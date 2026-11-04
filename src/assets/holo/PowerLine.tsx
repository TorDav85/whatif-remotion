/**
 * Medium-voltage line drawn as a hologram: lattice pylons, suspension insulators and three hanging
 * conductors. Metres, ground at y = 0, the line runs along z. Pure helpers (`powerLineLayout`,
 * `pylonSegments`) give the anchor points so a scene can place a bird or a current path exactly.
 */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {WireLines, WireMesh} from '../../shared/holo/WireframeScene';
import {catenary, type V3} from '../../shared/holo/geometry';
import {useDispose} from '../../shared/holo/materials';

export type PowerLineLayout = {
  /** z of each pylon. */
  pylons: number[];
  height: number;
  /** y of the bottom chord of the main cross-arm. */
  armY: number;
  armHalf: number;
  /** Insulator length (arm → conductor clamp). */
  insulator: number;
  /** Clamp of each phase on a pylon at z = 0: [x, y]. */
  phases: [number, number][];
  sag: number;
};

export const powerLineLayout = (over: Partial<PowerLineLayout> = {}): PowerLineLayout => {
  const base = {pylons: [-46, 0, 46], height: 14.6, armY: 12, armHalf: 3.2, insulator: 0.55, sag: 1.8, ...over};
  return {
    ...base,
    phases: over.phases ?? [[-2.6, base.armY - base.insulator], [2.6, base.armY - base.insulator], [0.9, base.armY + 2.0 - base.insulator]],
  };
};

/** Points of one conductor through every pylon (sagging between them). */
export const conductorPoints = (L: PowerLineLayout, phase: number, perSpan = 40): V3[] => {
  const [x, y] = L.phases[phase];
  const pts: V3[] = [];
  for (let i = 0; i < L.pylons.length - 1; i++) {
    const span = catenary([x, y, L.pylons[i]], [x, y, L.pylons[i + 1]], L.sag, perSpan);
    pts.push(...(i ? span.slice(1) : span));
  }
  return pts;
};

/** Height of conductor `phase` at position z (for perching something on it). */
export const conductorY = (L: PowerLineLayout, phase: number, z: number) => {
  const y = L.phases[phase][1];
  for (let i = 0; i < L.pylons.length - 1; i++) {
    const a = L.pylons[i];
    const b = L.pylons[i + 1];
    if (z >= a && z <= b) {
      const k = (z - a) / (b - a);
      return y - 4 * L.sag * k * (1 - k);
    }
  }
  return y;
};

