import tl from './nature.json';
import {sampleNum} from '../world';
import {fmtInt} from '../physics';

export const N = tl;
export const FPS = tl.fps;
export const DURATION_FRAMES = Math.round(tl.duration * tl.fps);

export const world = (t: number, field: string) => sampleNum(tl.world as any, t, field);

/** Temps vidéo (s) → jours sans humains. Interpolé en échelle log : le compteur s'emballe puis se pose sur chaque palier. */
export const elapsedDays = (t: number) => {
  const keys = tl.days.map((k) => ({t: k.t, L: Math.log10(1 + k.d)}));
  return Math.pow(10, sampleNum(keys as any, t, 'L')) - 1;
};

export const elapsedYears = (t: number) => elapsedDays(t) / 365.25;

export const fmtElapsed = (d: number) => {
  if (d < 1.5) {
    const h = Math.max(1, Math.round(d * 24));
    return h === 1 ? '1 heure' : `${fmtInt(h)} heures`;
  }
  if (d < 60) return `${fmtInt(d)} jours`;
  if (d < 340) return `${fmtInt(d / 30.44)} mois`;
  const y = Math.round(d / 365.25);
  return y <= 1 ? '1 an' : `${fmtInt(y)} ans`;
};
