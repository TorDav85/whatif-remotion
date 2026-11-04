/**
 * « Comment un avion de 575 tonnes peut-il voler ? » — 3D scene, holo style.
 * Story clock (seconds) in exported constants: also copied at the top of scripts/audio/avion-portance.py.
 */
import React from 'react';
import * as THREE from 'three';
import {sampleNum, smooth} from '../../core/animation';
import {shotAt, type Shot, type ShotView} from '../../shared/three/shots';
import {
  ElectronDots, HOLO_DEFAULT, PulseRings, PulseTube, Spark, VectorArrow, WireLines, WireframeScene, type V3,
} from '../../shared/holo';
import {AIRLINER, Airliner, ENGINES, wingChord, wingLeadingEdge} from '../../assets/holo/Airliner';
import {AIRFOIL_DEFAULT, AirfoilSection, streamline} from '../../assets/holo/Airfoil';

export const DURATION = 45;
export const FPS = 30;
export const WEIGHT = 6.2;
export const WING = 13.2;
export const RUNWAY = 22.4;
export const LIFTOFF = 27.4;
export const STALL_IN = 29.4;
export const STALL = 31.2;
export const RECOVER = 33.6;
export const RULE = 34.2;
export const END = 41.2;

export const THEME = HOLO_DEFAULT;
/** Take-off speed used for the "lift / weight" ratio (A380 order of magnitude). */
export const V_LIFTOFF = 280;
export const MASS_T = 575;

// ---- Flight model (illustrative, precomputed per frame so every frame is reproducible) ---------
type PlaneState = {pos: V3; pitch: number; speed: number; lift: number; gear: number};
const deg = Math.PI / 180;
const SPEED_KEYS = [
  {t: RUNWAY, v: 140}, {t: LIFTOFF, v: 282}, {t: STALL_IN, v: 300}, {t: STALL, v: 190}, {t: 32.4, v: 215},
  {t: RECOVER, v: 270}, {t: RULE + 1, v: 300}, {t: DURATION, v: 320},
];
const PITCH_KEYS = [
  {t: RUNWAY, p: 0}, {t: 27.0, p: 0}, {t: 27.8, p: 9}, {t: STALL_IN, p: 11}, {t: STALL, p: 19}, {t: 31.6, p: 14},
  {t: 32.5, p: -9}, {t: RECOVER, p: 0}, {t: RULE + 1, p: 3}, {t: DURATION, p: 4},
];
const CLIMB_KEYS = [
  {t: LIFTOFF, w: 0}, {t: 28.4, w: 10}, {t: STALL_IN, w: 12}, {t: 31.0, w: 6}, {t: 31.8, w: -10}, {t: 32.8, w: -6},
  {t: RECOVER, w: 2}, {t: DURATION, w: 4},
];
const speedAt = (t: number) => sampleNum(SPEED_KEYS, t, 'v');
const TABLE: {z: number; y: number}[] = (() => {
  const out: {z: number; y: number}[] = [];
  let z = 0;
  let y = 0;
  const dt = 1 / FPS;
  for (let f = 0; f <= DURATION * FPS + 1; f++) {
    const t = f / FPS;
    out.push({z, y});
    if (t >= RUNWAY) {
      z -= (speedAt(t) / 3.6) * dt;
      if (t >= LIFTOFF) y = Math.max(0, y + sampleNum(CLIMB_KEYS, t, 'w') * dt);
    }
  }
  return out;
})();

/** Plane for the opening display flight (t < WING): level, altitude 45 m, slow drift forward. */
const displayPlane = (t: number): PlaneState => ({pos: [0, 45, -40 * t], pitch: 2 * deg, speed: 290, lift: 1, gear: 0});

