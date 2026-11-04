/**
 * Earth-pressure-balance tunnel boring machine (≈ 9.8 m diameter, ≈ 100 m with its back-up train),
 * drawn as a hologram. Metres; origin at the centre of the cutter-head face, the machine extends
 * towards +z (it digs towards −z). The tunnel lining (`TunnelLining`) lives in world space.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {WireLines, WireMesh} from '../../shared/holo/WireframeScene';
import type {V3} from '../../shared/holo/geometry';
import {useDispose} from '../../shared/holo/materials';

export const TBM = {
  radius: 4.9,
  /** Cutter head thickness, then the excavation chamber up to the bulkhead. */
  head: 0.8,
  bulkhead: 3.0,
  shieldEnd: 11.8,
  /** Thrust cylinder barrels (local z) and radius of the cylinder circle. */
  cylinderFrom: 7.0,
  cylinderTo: 10.0,
  cylinderRadius: 4.25,
  cylinders: 16,
  erectorZ: 12.6,
  /** Lining rings: inner radius, thickness, width, segments per ring. */
  liningRadius: 4.45,
  liningThick: 0.35,
  ringWidth: 1.5,
  segments: 7,
  backupEnd: 96,
} as const;

/** Screw conveyor axis: from the bottom of the chamber, rising backwards through the bulkhead. */
export const SCREW_PATH: V3[] = [[0, -3.7, 1.6], [0, -3.2, 4], [0, -2.2, 8], [0, -1.3, 12], [0, -0.9, 14]];
/** Conveyor belt on the back-up train, from the screw outlet to the rear. */
export const BELT_PATH: V3[] = [[0, -0.9, 14], [0, -0.6, 30], [0, -0.4, 60], [0, -0.2, TBM.backupEnd]];
/** Erector angle that points its arm (+y) at the middle of segment slot i. */
export const slotAngle = (i: number) => ((i + 0.5) / TBM.segments) * Math.PI * 2 - Math.PI / 2 - Math.PI / 2;
/** Positions of the disc cutters on the face (local, before rotation), seeded layout on 6 spokes. */
export const CUTTERS: V3[] = (() => {
  const pts: V3[] = [];
  for (let s = 0; s < 6; s++) {
    for (let k = 0; k < 6; k++) {
      const r = 0.9 + k * 0.72 + (s % 2) * 0.36;
      if (r > TBM.radius - 0.25) continue;
      const a = (s / 6) * Math.PI * 2;
      pts.push([Math.cos(a) * r, Math.sin(a) * r, -0.05]);
    }
  }
  return pts;
})();

const ring = (r: number, z: number, n = 32): V3[] => {
  const out: V3[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    out.push([Math.cos(a0) * r, Math.sin(a0) * r, z], [Math.cos(a1) * r, Math.sin(a1) * r, z]);
  }
  return out;
};

/** Back-up train gantries: portal frames every 8 m, rails and the belt support. */
const BACKUP: V3[] = (() => {
  const segs: V3[] = [];
  const w = 3.2;
  const h0 = -3.4;
  const h1 = 2.6;
  for (let z = 14; z <= TBM.backupEnd; z += 8) {
    segs.push([-w, h0, z], [-w, h1, z], [w, h0, z], [w, h1, z], [-w, h1, z], [w, h1, z], [-w, -0.8, z], [w, -0.8, z]);
  }
  for (const [x, y] of [[-w, h0], [w, h0], [-w, h1], [w, h1]] as const) segs.push([x, y, 14], [x, y, TBM.backupEnd]);
  return segs;
})();

