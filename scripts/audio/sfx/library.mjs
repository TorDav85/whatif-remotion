/**
 * Sound-effect library: 38 effects taken from papercut-explainer library/audio/sfx
 * (MIT, © 2026 sanat, commit ff8223a — see THIRD_PARTY.md). Each line `// @sfx name | tags | seconds | description`
 * documents the effect below it; the functions are unchanged and run on the offline graph of offline-audio.mjs.
 */
export const SFX = {};

// @sfx birds | nature, ambience | 1.2 | soft garden birds: 4 short sine chirps with fast pitch glides, quiet, sparse | papercut-explainer
SFX['birds'] = (K, t) => {
  const chirp = (d, f, g) => { K.tone(f, t + d, .055, {g, f2: f * 1.5}); K.tone(f * 1.5, t + d + .055, .05, {g: g * .8, f2: f * 1.15}); };
  chirp(0, 3000, .45); chirp(.14, 3400, .4);
  chirp(.62, 2600, .34);
  chirp(1.0, 3200, .3);
};

// @sfx bubbles | water | 0.6 | a run of bubbles | papercut-explainer
SFX['bubbles'] = (K, t) => { for (let k = 0; k < 9; k++) K.tone(500 + K.R() * 900, t + k * .06 + K.R() * .03, .07, {g: .08, f2: 1400 + K.R() * 900}); };

// @sfx buzz | negative | 0.35 | low detuned saw buzz (bad, error) | papercut-explainer
SFX['buzz'] = (K, t) => { K.tone(110, t, .35, {g: .1, type: 'sawtooth'}); K.tone(116, t, .35, {g: .08, type: 'sawtooth'}); };

// @sfx chime | positive | 0.9 | three-note major chime (resolution) | papercut-explainer
SFX['chime'] = (K, t) => K.chime(t);

// @sfx clink | glass | 0.6 | glass clink (three partials) | papercut-explainer
SFX['clink'] = (K, t) => { [2380, 3710, 5230].forEach((f, k) => K.tone(f, t + k * .004, .6 - k * .12, {g: .08})); };

// @sfx count | ui, numbers | 1.0 | fast ticking counter (number counting up) | papercut-explainer
SFX['count'] = (K, t) => { for (let k = 0; k < 14; k++) K.tone(1700 + k * 40, t + k * .07, .025, {g: .07 * (1 - k / 20), type: 'square'}); };

// @sfx crack | impact, glass | 0.2 | glass crack, three snaps | papercut-explainer
SFX['crack'] = (K, t) => { K.noise(t, .05, {g: .3, f: 3500, q: 2, seed: 270}); K.noise(t + .06, .05, {g: .22, f: 2800, q: 2, seed: 271}); K.noise(t + .11, .08, {g: .18, f: 2200, q: 2, seed: 272}); };

// @sfx crackle | fire, ambience | 0.6 | campfire crackle + low rumble | papercut-explainer
SFX['crackle'] = (K, t) => { K.noise(t, .6, {g: .06, type: 'lowpass', f: 400, env: 1, seed: 199}); for (let k = 0; k < 10; k++) K.noise(t + k * .045 + K.R() * .02, .02, {g: .1 + K.R() * .08, f: 2500 + K.R() * 2000, q: 3, seed: 200 + k}); };

// @sfx cut | transition | 0.14 | soft paper swish on a hard cut | papercut-explainer
SFX['cut'] = (K, t) => K.noise(t, .14, {g: .08, f: 1600, q: .7, seed: 3});

// @sfx ding | positive, ui | 1.3 | two-note ding (notification / correct) | papercut-explainer
SFX['ding'] = (K, t) => { K.tone(1318.5, t, 1.1, {g: .14}); K.tone(1046.5, t + .22, 1.2, {g: .12}); };

// @sfx door | impact, building | 0.27 | door slam + latch click | papercut-explainer
SFX['door'] = (K, t) => { K.tone(120, t, .18, {g: .35, f2: 70}); K.noise(t, .08, {g: .2, type: 'lowpass', f: 900, seed: 240}); K.tone(2200, t + .09, .025, {g: .08, type: 'square'}); };

// @sfx drip | water | 0.15 | water drip | papercut-explainer
SFX['drip'] = (K, t) => { K.tone(1200, t, .07, {g: .16, f2: 2400}); K.tone(600, t + .03, .12, {g: .06, f2: 300}); };

