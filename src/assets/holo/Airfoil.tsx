/**
 * Wing cross-section (cambered NACA 4-digit profile) and an illustrative airflow around it, for
 * "how does a wing lift" diagrams. Profile in the XY plane (x = chord, leading edge at x = 0),
 * extruded along z. The streamlines are a drawing aid (bend over the curved top, downwash behind),
 * not a flow simulation.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {smooth} from '../../core/animation';
import {WireMesh} from '../../shared/holo/WireframeScene';
import type {V3} from '../../shared/holo/geometry';
import {useDispose} from '../../shared/holo/materials';

export type AirfoilSpec = {chord: number; camber: number; camberPos: number; thickness: number; aoa: number};
export const AIRFOIL_DEFAULT: AirfoilSpec = {chord: 10, camber: 0.04, camberPos: 0.4, thickness: 0.13, aoa: 6 * (Math.PI / 180)};

/** Upper and lower surface heights at x (0..chord), before the angle of attack. */
export const nacaAt = (x: number, s: AirfoilSpec = AIRFOIL_DEFAULT) => {
  const u = Math.min(1, Math.max(0, x / s.chord));
  const yt = 5 * s.thickness * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u ** 2 + 0.2843 * u ** 3 - 0.1036 * u ** 4);
  const {camber: m, camberPos: p} = s;
  const yc = u < p ? (m / p ** 2) * (2 * p * u - u * u) : (m / (1 - p) ** 2) * (1 - 2 * p + 2 * p * u - u * u);
  return {upper: (yc + yt) * s.chord, lower: (yc - yt) * s.chord, camber: yc * s.chord};
};

/** Rotate a profile point by the angle of attack about the quarter chord (nose up for aoa > 0). */
const pitch = (x: number, y: number, s: AirfoilSpec): [number, number] => {
  const cx = 0.25 * s.chord;
  const c = Math.cos(s.aoa);
  const n = Math.sin(s.aoa);
  return [cx + (x - cx) * c + y * n, -(x - cx) * n + y * c];
};

/** Closed outline (upper from TE to LE, then lower back), with the angle of attack. */
export const airfoilOutline = (s: AirfoilSpec = AIRFOIL_DEFAULT, n = 40): [number, number][] => {
  const xs = Array.from({length: n + 1}, (_, i) => s.chord * (1 - Math.cos((Math.PI * i) / n)) / 2);
  const up = xs.map((x) => pitch(x, nacaAt(x, s).upper, s)).reverse();
  const lo = xs.slice(1).map((x) => pitch(x, nacaAt(x, s).lower, s));
  return [...up, ...lo];
};

/** Height of the (pitched) surface at chordwise position x, for the side `upper` or lower. */
const surfaceY = (x: number, upper: boolean, s: AirfoilSpec) => {
  const h = nacaAt(x, s);
  return pitch(x, upper ? h.upper : h.lower, s)[1];
};

/**
 * Streamline passing at height `y0` (above > 0, below < 0) far ahead of the wing, at depth z.
 * It hugs the surface near the profile, then is deflected downward behind the trailing edge.
 */
export const streamline = (y0: number, z: number, s: AirfoilSpec = AIRFOIL_DEFAULT, from = -1, to = 2.4, n = 70): V3[] => {
  const c = s.chord;
  const upper = y0 >= 0;
  const decay = Math.exp(-Math.abs(y0) / (0.55 * c));
  const te = surfaceY(c, upper, s);
  const downwash = Math.sin(s.aoa) * c * 1.1 * decay;
  return Array.from({length: n + 1}, (_, i) => {
    const x = (from + ((to - from) * i) / n) * c;
    let y = y0;
    if (x < 0) y += surfaceY(0, upper, s) * decay * smooth(-0.6 * c, 0, x) + (upper ? 0.04 : 0.02) * c * decay * smooth(-0.8 * c, 0, x);
    else if (x <= c) y += surfaceY(x, upper, s) * decay + (upper ? 0.04 : 0.02) * c * decay * (1 - x / c);
    else y += te * decay - downwash * smooth(c, 2.2 * c, x);
    return [x, y, z];
  });
};

/** Extruded wing section drawn as a hologram, leading edge at x = 0, centred on z = 0. */
export const AirfoilSection: React.FC<{spec?: AirfoilSpec; span?: number; color: string; fill?: number; opacity?: number; position?: V3}> = ({
  spec = AIRFOIL_DEFAULT, span = 6, color, fill = 0.25, opacity = 1, position,
}) => {
  const geo = useDispose(
    useMemo(() => {
      const shape = new THREE.Shape(airfoilOutline(spec).map(([x, y]) => new THREE.Vector2(x, y)));
      return new THREE.ExtrudeGeometry(shape, {depth: span, bevelEnabled: false, curveSegments: 4}).translate(0, 0, -span / 2);
    }, [spec, span]),
  );
  return <WireMesh geometry={geo} color={color} fill={fill} opacity={opacity} position={position} threshold={35} />;
};
