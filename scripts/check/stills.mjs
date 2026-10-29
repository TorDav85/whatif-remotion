// Render a few frames of a composition in one bundle, then assemble a contact sheet.
//   npm run stills -- CityLayoutPreview --shots
//   npm run stills -- InternetOffV1 --frames 75,840,1890
//   npm run stills -- InternetOffV1 --count 10 --props '{"x":1}'
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {shotFrames} from './shot-frames.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
// PowerShell drops the `--` separator, so npm keeps flags like --shots as its own config:
// read them back from npm_config_* as well.
const fromNpm = (name) => process.env[`npm_config_${name}`];
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i >= 0) return args[i + 1];
  const v = fromNpm(name);
  return v && v !== 'true' ? v : undefined;
};
const flag = (name) => args.includes(`--${name}`) || fromNpm(name) === 'true';
if (!id) {
  console.error('Usage : npm run stills -- <Composition> [--shots | --frames 10,90 | --count 8] [--props JSON] [--out dossier]');
  process.exit(1);
}

const inputProps = opt('props') ? JSON.parse(opt('props')) : {};
console.log('Compilation du projet…');
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), onProgress: () => undefined});
const composition = await selectComposition({serveUrl, id, inputProps, chromiumOptions: {gl: 'angle'}, logLevel: 'error'});
const props = {...composition.props, ...inputProps};
const fps = composition.fps;

let frames;
if (flag('shots')) {
  const file = path.join(root, 'public', 'city-layouts', `${props.layout}.json`);
  if (!fs.existsSync(file)) throw new Error(`Ville introuvable : ${file}`);
  frames = shotFrames(JSON.parse(fs.readFileSync(file, 'utf8')), fps);
  if (!frames.length) throw new Error('Cette ville n’a aucun plan de caméra enregistré.');
} else if (opt('frames')) {
  frames = opt('frames').split(',').map((f) => ({frame: Number(f)}));
} else {
  const count = Number(opt('count') ?? 6);
  frames = Array.from({length: count}, (_, i) => ({frame: Math.round(((i + 0.5) / count) * (composition.durationInFrames - 1))}));
}

const out = path.resolve(root, opt('out') ?? path.join('out', 'stills', id));
fs.mkdirSync(out, {recursive: true});
for (const f of fs.readdirSync(out)) if (/^f-\d+\.png$/.test(f)) fs.rmSync(path.join(out, f));
const t0 = Date.now();
for (const f of frames) {
  const frame = Math.max(0, Math.min(composition.durationInFrames - 1, f.frame));
  await renderStill({composition, serveUrl, frame, inputProps: props, output: path.join(out, `f-${frame}.png`), chromiumOptions: {gl: 'angle'}, logLevel: 'error'});
  console.log(`  image ${frame} (${(frame / fps).toFixed(1)} s)${f.label ? ` · ${f.label}` : ''}`);
}
console.log(`${frames.length} images en ${((Date.now() - t0) / 1000).toFixed(0)} s → ${path.relative(root, out)}`);

const python = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (fs.existsSync(python)) {
  const sheet = path.join(out, 'planche.png');
  const r = spawnSync(python, ['-I', path.join(root, 'scripts/check/contact_sheet.py'), out, sheet, String(fps)], {stdio: 'inherit'});
  if (r.status === 0) console.log(`Planche : ${path.relative(root, sheet)}`);
} else {
  console.log('Planche non générée (.venv absent) : les images sont dans le dossier ci-dessus.');
}
