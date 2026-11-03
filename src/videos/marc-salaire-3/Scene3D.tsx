import React, {useLayoutEffect} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {clamp01, smooth} from '../../core/animation';
import {Block, Cyl} from '../../assets/kit';
import {Marc} from '../../shared/characters/Marc';
import {BossChair, ScreenRoom, useScreenTextures} from '../marc-salaire-2/Scene3D';
import {Oven} from '../marc-four/Scene3D';

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, k: number) => a + (b - a) * clamp01(k);
const mixV = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];

// ---------- Story clock (s). Mirrored in scripts/audio/marc-salaire-3.py ----------
export const CHAIR: [number, number] = [5.4, 7.6];
export const REVEAL = 7.6;
export const CURTAIN: [number, number] = [47.6, 49.4];
export const OVEN_DOOR = 53.6;
export const RUN: [number, number] = [58.6, 61.6];
export const DURATION = 79;

const MODEL_H = 2.06;
const S = 1.8 / MODEL_H;
const JULIEN = {shirt: '#16181d', pants: '#16181d', skin: '#d9a27c', hair: '#1e1712'};
const MARC_SPOT: V3 = [0, 0, -1.3];
const OVEN_AT: V3 = [2.3, 0, 0.9];

/** Pizza on a wooden peel, in Julien's hands. */
const Pizza: React.FC = () => (
  <group position={[0.05, 0.78, -0.42]} rotation={[0.25, 0, 0]}>
    <Block p={[0, -0.02, 0.1]} s={[0.36, 0.015, 0.5]} c="#b88a55" />
    <Cyl p={[0, 0, 0]} rad={0.17} h={0.025} c="#e8b04a" />
    <Cyl p={[0, 0.014, 0]} rad={0.15} h={0.01} c="#c8372a" />
    {[[0.06, 0.03], [-0.07, 0.05], [0.02, -0.08], [-0.05, -0.04], [0.09, -0.04]].map(([x, z], i) => (
      <Cyl key={i} p={[x, 0.021, z]} rad={0.025} h={0.008} c={i % 2 ? '#f4e6c8' : '#7a2a1e'} />
    ))}
  </group>
);

/** Red curtain in two halves, sliding apart along z in front of the oven. */
const Curtain: React.FC<{open: number}> = ({open}) => (
  <group position={[OVEN_AT[0] - 0.1, 0, OVEN_AT[2] + 0.7]}>
    {[-1, 1].map((s) => (
      <group key={s} position={[0, 0, s * (0.55 + 1.1 * open)]}>
        {Array.from({length: 5}, (_, i) => (
          <Block key={i} p={[0.03 * (i % 2), 1.5, (i - 2) * 0.22]} s={[0.06, 3.0, 0.24]} c={i % 2 ? '#a3141e' : '#c01e28'} />
        ))}
      </group>
    ))}
    <Block p={[0, 3.05, 0]} s={[0.12, 0.1, 3.6]} c="#c9a45a" metal />
  </group>
);

// ---------- Marc ----------
type Pose = {pos: V3; yaw: number; walk: number; cold: number; smile: number; speed: number; right?: V3; left?: V3};
const marcAt = (t: number): Pose => {
  if (t < REVEAL) return {pos: MARC_SPOT, yaw: Math.PI, walk: 0, cold: 0.6, smile: 0, speed: 1};
  if (t < 41.0) return {pos: MARC_SPOT, yaw: Math.PI, walk: 0, cold: t < 11 ? 0.8 : 0, smile: 0, speed: 1};
  if (t < RUN[0]) {
    // Asks about the mission (palms up), then frozen by the joke.
    const ask = smooth(41.6, 42.2, t) * (1 - smooth(45.4, 46.0, t));
    return {pos: MARC_SPOT, yaw: Math.PI, walk: 0, cold: t > 53.6 ? 0.9 : 0, smile: 0, speed: 1,
      right: mixV([0.3, 0.94, 0], [0.42, 1.2, -0.3], ask), left: mixV([-0.3, 0.94, 0], [-0.42, 1.2, -0.3], ask)};
  }
  // Runs away toward the camera as fast as he can.
  const turn = smooth(RUN[0], RUN[0] + 0.3, t);
  const k = smooth(RUN[0] + 0.3, RUN[1], t);
  return {pos: mixV(MARC_SPOT, [-0.6, 0, -9], k), yaw: mix(Math.PI, 0, turn), walk: 1, cold: 0, smile: 0, speed: 2.6,
    right: [0.45, 1.5, -0.2], left: [-0.45, 1.5, -0.2]};
};

// ---------- Camera ----------
const Rig: React.FC<{pos: THREE.Vector3; target: THREE.Vector3; fov: number}> = ({pos, target, fov}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.copy(pos);
    camera.up.set(0, 1, 0);
    camera.fov = fov;
    camera.near = 0.02;
    camera.far = 100;
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  });
  return null;
};

