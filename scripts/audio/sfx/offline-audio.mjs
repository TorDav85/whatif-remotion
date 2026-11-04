/**
 * Minimal offline audio graph for Node, shaped like the Web Audio API subset the sound effects use:
 * oscillators, buffer sources, biquad filters (lowpass / highpass / bandpass), gains and their
 * automation (setValueAtTime, linear / exponential ramps, setTargetAtTime, setValueCurveAtTime).
 * No browser, no dependency; the same cue sheet always renders the same samples.
 */
const BLOCK = 128;
const silent = (s) => { for (let i = 0; i < BLOCK; i++) if (s[i] !== 0) return false; return true; };

class Param {
  constructor(ctx, value) {
    this.ctx = ctx;
    this.defaultValue = value;
    this.events = [];
  }
  set value(v) { this.defaultValue = v; }
  get value() { return this.defaultValue; }
  push(e) { this.events.push(e); this.events.sort((a, b) => a.time - b.time); return this; }
  setValueAtTime(value, time) { return this.push({kind: 'set', value, time}); }
  linearRampToValueAtTime(value, time) { return this.push({kind: 'linear', value, time}); }
  exponentialRampToValueAtTime(value, time) { return this.push({kind: 'exp', value, time}); }
  setTargetAtTime(value, time, tau) { return this.push({kind: 'target', value, time, tau}); }
  setValueCurveAtTime(curve, time, duration) { return this.push({kind: 'curve', value: curve[curve.length - 1], curve: Array.from(curve), time, duration}); }

  /** Value at time t, following the Web Audio automation rules closely enough for short effects. */
  at(t) {
    let v = this.defaultValue;
    let prevTime = 0;
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i];
      if (e.kind === 'linear' || e.kind === 'exp') {
        // A ramp runs from the previous event's end value up to this event's time.
        if (t < e.time) {
          const k = (t - prevTime) / Math.max(1e-9, e.time - prevTime);
          if (k <= 0) return v;
          if (e.kind === 'linear') return v + (e.value - v) * k;
          if (v <= 0 || e.value <= 0) return v;
          return v * Math.pow(e.value / v, k);
        }
        v = e.value;
        prevTime = e.time;
        continue;
      }
      if (t < e.time) return v;
      if (e.kind === 'set') {
        v = e.value;
        prevTime = e.time;
      } else if (e.kind === 'target') {
        const next = this.events[i + 1];
        const end = next ? Math.min(t, next.time) : t;
        v = e.value + (v - e.value) * Math.exp(-(end - e.time) / e.tau);
        prevTime = end;
        if (!next || t < next.time) return v;
      } else if (e.kind === 'curve') {
        const k = (t - e.time) / e.duration;
        if (k < 1) {
          const x = Math.max(0, k) * (e.curve.length - 1);
          const i0 = Math.floor(x);
          const i1 = Math.min(e.curve.length - 1, i0 + 1);
          return e.curve[i0] + (e.curve[i1] - e.curve[i0]) * (x - i0);
        }
        v = e.value;
        prevTime = e.time + e.duration;
      }
    }
    return v;
  }
}

class Node {
  constructor(ctx) {
    this.ctx = ctx;
    this.inputs = [];
    this.cacheBlock = -1;
    this.out = new Float32Array(BLOCK);
  }
  connect(dest) { dest.inputs.push(this); return dest; }
  disconnect() {}
  mix(block) {
    const sum = new Float32Array(BLOCK);
    for (const n of this.inputs) {
      const s = n.pull(block);
      for (let i = 0; i < BLOCK; i++) sum[i] += s[i];
    }
    return sum;
  }
  pull(block) {
    if (this.cacheBlock !== block) {
      this.cacheBlock = block;
      this.out = this.process(block);
    }
    return this.out;
  }
  process(block) { return this.mix(block); }
}

class Gain extends Node {
  constructor(ctx) { super(ctx); this.gain = new Param(ctx, 1); }
  process(block) {
    const s = this.mix(block);
    if (silent(s)) return s;
    const sr = this.ctx.sampleRate;
    for (let i = 0; i < BLOCK; i++) s[i] *= this.gain.at((block * BLOCK + i) / sr);
    return s;
  }
}

class Scheduled extends Node {
  constructor(ctx) { super(ctx); this.startTime = Infinity; this.stopTime = Infinity; }
  start(t = 0) { this.startTime = t; }
  stop(t = 0) { this.stopTime = t; }
  live(t) { return t >= this.startTime && t < this.stopTime; }
  /** Whole block outside [start, stop): nothing to compute. */
  idle(block) {
    const sr = this.ctx.sampleRate;
    return (block + 1) * BLOCK / sr <= this.startTime || block * BLOCK / sr >= this.stopTime;
  }
}

