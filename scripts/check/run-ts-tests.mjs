// Compile tests/*.test.ts(x) with esbuild, then run them with the built-in Node test runner.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const testsDir = path.join(root, 'tests');
const outDir = path.join(root, '.cache', 'tests');
const filter = process.argv[2];
const entries = fs.readdirSync(testsDir)
  .filter((f) => /\.test\.tsx?$/.test(f) && (!filter || f.includes(filter)))
  .map((f) => path.join(testsDir, f));
if (!entries.length) {
  console.error('Aucun test trouvé.');
  process.exit(1);
}
fs.rmSync(outDir, {recursive: true, force: true});
await esbuild.build({
  entryPoints: entries,
  outdir: outDir,
  outExtension: {'.js': '.mjs'},
  bundle: true,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  packages: 'external',
  target: 'node20',
  logLevel: 'warning',
});
const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.mjs')).map((f) => path.join(outDir, f));
const r = spawnSync(process.execPath, ['--test', ...files], {stdio: 'inherit', cwd: root});
process.exit(r.status ?? 1);