type View = {pos: THREE.Vector3; target: THREE.Vector3; fov: number};
type Shot = {from: number; view: (t: number, k: number) => View};
export const SHOTS: Shot[] = [
  // Recap: the chair, Marc from behind.
  {from: 0, view: (t, k) => ({pos: V(mix(0.6, 0.4, k), 1.6, mix(-4.0, -3.6, k)), target: V(0, 1.3, 1.6), fov: 50})},
  // The chair turns: Julien!
  {from: 5.2, view: (t, k) => ({pos: V(mix(0.25, 0.15, k), 1.35, mix(-0.1, 0.3, k)), target: V(0, 1.3, 1.75), fov: 50})},
  // Yes, Julien: wider, both of them.
  {from: 10.4, view: (t, k) => ({pos: V(mix(-1.6, -1.4, k), 1.6, mix(-2.4, -2.1, k)), target: V(0, 1.2, 0.6), fov: 50})},
  // The lottery: Julien, smug.
  {from: 15.2, view: (t, k) => ({pos: V(mix(0.6, 0.45, k), 1.4, mix(0.15, 0.35, k)), target: V(0, 1.3, 1.75), fov: 50})},
  // The payments: over Julien's shoulder at Marc.
  {from: 21.8, view: (t, k) => ({pos: V(mix(0.5, 0.4, k), 1.75, mix(2.6, 2.4, k)), target: V(0, 1.4, -1.3), fov: 50})},
  // The labels: Julien again.
  {from: 28.0, view: (t, k) => ({pos: V(mix(-0.5, -0.35, k), 1.4, mix(0.2, 0.4, k)), target: V(0, 1.3, 1.75), fov: 50})},
  // The screens: pan over the wall.
  {from: 35.0, view: (t, k) => ({pos: V(mix(-2.0, 1.5, k), 2.0, 0.4), target: V(mix(-1.5, 1.8, k), 1.9, 3.2), fov: 50})},
  // Marc asks about his mission.
  {from: 41.0, view: (t, k) => ({pos: V(0.25, 1.62, mix(0.3, 0.1, k)), target: V(0, 1.55, -1.3), fov: 50})},
  // The curtain opens on the pizza oven.
  {from: 46.8, view: (t, k) => ({pos: V(mix(-1.2, -0.9, k), 1.7, mix(-2.6, -2.3, k)), target: V(1.6, 1.3, 1.0), fov: 55})},
  // "Get in to check the cooking?"
  {from: 52.8, view: (t, k) => ({pos: V(mix(0.55, 0.4, k), 1.4, mix(0.2, 0.4, k)), target: V(0, 1.25, 1.75), fov: 50})},
  // Marc runs off.
  {from: RUN[0], view: (t, k) => ({pos: V(1.4, 1.3, -4.2), target: V(mix(0, -0.5, k), 1.1, mix(-1.4, -6, k)), fov: 55})},
  // Moral: Julien alone with his pizza.
  {from: 63.6, view: (t, k) => ({pos: V(mix(-0.9, -0.6, k), 1.55, mix(-1.2, -0.8, k)), target: V(0.6, 1.2, 1.4), fov: 50})},
];
export const CUTS = SHOTS.slice(1).map((s) => s.from);

const shotAt = (t: number): View => {
  let i = SHOTS.length - 1;
  while (i > 0 && t < SHOTS[i].from) i--;
  const end = i + 1 < SHOTS.length ? SHOTS[i + 1].from : DURATION;
  return SHOTS[i].view(t, smooth(SHOTS[i].from, end, t));
};

// ---------- Scene ----------
export const Scene3D: React.FC<{t: number}> = ({t}) => {
  const textures = useScreenTextures();
  const view = shotAt(t);
  const m = marcAt(t);
  const lit = smooth(REVEAL - 0.2, REVEAL + 0.6, t);
  const revealed = t >= CHAIR[0] + 1.1;
  const curtain = smooth(CURTAIN[0], CURTAIN[1], t);
  return (
    <>
      <Rig pos={view.pos} target={view.target} fov={view.fov} />
      <color attach="background" args={['#0b0c10']} />
      <hemisphereLight color="#9aaee0" groundColor="#14141c" intensity={0.25 + 0.6 * lit} />
      <directionalLight color="#fff4e2" intensity={1.4 * lit} position={[2, 5, -4]} />
      {/* Spotlight on the chair once revealed */}
      <pointLight position={[0, 3.2, 0.9]} intensity={25 * lit} distance={6} decay={1.5} color="#fff2d8" />
      <ScreenRoom t={t} textures={textures} lit={lit} />
      <BossChair turn={smooth(CHAIR[0], CHAIR[1], t)} look={revealed ? JULIEN : undefined} tie={revealed}>
        {t >= 46.8 && <Pizza />}
      </BossChair>
      <group position={OVEN_AT} rotation={[0, Math.PI / 2, 0]}>
        <Oven t={t} heat={0.55} door={smooth(OVEN_DOOR, OVEN_DOOR + 0.8, t)} />
      </group>
      <Curtain open={curtain} />
      <group position={m.pos} rotation={[0, m.yaw, 0]}>
        <group scale={S}>
          <Marc t={t * m.speed} walk={m.walk} cold={m.cold} smile={m.smile} rightHand={m.right} leftHand={m.left} />
        </group>
      </group>
    </>
  );
};
