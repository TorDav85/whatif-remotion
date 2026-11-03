import tl from './timeline.json';
import {makeFall, schwarzschildRadius, accelAt, G0, SUN_MASS, FallState} from '../../core/physics';

export const T = tl;
export const FPS = tl.fps;
export const DURATION_FRAMES = Math.round(tl.duration * tl.fps);

export const createHoleModel = (hole: typeof tl.hole) => {
  const fall = makeFall(hole.massKg, hole.startDistanceM);
  return {
    holeStateAt: (t: number): FallState & {sinceAppear: number} => {
      const since = Math.max(0, t - hole.appearsAt);
      return {...fall.at(since / hole.slowFactor), sinceAppear: since};
    },
    holeDiameter: 2 * schwarzschildRadius(hole.massKg),
    pullInG: (r: number) => accelAt(hole.massKg, r) / G0,
  };
};
const model = createHoleModel(tl.hole);

/** Temps vidéo (s) → état physique du trou noir (distance, vitesse). */
export const holeStateAt = model.holeStateAt;

export const holeDiameter = model.holeDiameter;
export const sunHoleDiameter = 2 * schwarzschildRadius(SUN_MASS);
export const pullInG = model.pullInG;

export {sampleNum, clamp01, smooth, rng} from '../../core/animation';