// @sfx elevator | ambience | 0.9 | low elevator rumble | papercut-explainer
SFX['elevator'] = (K, t) => { K.noise(t, .9, {g: .07, type: 'lowpass', f: 300, q: .7, env: 1, seed: 190}); };

// @sfx end-chime | positive, ending | 1.4 | warm two-note resolving chime for the follow card (G to C), softer than `chime` | papercut-explainer
SFX['end-chime'] = (K, t) => {
  K.tone(783.99, t, .8, {g: .25}); K.tone(1568, t, .35, {g: .03});
  K.tone(1046.5, t + .22, 1.5, {g: .29}); K.tone(2093, t + .22, .5, {g: .03}); K.tone(523.25, t + .22, 1.3, {g: .06});
};

// @sfx fire-flare | fire | 0.7 | flames flaring: soft rising noisy whump + crackle burst that decays | papercut-explainer
SFX['fire-flare'] = (K, t) => {
  const ac = K.ac, sr = ac.sampleRate;
  const swell = (d, att, g, type, f, f2, q, seed) => { // noise with a RISING envelope (K.noise attacks too fast)
    const n = Math.ceil(sr * (d + .1)), b = ac.createBuffer(1, n, sr), c = b.getChannelData(0); let s = seed;
    for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; c[i] = s / 2147483648 - 1; }
    const src = ac.createBufferSource(), fl = ac.createBiquadFilter(), e = ac.createGain(); src.buffer = b; fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(f2, t + att);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + att); e.gain.setTargetAtTime(0, t + att, (d - att) * .3);
    src.connect(fl); fl.connect(e); e.connect(K.fx); src.start(t); src.stop(t + d + .1); };
  swell(.7, .2, .9, 'lowpass', 260, 1100, .7, 11);
  swell(.6, .22, .22, 'bandpass', 1500, 3000, .8, 12);
  K.tone(70, t, .35, {g: .3, f2: 48});
  for (let k = 0; k < 12; k++) K.noise(t + .12 + k * .035 + (k * 7 % 5) * .008, .02, {g: .16 - k * .008, f: 2200 + (k * 613 % 2400), q: 3, seed: 920 + k});
};

// @sfx fizz | water | 0.9 | fizz / carbonation hiss | papercut-explainer
SFX['fizz'] = (K, t) => K.noise(t, .9, {g: .16, type: 'highpass', f: 5000, f2: 9000, q: .5, env: 1, seed: 260});

// @sfx glint | positive, magic | 0.4 | three very high glints (shine, reveal) | papercut-explainer
SFX['glint'] = (K, t) => [3136, 4186, 5274].forEach((f, k) => K.tone(f, t + k * .04, .35, {g: .045}));

// @sfx gong | impact, tone | 1.2 | small round paper-gong: soft mallet hit, inharmonic partials ringing down (round start, not epic) | papercut-explainer
SFX['gong'] = (K, t) => {
  K.noise(t, .03, {g: .3, type: 'lowpass', f: 900, env: 1, seed: 1121});                       // mallet
  [[196, .26, 1.1], [293.7, .16, .95], [412, .11, .8], [590, .07, .6], [830, .04, .45]].forEach(([f, g, d]) => K.tone(f, t, d, {g, f2: f * .985}));
};

// @sfx hit | impact, hook | 0.6 | deep boom for the first frame / hook | papercut-explainer
SFX['hit'] = (K, t) => { K.tone(55, t, .6, {g: .5, f2: 38}); K.noise(t, .3, {g: .18, type: 'lowpass', f: 1200, seed: 7}); };

// @sfx monitor-beeps | tech, tension | 1.6 | heart-rate monitor that speeds up: clean 1 kHz sine beeps (60 ms) at accelerating intervals, 0.5 s down to 0.15 s | papercut-explainer
SFX['monitor-beeps'] = (K, t) => {
  const ac = K.ac;
  [0, .5, .83, 1.07, 1.25, 1.4, 1.55].forEach(d => {
    const o = ac.createOscillator(), e = ac.createGain(), s = t + d; o.type = 'sine'; o.frequency.value = 1000;
    e.gain.setValueAtTime(0, s); e.gain.linearRampToValueAtTime(.45, s + .004); e.gain.setValueAtTime(.45, s + .052); e.gain.linearRampToValueAtTime(0, s + .06);
    o.connect(e); e.connect(K.fx); o.start(s); o.stop(s + .07); });
};

