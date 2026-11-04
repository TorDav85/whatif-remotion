/**
 * « Comment fonctionne un tunnelier ? » — 3D scene, holo style (cutaway: city above, machine below).
 * Story clock (seconds) in exported constants: also copied at the top of scripts/audio/tunnelier.py.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {rng, smooth} from '../../core/animation';
import {shotAt, type Shot, type ShotView} from '../../shared/three/shots';
import {
  ElectronDots, HOLO_DEFAULT, PulseRings, PulseTube, Spark, VectorArrow, WireLines, WireMesh, WireframeScene, type V3,
} from '../../shared/holo';
import {BELT_PATH, CUTTERS, SCREW_PATH, TBM, TunnelBoringMachine, TunnelLining, slotAngle} from '../../assets/holo/Tbm';

export const DURATION = 45;
export const WHEEL = 6.2;
export const PRESSURE = 13.0;
export const COLLAPSE = 17.6;
export const RESTORE = 19.4;
export const SCREW = 21.2;
export const THRUST = 27.2;
export const RING = 34.0;
export const END = 41.2;
/** Segment placements of the new ring (copied in the audio script). */
export const SEGMENT_TIMES = Array.from({length: TBM.segments}, (_, i) => 34.8 + 0.7 * i);

export const THEME = HOLO_DEFAULT;
export const DEPTH = -24;
const ADVANCE = TBM.ringWidth;

// ---- Machine state ----------------------------------------------------------------------------
/** World z of the cutter-head face: the machine advances one ring width while the cylinders push. */
export const faceZ = (t: number) => -ADVANCE * smooth(THRUST + 0.4, RING - 0.6, t);
/** Front face of the last built ring (world z) — fixed: the rings do not move. */
export const LINING_FRONT = TBM.shieldEnd;
export const wheelAngle = (t: number) => 0.35 * Math.min(t, RING) + 0.35 * Math.max(0, Math.min(1, (t - RING) / 0.8)) * 0.4;
export const placedSegments = (t: number) => SEGMENT_TIMES.filter((s) => t >= s + 0.5).length;
/** Pressure of the chamber relative to the ground (1 = balanced); the demo drops it, then restores it. */
export const chamberPressure = (t: number) => 1 - 0.85 * smooth(COLLAPSE - 0.2, COLLAPSE + 0.3, t) * (1 - smooth(RESTORE - 0.2, RESTORE + 0.4, t));
export const face = (t: number): V3 => [0, DEPTH, faceZ(t)];

// ---- City above, soil layers ------------------------------------------------------------------
const BUILDINGS = (() => {
  const r = rng(77);
  const out: {pos: V3; size: V3}[] = [];
  for (let z = -60; z < 110; z += 13) {
    for (const side of [-1, 1]) {
      if (r() < 0.2) continue;
      const w = 8 + r() * 6;
      const h = 9 + r() * 22;
      out.push({pos: [side * (10 + r() * 8), h / 2, z + r() * 4], size: [w, h, 9 + r() * 3]});
    }
  }
  return out;
})();
const LAYERS: V3[] = [-7, -15, -36].flatMap((y) => [
  [-45, y, -90], [45, y, -90], [45, y, -90], [45, y, 130], [45, y, 130], [-45, y, 130], [-45, y, 130], [-45, y, -90],
  [-45, y, 20], [45, y, 20],
] as V3[]);

// ---- Soil flow (local to the machine) ---------------------------------------------------------
const CHAMBER_LOOP: V3[] = Array.from({length: 25}, (_, i) => {
  const a = (i / 24) * Math.PI * 2;
  return [Math.cos(a) * 3.4, Math.sin(a) * 3.4 - 0.4, 1.3 + 0.8 * Math.sin(a * 2) ** 2];
});
const FUNNEL_TOP_R = 7;

// ---- Camera -----------------------------------------------------------------------------------
const v = (p: V3) => new THREE.Vector3(...p);
const at = (t: number, d: V3) => v(face(t)).add(v(d));
const mix = (t: number, a: V3, b: V3, k: number) => at(t, a).lerp(at(t, b), k);

