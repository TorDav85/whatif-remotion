/**
 * Sound-effect kit: the fx-bus primitives of papercut-explainer's library/audio/engine.js
 * (MIT, © 2026 sanat — see THIRD_PARTY.md), ported to the offline graph of offline-audio.mjs.
 * SFX definitions in library.mjs call K.noise / K.tone / K.pop / K.chime / K.R / K.hz, or K.ac and K.fx directly.
 */
export const rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Master (0.9) and fx bus (0.75) of the original engine. */
export const makeBus = (ac) => {
  const master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(ac.destination);
  const fx = ac.createGain();
  fx.gain.value = 0.75;
  fx.connect(master);
  return fx;
};

/** One kit per cue: its own output and random stream, so a cue sounds the same wherever it sits in the sheet. */
export const makeKit = (ac, fx) => {
  const K = {ac, fx, R: rng(4242), hz: (m) => 440 * Math.pow(2, (m - 69) / 12)};

  K.noise = (t, d, {g = 0.3, type = 'bandpass', f = 2000, q = 1, f2 = null, env = 2, seed = 1} = {}) => {
    const sr = ac.sampleRate, n = Math.ceil(sr * d), b = ac.createBuffer(1, n, sr), ch = b.getChannelData(0), r = rng(seed);
    for (let i = 0; i < n; i++) ch[i] = r() * 2 - 1;
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), e = ac.createGain();
    s.buffer = b; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + Math.min(0.015, d * 0.2));
    e.gain.setTargetAtTime(0, t + d * (env === 2 ? 0.3 : 0.8), d * 0.2);
    s.connect(fl); fl.connect(e); e.connect(fx); s.start(t); s.stop(t + d + 0.2);
  };
  K.tone = (f, t, d, {g = 0.2, type = 'sine', f2 = null} = {}) => {
    const o = ac.createOscillator(), e = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0005, t + d);
    o.connect(e); e.connect(fx); o.start(t); o.stop(t + d + 0.05);
  };
  // paper pop = a short low "thup" of card on card + tiny tick
  K.pop = (t, f = 1) => {
    K.noise(t, 0.06, {g: 0.32, type: 'lowpass', f: 900 * f, q: 0.8, seed: Math.round(t * 100)});
    K.tone(220 * f, t, 0.07, {g: 0.18, f2: 120 * f});
    K.tone(1400 * f, t, 0.03, {g: 0.05});
  };
  K.chime = (t) => { K.tone(1046.5, t, 0.9, {g: 0.15}); K.tone(1318.5, t + 0.07, 0.8, {g: 0.12}); K.tone(1568, t + 0.14, 0.7, {g: 0.1}); };
  return K;
};

/** Gentle compressor on the final mix (threshold -14 dB, ratio 3), as in the original master bus. */
export const compress = (x, sampleRate, {threshold = -14, ratio = 3, attack = 0.003, release = 0.25} = {}) => {
  const out = new Float32Array(x.length);
  const ka = Math.exp(-1 / (attack * sampleRate));
  const kr = Math.exp(-1 / (release * sampleRate));
  let env = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    env = a > env ? ka * env + (1 - ka) * a : kr * env + (1 - kr) * a;
    const db = 20 * Math.log10(Math.max(env, 1e-6));
    const over = Math.max(0, db - threshold);
    out[i] = x[i] * Math.pow(10, -(over - over / ratio) / 20);
  }
  return out;
};
