/**
 * Render benchmark, before any optimisation: time per frame and peak memory, per composition.
 *
 *   npm run benchmark                         default list, 60 frames each
 *   npm run benchmark -- MarcGeant MarcMini   chosen compositions
 *   npm run benchmark -- --frames 120
 *
 * One bundle; each composition renders frames [mid, mid + n) to a throwaway MP4 (no audio).
 * Memory is sampled every 250 ms: Node RSS and the whole system's used RAM (which includes the
 * headless Chrome doing the WebGL work). Results go to out/benchmark/<date>.json and a table.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const fi = args.indexOf('--frames');
const n = fi >= 0 ? Number(args.splice(fi, 2)[1]) : Number(process.env.npm_config_frames ?? 60);
const ids = args.length ? args : ['MarcGeant', 'MarcMini', 'MarcDeuxLunes', 'MarcGeantCourt', 'InternetOffV1', 'AsteroideParis', 'Chaleur', 'WhatIfParisV6'];
const gl = 'angle';

const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), onProgress: () => undefined});
const results = [];
for (const id of ids) {
  const composition = await selectComposition({serveUrl, id, chromiumOptions: {gl}, logLevel: 'error'});
  const mid = Math.floor(composition.durationInFrames / 2);
  const frames = [mid, Math.min(composition.durationInFrames - 1, mid + n - 1)];
  const base = os.totalmem() - os.freemem();
  let peakRss = 0;
  let peakSystem = 0;
  const timer = setInterval(() => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
    peakSystem = Math.max(peakSystem, os.totalmem() - os.freemem() - base);
  }, 250);
  const started = performance.now();
  await renderMedia({
    serveUrl, composition, codec: 'h264', muted: true, frameRange: frames, concurrency: 2,
    outputLocation: path.join(root, 'out/benchmark', `${id}.mp4`), chromiumOptions: {gl}, logLevel: 'error',
  });
  const seconds = (performance.now() - started) / 1000;
  clearInterval(timer);
  const count = frames[1] - frames[0] + 1;
  const full = (seconds / count) * composition.durationInFrames;
  results.push({id, frames: count, seconds: +seconds.toFixed(1), msPerFrame: Math.round((seconds / count) * 1000),
    estimatedFullRenderMin: +(full / 60).toFixed(1), peakNodeMb: Math.round(peakRss / 2 ** 20), peakSystemDeltaMb: Math.round(peakSystem / 2 ** 20)});
  console.log(`${id.padEnd(18)} ${String(results.at(-1).msPerFrame).padStart(5)} ms/image  rendu complet ≈ ${results.at(-1).estimatedFullRenderMin} min  Node ${results.at(-1).peakNodeMb} Mo  système +${results.at(-1).peakSystemDeltaMb} Mo`);
}
const meta = {date: new Date().toISOString(), cpu: os.cpus()[0]?.model, cores: os.cpus().length, ramGb: +(os.totalmem() / 2 ** 30).toFixed(1), framesPerComposition: n, concurrency: 2, gl};
fs.mkdirSync(path.join(root, 'out/benchmark'), {recursive: true});
const file = path.join(root, 'out/benchmark', `${meta.date.slice(0, 10)}.json`);
fs.writeFileSync(file, JSON.stringify({meta, results}, null, 2));
console.log(`Résultats : ${path.relative(root, file)}`);
