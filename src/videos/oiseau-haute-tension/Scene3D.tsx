/**
 * « Pourquoi un oiseau sur un câble haute tension ne s'électrocute pas ? » — 3D scene, holo style.
 * Story clock (seconds) in exported constants: also copied at the top of scripts/audio/oiseau-haute-tension.py.
 */
import React from 'react';
import * as THREE from 'three';
import {smooth} from '../../core/animation';
import {shotAt, type Shot, type ShotView} from '../../shared/three/shots';
import {
  ElectricArc, ElectronDots, HOLO_DEFAULT, PulseRings, PulseTube, Spark, WireLines, WireMesh, WireframeScene, type V3,
} from '../../shared/holo';
import {BIRD_FEET, Bird, SHOULDER, WING_SPAN, birdPoint, birdWingTip, type BirdPose} from '../../assets/holo/Bird';
import {PowerLine, conductorPoints, conductorY, powerLineLayout} from '../../assets/holo/PowerLine';

export const DURATION = 45;
export const HOOK_END = 6.2;
export const FLOW = 6.2;
export const FEET = 12.2;
export const WING_UP = 18.4;
export const CONTACT = 20.8;
export const CLIMAX = 24.2;
export const ARC_END = 31.4;
export const RULE = 32.2;
export const END = 41.2;

export const THEME = HOLO_DEFAULT;

// ---- World ---------------------------------------------------------------------------------------
export const LINE = powerLineLayout();
const PHASE = 0;
const CABLE_R = 0.014;
const BIRD_Z = 0.32;
export const BIRD_ROT = Math.PI / 2;
export const BIRD: V3 = [LINE.phases[PHASE][0], conductorY(LINE, PHASE, BIRD_Z) + CABLE_R, BIRD_Z];
/** Lift of the right wing so its tip just reaches the bottom chord of the cross-arm. */
const RAISE = Math.asin(Math.min(1, (LINE.armY - (BIRD[1] + SHOULDER[1])) / WING_SPAN));
export const WING_TIP = birdWingTip({open: 1, raise: RAISE}, 'right', BIRD, BIRD_ROT);
export const FOOT_A = birdPoint(BIRD_FEET[0], BIRD, BIRD_ROT);
export const FOOT_B = birdPoint(BIRD_FEET[1], BIRD, BIRD_ROT);
const at = (dx: number, dy: number, dz: number): V3 => [BIRD[0] + dx, BIRD[1] + dy, BIRD[2] + dz];

const CABLES = LINE.phases.map((_, i) => conductorPoints(LINE, i));
/** Short stretch of the bird's cable for dense electrons around it. */
const NEAR_CABLE: V3[] = Array.from({length: 25}, (_, i) => {
  const z = 9 - (18 * i) / 24;
  return [BIRD[0], conductorY(LINE, PHASE, z), z];
});
/** Leg of the pylon under the cross-arm side of the bird, from the arm down to the ground. */
const legPoint = (y: number): V3 => {
  const h = 1.25 - 0.85 * Math.min(1, y / LINE.armY);
  return [-h, y, -h];
};
/** Short circuit: cable → foot → body → wing → cross-arm → pylon leg → ground. */
const FAULT_PATH: V3[] = [
  FOOT_B,
  birdPoint([0.03, 0.08, 0], BIRD, BIRD_ROT),
  birdPoint([0, 0.15, 0], BIRD, BIRD_ROT),
  birdPoint(SHOULDER, BIRD, BIRD_ROT),
  birdWingTip({open: 1, raise: RAISE}, 'right', BIRD, BIRD_ROT).map((v, i) => (i === 1 ? v - 0.01 : v)) as V3,
  [-1.6, LINE.armY, -0.25],
  ...Array.from({length: 7}, (_, i) => legPoint(LINE.armY * (1 - i / 6))),
];
const PYLON_FOOT: V3 = [-1.25, 0, -1.25];
/** Outline of the cross-arm (bottom chord at armY), highlighted as the grounded target. */
const ARM_BOX: V3[] = (() => {
  const x0 = -LINE.armHalf;
  const x1 = -0.4;
  const y0 = LINE.armY;
  const y1 = LINE.armY + 0.35;
  const d = 0.25;
  const c: V3[] = [[x0, y0, -d], [x1, y0, -d], [x1, y0, d], [x0, y0, d], [x0, y1, -d], [x1, y1, -d], [x1, y1, d], [x0, y1, d]];
  const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  return e.flatMap(([a, b]) => [c[a], c[b]]);
})();
const ARM_GEO = new THREE.BoxGeometry(LINE.armHalf - 0.4, 0.35, 0.5);
const ARM_CENTER: V3 = [(-LINE.armHalf - 0.4) / 2, LINE.armY + 0.175, 0];
/** Points of the bird the arcs crawl between during the short circuit (local → world). */
const BODY_ARCS: [V3, V3][] = [
  [FOOT_B, birdPoint(SHOULDER, BIRD, BIRD_ROT)],
  [FOOT_A, birdPoint([0, 0.24, -0.15], BIRD, BIRD_ROT)],
  [birdPoint([0, 0.1, 0.2], BIRD, BIRD_ROT), WING_TIP],
];