const useTbmGeometries = () =>
  useDispose(
    useMemo(() => {
      const R = TBM.radius;
      const rim = new THREE.CylinderGeometry(R, R, TBM.head, 36, 1, true).rotateX(Math.PI / 2).translate(0, 0, TBM.head / 2);
      const spoke = new THREE.BoxGeometry(R - 0.6, 0.55, TBM.head * 0.8).translate((R - 0.6) / 2 + 0.5, 0, TBM.head / 2);
      const hub = new THREE.ConeGeometry(0.9, 1.2, 12).rotateX(-Math.PI / 2).translate(0, 0, -0.2);
      const cutter = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10).rotateY(Math.PI / 2);
      const shield = new THREE.CylinderGeometry(R - 0.05, R - 0.12, TBM.shieldEnd - TBM.head, 36, 3, true)
        .rotateX(Math.PI / 2).translate(0, 0, (TBM.shieldEnd + TBM.head) / 2);
      const bulkhead = new THREE.CylinderGeometry(R - 0.15, R - 0.15, 0.3, 36).rotateX(Math.PI / 2).translate(0, 0, TBM.bulkhead);
      const screw = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(SCREW_PATH.map((p) => new THREE.Vector3(...p))), 40, 0.55, 10, false);
      const barrel = new THREE.CylinderGeometry(0.22, 0.22, TBM.cylinderTo - TBM.cylinderFrom, 8).rotateX(Math.PI / 2)
        .translate(0, 0, (TBM.cylinderFrom + TBM.cylinderTo) / 2);
      const rod = new THREE.CylinderGeometry(0.12, 0.12, 1, 6).rotateX(Math.PI / 2).translate(0, 0, 0.5);
      const erector = new THREE.TorusGeometry(2.6, 0.18, 6, 32).translate(0, 0, TBM.erectorZ);
      const arm = new THREE.BoxGeometry(0.5, 1.8, 0.5).translate(0, 3.2, TBM.erectorZ);
      const all = [rim, spoke, hub, cutter, shield, bulkhead, screw, barrel, rod, erector, arm];
      return {rim, spoke, hub, cutter, shield, bulkhead, screw, barrel, rod, erector, arm, dispose: () => all.forEach((g) => g.dispose())};
    }, []),
  );

/** One lining segment (arc of the ring), local to its ring: angle a0..a1, z from 0 to ringWidth. */
const segmentGeometry = (a0: number, a1: number) => {
  const r0 = TBM.liningRadius;
  const r1 = r0 + TBM.liningThick;
  const shape = new THREE.Shape();
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    if (i === 0) shape.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    else shape.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    shape.lineTo(Math.cos(a) * r0, Math.sin(a) * r0);
  }
  return new THREE.ExtrudeGeometry(shape, {depth: TBM.ringWidth * 0.97, bevelEnabled: false, curveSegments: 2});
};

const useSegments = () =>
  useDispose(
    useMemo(() => {
      const gap = 0.03;
      const geos = Array.from({length: TBM.segments}, (_, i) => {
        const a0 = (i / TBM.segments) * Math.PI * 2 + gap - Math.PI / 2;
        const a1 = ((i + 1) / TBM.segments) * Math.PI * 2 - gap - Math.PI / 2;
        return segmentGeometry(a0, a1);
      });
      return {geos, dispose: () => geos.forEach((g) => g.dispose())};
    }, []),
  ).geos;

/** Built tunnel lining in world space: rings from `zFrom` backwards (towards +z), `count` full rings. */
export const TunnelLining: React.FC<{
  zFrom: number; count: number; color: string; fill?: number; opacity?: number; y?: number;
  /** Segments of the newest ring already placed (0..segments), drawn at zFrom − ringWidth. */
  partial?: number; partialColor?: string;
}> = ({zFrom, count, color, fill = 0.08, opacity = 1, y = 0, partial = 0, partialColor}) => {
  const segs = useSegments();
  return (
    <group position={[0, y, 0]}>
      {Array.from({length: count}, (_, r) => (
        <group key={r} position={[0, 0, zFrom + r * TBM.ringWidth]}>
          {segs.map((g, i) => <WireMesh key={i} geometry={g} color={color} fill={fill} opacity={opacity * (r > 30 ? 0.5 : 1)} threshold={30} />)}
        </group>
      ))}
      {partial > 0 && (
        <group position={[0, 0, zFrom - TBM.ringWidth]}>
          {segs.slice(0, Math.floor(partial)).map((g, i) => (
            <WireMesh key={i} geometry={g} color={partialColor ?? color} fill={fill * 2} opacity={opacity} threshold={30} />
          ))}
        </group>
      )}
    </group>
  );
};