// @sfx pop | paper, ui | 0.07 | paper card pops in: low thup + tick (the workhorse) | papercut-explainer
SFX['pop'] = (K, t) => K.pop(t);

// @sfx pop3 | paper | 0.35 | three rising pops (three items appear) | papercut-explainer
SFX['pop3'] = (K, t) => { K.pop(t, .9); K.pop(t + .13, 1); K.pop(t + .26, 1.12); };

// @sfx radio | ui, signal | 0.25 | radio chirp: static + two beeps | papercut-explainer
SFX['radio'] = (K, t) => { K.noise(t, .25, {g: .1, f: 1800, q: 4, seed: 51}); K.tone(880, t + .05, .08, {g: .06, type: 'square'}); K.tone(1175, t + .15, .08, {g: .06, type: 'square'}); };

// @sfx scratch | comic, motion | 0.5 | record scratch: three scrubbed vinyl strokes, "wik-wik-wiiip" (freeze-frame meme beat) | papercut-explainer
SFX['scratch'] = (K, t) => {
  const stroke = (dt, d, a, b, seed) => { K.tone(a, t + dt, d, {g: .16, type: 'sawtooth', f2: b}); K.noise(t + dt, d, {g: .24, f: a * 2.4, f2: b * 2.4, q: 1.6, env: 1, seed}); };
  stroke(0, .14, 1000, 240, 301);
  stroke(.13, .1, 260, 1150, 302);
  stroke(.22, .22, 1300, 130, 303);
  K.tone(70, t + .4, .1, {g: .22, f2: 45});   // needle thump as it stops
};

// @sfx sizzle | fire | 0.7 | hot sizzle hiss | papercut-explainer
SFX['sizzle'] = (K, t) => K.noise(t, .7, {g: .12, type: 'highpass', f: 5000, q: .7, env: 1, seed: 210});