export const planeAt = (t: number): PlaneState => {
  if (t < RUNWAY) return displayPlane(Math.min(t, WING));
  const f = Math.min(TABLE.length - 1, Math.max(0, Math.round(t * FPS)));
  const speed = speedAt(t);
  const pitch = sampleNum(PITCH_KEYS, t, 'p') * deg;
  // Lift / weight: grows as v² on the runway; collapses during the stall, then back to level flight.
  const ground = Math.min(1.05, (speed / V_LIFTOFF) ** 2);
  const stalled = 1 - 0.5 * smooth(STALL - 0.1, STALL + 0.3, t) * (1 - smooth(32.6, RECOVER, t));
  const lift = t < LIFTOFF ? ground : t < STALL_IN ? 1.05 : stalled;
  const gear = 1 - smooth(LIFTOFF + 1.5, LIFTOFF + 3.5, t);
  return {pos: [0, TABLE[f].y, TABLE[f].z], pitch, speed, lift, gear};
};

/** World point of a local airliner point for the current plane state. */
const planePoint = (s: PlaneState, local: V3): THREE.Vector3 =>
  new THREE.Vector3(...local).applyEuler(new THREE.Euler(s.pitch, 0, 0, 'YXZ')).add(new THREE.Vector3(...s.pos));

// ---- Wind tunnel (cross-section), far from the runway so the cut changes place ---------------
export const TUNNEL: V3 = [2000, 14, 0];
const SPEC = AIRFOIL_DEFAULT;
const STREAMS = [0.5, 1.1, 1.9, 2.9, -0.7, -1.4, -2.4].map((y0, i) => ({
  y0, pts: streamline(y0, (i % 3 - 1) * 1.6, SPEC).map(([x, y, z]) => [x + TUNNEL[0], y + TUNNEL[1], z + TUNNEL[2]] as V3),
}));
export const TUNNEL_TOP: V3 = [TUNNEL[0] + 0.35 * SPEC.chord, TUNNEL[1] + 2.4, TUNNEL[2]];
export const TUNNEL_BOTTOM: V3 = [TUNNEL[0] + 0.45 * SPEC.chord, TUNNEL[1] - 2.0, TUNNEL[2]];
export const TUNNEL_WAKE: V3 = [TUNNEL[0] + 1.8 * SPEC.chord, TUNNEL[1] - 1.6, TUNNEL[2]];

// ---- Airflow over the real wing (local to the plane) ------------------------------------------
const WING_FLOW: V3[][] = [8, 16, 24, 32, -8, -16, -24, -32].map((x) => {
  const le = wingLeadingEdge(x);
  const c = wingChord(x);
  const y = AIRLINER.wingY + 0.8 + Math.abs(x) * 0.087;
  return Array.from({length: 13}, (_, i) => {
    const k = i / 12;
    const z = le - 14 + k * (c + 30);
    const over = smooth(le - 4, le + 0.3 * c, z) * (1 - smooth(le + c, le + c + 4, z));
    const down = smooth(le + c, le + c + 16, z) * 2.2;
    return [x, y + 0.9 * over - down, z] as V3;
  });
});

// ---- Runway -----------------------------------------------------------------------------------
const RUNWAY_LINES: V3[] = (() => {
  const segs: V3[] = [];
  const z0 = 400;
  const z1 = -3200;
  for (const x of [-30, 30]) segs.push([x, 0.05, z0], [x, 0.05, z1]);
  for (let z = z0; z > z1; z -= 60) segs.push([0, 0.05, z], [0, 0.05, z - 30]);
  for (let z = z0; z > z1; z -= 300) segs.push([-30, 0.05, z], [30, 0.05, z]);
  return segs;
})();

// ---- Camera -----------------------------------------------------------------------------------
const v = (p: V3) => new THREE.Vector3(...p);
const shake = (t: number, amp: number) => new THREE.Vector3(
  amp * (Math.sin(t * 31.7) + 0.5 * Math.sin(t * 57.3 + 1)),
  amp * (Math.sin(t * 27.1 + 2) + 0.5 * Math.sin(t * 61.9)),
  amp * 0.6 * Math.sin(t * 43.3 + 3),
);
/** View relative to the plane centre at time t. */
const rel = (t: number, offset: V3, look: V3 = [0, 0, 0], fov = 45): ShotView => {
  const s = planeAt(t);
  const c = planePoint(s, AIRLINER.lift);
  return {pos: c.clone().add(v(offset)), target: c.clone().add(v(look)), fov};
};
const orbit = (r: number, a: number, h: number): V3 => [r * Math.sin(a), h, r * Math.cos(a)];
const lerpV = (a: ShotView, b: ShotView, k: number): ShotView => ({pos: a.pos.clone().lerp(b.pos, k), target: a.target.clone().lerp(b.target, k), fov: a.fov + (b.fov - a.fov) * k});
const TC = v([TUNNEL[0] + 0.6 * SPEC.chord, TUNNEL[1], TUNNEL[2]]);

