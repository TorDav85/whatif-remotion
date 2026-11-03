/**
 * Refactoring guard: render the same frames from two checkouts and compare them pixel by pixel.
 *
 *   node scripts/check/compare-stills.mjs <other-checkout> Comp1:frame,frame Comp2:frame …
 *
 * One bundle per checkout; compare_images.py prints the mean and max channel difference per frame
 * (a mean above 2/255 is reported as a change; a still and its re-render differ by ~0).
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {spawnSync} from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [other, ...specs] = process.argv.slice(2);
if (!other || !specs.length) {
  console.error('Usage : node scripts/check/compare-stills.mjs <autre-dossier> Comp:frame,frame …');
  process.exit(2);
}
const jobs = specs.map((s) => {
  const [id, frames] = s.split(':');
  return {id, frames: frames.split(',').map(Number)};
});
const outDir = path.join(root, 'out/compare-stills');

const renderAll = async (checkout, label) => {
  const serveUrl = await bundle({entryPoint: path.join(checkout, 'src/index.ts'), onProgress: () => undefined});
  for (const job of jobs) {
    const composition = await selectComposition({serveUrl, id: job.id, chromiumOptions: {gl: 'angle'}, logLevel: 'error'});
    for (const frame of job.frames) {
      const output = path.join(outDir, label, `${job.id}-${frame}.png`);
      fs.mkdirSync(path.dirname(output), {recursive: true});
      await renderStill({serveUrl, composition, frame, output, chromiumOptions: {gl: 'angle'}, logLevel: 'error'});
    }
  }
};

await renderAll(path.resolve(other), 'avant');
await renderAll(root, 'apres');

// Pixel comparison in Python (Pillow + NumPy from .venv), see compare_images.py.
const pairs = jobs.flatMap((job) => job.frames.map((frame) => `${job.id}-${frame}.png`));
const result = spawnSync(process.execPath, [path.join(root, 'scripts/audio/python.mjs'), 'scripts/check/compare_images.py', outDir, ...pairs], {cwd: root, stdio: 'inherit'});
process.exitCode = result.status ?? 1;
