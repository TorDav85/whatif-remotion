import tl from './timeline.json';
import {makeFall, schwarzschildRadius, accelAt, G0, SUN_MASS, FallState} from './physics';

export const T = tl;
export const FPS = tl.fps;
export const DURATION_FRAMES = Math.round(tl.duration * tl.fps);

const fall = makeFall(tl.hole.massKg, tl.hole.startDistanceM);

/** Temps vidéo (s) → état physique du trou noir (distance, vitesse). */
export const holeStateAt = (t: number): FallState & {sinceAppear: number} => {
  const since = Math.max(0, t - tl.hole.appearsAt);
  const realT = since / tl.hole.slowFactor; // la vidéo est ralentie
  return {...fall.at(realT), sinceAppear: since};
};

export const holeDiameter = 2 * schwarzschildRadius(tl.hole.massKg);
export const sunHoleDiameter = 2 * schwarzschildRadius(SUN_MASS);
export const pullInG = (r: number) => accelAt(tl.hole.massKg, r) / G0;

// ---------- Interpolation de keyframes ----------
type KF = {t: number} & Record<string, any>;

export const sampleNum = (keys: KF[], t: number, field: string): number => {
  if (t <= keys[0].t) return keys[0][field];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) {
      const f = (t - a.t) / (b.t - a.t);
      const e = f * f * (3 - 2 * f); // smoothstep
      return a[field] + (b[field] - a[field]) * e;
    }
  }
  return keys[keys.length - 1][field];
};

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (a: number, b: number, x: number) => {
  const f = clamp01((x - a) / (b - a));
  return f * f * (3 - 2 * f);
};

/** RNG déterministe : mêmes valeurs à chaque rendu. */
export const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