export const SHOTS: Shot[] = [
  {from: 0, view: (t, k) => rel(t, orbit(200 - 30 * k, -2.3 + 0.7 * k, 40 - 10 * k), [0, -2, -3], 46)},
  {from: 3.2, view: (t, k) => rel(t, orbit(160 - 15 * k, -1.2 + 0.35 * k, 18), [0, 0, -3], 44)},
  {from: WEIGHT, view: (t, k) => rel(t, [-205 + 10 * k, 4, -3], [0, 0, -3], 44)},
  {from: 9.8, view: (t, k) => rel(t, [-170 + 10 * k, -18, -70], [0, 2, -3], 46)},
  {from: WING, view: (_t, k) => ({pos: TC.clone().add(v([2.5 - 1 * k, 0.6, 46 - 4 * k])), target: TC.clone().add(v([2.5, 0.2, 0])), fov: 40})},
  {from: 17.6, view: (_t, k) => ({pos: TC.clone().add(v([-12 + 5 * k, 7 - 1 * k, 36])), target: TC.clone().add(v([2.5, 1, 0])), fov: 42})},
  {from: RUNWAY, view: (t, k) => rel(t, [60 - 10 * k, 8, 110 - 15 * k], [0, -1, -8], 44)},
  {from: 25.4, view: (t, k) => rel(t, [-185 + 10 * k, 3, -3], [0, 4, -3], 46)},
  {from: 28.6, view: (t, k) => rel(t, [-95, -7 + 6 * k, 95], [0, 6, -10], 48)},
  {from: 30.6, view: (t, k) => {
    const r = rel(t, [-165 + 10 * k, 2, -3], [0, 0, -3], 46);
    r.pos.add(shake(t, smooth(STALL - 0.2, STALL, t) * (1 - smooth(32.8, RECOVER, t)) * 1.4));
    return r;
  }},
  {from: RULE, view: (t, k) => rel(t, [-125 + 10 * k, 26, -135 + 10 * k], [0, 2, -3], 46)},
  {from: 37.8, view: (t, k) => rel(t, orbit(175, -2.0 + 0.8 * k, 30), [0, 2, -3], 46)},
  {from: END, view: (t, k) => lerpV(rel(t, [-60, 15, 90], [0, 0, 0], 46), rel(t, [-120, 160, 220], [0, 0, -60], 50), k)},
];

export const viewAt = (t: number): ShotView => shotAt(SHOTS, t, DURATION);
export const liftOrigin = (t: number) => planePoint(planeAt(t), AIRLINER.lift);