// @sfx soft-swell | pad, emotional | 2 | warm low pad swell, 1 s in and 1 s out, for the emotional turn | papercut-explainer
SFX['soft-swell'] = (K, t) => { const {ac, hz, fx} = K, lp = ac.createBiquadFilter(), e = ac.createGain(), N = 128, sw = a => { const c = new Float32Array(N); for (let i = 0; i < N; i++) c[i] = a * Math.pow(Math.sin(Math.PI * i / (N - 1)), 2); return c; };
  lp.type = 'lowpass'; lp.Q.value = .3; lp.connect(e); e.connect(fx);
  e.gain.setValueAtTime(0, t); e.gain.setValueCurveAtTime(sw(.075), t, 2); lp.frequency.setValueAtTime(320, t); lp.frequency.setValueCurveAtTime(Float32Array.from(sw(1), v => 320 + 480 * v), t, 2);
  [41, 48, 53, 57, 60].forEach((m, i) => [-5, 6].forEach(d => { const o = ac.createOscillator(), og = ac.createGain(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = hz(m); o.detune.value = d; og.gain.value = i < 2 ? 1 : .6; o.connect(og); og.connect(lp); o.start(t); o.stop(t + 2.1); })); };

// @sfx sparkle | positive, magic | 0.45 | four high glints (something good appears) | papercut-explainer
SFX['sparkle'] = (K, t) => [2093, 2637, 3136, 4186].forEach((f, k) => K.tone(f, t + k * .05, .3, {g: .05}));

// @sfx splash | water | 0.7 | splash: wash + droplets | papercut-explainer
SFX['splash'] = (K, t) => { K.noise(t, .6, {g: .34, type: 'lowpass', f: 4000, f2: 500, q: .6, seed: 201}); K.noise(t + .02, .35, {g: .14, type: 'highpass', f: 3000, q: .5, seed: 202}); for (let k = 0; k < 6; k++) K.tone(500 + K.R() * 700, t + .2 + k * .07, .07, {g: .06, f2: 1600}); };

// @sfx stamp | impact, paper | 0.3 | rubber-stamp slam: low thump + paper hit | papercut-explainer
SFX['stamp'] = (K, t) => { K.tone(80, t, .3, {g: .55, f2: 42}); K.noise(t, .16, {g: .4, type: 'lowpass', f: 700, q: .7, seed: 41}); };

// @sfx thud | impact | 0.25 | dull heavy thud (something lands) | papercut-explainer
SFX['thud'] = (K, t) => { K.tone(95, t, .25, {g: .45, f2: 55}); K.noise(t, .1, {g: .2, type: 'lowpass', f: 500, seed: 91}); };

// @sfx tick | ui | 0.14 | two square ticks (clock / checkbox) | papercut-explainer
SFX['tick'] = (K, t) => { K.tone(2400, t, .035, {g: .12, type: 'square'}); K.tone(1800, t + .1, .035, {g: .08, type: 'square'}); };

// @sfx unplug | tech, negative | 0.55 | plug pulled + power-down tone | papercut-explainer
SFX['unplug'] = (K, t) => { K.tone(420, t, .05, {g: .16, type: 'square', f2: 180}); K.tone(600, t + .05, .5, {g: .1, f2: 90}); };

// @sfx vhs-blip | ui, tech | 0.2 | VHS/OSD tag appearing: square-wave blip + two lines of tape noise | papercut-explainer
SFX['vhs-blip'] = (K, t) => {
  K.tone(1320, t, .06, {g: .24, type: 'square'});
  K.noise(t, .03, {g: .4, type: 'bandpass', f: 4500, q: .8, env: 1, seed: 1011});
  K.noise(t + .13, .045, {g: .36, type: 'bandpass', f: 3200, q: .8, env: 1, seed: 1012});
  K.tone(990, t + .13, .06, {g: .13, type: 'square'});
};

// @sfx whip-crack | impact, comic, paper | 0.22 | dry cartoon whip crack: sharp broadband paper-snap, fast pitch-dropping tail, tiny paper rattle (no air sweep) | papercut-explainer
SFX['whip-crack'] = (K, t) => {
  K.noise(t, .035, {g: .6, type: 'highpass', f: 1200, q: .7, env: 1, seed: 901});           // the snap: broadband transient
  K.noise(t, .05, {g: .35, type: 'bandpass', f: 4200, f2: 2200, q: .8, seed: 902});
  K.tone(2600, t, .17, {g: .26, type: 'triangle', f2: 280});                                  // fast pitch-dropping tail
  K.tone(170, t, .08, {g: .3, f2: 80});                                                       // tiny body
  [.085, .125, .165].forEach((d, k) => K.noise(t + d, .035, {g: .14 - k * .03, f: 3600 - k * 500, q: 2.2, seed: 910 + k})); // paper rattle
};

// @sfx whip | transition | 0.3 | fast whip-pan swoosh (into the CTA) | papercut-explainer
SFX['whip'] = (K, t) => K.noise(t, .3, {g: .32, f: 600, f2: 5000, q: .7, env: 1, seed: 161});

// @sfx whoosh | motion | 0.55 | rising air whoosh: entrances, camera moves, ignition | papercut-explainer
SFX['whoosh'] = (K, t) => K.noise(t, .55, {g: .3, f: 350, f2: 3000, q: .8, env: 1, seed: 21});

// @sfx x | ui, negative | 0.18 | wrong / cross-out buzz | papercut-explainer
SFX['x'] = (K, t) => { K.noise(t, .1, {g: .3, f: 2600, q: 1.2, f2: 1200, seed: 11}); K.tone(140, t, .18, {g: .14, type: 'square', f2: 70}); };

// @sfx zoom | motion | 0.7 | big rising zoom sweep + saw | papercut-explainer
SFX['zoom'] = (K, t) => { K.noise(t, .7, {g: .25, f: 300, f2: 4200, q: 1.3, env: 1, seed: 120}); K.tone(150, t, .6, {g: .07, type: 'sawtooth', f2: 600}); };

/** Name, tags, length and description of every effect (from the @sfx lines above). */
export const SFX_INFO = [ { "name": "birds", "tags": "nature, ambience", "seconds": 1.2, "description": "soft garden birds: 4 short sine chirps with fast pitch glides, quiet, sparse" }, { "name": "bubbles", "tags": "water", "seconds": 0.6, "description": "a run of bubbles" }, { "name": "buzz", "tags": "negative", "seconds": 0.35, "description": "low detuned saw buzz (bad, error)" }, { "name": "chime", "tags": "positive", "seconds": 0.9, "description": "three-note major chime (resolution)" }, { "name": "clink", "tags": "glass", "seconds": 0.6, "description": "glass clink (three partials)" }, { "name": "count", "tags": "ui, numbers", "seconds": 1, "description": "fast ticking counter (number counting up)" }, { "name": "crack", "tags": "impact, glass", "seconds": 0.2, "description": "glass crack, three snaps" }, { "name": "crackle", "tags": "fire, ambience", "seconds": 0.6, "description": "campfire crackle + low rumble" }, { "name": "cut", "tags": "transition", "seconds": 0.14, "description": "soft paper swish on a hard cut" }, { "name": "ding", "tags": "positive, ui", "seconds": 1.3, "description": "two-note ding (notification / correct)" }, { "name": "door", "tags": "impact, building", "seconds": 0.27, "description": "door slam + latch click" }, { "name": "drip", "tags": "water", "seconds": 0.15, "description": "water drip" }, { "name": "elevator", "tags": "ambience", "seconds": 0.9, "description": "low elevator rumble" }, { "name": "end-chime", "tags": "positive, ending", "seconds": 1.4, "description": "warm two-note resolving chime for the follow card (G to C), softer than `chime`" }, { "name": "fire-flare", "tags": "fire", "seconds": 0.7, "description": "flames flaring: soft rising noisy whump + crackle burst that decays" }, { "name": "fizz", "tags": "water", "seconds": 0.9, "description": "fizz / carbonation hiss" }, { "name": "glint", "tags": "positive, magic", "seconds": 0.4, "description": "three very high glints (shine, reveal)" }, { "name": "gong", "tags": "impact, tone", "seconds": 1.2, "description": "small round paper-gong: soft mallet hit, inharmonic partials ringing down (round start, not epic)" }, { "name": "hit", "tags": "impact, hook", "seconds": 0.6, "description": "deep boom for the first frame / hook" }, { "name": "monitor-beeps", "tags": "tech, tension", "seconds": 1.6, "description": "heart-rate monitor that speeds up: clean 1 kHz sine beeps (60 ms) at accelerating intervals, 0.5 s down to 0.15 s" }, { "name": "pop", "tags": "paper, ui", "seconds": 0.07, "description": "paper card pops in: low thup + tick (the workhorse)" }, { "name": "pop3", "tags": "paper", "seconds": 0.35, "description": "three rising pops (three items appear)" }, { "name": "radio", "tags": "ui, signal", "seconds": 0.25, "description": "radio chirp: static + two beeps" }, { "name": "scratch", "tags": "comic, motion", "seconds": 0.5, "description": "record scratch: three scrubbed vinyl strokes, \"wik-wik-wiiip\" (freeze-frame meme beat)" }, { "name": "sizzle", "tags": "fire", "seconds": 0.7, "description": "hot sizzle hiss" }, { "name": "soft-swell", "tags": "pad, emotional", "seconds": 2, "description": "warm low pad swell, 1 s in and 1 s out, for the emotional turn" }, { "name": "sparkle", "tags": "positive, magic", "seconds": 0.45, "description": "four high glints (something good appears)" }, { "name": "splash", "tags": "water", "seconds": 0.7, "description": "splash: wash + droplets" }, { "name": "stamp", "tags": "impact, paper", "seconds": 0.3, "description": "rubber-stamp slam: low thump + paper hit" }, { "name": "thud", "tags": "impact", "seconds": 0.25, "description": "dull heavy thud (something lands)" }, { "name": "tick", "tags": "ui", "seconds": 0.14, "description": "two square ticks (clock / checkbox)" }, { "name": "unplug", "tags": "tech, negative", "seconds": 0.55, "description": "plug pulled + power-down tone" }, { "name": "vhs-blip", "tags": "ui, tech", "seconds": 0.2, "description": "VHS/OSD tag appearing: square-wave blip + two lines of tape noise" }, { "name": "whip-crack", "tags": "impact, comic, paper", "seconds": 0.22, "description": "dry cartoon whip crack: sharp broadband paper-snap, fast pitch-dropping tail, tiny paper rattle (no air sweep)" }, { "name": "whip", "tags": "transition", "seconds": 0.3, "description": "fast whip-pan swoosh (into the CTA)" }, { "name": "whoosh", "tags": "motion", "seconds": 0.55, "description": "rising air whoosh: entrances, camera moves, ignition" }, { "name": "x", "tags": "ui, negative", "seconds": 0.18, "description": "wrong / cross-out buzz" }, { "name": "zoom", "tags": "motion", "seconds": 0.7, "description": "big rising zoom sweep + saw" } ];