export const SHOTS: Shot[] = [
  {from: 0, view: (_t, k) => ({pos: v([-105 + 20 * k, 14 - 4 * k, -55 + 10 * k]), target: v([0, -12, 22]), fov: 46})},
  {from: 3.2, view: (t, k) => ({pos: mix(t, [-42, 9, -32], [-30, 6, -24], k), target: at(t, [0, 0, 10]), fov: 46})},
  {from: WHEEL, view: (t, k) => ({pos: mix(t, [3, 1.5, -34], [1.5, 1, -30], k), target: at(t, [0, 0, 0]), fov: 44})},
  {from: 9.4, view: (t, k) => ({pos: mix(t, [9, 2, -17], [8, 1.5, -15], k), target: at(t, [2.5, 0.4, 0]), fov: 42})},
  {from: PRESSURE, view: (t, k) => ({pos: mix(t, [-26, 2, 1], [-23, 1.5, 2], k), target: at(t, [0, 0, 2]), fov: 44})},
  {from: 17.2, view: (t, k) => ({pos: mix(t, [-64, 0, -6], [-60, 2, -6], k), target: at(t, [0, 11, -2]), fov: 46})},
  {from: SCREW, view: (t, k) => ({pos: mix(t, [-22, 4, 0], [-24, 6, 30], k), target: mix(t, [0, -2, 8], [0, -0.5, 44], k), fov: 48})},
  {from: THRUST, view: (t, k) => ({pos: mix(t, [-21, 7, 28], [-19, 6, 25], k), target: at(t, [0, 0, 9]), fov: 46})},
  {from: 30.6, view: (t, k) => ({pos: mix(t, [-34, 3, 8], [-31, 3, 9], k), target: at(t, [0, 0, 8]), fov: 46})},
  {from: RING, view: (_t, k) => ({pos: v([0.4, DEPTH + 0.6, LINING_FRONT + 20 - 3 * k]), target: v([0, DEPTH - 0.2, LINING_FRONT - 3]), fov: 56})},
  {from: 37.6, view: (_t, k) => ({pos: v([2.6 - 5 * k, DEPTH + 1.2, LINING_FRONT + 7]), target: v([0, DEPTH, LINING_FRONT - 1.2]), fov: 54})},
  {from: END, view: (t, k) => ({pos: at(t, [-40, 5, 12]).lerp(v([-120, 34, -70]), k), target: at(t, [0, 0, 12]).lerp(v([0, -12, 25]), k), fov: 48})},
];

export const viewAt = (t: number): ShotView => shotAt(SHOTS, t, DURATION);

