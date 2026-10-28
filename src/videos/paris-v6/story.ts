import * as THREE from 'three';
import {smooth} from '../../core/animation';
import P from './scenario.json';

export const heroAt = (t: number) => {
  const k = smooth(P.hero.absorbFrom, P.hero.absorbTo, t);
  const z = P.hero.z - Math.min(t, P.hero.driveUntil) * 3;
  const offset = new THREE.Vector3(P.hero.x, 0, z - P.hole.z)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), k * k * 3.8)
    .multiplyScalar(Math.pow(1 - k, 1.25));
  const pos = new THREE.Vector3(offset.x, P.hole.height * k + Math.sin(k * Math.PI) * 6, P.hole.z + offset.z);
  return {pos, k, size: 1.3 * (1 - smooth(0.72, 1, k))};
};
