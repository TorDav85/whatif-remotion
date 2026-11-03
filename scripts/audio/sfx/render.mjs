/**
 * Render sound effects to a WAV, offline and deterministic (no browser, no audio file to license).
 *
 *   npm run sfx -- <cues.json> <out.wav>     a cue sheet: {"duration": 60, "cues": [{"t": 8, "sfx": "hit", "gain": 1}]}
 *   npm run sfx -- --catalog                 every effect in a row → out/sfx/catalog.wav + scripts/audio/sfx/CATALOG.md
 *   npm run sfx -- --list                    names, tags and lengths
 *
 * In a video: <Audio src={staticFile('<slug>/fx.wav')} /> next to the voice; cue times are seconds of the film.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {encodeWav} from './offline-audio.mjs';
import {SFX_INFO} from './library.mjs';
import {SAMPLE_RATE, renderCues} from './cues.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const args = process.argv.slice(2);
if (args.includes('--list') || process.env.npm_config_list === 'true') {
  for (const s of SFX_INFO) console.log(`${s.name.padEnd(14)} ${String(s.seconds).padStart(4)} s  ${s.tags.padEnd(24)} ${s.description}`);
} else if (args.includes('--catalog') || process.env.npm_config_catalog === 'true') {
  const gap = 0.6;
  let t = 0.3;
  const cues = SFX_INFO.map((s) => { const c = {t, sfx: s.name}; t += s.seconds + gap; return c; });
  const out = path.join(root, 'out/sfx/catalog.wav');
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodeWav(renderCues({duration: t + 0.5, cues}), SAMPLE_RATE, 1));
  const rows = SFX_INFO.map((s, i) => `| \`${s.name}\` | ${cues[i].t.toFixed(1)} s | ${s.seconds} | ${s.tags} | ${s.description} |`);
  fs.writeFileSync(path.join(here, 'CATALOG.md'), `# Effets sonores (${SFX_INFO.length})\n\nGénéré par \`npm run sfx -- --catalog\` (ne pas modifier à la main). Écoute : \`out/sfx/catalog.wav\`, à l'instant indiqué.\nDescriptions d'origine (papercut-explainer, MIT).\n\n| nom | dans catalog.wav | durée (s) | étiquettes | son |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`);
  console.log(`${SFX_INFO.length} effets → ${path.relative(root, out)} et scripts/audio/sfx/CATALOG.md`);
} else {
  const [cuesFile, outFile] = args.filter((a) => !a.startsWith('--'));
  if (!cuesFile || !outFile) {
    console.error('Usage : npm run sfx -- <cues.json> <out.wav> | --catalog | --list');
    process.exit(1);
  }
  const sheet = JSON.parse(fs.readFileSync(cuesFile, 'utf8'));
  fs.mkdirSync(path.dirname(path.resolve(outFile)), {recursive: true});
  fs.writeFileSync(outFile, encodeWav(renderCues(sheet), SAMPLE_RATE, 1));
  console.log(`${sheet.cues.length} effets sur ${sheet.duration} s → ${outFile}`);
}
