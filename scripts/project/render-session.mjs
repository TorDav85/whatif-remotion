/**
 * One render session for every script: the compiled project and the browser are made once and reused.
 *
 *   const session = await openSession();                  // bundle (cached) + one Chrome
 *   const comp = await session.select('MarcGeant');
 *   await session.still(comp, {frame: 300, output});      // renderStill with the shared browser
 *   await session.media(comp, {codec: 'h264', outputLocation});
 *   await session.close();
 *
 * - The bundle is kept in .cache/render-session/bundle-<hash>, where the hash covers src/, the
 *   Remotion config and package-lock.json: an unchanged project is not recompiled at all.
 * - public/ is not copied into the bundle (≈ 190 to 340 Mo each time before): every file is
 *   hard-linked instead (same disk, no data copied), and the links are refreshed at each session.
 *   No junction or symbolic link is ever created, so removing a bundle can never reach public/.
 * - One Chrome (openBrowser) serves selectComposition, renderStill, renderFrames and renderMedia
 *   (puppeteerInstance), instead of one launch per call.
 * See docs/acceleration-rendu.md for the measurements.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderFrames, renderMedia, renderStill, selectComposition} from '@remotion/renderer';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cacheDir = path.join(root, '.cache', 'render-session');
const KEEP_BUNDLES = 2;

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.isFile()) out.push(p);
  }
  return out;
};

/** Hash of everything webpack compiles: a different hash means a new bundle. */
export const projectHash = () => {
  const h = crypto.createHash('sha256');
  const files = [...walk(path.join(root, 'src')), ...['remotion.config.ts', 'package-lock.json', 'tsconfig.json'].map((f) => path.join(root, f))]
    .filter((f) => fs.existsSync(f)).sort();
  for (const f of files) h.update(path.relative(root, f).replaceAll('\\', '/')).update('\0').update(fs.readFileSync(f)).update('\0');
  return h.digest('hex').slice(0, 16);
};

/**
 * Removes a folder made by this module, refusing any symbolic link or junction inside it
 * (a recursive delete must never follow one into the real public/, node_modules or .venv).
 */
export const removeOwnDir = (dir) => {
  if (!fs.existsSync(dir)) return;
  const check = (d) => {
    for (const ent of fs.readdirSync(d, {withFileTypes: true})) {
      const p = path.join(d, ent.name);
      const st = fs.lstatSync(p);
      if (st.isSymbolicLink()) throw new Error(`Lien symbolique ou jonction dans ${d} : suppression refusée (${p}).`);
      if (st.isDirectory()) check(p);
    }
  };
  check(dir);
  fs.rmSync(dir, {recursive: true});
};

/**
 * Mirrors public/ into <bundle>/public with hard links: new or changed files are (re)linked,
 * files gone from public/ are unlinked. Falls back to a copy if the disk refuses links.
 */
export const syncPublic = (dest) => {
  const src = path.join(root, 'public');
  const wanted = new Set();
  let linked = 0;
  let copied = 0;
  for (const file of walk(src)) {
    const rel = path.relative(src, file);
    wanted.add(rel);
    const target = path.join(dest, rel);
    const s = fs.statSync(file);
    if (fs.existsSync(target)) {
      const t = fs.lstatSync(target);
      if (t.isFile() && t.ino === s.ino && t.dev === s.dev) continue;
      fs.unlinkSync(target);
    }
    fs.mkdirSync(path.dirname(target), {recursive: true});
    try {
      fs.linkSync(file, target);
      linked++;
    } catch {
      fs.copyFileSync(file, target);
      copied++;
    }
  }
  let removed = 0;
  for (const file of walk(dest)) {
    if (!wanted.has(path.relative(dest, file))) {
      fs.unlinkSync(file);
      removed++;
    }
  }
  return {files: wanted.size, linked, copied, removed};
};

const emptyPublic = () => {
  const dir = path.join(cacheDir, 'empty-public');
  fs.mkdirSync(dir, {recursive: true});
  return dir;
};

/** The compiled project for the current sources, compiled only when they changed. */
export const cachedBundle = async ({log = console.log} = {}) => {
  const started = performance.now();
  const hash = projectHash();
  const dir = path.join(cacheDir, `bundle-${hash}`);
  const done = path.join(dir, '.complete');
  let compiled = false;
  if (!fs.existsSync(done)) {
    log('Compilation du projet…');
    removeOwnDir(dir);
    // publicDir: an empty folder, so webpack's copy of public/ is skipped; links are made just after.
    await bundle({entryPoint: path.join(root, 'src/index.ts'), outDir: dir, publicDir: emptyPublic(), onProgress: () => undefined});
    fs.writeFileSync(done, new Date().toISOString());
    compiled = true;
  }
  const sync = syncPublic(path.join(dir, 'public'));
  // Keep the last bundles only (each is a few Mo of code plus links).
  const others = fs.readdirSync(cacheDir).filter((d) => d.startsWith('bundle-') && d !== `bundle-${hash}`)
    .map((d) => ({d, t: fs.statSync(path.join(cacheDir, d)).mtimeMs})).sort((a, b) => b.t - a.t);
  for (const {d} of others.slice(KEEP_BUNDLES - 1)) removeOwnDir(path.join(cacheDir, d));
  fs.utimesSync(dir, new Date(), new Date());
  return {serveUrl: dir, hash, compiled, sync, ms: Math.round(performance.now() - started)};
};

/**
 * Bundle + one browser. Every helper passes the shared browser and chromium options;
 * `gl` defaults to REMOTION_GL or 'angle' (swangle without GPU, as in CI).
 */
export const openSession = async ({gl = process.env.REMOTION_GL ?? 'angle', logLevel = 'error', log = console.log} = {}) => {
  const timings = {};
  const b = await cachedBundle({log});
  timings.bundleMs = b.ms;
  const chromiumOptions = {gl};
  let t = performance.now();
  const browser = await openBrowser('chrome', {chromiumOptions, logLevel});
  timings.browserMs = Math.round(performance.now() - t);
  const common = {serveUrl: b.serveUrl, puppeteerInstance: browser, chromiumOptions, logLevel};
  return {
    serveUrl: b.serveUrl,
    bundleHash: b.hash,
    compiled: b.compiled,
    publicSync: b.sync,
    browser,
    chromiumOptions,
    gl,
    timings,
    select: (id, inputProps = {}) => selectComposition({...common, id, inputProps}),
    still: (composition, options) => renderStill({...common, composition, inputProps: composition.props, ...options}),
    frames: (composition, options) => renderFrames({...common, composition, inputProps: composition.props, ...options}),
    media: (composition, options) => renderMedia({...common, composition, inputProps: composition.props, ...options}),
    close: () => browser.close({silent: true}),
  };
};
