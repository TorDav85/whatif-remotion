/**
 * CurrentFlow: electricity in the holo style. Glowing tubes with travelling pulses, electrons drifting
 * along a path, flickering lightning arcs and contact sparks. All driven by `t` (s) / `frame`.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {rng} from '../../core/animation';
import {along, arcPoints, flickerSeed, type V3} from './geometry';
import {ADDITIVE, useDispose, useGlowTexture, usePulseMaterial} from './materials';

const curveOf = (points: V3[]) => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');

const useTube = (points: V3[], radius: number, radial = 8) =>
  useDispose(
    useMemo(() => new THREE.TubeGeometry(curveOf(points), Math.max(16, points.length * 4), radius, radial, false), [points, radius, radial]),
  );

export type PulseProps = {
  points: V3[]; t: number; color: string; radius?: number; count?: number; speed?: number; width?: number;
  base?: number; intensity?: number; head?: number; tail?: number; halo?: number;
};

/** Tube lit by pulses moving from the first point to the last (`speed` path-lengths per second). */
export const PulseTube: React.FC<PulseProps> = ({
  points, t, color, radius = 0.03, count = 8, speed = 0.12, width = 0.22, base = 0.25, intensity = 1, head = 1, tail = 0, halo = 3,
}) => {
  const core = useTube(points, radius);
  const outer = useTube(points, radius * halo);
  const a = usePulseMaterial();
  const b = usePulseMaterial();
  for (const [m, k] of [[a, 1], [b, 0.28]] as const) {
    (m.uniforms.uColor.value as THREE.Color).set(color);
    m.uniforms.uTime.value = t;
    m.uniforms.uCount.value = count;
    m.uniforms.uSpeed.value = speed;
    m.uniforms.uWidth.value = width;
    m.uniforms.uBase.value = base;
    m.uniforms.uIntensity.value = intensity * k;
    m.uniforms.uHead.value = head;
    m.uniforms.uTail.value = tail;
  }
  if (intensity <= 0 || head <= tail) return null;
  return (
    <>
      <mesh geometry={core} material={a} />
      {halo > 0 && <mesh geometry={outer} material={b} />}
    </>
  );
};

/** Electrons drifting along a path; each has its own phase and a little sideways jitter (seeded). */
export const ElectronDots: React.FC<{
  points: V3[]; t: number; color: string; count?: number; speed?: number; seed?: number; size?: number;
  spread?: number; opacity?: number;
}> = ({points, t, color, count = 40, speed = 0.08, seed = 1, size = 0.08, spread = 0.02, opacity = 1}) => {
  const tex = useGlowTexture();
  const phases = useMemo(() => {
    const r = rng(seed);
    return Array.from({length: count}, () => ({u: r(), v: 0.7 + 0.6 * r(), o: [r() - 0.5, r() - 0.5, r() - 0.5]}));
  }, [count, seed]);
  const geo = useDispose(
    useMemo(() => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
      return g;
    }, [count]),
  );
  const mat = useDispose(useMemo(() => new THREE.PointsMaterial({...ADDITIVE, map: tex, size, sizeAttenuation: true}), [tex, size]));
  mat.color.set(color);
  mat.opacity = opacity;
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  phases.forEach((ph, i) => {
    const u = (((ph.u + t * speed * ph.v) % 1) + 1) % 1;
    const {p} = along(points, u);
    pos.setXYZ(i, p[0] + ph.o[0] * spread, p[1] + ph.o[1] * spread, p[2] + ph.o[2] * spread);
  });
  pos.needsUpdate = true;
  geo.computeBoundingSphere();
  if (opacity <= 0) return null;
  return <points geometry={geo} material={mat} />;
};

/**
 * Lightning between `from` and `to`, a new shape every `hold` frames (seeded, so reproducible), with
 * `branches` short side forks. White core + coloured halo.
 */
export const ElectricArc: React.FC<{
  from: V3; to: V3; frame: number; color: string; seed?: number; hold?: number; radius?: number;
  intensity?: number; branches?: number; roughness?: number;
}> = ({from, to, frame, color, seed = 1, hold = 2, radius = 0.01, intensity = 1, branches = 2, roughness = 0.3}) => {
  const s = flickerSeed(seed, frame, hold);
  const paths = useMemo(() => {
    const main = arcPoints(from, to, s, 5, roughness);
    const r = rng(s + 17);
    const forks = Array.from({length: branches}, (_, i) => {
      const start = main[Math.floor((0.2 + 0.6 * r()) * (main.length - 1))];
      const len = 0.25 + 0.35 * r();
      const end: V3 = [
        start[0] + (to[0] - from[0]) * len * 0.4 + (r() - 0.5) * len,
        start[1] + (to[1] - from[1]) * len * 0.4 + (r() - 0.5) * len,
        start[2] + (to[2] - from[2]) * len * 0.4 + (r() - 0.5) * len,
      ];
      return arcPoints(start, end, s + 101 * (i + 1), 3, 0.35);
    });
    return [main, ...forks];
  }, [from.join(), to.join(), s, branches, roughness]);
  if (intensity <= 0) return null;
  return (
    <>
      {paths.map((p, i) => (
        <ArcStroke key={`${s}-${i}`} points={p} color={color} radius={radius * (i ? 0.6 : 1)} intensity={intensity * (i ? 0.7 : 1)} />
      ))}
    </>
  );
};

const ArcStroke: React.FC<{points: V3[]; color: string; radius: number; intensity: number}> = ({points, color, radius, intensity}) => {
  const core = useTube(points, radius, 5);
  const halo = useTube(points, radius * 4, 6);
  const mats = useDispose(
    useMemo(() => {
      const m = [new THREE.MeshBasicMaterial({...ADDITIVE}), new THREE.MeshBasicMaterial({...ADDITIVE})];
      return {dispose: () => m.forEach((x) => x.dispose()), m};
    }, []),
  ).m;
  mats[0].color.set('#ffffff').lerp(new THREE.Color(color), 0.25).multiplyScalar(Math.min(1, intensity));
  mats[1].color.set(color).multiplyScalar(0.45 * Math.min(1, intensity));
  return (
    <>
      <mesh geometry={core} material={mats[0]} />
      <mesh geometry={halo} material={mats[1]} />
    </>
  );
};

/** Glow sprite (spark at a contact point, halo on a node). */
export const Spark: React.FC<{position: V3; color: string; size?: number; intensity?: number}> = ({position, color, size = 0.6, intensity = 1}) => {
  const tex = useGlowTexture();
  const mat = useDispose(useMemo(() => new THREE.SpriteMaterial({...ADDITIVE, map: tex}), [tex]));
  mat.color.set(color);
  mat.opacity = Math.min(1, intensity);
  if (intensity <= 0) return null;
  return <sprite material={mat} position={position} scale={[size, size, size]} />;
};
