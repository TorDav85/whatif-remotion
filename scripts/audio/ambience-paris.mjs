import fs from 'node:fs';
const scenarioPath = process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? 'src/videos/paris-v3/scenario.json';
const p = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
const output = `public/${p.audio.music}`;
const fresh = fs.existsSync(output) && fs.statSync(output).mtimeMs >= Math.max(fs.statSync(scenarioPath).mtimeMs, fs.statSync('scripts/audio/ambience-paris.mjs').mtimeMs);
if (process.argv.includes('--if-missing') && fresh) process.exit(0);
const sr = 44100;
const n = Math.round(p.duration * sr);
const pcm = new Int16Array(n * 2);
const smooth = (a, b, x) => {const f = Math.max(0, Math.min(1, (x - a) / (b - a))); return f * f * (3 - 2 * f);};
let seed = 3;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
let low = 0; let air = 0; let phase = 0;
for (let i = 0; i < n; i++) {
  const t = i / sr;
  const pull = smooth(p.effects.pullFrom, p.effects.absorbTo, t);
  const space = smooth(p.shots[1].from, p.shots[2].from, t);
  const opening = 1 - smooth(p.hero.absorbFrom, p.hero.absorbTo, t);
  low += (rnd() - low) * 0.008; air += (rnd() - air) * 0.16;
  const tension = smooth(p.hole.appearsAt, p.hero.impactAt, t);
  phase += 2 * Math.PI * (85 + tension * 260 + pull * 100) / sr;
  let sample = (1 - space) * (0.19 * low + 0.025 * Math.sin(2 * Math.PI * 82 * t));
  if (p.artDirection?.snow) sample += (1 - space) * (air * 0.075 + low * 0.14) * (0.7 + 0.3 * Math.sin(t * 0.6));
  // Le moteur de la voiture se transforme en aspiration dès l'ouverture.
  sample += opening * 0.04 * Math.sin(2 * Math.PI * 115 * t + 7 * Math.sin(t * 3));
  sample += (1 - space) * (0.055 + pull * 0.06) * Math.sin(phase);
  sample += (1 - space) * pull * (low * 0.5 + air * 0.08);
  sample += 0.06 * (Math.sin(2 * Math.PI * 55 * t) + 0.5 * Math.sin(2 * Math.PI * 110 * t));
  sample += space * 0.055 * (Math.sin(2 * Math.PI * 146.83 * t) + 0.5 * Math.sin(2 * Math.PI * 220 * t) + 0.24 * Math.sin(2 * Math.PI * 293.66 * t));
  // Un très bref silence matérialise la disparition ; l'impact arrive juste après.
  const quiet = smooth(p.hero.impactAt - 0.04, p.hero.impactAt, t) * (1 - smooth(p.hero.impactAt + 0.23, p.hero.impactAt + 0.32, t));
  sample *= 1 - quiet * 0.98;
  const age = t - (p.hero.impactAt + 0.28);
  if (age >= 0 && age < 1.5) sample += Math.exp(-age * 5) * (0.27 * Math.sin(2 * Math.PI * (65 * age - 12 * age * age)) + low * 0.6);
  // La tour craque avant le recul. Les changements d'échelle ont chacun un souffle.
  const crack = Math.exp(-Math.pow((t - (p.timing.towerFrom + 1.2)) / 0.16, 2));
  sample += air * crack * 0.17;
  for (const event of [p.timing.beaconFrom, ...p.shots.slice(1).map(s => s.from + 0.4)]) {
    const d = t - event;
    if (Math.abs(d) < 1.3) sample += Math.exp(-d * d * 4) * (air * 0.16 + low * 0.65);
  }
  const fade = Math.min(1, (p.duration - t) / 1.5);
  const pan = opening * -0.25 + Math.sin(t * 0.22) * space * 0.12;
  const width = space * air * 0.012;
  pcm[i * 2] = Math.tanh((sample * (1 - pan) + width) * 1.25) * fade * 32767;
  pcm[i * 2 + 1] = Math.tanh((sample * (1 + pan) - width) * 1.25) * fade * 32767;
}
const buffer = Buffer.alloc(44 + pcm.byteLength);
buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + pcm.byteLength, 4); buffer.write('WAVEfmt ', 8);
buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(2, 22);
buffer.writeUInt32LE(sr, 24); buffer.writeUInt32LE(sr * 4, 28); buffer.writeUInt16LE(4, 32); buffer.writeUInt16LE(16, 34);
buffer.write('data', 36); buffer.writeUInt32LE(pcm.byteLength, 40); Buffer.from(pcm.buffer).copy(buffer, 44);
fs.mkdirSync('public', {recursive: true}); fs.writeFileSync(output, buffer);
console.log(`${output} généré (${p.duration} s, stéréo)`);
