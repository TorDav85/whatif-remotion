// Génère public/heat.wav : drone grave + souffle + crépitements de feu, pilotés par la courbe de température
// de src/heat/timeline.json, puis retombée à la fin. Aucune dépendance.
import fs from 'node:fs';

const OUT = 'public/heat.wav';
if (process.argv.includes('--if-missing') && fs.existsSync(OUT)) process.exit(0);

const tl = JSON.parse(fs.readFileSync('src/heat/timeline.json', 'utf8'));

// Même spline monotone (Fritsch–Carlson) que src/heat/curve.ts
const K = tl.curve;
const n0 = K.length;
const d = K.slice(0, -1).map((k, i) => (K[i + 1].c - k.c) / (K[i + 1].t - k.t));
const m = K.map((_, i) => (i === 0 ? d[0] : i === n0 - 1 ? d[n0 - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
for (let i = 0; i < n0 - 1; i++) {
  if (d[i] === 0) {
    m[i] = m[i + 1] = 0;
    continue;
  }
  const a = m[i] / d[i];
  const b = m[i + 1] / d[i];
  const s = a * a + b * b;
  if (s > 9) {
    const k = 3 / Math.sqrt(s);
    m[i] = k * a * d[i];
    m[i + 1] = k * b * d[i];
  }
}
const tempAt = (t) => {
  if (t <= K[0].t) return K[0].c;
  if (t >= K[n0 - 1].t) return K[n0 - 1].c;
  let i = 0;
  while (i < n0 - 2 && t > K[i + 1].t) i++;
  const h = K[i + 1].t - K[i].t;
  const s = (t - K[i].t) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * K[i].c + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * K[i + 1].c + (s3 - s2) * h * m[i + 1];
};

const SR = 44100;
const dur = tl.duration;
const n = Math.floor(SR * dur);
const outroT = tl.outro.t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => {
  const f = clamp01((x - a) / (b - a));
  return f * f * (3 - 2 * f);
};

let seed = 11;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;

// crépitements : impulsions brèves dont la densité suit la température
const crackles = [];
for (let t = 0; t < dur; ) {
  const fire = smooth(200, 900, tempAt(t)) * (1 - smooth(outroT, outroT + 2, t));
  const rate = 1 + 40 * fire;
  t += (0.2 + Math.abs(rnd())) / rate;
  if (fire > 0.02) crackles.push({t, a: (0.15 + 0.5 * Math.abs(rnd())) * fire, len: 0.004 + 0.012 * Math.abs(rnd()), f: 900 + 2500 * Math.abs(rnd())});
}

const out = new Float32Array(n);
let ph1 = 0;
let ph2 = 0;
let lp = 0;
let lp2 = 0;
let rumble = 0;
for (let i = 0; i < n; i++) {
  const t = i / SR;
  const c = tempAt(t);
  const k = clamp01((c - 22) / (1100 - 22)); // 0 → 1 avec la chaleur
  const fall = 1 - smooth(outroT - 0.5, outroT + 2, t);
  let s = 0;
  // drone grave qui monte doucement
  ph1 += (2 * Math.PI * (42 + 22 * k)) / SR;
  ph2 += (2 * Math.PI * (63 + 30 * k + Math.sin(t * 0.3))) / SR;
  s += (0.18 + 0.32 * Math.sqrt(k)) * (0.65 * Math.sin(ph1) + 0.35 * Math.sin(ph2)) * fall;
  // souffle (bruit filtré) de plus en plus fort et ouvert
  lp += (rnd() - lp) * (0.01 + 0.06 * k);
  s += (0.05 + 0.55 * k) * lp * (0.8 + 0.2 * Math.sin(t * 0.9)) * fall;
  // grondement de lave à la fin
  lp2 += (rnd() - lp2) * 0.003;
  rumble = smooth(842, 1100, c);
  s += 1.6 * rumble * lp2 * fall;
  // nappe calme pour la dernière phrase
  const calm = smooth(outroT + 0.3, outroT + 1.5, t);
  if (calm > 0) s += 0.05 * calm * (Math.sin(2 * Math.PI * 196 * t) + 0.6 * Math.sin(2 * Math.PI * 293.7 * t));
  out[i] = s;
}
for (const cr of crackles) {
  const i0 = Math.floor(cr.t * SR);
  const len = Math.floor(cr.len * SR);
  for (let j = 0; j < len && i0 + j < n; j++) {
    const e = Math.exp((-6 * j) / len);
    out[i0 + j] += cr.a * e * (0.6 * rnd() + 0.4 * Math.sin((2 * Math.PI * cr.f * j) / SR));
  }
}

const pcm = new Int16Array(n);
for (let i = 0; i < n; i++) {
  const fade = Math.min(1, (dur - i / SR) / 1.5, (i / SR) / 0.5);
  pcm[i] = Math.max(-1, Math.min(1, out[i] * 0.55 * fade)) * 32767;
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
