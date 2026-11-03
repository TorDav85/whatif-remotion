// Génère public/ambience.wav : un drone qui monte avec la tension, un "boom" au flash, puis un calme.
// Aucune dépendance. Les temps suivent src/videos/whatif/timeline.json.
import fs from 'node:fs';

const scenarioPath = process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? 'src/videos/whatif/timeline.json';
const tl = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
const output = `public/${tl.audio.music}`;
if (process.argv.includes('--if-missing') && fs.existsSync(output)) process.exit(0);
const SR = 44100;
const dur = tl.duration;
const n = Math.floor(SR * dur);
const t0 = tl.hole.appearsAt;
const flashT = tl.flash.find((k) => k.a >= 1).t; // moment du blanc total
const rise = flashT - t0;

let seed = 1;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;

const out = new Int16Array(n);
let ph = 0;
let lp = 0;
for (let i = 0; i < n; i++) {
  const t = i / SR;
  const k = t < t0 ? 0.15 : t < flashT ? 0.15 + 0.85 * ((t - t0) / rise) ** 2 : 0;
  let s = 0;
  const droneAmp = t < flashT ? 0.35 + 0.35 * k : 0;
  s += droneAmp * (0.6 * Math.sin(2 * Math.PI * 55 * t) + 0.35 * Math.sin(2 * Math.PI * 82.5 * t + Math.sin(2 * Math.PI * 0.1 * t)));
  if (t >= t0 && t < flashT) {
    const f = 180 * Math.pow(7, (t - t0) / rise); // la hauteur monte
    ph += (2 * Math.PI * f) / SR;
    s += 0.22 * k * Math.sin(ph);
    lp += (rnd() - lp) * 0.04;
    s += 0.5 * k * k * lp;
  }
  if (t >= flashT) {
    const e = Math.exp(-(t - flashT) * 1.4);
    s += 0.9 * e * Math.sin(2 * Math.PI * 40 * t);
    const calm = Math.min(1, (t - flashT) / 3);
    s += 0.12 * calm * (Math.sin(2 * Math.PI * 110 * t) + 0.6 * Math.sin(2 * Math.PI * 165 * t));
  }
  const fadeOut = Math.min(1, (dur - t) / 2);
  out[i] = Math.max(-1, Math.min(1, s * 0.5 * fadeOut)) * 32767;
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
Buffer.from(out.buffer).copy(buf, 44);
fs.mkdirSync('public', {recursive: true});
fs.writeFileSync(output, buf);
console.log(`${output} généré`);