class Oscillator extends Scheduled {
  constructor(ctx) {
    super(ctx);
    this.type = 'sine';
    this.frequency = new Param(ctx, 440);
    this.detune = new Param(ctx, 0);
    this.phase = 0;
  }
  process(block) {
    const s = new Float32Array(BLOCK);
    if (this.idle(block)) return s;
    const sr = this.ctx.sampleRate;
    for (let i = 0; i < BLOCK; i++) {
      const t = (block * BLOCK + i) / sr;
      if (!this.live(t)) continue;
      const f = this.frequency.at(t) * Math.pow(2, this.detune.at(t) / 1200);
      const p = this.phase;
      s[i] = this.type === 'square' ? (p < 0.5 ? 1 : -1)
        : this.type === 'sawtooth' ? 2 * p - 1
        : this.type === 'triangle' ? 1 - 4 * Math.abs(p - 0.5)
        : Math.sin(2 * Math.PI * p);
      this.phase = (p + f / sr) % 1;
    }
    return s;
  }
}

class BufferSource extends Scheduled {
  constructor(ctx) { super(ctx); this.buffer = null; }
  process(block) {
    const s = new Float32Array(BLOCK);
    if (!this.buffer || this.idle(block)) return s;
    const data = this.buffer.getChannelData(0);
    const sr = this.ctx.sampleRate;
    const first = Math.round(this.startTime * sr);
    for (let i = 0; i < BLOCK; i++) {
      const frame = block * BLOCK + i;
      if (!this.live(frame / sr)) continue;
      const k = frame - first;
      if (k >= 0 && k < data.length) s[i] = data[k];
    }
    return s;
  }
}

/** RBJ cookbook biquads; like Web Audio, lowpass/highpass Q is a resonance in dB, bandpass Q is linear. */
class Biquad extends Node {
  constructor(ctx) {
    super(ctx);
    this.type = 'lowpass';
    this.frequency = new Param(ctx, 350);
    this.Q = new Param(ctx, 1);
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  process(block) {
    const x = this.mix(block);
    const y = new Float32Array(BLOCK);
    if (silent(x) && Math.abs(this.y1) < 1e-9 && Math.abs(this.y2) < 1e-9) return y;
    const sr = this.ctx.sampleRate;
    let c = null;
    for (let i = 0; i < BLOCK; i++) {
      if (i % 16 === 0) c = this.coefficients((block * BLOCK + i) / sr);
      const out = c.b0 * x[i] + c.b1 * this.x1 + c.b2 * this.x2 - c.a1 * this.y1 - c.a2 * this.y2;
      this.x2 = this.x1; this.x1 = x[i]; this.y2 = this.y1; this.y1 = out;
      y[i] = out;
    }
    return y;
  }
  coefficients(t) {
    const sr = this.ctx.sampleRate;
    const f = Math.min(sr * 0.49, Math.max(10, this.frequency.at(t)));
    const q = this.Q.at(t);
    const w = (2 * Math.PI * f) / sr;
    const cos = Math.cos(w);
    const alpha = this.type === 'bandpass' ? Math.sin(w) / (2 * Math.max(1e-4, q)) : Math.sin(w) / (2 * Math.pow(10, q / 20));
    let b0, b1, b2;
    if (this.type === 'highpass') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; }
    else if (this.type === 'bandpass') { b0 = alpha; b1 = 0; b2 = -alpha; }
    else { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; }
    const a0 = 1 + alpha;
    return {b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0};
  }
}

export class OfflineContext {
  constructor(seconds, sampleRate = 48000) {
    this.sampleRate = sampleRate;
    this.length = Math.ceil(seconds * sampleRate);
    this.destination = new Node(this);
  }
  createGain() { return new Gain(this); }
  createOscillator() { return new Oscillator(this); }
  createBufferSource() { return new BufferSource(this); }
  createBiquadFilter() { return new Biquad(this); }
  createBuffer(channels, length, sampleRate) {
    const data = Array.from({length: channels}, () => new Float32Array(length));
    return {numberOfChannels: channels, length, sampleRate, getChannelData: (c) => data[c]};
  }
  /** Renders the whole graph into one mono channel. */
  render() {
    const out = new Float32Array(this.length);
    for (let b = 0; b * BLOCK < this.length; b++) {
      const s = this.destination.pull(b);
      for (let i = 0; i < BLOCK && b * BLOCK + i < this.length; i++) out[b * BLOCK + i] = s[i];
    }
    return out;
  }
}

/** 16-bit PCM WAV (mono or stereo from the same channel). */
export const encodeWav = (samples, sampleRate, channels = 2) => {
  const bytes = 44 + samples.length * 2 * channels;
  const buf = Buffer.alloc(bytes);
  buf.write('RIFF', 0); buf.writeUInt32LE(bytes - 8, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(channels, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2 * channels, 28); buf.writeUInt16LE(2 * channels, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2 * channels, 40);
  let o = 44;
  for (const v of samples) {
    const s = Math.round(Math.max(-1, Math.min(1, v)) * 32767);
    for (let c = 0; c < channels; c++) { buf.writeInt16LE(s, o); o += 2; }
  }
  return buf;
};