/** Lattice of one pylon at z0: tapered legs, rings, X-bracing, main arm truss and top arm. */
export const pylonSegments = (L: PowerLineLayout, z0 = 0): V3[] => {
  const segs: V3[] = [];
  const add = (a: V3, b: V3) => segs.push(a, b);
  const levels = 9;
  const half = (y: number) => 1.25 - 0.85 * Math.min(1, y / L.armY);
  const ring = (y: number): V3[] => {
    const h = half(y);
    return [[-h, y, z0 - h], [h, y, z0 - h], [h, y, z0 + h], [-h, y, z0 + h]];
  };
  let prev = ring(0);
  for (let i = 1; i <= levels; i++) {
    const y = (L.armY + 0.35) * (i / levels);
    const cur = ring(y);
    for (let k = 0; k < 4; k++) {
      add(prev[k], cur[k]);
      add(cur[k], cur[(k + 1) % 4]);
      add(prev[k], cur[(k + 1) % 4]);
      add(prev[(k + 1) % 4], cur[k]);
    }
    prev = cur;
  }
  // Mast above the arm up to the top arm.
  const top = ring(L.armY + 0.35);
  const peak: V3[] = top.map(([x, , z]) => [x * 0.6, L.height, z0 + (z - z0) * 0.6]);
  for (let k = 0; k < 4; k++) {
    add(top[k], peak[k]);
    add(peak[k], peak[(k + 1) % 4]);
    add(top[k], peak[(k + 1) % 4]);
  }
  // Main cross-arm: box truss, bottom chord at armY.
  const d = 0.25;
  const y0 = L.armY;
  const y1 = L.armY + 0.35;
  const xs = Array.from({length: 9}, (_, i) => -L.armHalf + (2 * L.armHalf * i) / 8);
  for (const [ya, za] of [[y0, -d], [y0, d], [y1, -d], [y1, d]] as const) add([-L.armHalf, ya, z0 + za], [L.armHalf, ya, z0 + za]);
  xs.forEach((x, i) => {
    add([x, y0, z0 - d], [x, y0, z0 + d]);
    add([x, y1, z0 - d], [x, y1, z0 + d]);
    add([x, y0, z0 - d], [x, y1, z0 - d]);
    add([x, y0, z0 + d], [x, y1, z0 + d]);
    if (i < xs.length - 1) {
      add([x, y0, z0 - d], [xs[i + 1], y1, z0 - d]);
      add([x, y0, z0 + d], [xs[i + 1], y1, z0 + d]);
    }
  });
  // Top arm for the third phase.
  const ty = L.armY + 2.0;
  add([-0.3, ty, z0], [1.3, ty, z0]);
  add([-0.3, ty + 0.25, z0], [1.3, ty + 0.25, z0]);
  add([1.3, ty, z0], [1.3, ty + 0.25, z0]);
  add([0.6, ty, z0], [1.3, ty + 0.25, z0]);
  return segs;
};

const useInsulator = (length: number) =>
  useDispose(
    useMemo(() => {
      const parts: THREE.BufferGeometry[] = [];
      const n = 5;
      for (let i = 0; i < n; i++) {
        parts.push(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10).translate(0, -length * (0.15 + (0.75 * i) / (n - 1)), 0));
      }
      parts.push(new THREE.CylinderGeometry(0.018, 0.018, length, 5).translate(0, -length / 2, 0));
      const merged = mergeGeometries(parts);
      parts.forEach((p) => p.dispose());
      return merged;
    }, [length]),
  );

/** Minimal merge (positions + normals + index) to avoid importing three/examples. */
const mergeGeometries = (geos: THREE.BufferGeometry[]) => {
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  let offset = 0;
  for (const g of geos) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    const index = g.getIndex();
    if (index) for (let i = 0; i < index.count; i++) idx.push(index.getX(i) + offset);
    else for (let i = 0; i < p.count; i++) idx.push(i + offset);
    offset += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
};

/** Pylons + insulators + conductors (as thin lines; scenes add PulseTube on top for current). */
export const PowerLine: React.FC<{
  layout: PowerLineLayout; color: string; cableColor?: string; insulatorColor?: string; opacity?: number; pylonOpacity?: number;
}> = ({layout, color, cableColor, insulatorColor, opacity = 1, pylonOpacity = 0.75}) => {
  const lattice = useMemo(() => layout.pylons.flatMap((z) => pylonSegments(layout, z)), [layout]);
  const cables = useMemo(() => {
    const segs: V3[] = [];
    layout.phases.forEach((_, i) => {
      const pts = conductorPoints(layout, i);
      for (let k = 0; k < pts.length - 1; k++) segs.push(pts[k], pts[k + 1]);
    });
    return segs;
  }, [layout]);
  const ins = useInsulator(layout.insulator);
  return (
    <group>
      <WireLines segments={lattice} color={color} opacity={pylonOpacity * opacity} />
      <WireLines segments={cables} color={cableColor ?? color} opacity={opacity} />
      {layout.pylons.flatMap((z) =>
        layout.phases.map(([x, y], i) => (
          <WireMesh key={`${z}-${i}`} geometry={ins} color={insulatorColor ?? color} fill={0.15} opacity={0.9 * opacity}
            position={[x, y + layout.insulator, z]} />
        )),
      )}
    </group>
  );
};
