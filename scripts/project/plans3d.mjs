/**
 * Cache of the 3D shots (docs/acceleration-rendu.md): each shot of a composition declared in
 * src/core/plans3d-manifests.ts is rendered once, 3D layer only, into
 *
 *   .cache/plans3d/<Composition>/<shot>-<key>/00000.png …
 *
 * key = composition + shot + size/scale + the shot's `inputs` + a hash of the scene's source files
 * (their import graph, minus the per-shot data files). The final render then draws those images
 * under the overlays, captions and audio, which stay live: a new text or voice reuses every image,
 * a decor or camera change re-renders only the shots whose key changed.
 *
 * Safety net: for each reused shot one frame is rendered again and compared byte for byte with the
 * cache (`verify`, on by default); a difference throws the shot away and re-renders it.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as esbuild from 'esbuild';
import {removeOwnDir, root} from './render-session.mjs';

export const PLANS_DIR = path.join(root, '.cache', 'plans3d');
const MAX_GB = Number(process.env.PLANS3D_MAX_GB ?? 12);
const frameName = (i) => `${String(i).padStart(5, '0')}.png`;
const sha = (...parts) => {
  const h = crypto.createHash('sha256');
  for (const p of parts) h.update(typeof p === 'string' || Buffer.isBuffer(p) ? p : JSON.stringify(p)).update('\0');
  return h.digest('hex');
};
const rel = (f) => path.relative(root, f).replaceAll('\\', '/');
const esbuildBase = {
  bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', packages: 'external', target: 'node20', logLevel: 'error',
  loader: {'.png': 'file', '.jpg': 'file', '.wav': 'file', '.mp3': 'file', '.glb': 'file'},
};

/** The manifests, compiled for Node, and the import graph of every source file they reach. */
export const loadManifests = async () => {
  const outdir = path.join(root, '.cache', 'plans3d-manifests');
  const result = await esbuild.build({...esbuildBase, entryPoints: [path.join(root, 'src/core/plans3d-manifests.ts')], outdir,
    outExtension: {'.js': '.mjs'}, metafile: true, assetNames: '[name]-[hash]'});
  const mod = await import(`${pathToFileURL(path.join(outdir, 'plans3d-manifests.mjs')).href}?t=${Date.now()}`);
  return Object.fromEntries(mod.PLANS3D_MANIFESTS.map((m) => [m.composition, m]));
};

/** Hash of the scene files and everything they import (from the project), minus the per-shot data. */
export const sceneHash = async (manifest) => {
  const result = await esbuild.build({...esbuildBase, entryPoints: manifest.scene.map((f) => path.join(root, f)), outdir: path.join(root, '.cache', 'plans3d-graph'),
    write: false, metafile: true});
  const inputs = result.metafile.inputs;
  const skip = new Set(manifest.perPlan ?? []);
  const seen = new Set();
  const stack = manifest.scene.map((f) => f.replaceAll('\\', '/'));
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f) || !inputs[f]) continue;
    seen.add(f);
    for (const imp of inputs[f].imports) if (!imp.external) stack.push(imp.path);
  }
  for (const f of manifest.scene) if (!seen.has(f)) throw new Error(`Fichier de scène introuvable : ${f}`);
  const files = [...seen].filter((f) => !skip.has(f)).sort();
  return {hash: sha(...files.flatMap((f) => [f, fs.readFileSync(path.join(root, f))])).slice(0, 16), files};
};