// ---- Bird pose -----------------------------------------------------------------------------------
export const birdPose = (t: number): BirdPose => {
  const up = t < RULE ? smooth(WING_UP + 0.3, CONTACT, t) : 0;
  const twitch = 0.04 * Math.sin(t * 9) * smooth(CONTACT, CONTACT + 0.2, t) * (1 - smooth(ARC_END - 1, ARC_END, t));
  const look = t < WING_UP ? 0.35 * Math.sin(t * 0.9) * smooth(0.5, 2, t) : -0.25 * up;
  return {
    right: {open: up, raise: RAISE + twitch},
    left: {open: 0.55 * up, raise: 0.25 * up},
    look,
  };
};

// ---- Camera --------------------------------------------------------------------------------------
const v = (p: V3) => new THREE.Vector3(...p);
const mixV = (a: V3, b: V3, k: number) => v(a).lerp(v(b), k);
const orbit = (target: V3, r: number, a: number, h: number): V3 => [target[0] + r * Math.sin(a), target[1] + h, target[2] + r * Math.cos(a)];
/** Hand-held shake (deterministic sum of sines), metres. */
const shake = (t: number, amp: number) => new THREE.Vector3(
  amp * (Math.sin(t * 31.7) + 0.5 * Math.sin(t * 57.3 + 1)),
  amp * (Math.sin(t * 27.1 + 2) + 0.5 * Math.sin(t * 61.9)),
  amp * 0.6 * Math.sin(t * 43.3 + 3),
);
const BC = at(0, 0.15, 0);

