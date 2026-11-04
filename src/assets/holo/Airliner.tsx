/**
 * Four-engine wide-body airliner (≈ 72 m long, 80 m span), generic, drawn as a hologram.
 * Metres, front towards −z. Origin on the ground under the main landing gear, so a pitch rotation
 * about the origin is the take-off rotation on the main wheels.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {WireMesh} from '../../shared/holo/WireframeScene';
import type {V3} from '../../shared/holo/geometry';
import {useDispose} from '../../shared/holo/materials';

export const AIRLINER = {
  length: 72,
  span: 80,
  /** Fuselage axis height above the main-gear contact point. */
  axisY: 5.6,
  radius: 3.6,
  nose: -40,
  tail: 32,
  wingY: 3.4,
  /** Leading edge of the wing root (z) and its chord. */
  rootLE: -9,
  rootChord: 17,
  sweep: 33 * (Math.PI / 180),
  /** Rough centre of lift (local), where the force arrows start. */
  lift: [0, 5.6, -1] as V3,
} as const;

/** Leading-edge z of the wing at spanwise station x (|x| ≥ fuselage radius). */
export const wingLeadingEdge = (x: number) => AIRLINER.rootLE + Math.tan(AIRLINER.sweep) * (Math.abs(x) - AIRLINER.radius);
export const wingChord = (x: number) => {
  const k = (Math.abs(x) - AIRLINER.radius) / (AIRLINER.span / 2 - AIRLINER.radius);
  return AIRLINER.rootChord + (4 - AIRLINER.rootChord) * Math.min(1, Math.max(0, k));
};

const planform = (pts: [number, number][]) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
const extrude = (shape: THREE.Shape, depth: number) => new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: false});

const useAirlinerGeometries = () =>
  useDispose(
    useMemo(() => {
      const A = AIRLINER;
      const L = A.tail - A.nose;
      // Fuselage: lathe around y, then laid along z (nose at −z).
      const profile: THREE.Vector2[] = [];
      const rAt = (s: number) => {
        if (s < 9) return A.radius * Math.sqrt(1 - ((9 - s) / 9) ** 2);
        if (s < L - 20) return A.radius;
        const k = (s - (L - 20)) / 20;
        return A.radius * (1 - 0.82 * k ** 1.3);
      };
      for (let i = 0; i <= 24; i++) {
        const s = (L * i) / 24;
        profile.push(new THREE.Vector2(Math.max(0.05, rAt(s)), s));
      }
      const fuselage = new THREE.LatheGeometry(profile, 14).rotateX(Math.PI / 2).translate(0, A.axisY, A.nose);
      // Wing (right side, +x): planform in (x, z), thin, swept, slight dihedral.
      const tipX = A.span / 2;
      const right = extrude(planform([
        [A.radius - 0.5, A.rootLE], [tipX, wingLeadingEdge(tipX)], [tipX, wingLeadingEdge(tipX) + 4],
        [12, wingLeadingEdge(12) + wingChord(12)], [A.radius - 0.5, A.rootLE + A.rootChord],
      ]), 0.7).rotateX(Math.PI / 2).rotateZ(5 * (Math.PI / 180)).translate(0, A.wingY, 0);
      // Horizontal tail (right side).
      const stab = extrude(planform([[0.5, 22], [15.5, 28.5], [15.5, 31], [0.5, 31]]), 0.4)
        .rotateX(Math.PI / 2).translate(0, A.axisY + 1.2, 0);
      // Fin in the (z, y) plane.
      const fin = extrude(planform([[19, A.axisY + 2], [27, A.axisY + 17], [31, A.axisY + 17], [32, A.axisY + 2]]), 0.5)
        .rotateY(-Math.PI / 2).translate(0.25, 0, 0);
      const engine = new THREE.CylinderGeometry(1.5, 1.25, 5.8, 12).rotateX(Math.PI / 2);
      const strut = new THREE.CylinderGeometry(0.12, 0.12, 2.6, 4);
      const wheel = new THREE.CylinderGeometry(0.65, 0.65, 0.5, 10).rotateZ(Math.PI / 2);
      const all = [fuselage, right, stab, fin, engine, strut, wheel];
      return {fuselage, right, stab, fin, engine, strut, wheel, dispose: () => all.forEach((g) => g.dispose())};
    }, []),
  );

/** Engine centres (local), right then left side. */
export const ENGINES: V3[] = [15, 26, -15, -26].map((x) => [x, AIRLINER.wingY - 1.5 + Math.abs(x) * 0.087, wingLeadingEdge(x) - 1.5]);

export const Airliner: React.FC<{
  color: string; accent?: string; fill?: number; opacity?: number; position?: V3; pitch?: number; roll?: number; yaw?: number;
  /** Landing gear 0 (up) .. 1 (down). */
  gear?: number;
}> = ({color, accent, fill = 0.12, opacity = 1, position, pitch = 0, roll = 0, yaw = 0, gear = 1}) => {
  const g = useAirlinerGeometries();
  const a = accent ?? color;
  return (
    <group position={position} rotation={[pitch, yaw, roll, 'YXZ']}>
      <WireMesh geometry={g.fuselage} color={color} fill={fill} opacity={opacity} threshold={25} />
      <WireMesh geometry={g.right} color={color} fill={fill * 1.3} opacity={opacity} />
      <group scale={[-1, 1, 1]}>
        <WireMesh geometry={g.right} color={color} fill={fill * 1.3} opacity={opacity} />
        <WireMesh geometry={g.stab} color={color} fill={fill} opacity={opacity} />
      </group>
      <WireMesh geometry={g.stab} color={color} fill={fill} opacity={opacity} />
      <WireMesh geometry={g.fin} color={color} fill={fill} opacity={opacity} />
      {ENGINES.map((p, i) => (
        <WireMesh key={i} geometry={g.engine} color={a} fill={fill * 1.5} opacity={opacity} position={p} />
      ))}
      {gear > 0 && [[-5.5, 2], [5.5, 2], [-2, 2], [2, 2], [0, -26]].map(([x, z], i) => (
        <group key={i} position={[x, 2.6 * (1 - gear) + 1.3, z]} scale={[1, gear, 1]}>
          <WireMesh geometry={g.strut} color={a} fill={fill} opacity={opacity} />
          <WireMesh geometry={g.wheel} color={a} fill={fill} opacity={opacity} position={[0, -0.65, 0]} />
        </group>
      ))}
    </group>
  );
};