const dirSize = (dir) => fs.readdirSync(dir, {withFileTypes: true}).reduce((s, e) => s + (e.isDirectory() ? dirSize(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0);

/** Keeps the cache under PLANS3D_MAX_GB (12 Go by default), removing the shots used longest ago. */
export const prunePlans = (keep = new Set()) => {
  if (!fs.existsSync(PLANS_DIR)) return {removed: 0, bytes: 0};
  const shots = fs.readdirSync(PLANS_DIR, {withFileTypes: true}).filter((e) => e.isDirectory())
    .flatMap((c) => fs.readdirSync(path.join(PLANS_DIR, c.name)).map((s) => path.join(PLANS_DIR, c.name, s)))
    .map((d) => ({d, bytes: dirSize(d), used: fs.statSync(d).mtimeMs})).sort((a, b) => a.used - b.used);
  let total = shots.reduce((s, x) => s + x.bytes, 0);
  let removed = 0;
  for (const s of shots) {
    if (total <= MAX_GB * 2 ** 30) break;
    if (keep.has(s.d)) continue;
    removeOwnDir(s.d);
    total -= s.bytes;
    removed++;
  }
  return {removed, bytes: total};
};

/** Read-only HTTP server for the cached images (the render page loads them like any image). */
export const servePlans = () => new Promise((resolve) => {
  const server = http.createServer((req, res) => {
    const file = path.resolve(PLANS_DIR, `.${decodeURIComponent(new URL(req.url, 'http://x').pathname)}`);
    if (!file.startsWith(PLANS_DIR + path.sep) || !file.endsWith('.png') || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store'});
    fs.createReadStream(file).pipe(res);
  });
  server.listen(0, '127.0.0.1', () => resolve({url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r))}));
});

/**
 * Makes sure every 3D image of `frameRange` or `frames` (all frames by default) is in the cache, rendering only
 * what is missing, and returns the `__plans3d` segments for the final render (or null when the
 * composition has no manifest).
 */
export const preparePlans = async ({session, composition, manifests, scale = 1, frameRange = null, frames = null, verify = true, concurrency = 2, log = console.log, baseUrl}) => {
  const manifest = manifests[composition.id];
  if (!manifest) return null;
  const started = performance.now();
  const scene = await sceneHash(manifest);
  const [first, last] = frameRange ?? [0, composition.durationInFrames - 1];
  const userProps = Object.fromEntries(Object.entries(composition.props).filter(([k]) => !k.startsWith('__')));
  const stats = {plans: 0, reused: 0, rendered: 0, verified: 0, stale: 0, framesRendered: 0, sceneFiles: scene.files.length, sceneHash: scene.hash};
  const segments = [];
  const keep = new Set();
  // 3D layer only, every frame of every shot in one call (one page load), each image to its shot's folder.
  const renderLayer = async (targets) => {
    const buffers = new Map();
    if (!targets.size) return buffers;
    await session.frames(composition, {frames: [...targets.keys()].sort((x, y) => x - y), imageFormat: 'png', outputDir: null, concurrency, muted: true, scale,
      inputProps: {...composition.props, __layer3d: 'only'}, onStart: () => undefined, onFrameUpdate: () => undefined,
      onFrameBuffer: (buf, f) => {
        const target = targets.get(f);
        if (target) fs.writeFileSync(target, buf);
        buffers.set(f, buf);
      }});
    return buffers;
  };
  const shots = [];
  for (const plan of manifest.plans(composition.fps)) {
    const a = Math.max(first, plan.from);
    const b = Math.min(last, plan.from + plan.durationInFrames - 1);
    if (a > b) continue;
    const wanted = [];
    for (let f = a; f <= b; f++) if (!frames || frames.includes(f)) wanted.push(f);
    if (!wanted.length) continue;
    stats.plans++;
    const key = sha(composition.id, plan.id, plan.durationInFrames, plan.inputs, userProps, scene.hash, composition.width, composition.height, scale, session.gl).slice(0, 16);
    const dir = path.join(PLANS_DIR, composition.id, `${plan.id.replace(/[^a-zA-Z0-9_-]+/g, '_')}-${key}`);
    keep.add(dir);
    const file = (f) => path.join(dir, frameName(f - plan.from));
    const present = wanted.filter((f) => fs.existsSync(file(f)));
    shots.push({plan, dir, file, wanted, present, probe: present[Math.floor(present.length / 2)]});
  }
  if (verify) {
    // One cached frame per reused shot, rendered again: the bytes must be the same.
    const probes = shots.filter((s) => s.present.length);
    const fresh = await renderLayer(new Map(probes.map((s) => [s.probe, null])));
    stats.verified = probes.length;
    for (const s of probes) {
      if (fresh.get(s.probe).equals(fs.readFileSync(s.file(s.probe)))) continue;
      log(`  ${s.plan.id} : l’image ${s.probe} ne correspond plus au cache, plan recalculé.`);
      removeOwnDir(s.dir);
      s.present = [];
      stats.stale++;
    }
  }
  const targets = new Map();
  for (const s of shots) {
    const have = new Set(s.present);
    const missing = s.wanted.filter((f) => !have.has(f));
    fs.mkdirSync(s.dir, {recursive: true});
    if (missing.length) {
      log(`  ${s.plan.id} : ${missing.length} image(s) 3D à calculer`);
      for (const f of missing) targets.set(f, s.file(f));
      stats.rendered++;
      stats.framesRendered += missing.length;
    } else {
      stats.reused++;
    }
    // Whole shot (images are named by index in the shot); only the wanted frames are rendered, and they are all there.
    segments.push({from: s.plan.from, durationInFrames: s.plan.durationInFrames, url: `${baseUrl}/${composition.id}/${path.basename(s.dir)}/`});
  }
  await renderLayer(targets);
  for (const s of shots) fs.utimesSync(s.dir, new Date(), new Date());
  stats.ms = Math.round(performance.now() - started);
  stats.prune = prunePlans(keep);
  return {segments, stats};
};