export const SHOTS: Shot[] = [
  {from: 0, view: (_t, k) => {
    const target: V3 = [-1.6 - 0.8 * k, 9.6 + 1.4 * k, 0.1];
    return {pos: v(orbit(target, 17 - 4 * k, -0.95 + 0.45 * k, 3.5 + 0.8 * k)), target: v(target), fov: 50};
  }},
  {from: 3.2, view: (_t, k) => ({pos: mixV(at(-4.2, 1.4, 4.4), at(-1.5, 0.45, 1.5), k), target: v(BC), fov: 44})},
  {from: 6.2, view: (_t, k) => ({
    pos: mixV([BIRD[0] - 1.4, conductorY(LINE, PHASE, 11) + 0.55, 11], [BIRD[0] - 1.1, BIRD[1] + 0.45, 3.2], k),
    target: mixV([BIRD[0], conductorY(LINE, PHASE, 5), 5], BC, k), fov: 50,
  })},
  {from: 12.2, view: (_t, k) => ({pos: mixV(at(-1.35, 0.1, 0.42), at(-1.2, 0.08, 0.3), k), target: v(at(0, 0.035, 0)), fov: 22})},
  {from: 18.2, view: (_t, k) => ({pos: mixV(at(-2.5, 0.05, 1.7), at(-2.1, 0.1, 1.4), k), target: v(at(0, 0.36, -0.15)), fov: 44})},
  {from: 24.2, view: (t, k) => ({
    pos: mixV(at(-2.4, 0.4, 1.6), at(-7.5, -1.5, 6.5), k).add(shake(t, 0.05 * (1 - k * 0.6))),
    target: mixV(at(0, 0.3, -0.1), [-1.8, 10.5, -0.2], k), fov: 48,
  })},
  {from: 28.0, view: (t, k) => ({
    pos: mixV([-6.5, 1.2, 7.5], [-5.4, 1.6, 6.2], k).add(shake(t, 0.03)),
    target: mixV([-1.6, 8.5, -0.2], [-1.9, 10.4, 0], k), fov: 58,
  })},
  {from: RULE, view: (_t, k) => ({pos: mixV(at(-1.75, 0.3, 0), at(-1.35, 0.25, 0), k), target: v(at(0, 0.24, 0)), fov: 40})},
  {from: 37.0, view: (_t, k) => {
    const target = at(0, 0.18, 0);
    return {pos: v(orbit(target, 1.9, -Math.PI / 2 - 0.7 + 1.2 * k, 0.35)), target: v(target), fov: 42};
  }},
  {from: END, view: (_t, k) => ({pos: mixV(at(-3.2, 0.6, 3.2), [-9, 24, 16], k), target: mixV(BC, [-0.8, 8, 0], k), fov: 48})},
];

export const viewAt = (t: number): ShotView => shotAt(SHOTS, t, DURATION);

