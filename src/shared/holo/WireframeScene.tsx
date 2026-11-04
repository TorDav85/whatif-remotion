/**
 * WireframeScene: the 3D stage of the holo style (black void, perspective grid, camera driven by the
 * frame) and its building blocks: wireframe/X-ray meshes and radar rings on the ground.
 * Render inside <ThreeCanvas flat linear={false}> so neon colours are not tone-mapped.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {CameraRig} from '../three/common';
import {HOLO_DEFAULT, type HoloTheme} from './theme';
import type {V3} from './geometry';
import {useDispose, useGridMaterial, useRingsMaterial, useWireMaterial, useXrayMaterial} from './materials';

export type HoloView = {pos: V3 | THREE.Vector3; target: V3 | THREE.Vector3; fov: number};
const arr = (v: V3 | THREE.Vector3): V3 => (Array.isArray(v) ? v : [v.x, v.y, v.z]);

/** Ground grid: `step` metres between lines over ±`size`, fading between `near` and `far` from `center`. */
export const HoloGrid: React.FC<{
  theme?: HoloTheme; size?: number; step?: number; center?: [number, number]; near?: number; far?: number;
  opacity?: number; y?: number; color?: string;
}> = ({theme = HOLO_DEFAULT, size = 80, step = 2, center = [0, 0], near = 12, far = 70, opacity = 1, y = 0, color}) => {
  const geo = useDispose(
    useMemo(() => {
      const pts: number[] = [];
      for (let v = -size; v <= size + 1e-6; v += step) {
        pts.push(-size, 0, v, size, 0, v, v, 0, -size, v, 0, size);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      return g;
    }, [size, step]),
  );
  const mat = useGridMaterial();
  (mat.uniforms.uColor.value as THREE.Color).set(color ?? theme.grid);
  (mat.uniforms.uCenter.value as THREE.Vector2).set(center[0], center[1]);
  mat.uniforms.uNear.value = near;
  mat.uniforms.uFar.value = far;
  mat.uniforms.uOpacity.value = opacity * 1.6;
  return <lineSegments geometry={geo} material={mat} position={[center[0] - (center[0] % step), y, center[1] - (center[1] % step)]} />;
};

/**
 * A mesh shown as a hologram: its lines (`edges` = silhouette and hard edges, `wire` = every triangle)
 * over a translucent fresnel body (`fill`, 0 to hide).
 */
export const WireMesh: React.FC<{
  geometry: THREE.BufferGeometry; color: string; opacity?: number; fill?: number; mode?: 'edges' | 'wire';
  threshold?: number; position?: V3; rotation?: V3; scale?: number | V3; fillColor?: string;
}> = ({geometry, color, opacity = 1, fill = 0.3, mode = 'edges', threshold = 20, position, rotation, scale, fillColor}) => {
  const lines = useDispose(
    useMemo(
      () => (mode === 'wire' ? new THREE.WireframeGeometry(geometry) : new THREE.EdgesGeometry(geometry, threshold)),
      [geometry, mode, threshold],
    ),
  );
  const line = useWireMaterial(color, opacity);
  const body = useXrayMaterial(fillColor ?? color, fill);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <lineSegments geometry={lines} material={line} />
      {fill > 0 && <mesh geometry={geometry} material={body} />}
    </group>
  );
};

/** Plain polyline(s) in neon (pylons, schematics). `segments`: pairs of points. */
export const WireLines: React.FC<{segments: V3[]; color: string; opacity?: number}> = ({segments, color, opacity = 1}) => {
  const geo = useDispose(
    useMemo(() => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(segments.flat(), 3));
      return g;
    }, [segments]),
  );
  const mat = useWireMaterial(color, opacity);
  return <lineSegments geometry={geo} material={mat} />;
};

/** Radar wave on the ground: `count` rings leaving `origin` at time `start` (seconds). */
export const PulseRings: React.FC<{
  t: number; start: number; origin: V3; color: string; speed?: number; spacing?: number; count?: number;
  life?: number; radius?: number; intensity?: number;
}> = ({t, start, origin, color, speed = 6, spacing = 2.5, count = 3, life = 4, radius = 30, intensity = 1}) => {
  const geo = useDispose(useMemo(() => new THREE.CircleGeometry(radius, 96), [radius]));
  const mat = useRingsMaterial();
  const age = t - start;
  if (age < 0 || age > life + (count * spacing) / speed) return null;
  (mat.uniforms.uColor.value as THREE.Color).set(color);
  mat.uniforms.uAge.value = age;
  mat.uniforms.uSpeed.value = speed;
  mat.uniforms.uSpacing.value = spacing;
  mat.uniforms.uCount.value = count;
  mat.uniforms.uLife.value = life;
  mat.uniforms.uRadius.value = radius;
  mat.uniforms.uIntensity.value = intensity;
  return <mesh geometry={geo} material={mat} position={[origin[0], origin[1] + 0.01, origin[2]]} rotation={[-Math.PI / 2, 0, 0]} />;
};

/** Stage: background colour, optional grid, camera for this frame. */
export const WireframeScene: React.FC<{
  view: HoloView; theme?: HoloTheme; grid?: React.ComponentProps<typeof HoloGrid> | false; children?: React.ReactNode;
}> = ({view, theme = HOLO_DEFAULT, grid = {}, children}) => (
  <>
    <color attach="background" args={[theme.bg]} />
    <CameraRig position={arr(view.pos)} target={arr(view.target)} fov={view.fov} />
    {grid !== false && <HoloGrid theme={theme} {...grid} />}
    {children}
  </>
);
