import * as THREE from 'three';
import {smooth} from '../../core/animation';

/**
 * Shot list shared by the 3D videos: each shot starts at `from` (s) and gives the camera for
 * time t and its eased progress k (0 → 1) until the next shot.
 */
export type ShotView = {pos: THREE.Vector3; target: THREE.Vector3; fov: number};
export type Shot<V = ShotView> = {from: number; view: (t: number, k: number) => V};

/** Camera at time t; the last shot runs until `duration`. */
export const shotAt = <V>(shots: Shot<V>[], t: number, duration: number): V => {
  let i = shots.length - 1;
  while (i > 0 && t < shots[i].from) i--;
  const end = i + 1 < shots.length ? shots[i + 1].from : duration;
  return shots[i].view(t, smooth(shots[i].from, end, t));
};

/** Cut times (every shot start but the first). */
export const cutsOf = <V>(shots: Shot<V>[]) => shots.slice(1).map((s) => s.from);
