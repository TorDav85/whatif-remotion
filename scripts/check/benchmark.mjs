/**
 * Render benchmark: time per frame and peak memory, per composition and per concurrency.
 *
 *   npm run benchmark                                   default list, 60 frames each, concurrency 2
 *   npm run benchmark -- MarcGeant MarcMini             chosen compositions
 *   npm run benchmark -- --frames 120
 *   npm run benchmark -- VilleReferenceVisite@150-299 BombeNucleaireVille@8s-30s --concurrency 2,3,4
 *   npm run benchmark -- BombeNucleaireVille@46s-58s --scale 0.5
 *
 * `Id@a-b` renders frames a..b, `Id@8s-30s` seconds 8 to 30; without a range, frames [mid, mid + n).
 * One shared session (cached bundle, one browser); each run renders to a throwaway MP4 (no audio).
 * Memory is sampled every 250 ms: Node RSS and the whole system's used RAM (which includes the
 * headless Chrome doing the WebGL work). Results go to out/benchmark/<date>.json (or --out) and a table.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openSession, root} from '../project/render-session.mjs';

const args = process.argv.slice(2);
const take = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i >= 0) return args.splice(i, 2)[1];
  return process.env[`npm_config_${name}`] ?? fallback;
};
const n = Number(take('frames', 60));
const concurrencies = String(take('concurrency', 2)).split(',').map(Number);
const scale = Number(take('scale', 1));
const outFile = take('out', null);
const specs = args.length ? args : ['MarcGeant', 'MarcMini', 'MarcDeuxLunes', 'MarcGeantCourt', 'InternetOffV1', 'AsteroideParis', 'Chaleur', 'WhatIfParisV6'];

const session = await openSession();
const results = [];
try {
  for (const spec of specs) {
    const [id, range] = spec.split('@');
    const composition = await session.select(id);
    const last = composition.durationInFrames - 1;
    let frames;
    if (range) {
      frames = range.split('-').map((v) => (v.endsWith('s') ? Math.round(Number(v.slice(0, -1)) * composition.fps) : Number(v)));
      frames = [Math.max(0, frames[0]), Math.min(last, frames[1])];
    } else {
      const mid = Math.floor(composition.durationInFrames / 2);
      frames = [mid, Math.min(last, mid + n - 1)];
    }
    for (const concurrency of concurrencies) {
      const base = os.totalmem() - os.freemem();
      let peakRss = 0;
      let peakSystem = 0;
      const timer = setInterval(() => {
        peakRss = Math.max(peakRss, process.memoryUsage().rss);
        peakSystem = Math.max(peakSystem, os.totalmem() - os.freemem() - base);
      }, 250);
      const started = performance.now();
      await session.media(composition, {
        codec: 'h264', muted: true, frameRange: frames, concurrency, scale,
        outputLocation: path.join(root, 'out/benchmark', `${id}.mp4`),
      });
      const seconds = (performance.now() - started) / 1000;
      clearInterval(timer);
      const count = frames[1] - frames[0] + 1;
      const full = (seconds / count) * composition.durationInFrames;
      results.push({id, range: frames, concurrency, scale, frames: count, seconds: +seconds.toFixed(1), msPerFrame: Math.round((seconds / count) * 1000),
        estimatedFullRenderMin: +(full / 60).toFixed(1), peakNodeMb: Math.round(peakRss / 2 ** 20), peakSystemDeltaMb: Math.round(peakSystem / 2 ** 20)});
      const r = results.at(-1);
      console.log(`${`${id}@${frames.join('-')}`.padEnd(30)} ×${concurrency} ${String(r.msPerFrame).padStart(5)} ms/image  rendu complet ≈ ${r.estimatedFullRenderMin} min  Node ${r.peakNodeMb} Mo  système +${r.peakSystemDeltaMb} Mo`);
    }
  }
} finally {
  await session.close();
}
const meta = {date: new Date().toISOString(), cpu: os.cpus()[0]?.model, cores: os.cpus().length, ramGb: +(os.totalmem() / 2 ** 30).toFixed(1),
  framesPerComposition: n, concurrency: concurrencies, scale, gl: session.gl, session: session.timings};
fs.mkdirSync(path.join(root, 'out/benchmark'), {recursive: true});
const file = outFile ? path.resolve(root, outFile) : path.join(root, 'out/benchmark', `${meta.date.slice(0, 10)}.json`);
fs.mkdirSync(path.dirname(file), {recursive: true});
fs.writeFileSync(file, JSON.stringify({meta, results}, null, 2));
console.log(`Résultats : ${path.relative(root, file)}`);
