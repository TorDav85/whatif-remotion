import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {BOX_UP, MANSARD, PAL} from '../../kit';
import type {LayoutItem} from '../registry';
import {FAR_CARS, FAR_TREES} from './episode';

/**
 * Distant districts of the reference city as a handful of instanced meshes: each building becomes its
 * walls, a darker band per floor (rows of windows, read from afar) and its mansard roof; each tree a
 * crown and a trunk. Same footprint, height and stone colour as the detailed asset, so the seam between
 * near and far stays quiet. Geometry is fixed for a given list: no per-frame work.
 */
type Box = {x: number; y: number; z: number; ry: number; w: number; h: number; d: number; color: string};

// Same storey heights as Building.tsx, Shops.tsx and Towers.tsx (ModernBlock).
const shape = (it: LayoutItem) => {
  const p = it.props;
  const w = Number(p.width ?? 14);
  const d = Number(p.depth ?? 12);
  const floors = Number(p.floors ?? 5);
  switch (it.type) {
    case 'haussmann': return {w, d, ground: 4.2, storey: 3.1, floors, roof: true, stone: String(p.stone ?? PAL.cream)};
    case 'shop': return {w, d, ground: 4.2, storey: 3.1, floors, roof: false, stone: String(p.stone ?? PAL.cream)};
    case 'modern-block': return {w, d, ground: 3.5, storey: 2.9, floors, roof: false, stone: String(p.color ?? '#d6cfc2')};
    case 'house': return {w: Number(p.width ?? 9), d: Number(p.depth ?? 7), ground: 3, storey: 2.7, floors: Number(p.floors ?? 2) - 1, roof: true, stone: String(p.walls ?? '#efe3c8')};
    default: return {w: 12, d: 12, ground: 3, storey: 3, floors: Math.round(Number(p.height ?? 15) / 3), roof: false, stone: String(p.color ?? '#b9a48c')};
  }
};

const Instances: React.FC<{boxes: Box[]; geometry: THREE.BufferGeometry; snow?: number; snowShare?: number}> = ({boxes, geometry, snow = 0, snowShare = 0}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const white = new THREE.Color('#e6ecef');
    boxes.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z);
      o.rotation.set(0, b.ry, 0);
      o.scale.set(b.w, b.h, b.d);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c.set(b.color).lerp(white, snow * snowShare));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes, snow, snowShare]);
  if (!boxes.length) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, boxes.length]} frustumCulled={false}>
      <meshStandardMaterial roughness={0.9} flatShading />
    </instancedMesh>
  );
};

const CROWN = new THREE.IcosahedronGeometry(1, 0).translate(0, 0, 0);

export const FarBlocks: React.FC<{items: LayoutItem[]; snow?: number}> = ({items, snow = 0}) => {
  const {walls, bands, roofs, crowns, trunks} = useMemo(() => {
    const walls: Box[] = [];
    const bands: Box[] = [];
    const roofs: Box[] = [];
    const crowns: Box[] = [];
    const trunks: Box[] = [];
    for (const it of items) {
      if (FAR_CARS.has(it.type)) {
        // Car.tsx proportions: body and cabin, along the car's local z.
        const color = String(it.props.color ?? '#b8322a');
        walls.push({x: it.x, y: it.y + 0.3, z: it.z, ry: it.ry, w: 1.75, h: 0.7, d: 4.2, color});
        bands.push({x: it.x, y: it.y + 1.0, z: it.z, ry: it.ry, w: 1.55, h: 0.55, d: 2.1, color: '#3a4450'});
        continue;
      }
      if (FAR_TREES.has(it.type)) {
        const h = Number(it.props.height ?? 5.4) * (it.type === 'oak' ? Number(it.props.scale ?? 1) : 1);
        const foliage = String(it.props.foliage ?? '#608451');
        trunks.push({x: it.x, y: it.y, z: it.z, ry: 0, w: 0.35, h: h * 0.55, d: 0.35, color: '#5a4636'});
        crowns.push({x: it.x, y: it.y + h * 0.66, z: it.z, ry: it.ry, w: h * 0.42, h: h * 0.38, d: h * 0.42, color: foliage});
        continue;
      }
      const s = shape(it);
      const wallH = s.ground + Math.max(0, s.floors) * s.storey;
      walls.push({x: it.x, y: it.y, z: it.z, ry: it.ry, w: s.w, h: wallH, d: s.d, color: s.stone});
      if (it.type === 'modern-block') {
        // Continuous balconies: one band per floor all around.
        const band = new THREE.Color(s.stone).lerp(new THREE.Color('#55606a'), 0.35).getStyle();
        for (let f = 0; f < s.floors; f++) bands.push({x: it.x, y: it.y + s.ground + f * s.storey + s.storey * 0.3, z: it.z, ry: it.ry, w: s.w + 0.08, h: s.storey * 0.4, d: s.d + 0.08, color: band});
      } else {
        // Window grid on the street front, as Building.tsx lays it out (one column every width / cols).
        const cols = Math.max(2, Math.floor(s.w / 2.6));
        const c = Math.cos(it.ry);
        const sn = Math.sin(it.ry);
        for (let f = 0; f < s.floors; f++) for (let k = 0; k < cols; k++) {
          const lx = -s.w / 2 + ((k + 0.5) * s.w) / cols;
          const lz = -s.d / 2 - 0.04;
          bands.push({x: it.x + lx * c + lz * sn, y: it.y + s.ground + f * s.storey + 0.6, z: it.z - lx * sn + lz * c, ry: it.ry, w: 1.1, h: 1.95, d: 0.08, color: PAL.glass});
        }
      }
      if (s.roof) roofs.push({x: it.x, y: it.y + wallH, z: it.z, ry: it.ry, w: s.w, h: 4.2, d: s.d, color: PAL.zinc});
    }
    return {walls, bands, roofs, crowns, trunks};
  }, [items]);
  return (
    <group>
      <Instances boxes={walls} geometry={BOX_UP} snow={snow} snowShare={0.15} />
      <Instances boxes={bands} geometry={BOX_UP} />
      <Instances boxes={roofs} geometry={MANSARD} snow={snow} snowShare={0.9} />
      <Instances boxes={trunks} geometry={BOX_UP} />
      <Instances boxes={crowns} geometry={CROWN} snow={snow} snowShare={0.6} />
    </group>
  );
};
