/**
 * Perching bird (crow-sized, ~40 cm, ~1 m wingspan) built from a few primitives, drawn as a hologram.
 * Library conventions: metres, origin between the feet on the perch, front towards −z.
 * Wings fold along the body (`open` 0) or spread (`open` 1); `raise` (rad) lifts a spread wing.
 * The right wing is on the local +x side.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {WireMesh} from '../../shared/holo/WireframeScene';
import type {V3} from '../../shared/holo/geometry';
import {useDispose} from '../../shared/holo/materials';

export type WingPose = {open: number; raise: number};
export type BirdPose = {left: WingPose; right: WingPose; /** head turn, rad (+ = to its left) */ look?: number};
export const BIRD_REST: BirdPose = {left: {open: 0, raise: 0}, right: {open: 0, raise: 0}};

/** Shoulder (right side) and wing length, shared by the mesh and birdWingTip. */
export const SHOULDER: V3 = [0.06, 0.17, -0.03];
export const WING_SPAN = 0.48;
/** Feet in local space (they sit on a perch running along local x). */
export const BIRD_FEET: [V3, V3] = [[-0.032, 0, 0], [0.032, 0, 0]];
const FOLD = -Math.PI / 2 * 0.94;

/** Wing tip in world space for a bird at `position` turned by `rotY` about the vertical. */
export const birdWingTip = (wing: WingPose, side: 'left' | 'right', position: V3, rotY: number): V3 => {
  const p = new THREE.Vector3(WING_SPAN, 0, 0)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), FOLD * (1 - wing.open))
    .applyAxisAngle(new THREE.Vector3(0, 0, 1), wing.raise * wing.open)
    .add(new THREE.Vector3(...SHOULDER));
  if (side === 'left') p.x = -p.x;
  p.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(new THREE.Vector3(...position));
  return [p.x, p.y, p.z];
};

/** A point of the bird (local) in world space. */
export const birdPoint = (local: V3, position: V3, rotY: number): V3 => {
  const p = new THREE.Vector3(...local).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(new THREE.Vector3(...position));
  return [p.x, p.y, p.z];
};

const useBirdGeometries = () =>
  useDispose(
    useMemo(() => {
      const body = new THREE.SphereGeometry(1, 12, 8).scale(0.085, 0.075, 0.16).rotateX(0.18).translate(0, 0.13, 0.01);
      const chest = new THREE.SphereGeometry(1, 10, 6).scale(0.07, 0.07, 0.07).translate(0, 0.15, -0.09);
      const head = new THREE.SphereGeometry(0.055, 10, 7);
      const beak = new THREE.ConeGeometry(0.018, 0.075, 6).rotateX(-Math.PI / 2).translate(0, -0.005, -0.075);
      const tail = new THREE.BoxGeometry(0.075, 0.012, 0.16).rotateX(0.35).translate(0, 0.085, 0.22);
      const leg = new THREE.CylinderGeometry(0.006, 0.007, 0.075, 5).translate(0, 0.0375, 0);
      const toe = new THREE.BoxGeometry(0.008, 0.008, 0.055).translate(0, 0.004, -0.008);
      const shape = new THREE.Shape([
        [0, -0.05], [0.16, -0.065], [0.32, -0.05], [WING_SPAN, 0.0], [0.42, 0.05], [0.36, 0.09], [0.28, 0.11],
        [0.2, 0.12], [0.12, 0.12], [0.04, 0.08],
      ].map(([x, y]) => new THREE.Vector2(x, y)));
      const wing = new THREE.ShapeGeometry(shape).rotateX(Math.PI / 2);
      const all = [body, chest, head, beak, tail, leg, toe, wing];
      return {body, chest, head, beak, tail, leg, toe, wing, dispose: () => all.forEach((g) => g.dispose())};
    }, []),
  );

const Wing: React.FC<{g: THREE.BufferGeometry; pose: WingPose; color: string; fill: number; opacity: number}> = ({g, pose, color, fill, opacity}) => (
  <group position={SHOULDER} rotation={[0, 0, pose.raise * pose.open]}>
    <group rotation={[0, FOLD * (1 - pose.open), 0]}>
      <WireMesh geometry={g} color={color} fill={fill} opacity={opacity} />
    </group>
  </group>
);

export const Bird: React.FC<{
  pose?: BirdPose; color: string; accent?: string; fill?: number; opacity?: number; position?: V3; rotationY?: number; scale?: number;
}> = ({pose = BIRD_REST, color, accent, fill = 0.3, opacity = 1, position, rotationY = 0, scale = 1}) => {
  const g = useBirdGeometries();
  const a = accent ?? color;
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <WireMesh geometry={g.body} color={color} fill={fill} opacity={opacity} />
      <WireMesh geometry={g.chest} color={color} fill={fill * 0.6} opacity={opacity * 0.6} />
      <group position={[0, 0.225, -0.13]} rotation={[0, pose.look ?? 0, 0]}>
        <WireMesh geometry={g.head} color={color} fill={fill} opacity={opacity} />
        <WireMesh geometry={g.beak} color={a} fill={fill} opacity={opacity} />
      </group>
      <WireMesh geometry={g.tail} color={color} fill={fill} opacity={opacity} />
      {BIRD_FEET.map((f, i) => (
        <group key={i} position={f}>
          <WireMesh geometry={g.leg} color={a} fill={fill} opacity={opacity} />
          <WireMesh geometry={g.toe} color={a} fill={fill} opacity={opacity} />
        </group>
      ))}
      <Wing g={g.wing} pose={pose.right} color={color} fill={fill} opacity={opacity} />
      <group scale={[-1, 1, 1]}>
        <Wing g={g.wing} pose={pose.left} color={color} fill={fill} opacity={opacity} />
      </group>
    </group>
  );
};