// ---- Scene ------------------------------------------------------------------------------------
export const Scene3D: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const th = THEME;
  const view = viewAt(t);
  const s = planeAt(t);
  const inTunnel = t >= WING && t < RUNWAY;
  const stalled = t >= STALL - 0.1 && t < RECOVER;
  const fadeOut = 1 - smooth(DURATION - 1.4, DURATION - 0.2, t);
  const alpha = smooth(0, 0.9, t) * fadeOut;
  const c = planePoint(s, AIRLINER.lift);
  const center: [number, number] = inTunnel ? [TUNNEL[0], TUNNEL[2]] : [c.x, c.z];
  // Force arrows: weight always 40 m; lift = 40 m × lift/weight.
  const arrows = (t >= WEIGHT + 0.4 && t < WING) || (t >= RUNWAY + 0.3 && t < RULE);
  const weightK = t < WING ? smooth(WEIGHT + 0.4, WEIGHT + 1.2, t) : 1;
  const liftK = t < WING ? smooth(10.6, 11.6, t) : 1;
  const planeColor = stalled ? th.danger : th.primary;
  const flicker = stalled ? 0.8 + 0.2 * Math.sin(frame * 2.3) : 1;
  return (
    <WireframeScene view={view} theme={th} grid={{center, step: inTunnel ? 2 : 10, size: inTunnel ? 60 : 600, near: inTunnel ? 20 : 150, far: inTunnel ? 60 : 520,
      opacity: alpha * (t >= END ? 1 - smooth(END + 1, DURATION, t) : 1), y: inTunnel ? TUNNEL[1] - 8 : 0}}>
      {!inTunnel && (
        <>
          {t >= RUNWAY && <WireLines segments={RUNWAY_LINES} color={th.primary} opacity={0.45 * alpha} />}
          <Airliner position={s.pos} pitch={s.pitch} gear={s.gear} color={planeColor} accent={stalled ? th.warn : th.secondary}
            fill={0.1 * flicker} opacity={alpha * flicker} />
          {/* Airflow over the wings: smooth (cyan) or torn off the wing (red) in the stall. */}
          <group position={s.pos} rotation={[s.pitch, 0, 0, 'YXZ']}>
            {WING_FLOW.map((pts, i) => (
              <ElectronDots key={i} points={pts} t={t} color={stalled ? th.danger : th.secondary} count={14} speed={stalled ? 0.35 : 0.9} seed={40 + i}
                size={stalled ? 1.6 : 1.1} spread={stalled ? 7 : 0.4} opacity={alpha * (t < WING ? smooth(WEIGHT, WEIGHT + 1, t) * 0.8 : smooth(RUNWAY + 1.5, RUNWAY + 3, t))} />
            ))}
            {t >= RUNWAY && t < LIFTOFF + 4 && ENGINES.map((p, i) => (
              <Spark key={i} position={[p[0], p[1], p[2] + 4]} color={th.warn} size={6 + Math.sin(frame * 1.7 + i)} intensity={0.8 * alpha} />
            ))}
          </group>
          {arrows && (
            <>
              <VectorArrow from={[c.x, c.y - 4, c.z]} dir={[0, -1, 0]} length={40 * weightK} color={th.danger} radius={1.1} head={8} opacity={alpha} />
              <VectorArrow from={[c.x, c.y + 4, c.z]} dir={[0, 1, 0]} length={40 * s.lift * liftK} color={stalled ? th.warn : th.secondary} radius={1.1} head={8} opacity={alpha} />
            </>
          )}
          {/* Radar waves under the display flight, then at lift-off. */}
          {[0.3, 2.2, 4.1].map((st) => (
            <PulseRings key={st} t={t} start={st} origin={[c.x, 0, c.z]} color={th.primary} speed={45} spacing={18} count={3} life={3} radius={220} intensity={0.9 * alpha} />
          ))}
          <PulseRings t={t} start={LIFTOFF} origin={[0, 0, planeAt(LIFTOFF).pos[2]]} color={th.secondary} speed={40} spacing={15} count={3} life={3} radius={200} intensity={alpha} />
        </>
      )}
      {inTunnel && (
        <>
          <AirfoilSection position={TUNNEL} color={th.primary} fill={0.3} span={5} opacity={smooth(WING, WING + 0.5, t)} />
          {STREAMS.map(({y0, pts}, i) => (
            <PulseTube key={i} points={pts} t={t} color={y0 > 0 ? th.secondary : th.primary} radius={0.05} count={7}
              speed={y0 > 0 ? 0.32 : 0.22} base={0.2} width={0.25} head={smooth(WING + 0.2, WING + 1.6, t)} halo={2.5} />
          ))}
          <VectorArrow from={[TUNNEL[0] + 0.3 * SPEC.chord, TUNNEL[1] + 1.2, TUNNEL[2]]} dir={[0, 1, 0]} length={6 * smooth(17.4, 18.4, t)}
            color={th.secondary} radius={0.22} head={1.6} />
          <VectorArrow from={[TUNNEL[0] + 1.25 * SPEC.chord, TUNNEL[1] - 0.6, TUNNEL[2]]} dir={[0.45, -1, 0]} length={5 * smooth(16.0, 17.0, t)}
            color={th.warn} radius={0.2} head={1.4} />
          <Spark position={TUNNEL_TOP} color={th.secondary} size={5} intensity={0.35 * smooth(14.2, 15, t)} />
        </>
      )}
    </WireframeScene>
  );
};
