/** Render a cue sheet of sound effects to mono samples (used by render.mjs and the tests). */
import {OfflineContext} from './offline-audio.mjs';
import {compress, makeBus, makeKit} from './kit.mjs';
import {SFX} from './library.mjs';

export const SAMPLE_RATE = 48000;

/** Mono samples of a cue sheet; an unknown effect name is an error listing the valid ones. */
export const renderCues = ({duration, cues}) => {
  for (const c of cues) {
    if (!SFX[c.sfx]) throw new Error(`Effet inconnu « ${c.sfx} ». Effets disponibles : ${Object.keys(SFX).join(', ')}.`);
  }
  const ac = new OfflineContext(duration, SAMPLE_RATE);
  const bus = makeBus(ac);
  for (const c of cues) {
    const out = ac.createGain();
    out.gain.value = c.gain ?? 1;
    out.connect(bus);
    SFX[c.sfx](makeKit(ac, out), c.t);
  }
  return compress(ac.render(), SAMPLE_RATE);
};