// ---- Scene ------------------------------------------------------------------------------------
export const Scene3D: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const th = THEME;
  const view = viewAt(t);
  const F = face(t);
  const fadeOut = 1 - smooth(DURATION - 1.4, DURATION - 0.2, t);
  const alpha = smooth(0, 0.9, t) * fadeOut;
  const p = chamberPressure(t);
  const collapse = 1 - p;
  const ringPhase = t >= RING && t < END;
  const placed = placedSegments(t);
  const carried = ringPhase && placed < TBM.segments ? placed : null;
  const slot = carried ?? Math.max(0, placed - 1);
  const reach = carried !== null ? smooth(SEGMENT_TIMES[carried] - 0.2, SEGMENT_TIMES[carried] + 0.5, t) : 1;
  const erector = ringPhase ? slotAngle(slot) : slotAngle(0);
  const rodEnd = LINING_FRONT - F[2];
  const excavating = t < RING;
  const pushing = t >= THRUST && t < RING;
  const buildings = useMemo(() => BUILDINGS.map((b) => new THREE.BoxGeometry(...b.size)), []);
  const funnel = useMemo(() => new THREE.ConeGeometry(FUNNEL_TOP_R, Math.abs(DEPTH) - TBM.radius, 16, 1, true).rotateX(Math.PI), []);
  const machineColor = collapse > 0.3 ? th.danger : th.primary;
  return (
    <WireframeScene view={view} theme={th} grid={{center: [0, 20], step: 4, size: 160, near: 50, far: 150, opacity: alpha * (t >= END ? 1 - smooth(END + 1, DURATION, t) : 1)}}>
      {/* City above and soil layers (cutaway). */}
      {BUILDINGS.map((b, i) => (
        <WireMesh key={i} geometry={buildings[i]} color={th.grid === '#003344' ? '#0a7fa0' : th.grid} fill={0.04} opacity={0.55 * alpha} position={b.pos} />
      ))}
      <WireLines segments={LAYERS} color={th.warn} opacity={0.18 * alpha} />
      {/* Built tunnel behind the machine (fixed in the ground). */}
      <TunnelLining zFrom={LINING_FRONT} count={40} color={th.secondary} fill={0.025} opacity={0.42 * alpha} y={DEPTH}
        partial={ringPhase || t >= END ? placed : 0} partialColor={th.warn} />
      <TunnelBoringMachine position={F} wheel={wheelAngle(t)} erector={erector} rodEnd={rodEnd} carried={carried} reach={reach}
        color={machineColor} accent={th.secondary} fill={0.08} opacity={alpha} />
      <group position={F}>
        {/* Soil churning in the chamber, then along the screw and the belt. */}
        <ElectronDots points={CHAMBER_LOOP} t={t} color={collapse > 0.3 ? th.danger : th.warn} count={60} speed={excavating ? 0.25 : 0.02} seed={5}
          size={0.45} spread={0.6} opacity={alpha * smooth(PRESSURE - 1, PRESSURE, t)} />
        <ElectronDots points={SCREW_PATH} t={t} color={th.warn} count={30} speed={excavating ? 0.22 : 0} seed={6} size={0.4} spread={0.5}
          opacity={alpha * smooth(SCREW - 0.5, SCREW + 0.3, t) * (t < RING + 1 ? 1 : 0.3)} />
        <PulseTube points={BELT_PATH} t={t} color={th.warn} radius={0.12} count={20} speed={excavating ? 0.12 : 0} base={0.25}
          intensity={alpha * smooth(SCREW + 1, SCREW + 2, t)} head={smooth(SCREW + 1, SCREW + 3, t)} halo={2} />
        {/* Cutters sparking while the head turns. */}
        {t >= WHEEL && t < PRESSURE && CUTTERS.filter((_, i) => i % 3 === frame % 3).map((c, i) => {
          const a = wheelAngle(t);
          return <Spark key={i} position={[c[0] * Math.cos(a) - c[1] * Math.sin(a), c[0] * Math.sin(a) + c[1] * Math.cos(a), -0.3]} color={th.warn} size={1.1} intensity={0.8} />;
        })}
        {/* Pressure balance on the face: chamber pushes forward, ground pushes back. */}
        {t >= PRESSURE && t < SCREW && [0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          const r = 2.6;
          return (
            <React.Fragment key={i}>
              <VectorArrow from={[Math.cos(a) * r, Math.sin(a) * r, 1.6]} dir={[0, 0, -1]} length={2.6 * p * smooth(PRESSURE + 0.8, PRESSURE + 1.6, t)}
                color={th.secondary} radius={0.14} head={0.8} opacity={alpha} />
              <VectorArrow from={[Math.cos(a) * r, Math.sin(a) * r, -4.2]} dir={[0, 0, 1]} length={2.6 * smooth(PRESSURE + 1.6, PRESSURE + 2.4, t)}
                color={collapse > 0.3 ? th.danger : th.primary} radius={0.14} head={0.8} opacity={alpha} />
            </React.Fragment>
          );
        })}
        {excavating && <Spark position={[0, -0.4, 1.9]} color={collapse > 0.3 ? th.danger : th.secondary} size={6} intensity={0.35 * p * smooth(PRESSURE, PRESSURE + 1, t)} />}
        {/* Thrust: glow on the rods bearing on the last ring. */}
        {pushing && Array.from({length: TBM.cylinders}, (_, i) => {
          const a = (i / TBM.cylinders) * Math.PI * 2;
          return <Spark key={i} position={[Math.cos(a) * TBM.cylinderRadius, Math.sin(a) * TBM.cylinderRadius, rodEnd]} color={th.secondary} size={0.9} intensity={0.8 * alpha} />;
        })}
      </group>
      {/* Collapse demo: a sinkhole funnel up to the street, debris falling into the chamber. */}
      {collapse > 0.02 && (
        <>
          <WireMesh geometry={funnel} color={th.danger} fill={0.12 * collapse} opacity={collapse * alpha}
            position={[0, (DEPTH + TBM.radius) / 2, F[2] - 2]} />
          <ElectronDots points={[[0, -2, F[2] - 2], [0, DEPTH + TBM.radius, F[2] - 1.5]]} t={t} color={th.danger} count={40} speed={0.9} seed={9}
            size={0.8} spread={5} opacity={collapse * alpha} />
          {[COLLAPSE, COLLAPSE + 0.7, COLLAPSE + 1.4].map((s) => (
            <PulseRings key={s} t={t} start={s} origin={[0, 0, F[2] - 2]} color={th.danger} speed={12} spacing={4} count={3} life={1.6} radius={30} intensity={collapse} />
          ))}
        </>
      )}
      {/* Radar waves at the surface above the machine (hook). */}
      {[0.3, 2.2, 4.1].map((s) => (
        <PulseRings key={s} t={t} start={s} origin={[0, 0, 10]} color={th.primary} speed={30} spacing={12} count={3} life={3} radius={120} intensity={0.8 * alpha} />
      ))}
    </WireframeScene>
  );
};
