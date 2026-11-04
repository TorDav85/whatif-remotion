// Produce this episode, normalize and verify its mix, then prepare local delivery files.
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = 'out/bombe-nucleaire/bombe-nucleaire-60s-v3.mp4';
const run = (args) => {
  const result = spawnSync(process.execPath, args, {cwd: root, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run(['scripts/check/validate-scenarios.mjs', 'bombe-nucleaire']);
run(['scripts/check/editorial-report.mjs', 'bombe-nucleaire']);
if (process.argv.includes('--preview-stability')) {
  for (const [label, from, to] of [['intro', 0, 89], ['aerial', 780, 839], ['damage', 540, 599], ['road', 960, 1019]]) {
    run(['node_modules/@remotion/cli/remotion-cli.js', 'render', 'BombeNucleaire',
      `out/bombe-nucleaire/v3-stability-${label}.mp4`, `--frames=${from}-${to}`,
      '--codec=h264', '--concurrency=2', '--audio-codec=aac', '--audio-bitrate=192k']);
  }
  process.exit(0);
}
if (process.argv.includes('--preview')) {
  run(['scripts/check/stills.mjs', 'BombeNucleaire', '--frames',
    '60,180,285,450,570,660,795,894,990,1110,1260,1455,1530,1590,1635,1695,1740,1785',
    '--out', 'out/bombe-nucleaire/v3-storyboard']);
}
if (process.argv.includes('--preview-ending') || process.argv.includes('--preview')) {
  run(['node_modules/@remotion/cli/remotion-cli.js', 'render', 'BombeNucleaire',
    'out/bombe-nucleaire/v3-ending-preview.mp4', '--frames=1380-1799', '--scale=0.6',
    '--codec=h264', '--concurrency=2', '--audio-codec=aac', '--audio-bitrate=192k']);
  process.exit(0);
}
if (!process.argv.includes('--finish-only')) {
  run(['node_modules/@remotion/cli/remotion-cli.js', 'render', 'BombeNucleaire', output,
    '--codec=h264', '--concurrency=2', '--audio-codec=aac', '--audio-bitrate=192k']);
}
run(['scripts/audio/python.mjs', 'scripts/audio/finalize-bombe-nucleaire.py', output]);
run(['scripts/audio/python.mjs', 'scripts/check/audio-levels.py', 'bombe-nucleaire', output]);
run(['scripts/export/publication.mjs', 'bombe-nucleaire', ...(process.argv.includes('--replace-publication') ? ['--force'] : [])]);