// ---- Scene ---------------------------------------------------------------------------------------
export const Scene3D: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const th = THEME;
  const view = viewAt(t);
  const fault = t >= CONTACT && t < RULE;
  const faultK = fault ? 1 - smooth(ARC_END - 1.2, ARC_END, t) : 0;
  const reveal = smooth(0, 0.9, t) * (t < RULE ? 1 : smooth(RULE, RULE + 0.6, t));
  const fadeOut = 1 - smooth(DURATION - 1.4, DURATION - 0.2, t);
  const alpha = reveal * fadeOut;
  const science = t >= FEET && t < WING_UP;
  const birdColor = fault ? th.danger : science || t >= RULE ? th.secondary : th.primary;
  const flicker = fault ? 0.75 + 0.25 * Math.sin(frame * 2.7) : 1;
  const armGlow = t >= WING_UP && t < RULE ? 0.9 * smooth(WING_UP + 0.5, WING_UP + 1.2, t) * (fault ? 0.6 : 1) : 0;
  // Cable thickness follows the camera distance (thin in close-ups, still visible in wide shots).
  const camDist = view.pos.distanceTo(new THREE.Vector3(...BIRD));
  const cableR = Math.round(Math.min(0.03, Math.max(0.009, 0.0016 * camDist)) * 1000) / 1000;
  const approach = t >= WING_UP && t < CONTACT ? smooth(CONTACT - 0.5, CONTACT, t) : 0;
  return (
    <WireframeScene view={view} theme={th} grid={{center: [-1, 0], step: 2, near: 14, far: 70, opacity: alpha * (t >= END ? 1 - smooth(END + 1, DURATION, t) : 1)}}>
      <PowerLine layout={LINE} color={th.primary} cableColor={th.primary} opacity={0.85 * alpha} pylonOpacity={0.8} />
      <WireLines segments={ARM_BOX} color={th.warn} opacity={armGlow * alpha} />
      {armGlow > 0 && <WireMesh geometry={ARM_GEO} color={th.warn} fill={0.05 * armGlow} opacity={armGlow * alpha} position={ARM_CENTER} />}
      {/* Current at rest in the three conductors (the bird's one brighter). */}
      {CABLES.map((pts, i) => (
        <PulseTube key={i} points={pts} t={t + i * 0.37} color={i === PHASE ? th.primary : th.grid} radius={cableR * (i === PHASE ? 1 : 0.8)}
          count={18} speed={0.04} base={0.35} intensity={alpha * (i === PHASE ? 1 : 0.9) * (t >= RULE && t < END ? 0.7 : 1)} halo={1.8} />
      ))}
      <ElectronDots points={NEAR_CABLE} t={t} color={th.primary} count={70} speed={0.12} seed={11} size={0.05} spread={0.018}
        opacity={alpha * smooth(FLOW - 0.3, FLOW + 0.5, t) * (1 - smooth(WING_UP, WING_UP + 1, t))} />
      <Bird position={BIRD} rotationY={BIRD_ROT} pose={birdPose(t)} color={birdColor} accent={fault ? th.warn : birdColor}
        fill={(science ? 0.07 : 0.14) * flicker} opacity={alpha * flicker} />
      {/* Equal potentials on both feet. */}
      {[FOOT_A, FOOT_B].map((p, i) => (
        <Spark key={i} position={p} color={th.secondary} size={0.06 + 0.012 * Math.sin(t * 6 + i)} intensity={smooth(FEET + 0.6, FEET + 1.4, t) * (1 - smooth(WING_UP - 0.4, WING_UP, t))} />
      ))}
      {/* Radar waves: hook (cyan from the pylon), fault (red into the ground). */}
      {[0.3, 2.2, 4.1].map((s) => (
        <PulseRings key={s} t={t} start={s} origin={[0, 0, 0]} color={th.primary} speed={9} spacing={3} count={3} life={3} radius={34} intensity={0.9 * alpha} />
      ))}
      {fault && [0, 1.3, 2.6, 3.9, 5.2, 6.5, 7.8].map((s) => (
        <PulseRings key={`f${s}`} t={t} start={CONTACT + 0.4 + s} origin={PYLON_FOOT} color={th.danger} speed={8} spacing={2.2} count={3} life={2.6} radius={30} intensity={faultK} />
      ))}
      {/* Pre-arc as the wing closes in, then the short circuit. */}
      <ElectricArc from={WING_TIP} to={[WING_TIP[0], LINE.armY + 0.02, WING_TIP[2] - 0.02]} frame={frame} seed={3} color={th.primary}
        radius={0.004} intensity={approach * (frame % 3 === 0 ? 1 : 0.3)} branches={0} roughness={0.8} />
      {fault && (
        <>
          <PulseTube points={FAULT_PATH} t={t} color={th.danger} radius={0.02} count={10} speed={0.5} base={0.4} width={0.35}
            intensity={1.4 * faultK} head={smooth(CONTACT, CONTACT + 0.7, t)} halo={3} />
          <ElectricArc from={WING_TIP} to={[WING_TIP[0] - 0.35, LINE.armY + 0.1, WING_TIP[2] - 0.15]} frame={frame} seed={5} color={th.danger}
            radius={0.012} intensity={faultK} branches={3} roughness={0.4} />
          <ElectricArc from={WING_TIP} to={[WING_TIP[0] + 0.3, LINE.armY + 0.05, WING_TIP[2] + 0.2]} frame={frame + 1} seed={7} color={th.warn}
            radius={0.008} intensity={faultK * 0.8} branches={2} />
          {BODY_ARCS.map(([a, b], i) => (
            <ElectricArc key={i} from={a} to={b} frame={frame + i} seed={20 + i} color={i % 2 ? th.warn : th.danger} radius={0.005}
              intensity={faultK * (frame % (3 + i) === 0 ? 1 : 0.55)} branches={1} roughness={0.35} />
          ))}
          <Spark position={WING_TIP} color={th.warn} size={0.9 + 0.3 * Math.sin(frame * 1.9)} intensity={faultK * (1.2 - 0.6 * smooth(CONTACT, CONTACT + 0.6, t))} />
          <Spark position={PYLON_FOOT} color={th.danger} size={3} intensity={faultK * smooth(CONTACT + 0.5, CONTACT + 1, t) * 0.7} />
        </>
      )}
    </WireframeScene>
  );
};
