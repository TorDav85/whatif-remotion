// Génère public/gravity.wav : foule et circulation, coupure de la gravité (souffle grave), vent vertical
// qui enfle, gravité qui revient (grand fracas), puis silence et clapotis. Aucune dépendance.
// Les temps (vidéo → temps réel) suivent src/gravity/gravity.json.
import fs from 'node:fs';

const OUT = 'public/gravity.wav';
if (process.argv.includes('--if-missing') && fs.existsSync(OUT)) process.exit(0);

const tl = JSON.parse(fs.readFileSync('src/gravity/gravity.json', 'utf8'));
const SR = 44100;
const dur = tl.duration;
const n = Math.floor(SR * dur);
const P = tl.physics;

const lin = (keys, t) => {
  if (t <= keys[0].t) return keys[0].v;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) return a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t);
  }
  return keys[keys.length - 1].v;
};
const tTau = (tau) => {
  // instant vidéo où le temps réel vaut tau
  for (let t = 0; t < dur; t += 0.005) if (lin(tl.tau, t) >= tau) return t;
  return dur;
};
const lat = (P.latDeg * Math.PI) / 180;
const aUp = P.omega ** 2 * P.earthRadiusM * Math.cos(lat) ** 2;
const hLand = 0.5 * aUp * P.offSec ** 2;
const tOff = tTau(0);
const tBack = tTau(P.offSec);
const tLand = tTau(P.offSec + Math.sqrt((2 * hLand) / P.g));
const endT = tl.scenes.find((s) => s.id === 'end').from;

let seed = 5;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

const out = new Float32Array(n);
let lp1 = 0, lp2 = 0, lpW = 0, lpW2 = 0, lpB = 0, lpS = 0, lpS2 = 0, ph = 0;
for (let i = 0; i < n; i++) {
  const t = i / SR;
  let s = 0;
  // ville : circulation lointaine + brouhaha de foule, qui s'étouffent quand la gravité s'arrête
  const city = 1 - clamp01((t - tOff) / 3) * 0.85;
  lp1 += (rnd() - lp1) * 0.02;
  lp2 += (lp1 - lp2) * 0.3;
  const syll = 0.55 + 0.45 * Math.sin(t * 9.1) * Math.sin(t * 5.3 + 1) * Math.sin(t * 2.7 + 2);
  s += city * (0.4 * lp1 + 0.35 * (lp1 - lp2) * syll);
  // coupure : un souffle grave qui descend
  if (t > tOff - 0.1 && t < tOff + 2.5) {
    const k = (t - tOff + 0.1) / 2.6;
    ph += (2 * Math.PI * (70 * Math.pow(0.35, k))) / SR;
    s += 0.45 * Math.sin(Math.PI * k) * Math.sin(ph);
  }
  // vent vertical qui enfle pendant la minute sans gravité
  const wind = clamp01((t - tOff) / 8) * (1 - clamp01((t - tBack) / 0.6));
  lpW += (rnd() - lpW) * (0.01 + 0.03 * wind);
  lpW2 += (lpW - lpW2) * 0.08;
  s += wind * (0.6 + 0.4 * Math.sin(t * 0.7)) * lpW2 * 3.2;
  // fracas à l'impact : bruit grave puis aigu, très court
  if (t > tLand && t < tLand + 4) {
    const k = t - tLand;
    lpB += (rnd() - lpB) * 0.05;
    s += 1.6 * Math.exp(-k * 1.6) * lpB * 3 + 0.5 * Math.exp(-k * 6) * rnd();
  }
  // clapotis de l'eau qui s'étale ensuite
  if (t > tLand + 0.5 && t < endT + 3) {
    lpS += (rnd() - lpS) * 0.3;
    lpS2 += (lpS - lpS2) * 0.05;
    s += 0.12 * (1 - clamp01((t - endT) / 3)) * (lpS - lpS2) * (0.6 + 0.4 * Math.sin(t * 3.1));
  }
  out[i] = s;
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