export const TunnelBoringMachine: React.FC<{
  color: string; accent?: string; fill?: number; opacity?: number; position?: V3;
  /** Cutter-head rotation (rad), erector rotation (rad). */
  wheel?: number; erector?: number;
  /** Local z where the thrust rods bear (front face of the last ring). */
  rodEnd?: number;
  /** A segment carried by the erector (index into the ring), or null. */
  carried?: number | null;
  /** How far the carried segment has moved out to its place (0..1). */
  reach?: number;
}> = ({color, accent, fill = 0.1, opacity = 1, position, wheel = 0, erector = 0, rodEnd = TBM.shieldEnd, carried = null, reach = 1}) => {
  const g = useTbmGeometries();
  const segs = useSegments();
  const a = accent ?? color;
  const rodLen = Math.max(0.1, rodEnd - TBM.cylinderTo);
  const shieldRings = useMemo(() => [TBM.head + 0.2, 5, 8.5, TBM.shieldEnd].flatMap((z) => ring(TBM.radius - 0.08, z)), []);
  return (
    <group position={position}>
      <group rotation={[0, 0, wheel]}>
        <WireMesh geometry={g.rim} color={color} fill={fill} opacity={opacity} />
        {Array.from({length: 6}, (_, s) => (
          <group key={s} rotation={[0, 0, (s / 6) * Math.PI * 2]}>
            <WireMesh geometry={g.spoke} color={color} fill={fill * 1.5} opacity={opacity} />
          </group>
        ))}
        <WireMesh geometry={g.hub} color={a} fill={fill * 2} opacity={opacity} />
        {CUTTERS.map((p, i) => <WireMesh key={i} geometry={g.cutter} color={a} fill={fill * 3} opacity={opacity} position={p} />)}
      </group>
      <WireMesh geometry={g.shield} color={color} fill={fill * 0.5} opacity={opacity * 0.8} />
      <WireLines segments={shieldRings} color={color} opacity={opacity} />
      <WireMesh geometry={g.bulkhead} color={color} fill={fill * 0.6} opacity={opacity * 0.8} />
      <WireMesh geometry={g.screw} color={a} fill={fill} opacity={opacity} />
      {Array.from({length: TBM.cylinders}, (_, i) => {
        const ang = (i / TBM.cylinders) * Math.PI * 2;
        const p: V3 = [Math.cos(ang) * TBM.cylinderRadius, Math.sin(ang) * TBM.cylinderRadius, 0];
        return (
          <group key={i} position={p}>
            <WireMesh geometry={g.barrel} color={color} fill={fill} opacity={opacity} />
            <group position={[0, 0, TBM.cylinderTo]} scale={[1, 1, rodLen]}>
              <WireMesh geometry={g.rod} color={a} fill={fill * 2} opacity={opacity} />
            </group>
          </group>
        );
      })}
      <group rotation={[0, 0, erector]}>
        <WireMesh geometry={g.erector} color={a} fill={fill} opacity={opacity} />
        <WireMesh geometry={g.arm} color={a} fill={fill} opacity={opacity} />
      </group>
      {carried !== null && (
        // The segment geometry already sits at its slot angle: it moves out radially as it is set (reach 0 → 1).
        <group position={[0, 0, rodEnd - TBM.ringWidth]} scale={[0.8 + 0.2 * reach, 0.8 + 0.2 * reach, 1]}>
          <WireMesh geometry={segs[carried]} color={a} fill={fill * 3} opacity={opacity} />
        </group>
      )}
      <WireLines segments={BACKUP} color={color} opacity={0.55 * opacity} />
    </group>
  );
};
