// Génère public/nature.wav : rumeur de la ville, coupure de courant, puis vent et oiseaux qui reviennent.
// Aucune dépendance. Les temps suivent src/nature/nature.json.
import fs from 'node:fs';

const OUT = 'public/nature.wav';
if (process.argv.includes('--if-missing') && fs.existsSync(OUT)) process.exit(0);

const tl = JSON.parse(fs.readFileSync('src/nature/nature.json', 'utf8'));
const SR = 44100;
const dur = tl.duration;
const n = Math.floor(SR * dur);
const off = tl.world.find((k) => k.lights === 0).t; // tout est éteint
const offStart = off - 2;
const endT = tl.scenes.find((s) => s.id === 'end').from;

let seed = 3;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// chants d'oiseaux : de plus en plus nombreux
const chirps = [];
for (let t = off + 1; t < endT + 2; ) {
  const density = 0.6 + 3.5 * clamp01((t - off) / (endT - off));
  t += (0.5 + 0.5 * Math.abs(rnd())) / density;
  const f0 = 2300 + 1600 * Math.abs(rnd());
  const notes = 1 + Math.floor(Math.abs(rnd()) * 4);
  for (let k = 0; k < notes; k++) chirps.push({t: t + k * 0.11, f0, f1: f0 * (1.15 + 0.4 * rnd()), d: 0.06 + 0.05 * Math.abs(rnd()), a: 0.05 + 0.07 * Math.abs(rnd())});
}

const out = new Float32Array(n);
let lpCity = 0;
let lpWind = 0;
let lpWind2 = 0;
let phDown = 0;
for (let i = 0; i < n; i++) {
  const t = i / SR;
  let s = 0;
  // rumeur urbaine (circulation lointaine + bourdonnement électrique)
  const city = 1 - clamp01((t - offStart) / (off - offStart));
  lpCity += (rnd() - lpCity) * 0.02;
  s += city * (0.55 * lpCity + 0.05 * Math.sin(2 * Math.PI * 50 * t) + 0.03 * Math.sin(2 * Math.PI * 100 * t));
  // le réseau s'arrête : un ton qui descend
  if (t > offStart && t < off + 0.8) {
    const k = (t - offStart) / (off + 0.8 - offStart);
    phDown += (2 * Math.PI * (120 * Math.pow(0.15, k))) / SR;
    s += 0.25 * (1 - k) * Math.sin(phDown);
  }
  // vent
  const wind = clamp01((t - off) / 3) * (1 - clamp01((t - endT) / 3));
  lpWind += (rnd() - lpWind) * 0.008;
  lpWind2 += (lpWind - lpWind2) * 0.05;
  s += wind * (0.5 + 0.3 * Math.sin(t * 0.37)) * lpWind2 * 2.2;
  // nappe douce à la fin
  const pad = clamp01((t - (endT - 7)) / 4);
  if (pad > 0) s += 0.05 * pad * (Math.sin(2 * Math.PI * 220 * t) + 0.7 * Math.sin(2 * Math.PI * 277.2 * t) + 0.6 * Math.sin(2 * Math.PI * 329.6 * t));
  out[i] = s;
}
for (const c of chirps) {
  const i0 = Math.floor(c.t * SR);
  const len = Math.floor(c.d * SR);
  let ph = 0;
  for (let j = 0; j < len && i0 + j < n; j++) {
    const k = j / len;
    ph += (2 * Math.PI * (c.f0 + (c.f1 - c.f0) * k)) / SR;
    out[i0 + j] += c.a * Math.sin(Math.PI * k) ** 2 * Math.sin(ph);
  }
}

const pcm = new Int16Array(n);
for (let i = 0; i < n; i++) {
  const fade = Math.min(1, (dur - i / SR) / 2);
  pcm[i] = Math.max(-1, Math.min(1, out[i] * 0.6 * fade)) * 32767;
}
const buf = Buffer.alloc(44 + n * 2);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + n * 2, 4);
buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(n * 2, 40);
Buffer.from(pcm.buffer).copy(buf, 44);
fs.mkdirSync('public', {recursive: true});
fs.writeFileSync(OUT, buf);
console.log(`${OUT} généré`);
