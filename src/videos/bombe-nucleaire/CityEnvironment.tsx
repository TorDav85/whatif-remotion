import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {Building} from '../../assets/Building';
import {Car, Bus} from '../../assets/Car';
import {Person, PEOPLE_PRESETS} from '../../assets/Person';
import {BOX, MANSARD, PRISM, Ball, Block, Cyl, PAL, seeded} from '../../assets/kit';
import {DetailBlocks, type DetailBlock} from '../../assets/details';
import {Bench, StreetLamp, Bollard, TrashBin, BusShelter, BicycleRack} from '../../assets/city/Street';
import {Tree, Planter} from '../../assets/city/Park';
import {Bicycle, TrafficLight, TrafficSign} from '../../assets/city/Mobility';
import {CafeTerrace, Kiosk, FireHydrant} from '../../assets/city/CityLife';
import {UrbanBackdrop} from '../../shared/three/UrbanBackdrop';
import {clamp01, smooth} from '../../core/animation';
import {CITY_CROSSINGS, cityRoadFootprints, debrisVariation, windowDamageAt} from './stability';

type V3 = [number, number, number];
type Piece = DetailBlock & {color: string};
type CityBuilding = {id: number; x: number; z: number; yaw: number; width: number; depth: number; floors: number; tone: number; awning: number; hero: boolean};
export type CityEnvironmentProps = {t: number; damage: number; shot?: string};

// One shared neighbourhood, with the same shops and street objects before and after the blast.
// Metres are staging units; damage is an illustration, not an engineering prediction.
const STONE = ['#eadcc1', '#dfcdb0', '#e4d4b8', '#d4c5ab', '#e8ddca'];
const ROOF = ['#61788a', '#6c7f8b', '#5b7081', '#738594'];
const SHOP = ['#773b3c', '#3c6352', '#916a44', '#334f5e'];
const IRON = '#2d4842';
const CROSS = CITY_CROSSINGS;
const FRONT = 9;
const nearCross = (z: number, margin = 0) => CROSS.some((c) => Math.abs(z - c) < 6 + margin);
const reserved = (x: number, z: number) => x > 5.0 && x < 10 && z > 2.5 && z < 12.5;

const BUILDINGS: CityBuilding[] = (() => {
  const r = seeded(732107);
  const out: CityBuilding[] = [];
  const add = (x: number, z: number, yaw: number, width: number, depth: number, hero = false) => out.push({
    id: out.length, x, z, yaw, width, depth, floors: 4 + Math.floor(r() * 3),
    tone: Math.floor(r() * STONE.length), awning: Math.floor(r() * SHOP.length), hero,
  });
  // Main avenue: real party walls, breaks at intersections, and a reserved basement entry.
  for (const side of [-1, 1]) {
    for (let row = 0; row < CROSS.length - 1; row++) {
      const a = CROSS[row] + 7, b = CROSS[row + 1] - 7;
      const segments = side === 1 && a < 8 && b > 8 ? [[a, 4.8], [11.2, b]] : [[a, b]];
      for (const [from, to] of segments) {
        const count = Math.max(1, Math.round((to - from) / 13));
        const width = (to - from) / count;
        for (let n = 0; n < count; n++) {
          const z = from + width * (n + 0.5);
          add(side * (FRONT + 6), z, side * Math.PI / 2, width - 0.07, 12, z > -58 && z < 35);
        }
      }
    }
  }
  // Courtyard and secondary street buildings: visible detail on all four sides.
  // Their spacing forms continuous streets rather than isolated, repeated ground tiles.
  for (const side of [-1, 1]) for (let col = 0; col < 5; col++) {
    const x = side * (38 + col * 43);
    for (let row = 0; row < 16; row++) {
      const z = 148 - row * 30 + (col % 2) * 8;
      if (nearCross(z, 4)) continue;
      add(x + (r() - 0.5) * 1.4, z, 0, 23 + r() * 4, 21 + r() * 3);
    }
  }
  // Beyond the first aerial composition, the roofs remain articulated and fenestrated.
  for (const side of [-1, 1]) for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 15; row++) {
      const z = 180 - row * 37;
      if (nearCross(z, 3)) continue;
      add(side * (260 + col * 39), z, 0, 26 + r() * 3, 25 + r() * 3);
    }
  }
  return out;
})();

export const CITY_LANDMARKS = {
  cafe: {facade: [-9, 3.9, -29.67] as V3, terrace: [-7.9, 0.15, -26] as V3},
  brokenWindow: {facade: [-9, 5.9, -4.99] as V3, buildingCentre: [-15, 0, -2.33] as V3},
  openedBuilding: {facade: [-9, 10.4, -110.33] as V3, buildingCentre: [-15, 0, -110.33] as V3},
  shelter: {entry: [8.7, 0.65, 8] as V3, clearApproach: [5.8, 0.15, 8] as V3},
} as const;

const instanceObject = new THREE.Object3D();
/** Full architecture is grouped by geometry; the colour still varies per stone or window. */
const Pieces: React.FC<{items: Piece[]; geometry?: THREE.BufferGeometry; metal?: boolean}> = ({items, geometry = BOX, metal = false}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    items.forEach((piece, i) => {
      instanceObject.position.set(...piece.p);
      instanceObject.rotation.set(...(piece.r ?? [0, 0, 0]));
      instanceObject.scale.set(...piece.s);
      instanceObject.updateMatrix();
      mesh.setMatrixAt(i, instanceObject.matrix);
      mesh.setColorAt(i, color.set(piece.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  if (!items.length) return null;
  return <instancedMesh key={items.length} ref={ref} args={[geometry, undefined, items.length]}>
    <meshStandardMaterial roughness={metal ? 0.48 : 0.85} metalness={metal ? 0.24 : 0} flatShading/>
  </instancedMesh>;
};

const blastAt = (b: {x: number; z: number}, t: number, damage: number) => {
  const distance = Math.hypot(b.x, b.z + 120);
  const arrival = 16.1 + distance * 0.013;
  const travelled = smooth(arrival, arrival + 1.3, t) * clamp01(damage);
  return travelled * (1 - smooth(25, 240, distance) * 0.77);
};

const Architecture: React.FC<{t: number; damage: number}> = ({t, damage}) => {
  // After the shock has passed, the full detailed city becomes a stable frame-independent plan.
  const phase = damage > 0 ? Math.min(28, Math.round(t * 8) / 8) : 0;
  const plan = useMemo(() => {
    const stone: Piece[] = [], frames: Piece[] = [], iron: Piece[] = [], glass: Piece[] = [];
    const roof: Piece[] = [], dormerRoofs: Piece[] = [], colour: Piece[] = [], scars: Piece[] = [], rubble: Piece[] = [];
    for (const b of BUILDINGS) {
      const d = blastAt(b, phase, damage);
      const severe = d > 0.72 && !b.hero;
      const rnd = seeded(11489 + b.id * 11);
      const wallH = 4.2 + b.floors * 3.1;
      const wallColor = new THREE.Color(STONE[b.tone]).lerp(new THREE.Color('#9a8e7d'), d * (0.12 + rnd() * 0.18)).getStyle();
      const roofColor = ROOF[b.id % ROOF.length];
      const roofGone = severe && b.id % 4 !== 0;
      const world = (x: number, y: number, z: number): V3 => [b.x + Math.cos(b.yaw) * x + Math.sin(b.yaw) * z, y + 0.15, b.z - Math.sin(b.yaw) * x + Math.cos(b.yaw) * z];
      const put = (list: Piece[], p: V3, s: V3, color: string, yaw = 0, rz = 0) => list.push({p: world(...p), s, r: [0, b.yaw + yaw, rz], color});

      if (!b.hero) {
        if (!severe) put(stone, [0, wallH / 2, 0], [b.width, wallH, b.depth], wallColor);
        else {
          // Missing wall panels expose real floors, partitions and columns; no uniform scaling.
          for (let floor = 0; floor <= b.floors; floor++) {
            const y = floor === 0 ? 0.14 : 4.15 + (floor - 1) * 3.1;
            put(stone, [0, y, 0], [b.width - (floor > 3 ? (b.id % 3) * 2.5 : 0), 0.2, b.depth], '#b1a894');
            if (floor < b.floors) {
              put(stone, [b.width * 0.28, y + 1.45, 0], [0.25, 2.9, b.depth * 0.72], '#79786c');
              for (const side of [-1, 1]) put(stone, [side * b.width * 0.43, y + 1.4, b.depth * 0.3], [0.32, 2.8, 0.32], '#9b988b');
            }
          }
        }
        if (!roofGone) put(roof, [0, wallH, 0], [b.width + 0.15, 4.2, b.depth + 0.1], roofColor);
        else {
          for (let rafter = 0; rafter < 6; rafter++) put(iron, [-b.width * 0.43 + rafter * b.width * 0.17, wallH + 0.5, 0], [0.16, 0.2, b.depth * 0.85], '#5a4c3a', 0, rafter % 2 ? 0.1 : -0.08);
        }
      }

      const faces = [
        {angle: 0, x: 0, z: -b.depth / 2, width: b.width, primary: true},
        {angle: Math.PI, x: 0, z: b.depth / 2, width: b.width, primary: false},
        {angle: Math.PI / 2, x: -b.width / 2, z: 0, width: b.depth, primary: false},
        {angle: -Math.PI / 2, x: b.width / 2, z: 0, width: b.depth, primary: false},
      ];
      for (const [faceIndex, face] of faces.entries()) {
        const ca = Math.cos(face.angle), sa = Math.sin(face.angle);
        const facePut = (list: Piece[], u: number, y: number, forward: number, s: V3, color: string, rz = 0) => put(list,
          [face.x + ca * u + sa * forward, y, face.z - sa * u + ca * forward], s, color, face.angle, rz);
        const cols = Math.max(2, Math.floor(face.width / 2.6));
        const frontBuilt = b.hero && face.primary;
        const balcony = faceIndex < 2;
        for (let floor = 0; floor < b.floors; floor++) {
          const base = 4.2 + floor * 3.1;
          if (!frontBuilt) facePut(stone, 0, base, -0.1, [face.width + 0.04, 0.12, 0.24], '#c8bba1');
          for (let col = 0; col < cols; col++) {
            const u = -face.width / 2 + (col + 0.5) * face.width / cols;
            const y = base + 1.55;
            const lostWall = severe && ((floor * 7 + col * 3 + b.id + faceIndex) % 6 > 1);
            const {broken, scarHeight} = windowDamageAt(d, b.id, faceIndex, floor, col);
            if (severe && !lostWall) facePut(stone, u, y, 0.175, [face.width / cols, 2.95, 0.35], wallColor);
            if (lostWall) {
              // Jagged masonry edges and exposed vertical frames around the missing sections.
              facePut(scars, u - 0.8, base + 0.45, -0.12, [0.42, scarHeight, 0.48], '#8b8170', 0.15);
              continue;
            }
            if (!frontBuilt) {
              facePut(frames, u, y, -0.08, [1.38, 2.24, 0.12], '#f0e6d2');
              facePut(glass, u, y, -0.155, [1.08, 1.97, 0.055], broken ? '#1a2428' : (b.id + col + floor) % 11 === 0 ? '#b1c4c6' : '#39545f');
              facePut(stone, u, y - 1.17, -0.22, [1.6, 0.14, 0.34], wallColor);
              facePut(stone, u, y + 1.24, -0.13, [1.53, 0.14, 0.25], wallColor);
              if (!broken) {
                facePut(frames, u, y, -0.2, [0.055, 1.96, 0.035], '#e9dec8');
                facePut(frames, u, y + 0.22, -0.2, [1.08, 0.055, 0.035], '#e9dec8');
              }
            } else if (broken) facePut(glass, u, y, -0.25, [0.99, 1.9, 0.035], '#19252a');
            if (broken) {
              // Two surviving triangles of glass and a displaced crossbar read as breakage.
              facePut(colour, u - 0.34, y - 0.65, -0.28, [0.18, 0.46, 0.03], '#9eb5b8', 0.24);
              facePut(frames, u + 0.15, y + 0.31, -0.28, [0.77, 0.045, 0.035], '#c2bba9', -0.24);
              if ((col + floor + b.id) % 3 === 0) facePut(scars, u + 0.73, y + 0.62, -0.25, [0.035, 1.28, 0.025], '#5b574e', -0.21);
            }
          }
          if (balcony && (floor === 1 || floor === b.floors - 1) && !frontBuilt) {
            facePut(stone, 0, base + 0.44, -0.47, [face.width - 0.3, 0.16, 0.95], wallColor);
            facePut(iron, 0, base + 1.35, -0.9, [face.width - 0.4, 0.06, 0.065], IRON);
            facePut(iron, 0, base + 0.59, -0.9, [face.width - 0.4, 0.045, 0.05], IRON);
            const rails = Math.floor(face.width / 0.32);
            for (let k = 0; k < rails; k++) {
              if (d > 0.45 && (k + b.id) % 8 < 2) continue;
              facePut(iron, -face.width / 2 + 0.3 + k * 0.32, base + 0.93, -0.9, [0.027, 0.79, 0.035], IRON);
            }
          }
        }
        if (!frontBuilt) {
          facePut(stone, 0, wallH - 0.25, -0.25, [face.width, 0.5, 0.46], wallColor);
          for (let shop = 0; shop < Math.max(2, Math.floor(face.width / 4)); shop++) {
            const u = -face.width / 2 + 2 + shop * 4;
            facePut(colour, u, 1.8, -0.16, [3.1, 3.35, 0.12], '#31484c');
            facePut(colour, u, 3.62, -0.2, [3.4, 0.42, 0.14], SHOP[b.awning]);
            facePut(frames, u - 1.54, 1.8, -0.24, [0.11, 3.38, 0.09], '#c7b593');
            facePut(frames, u, 1.7, -0.24, [0.08, 3.1, 0.07], '#aa9d83');
          }
        }
        // Rainwater pipe, gutter, and stone corner quoins survive the wide shots.
        facePut(iron, -face.width / 2 + 0.18, wallH / 2, -0.2, [0.085, wallH - 0.3, 0.085], '#5a706d');
        if (faceIndex < 2 && !roofGone) {
          facePut(iron, 0, wallH + 0.05, -0.2, [face.width + 0.18, 0.12, 0.17], '#526b79');
          const dormers = Math.max(2, Math.floor(face.width / 3.8));
          if (!frontBuilt) for (let k = 0; k < dormers; k++) {
            const u = (k + 0.5) * face.width / dormers - face.width / 2;
            facePut(stone, u, wallH + 1.36, 1.0, [1.08, 1.52, 0.9], wallColor);
            facePut(glass, u, wallH + 1.36, 0.525, [0.72, 1.1, 0.045], '#364e5c');
            facePut(dormerRoofs, u, wallH + 2.13, 1, [1.28, 0.58, 1.06], roofColor);
          }
        }
      }
      if (!roofGone) {
        // Roof seams, ridges, pots and aerials remain visible from the elevated cuts.
        put(iron, [0, wallH + 4.23, 0], [b.width * 0.72, 0.065, 0.09], '#8299a6');
        for (let k = 0; k < 4; k++) put(iron, [-b.width * 0.3 + k * b.width * 0.2, wallH + 4.23, 0], [0.045, 0.035, b.depth * 0.67], '#8299a6');
        if (!b.hero) for (const side of [-1, 1]) {
          put(colour, [side * b.width * 0.3, wallH + 3.8, b.depth * 0.15], [1.25, 1.7, 0.7], '#a66e50');
          for (const pot of [-0.38, 0, 0.38]) put(colour, [side * b.width * 0.3 + pot, wallH + 4.8, b.depth * 0.15], [0.17, 0.36, 0.18], '#b97953');
        }
        if (b.id % 3 === 0) {
          put(iron, [b.width * 0.16, wallH + 5.1, 0], [0.045, 1.8, 0.045], IRON);
          put(iron, [b.width * 0.16, wallH + 5.7, 0], [1.8, 0.04, 0.045], IRON);
        }
      }
      if (d > 0.19) {
        const amount = Math.ceil((b.hero ? 16 : severe ? 45 : 10) * d);
        for (let k = 0; k < amount; k++) {
          const variation = debrisVariation(b.id, k);
          const x = (variation[0] - 0.5) * (b.width + 5), z = -b.depth / 2 - variation[1] * 4;
          const p = world(x, 0, z);
          if (reserved(p[0], p[2])) continue;
          const size: V3 = [0.18 + variation[2] * 0.88, 0.12 + variation[3] * 0.38, 0.23 + variation[4] * 0.9];
          p[1] = (Math.abs(p[0]) > 7 ? 0.15 : 0.025) + size[1] / 2;
          rubble.push({p, s: size, r: [variation[5] * 0.35, variation[6] * Math.PI, variation[7] * 0.24], color: k % 5 === 0 ? '#7497a1' : k % 4 === 0 ? ROOF[b.id % 4] : wallColor});
        }
      }
    }
    return {stone, frames, iron, glass, roof, dormerRoofs, colour, scars, rubble};
  }, [phase, damage]);
  return <group>
    {BUILDINGS.filter((b) => b.hero).map((b) => <group key={b.id} position={[b.x, 0.15, b.z]} rotation={[0, b.yaw, 0]}>
      <Building width={b.width} depth={b.depth} floors={b.floors} stone={STONE[b.tone]} roof={ROOF[b.id % 4]} awning={SHOP[b.awning]} seed={b.id + 731} corniceOverhang={0} details/>
    </group>)}
    <Pieces items={plan.stone}/><Pieces items={plan.frames}/><Pieces items={plan.iron} metal/>
    <Pieces items={plan.glass}/><Pieces items={plan.roof} geometry={MANSARD}/>
    <Pieces items={plan.dormerRoofs} geometry={PRISM}/><Pieces items={plan.colour}/>
    <Pieces items={plan.scars}/><Pieces items={plan.rubble}/>
  </group>;
};

const GROUND_PLAN = (() => {
  const road: DetailBlock[] = [], curb: DetailBlock[] = [], paving: DetailBlock[] = [], joints: DetailBlock[] = [], marks: DetailBlock[] = [], drains: DetailBlock[] = [];
  for (const rect of cityRoadFootprints()) road.push({
    p: [(rect.minX + rect.maxX) / 2, -0.04, (rect.minZ + rect.maxZ) / 2],
    s: [rect.maxX - rect.minX, 0.08, rect.maxZ - rect.minZ],
  });
  for (const side of [-1, 1]) {
    for (let z = -320; z < 190; z += 1.0) {
      if (nearCross(z, 0.6)) continue;
      const x = side * 7.03;
      const stair = side > 0 && z >= 6 && z <= 10;
      if (!stair) curb.push({p: [x, 0.06, z], s: [0.23, 0.21, 0.96]});
      if (!stair || z === 6 || z === 10) {
        const tileZ = stair ? z === 6 ? 5.95 : 10.05 : z;
        const length = stair ? 0.9 : 0.98;
        paving.push({p: [side * 8.05, 0.07, tileZ], s: [1.83, 0.14, length]});
        joints.push({p: [side * 8.05, 0.154, tileZ], s: [0.018, 0.012, length]});
      }
      if (Math.abs(z) < 85 && z % 12 === 0) for (let bar = 0; bar < 7; bar++) drains.push({p: [side * 6.65, 0.005, z + bar * 0.055], s: [0.38, 0.018, 0.023]});
    }
  }
  // Five well-spaced pedestrian crossings and parking bays establish a real road layout.
  for (const z of CROSS) for (const side of [-1, 1]) for (let stripe = 0; stripe < 9; stripe++) {
    marks.push({p: [-5.8 + stripe * 1.45, 0.014, z + side * 8.3], s: [0.65, 0.018, 2.7]});
  }
  for (let z = -320; z < 190; z += 6) {
    if (nearCross(z, 5)) continue;
    marks.push({p: [0, 0.012, z], s: [0.13, 0.018, 2.6]});
    for (const side of [-1, 1]) {
      marks.push({p: [side * 3.65, 0.012, z], s: [0.085, 0.018, 5.8]});
      marks.push({p: [side * 5.25, 0.012, z + 2.9], s: [3.1, 0.018, 0.08]});
    }
  }
  return {road, curb, paving, joints, marks, drains};
})();

const Ground: React.FC = () => <group>
  {/* Four large terrain surfaces retain a real hole for the basement stairwell. */}
  <Block p={[-2496.525, -0.28, -100]} s={[5006.95, 0.2, 10000]} c="#8d958a"/>
  <Block p={[2504.625, -0.28, -100]} s={[4990.75, 0.2, 10000]} c="#8d958a"/>
  <Block p={[8.1, -0.28, -2496.8]} s={[2.3, 0.2, 5006.4]} c="#8d958a"/>
  <Block p={[8.1, -0.28, 2504.8]} s={[2.3, 0.2, 4990.4]} c="#8d958a"/>
  <DetailBlocks blocks={GROUND_PLAN.road} color="#4b565b"/>
  <DetailBlocks blocks={GROUND_PLAN.curb} color="#c6c4b7"/>
  <DetailBlocks blocks={GROUND_PLAN.paving} color="#c5bfae"/>
  <DetailBlocks blocks={GROUND_PLAN.joints} color="#918e83"/>
  <DetailBlocks blocks={GROUND_PLAN.marks} color="#e9e1c9"/>
  <DetailBlocks blocks={GROUND_PLAN.drains} color="#263c3a" metal/>
</group>;

type StreetItem = {x: number; z: number; side: number; kind: 'tree' | 'lamp' | 'bench' | 'bin' | 'bollard'};
const FURNITURE: StreetItem[] = (() => {
  const out: StreetItem[] = [];
  for (const side of [-1, 1]) for (let z = -270; z <= 110; z += 13.5) {
    if (nearCross(z, 3) || reserved(side * 7.6, z)) continue;
    const i = out.length;
    out.push({x: side * 7.56, z, side, kind: i % 4 === 0 ? 'bench' : i % 4 === 2 ? 'lamp' : 'tree'});
    if (i % 5 === 0) out.push({x: side * 7.35, z: z + 3.3, side, kind: 'bin'});
  }
  for (const z of CROSS.filter((v) => v > -180 && v < 95)) for (const side of [-1, 1]) {
    for (const dz of [-8, 8]) out.push({x: side * 7.2, z: z + dz, side, kind: 'bollard'});
  }
  return out;
})();

const VEHICLES = (() => {
  const r = seeded(201671);
  const colors = ['#8f3c3b', '#325b73', '#d6d2bc', '#42705b', '#b48743', '#6e7a80'];
  const out: {x: number; z: number; side: number; color: string; variant: 'berline' | 'citadine' | 'utilitaire'}[] = [];
  for (const side of [-1, 1]) for (let z = -240; z < 100; z += 9 + r() * 4) {
    if (nearCross(z, 6) || (z > -4 && z < 18 && side > 0) || r() < 0.26) continue;
    out.push({x: side * 5.3, z, side, color: colors[Math.floor(r() * colors.length)], variant: r() < 0.3 ? 'citadine' : r() > 0.88 ? 'utilitaire' : 'berline'});
  }
  return out;
})();

const ShopSign: React.FC<{label: string; color: string; width: number}> = ({label, color, width}) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f0dfbc'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 57px Georgia'; ctx.fillText(label, 384, 52, 710);
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace; return result;
  }, [label, color]);
  return <mesh position={[0, 3.98, -0.4]}><planeGeometry args={[width, 0.62]}/><meshBasicMaterial map={texture} toneMapped={false}/></mesh>;
};

const Commerce: React.FC<{t: number; damage: number}> = ({t, damage}) => <group>
  {BUILDINGS.filter((b) => b.hero && b.z > -32 && b.z < 34).map((b, i) => <group key={b.id} position={[b.x, 0.15, b.z]} rotation={[0, b.yaw, 0]}>
    <group position={[0, 0, -b.depth / 2]}><ShopSign label={['LE PETIT BISTROT', 'LIBRAIRIE', 'BOULANGERIE', 'FLEURISTE'][i % 4]} color={SHOP[b.awning]} width={Math.min(10, b.width - 0.7)}/></group>
  </group>)}
  {[-26, -31].map((z, i) => <group key={z} position={[-7.9, 0.15, z]} rotation={[0, Math.PI / 2, 0.14 * blastAt({x: -7.9, z}, t, damage)]}>
    <CafeTerrace color={i ? '#416452' : '#853d3b'} umbrella={i === 0}/>
  </group>)}
  <group position={[-7.7, 0.15, 23]} rotation={[0, Math.PI / 2, 0]}><Kiosk color="#365f51"/></group>
  <group position={[7.9, 0.15, -48]} rotation={[0, -Math.PI / 2, 0]}><BusShelter color={IRON}/></group>
  <group position={[-7.8, 0.15, -56]} rotation={[0, Math.PI / 2, 0]}><BicycleRack spaces={3}/></group>
  <group position={[-7.5, 0.15, -55.4]} rotation={[0, 0.1, 0]}><Bicycle color="#8c423e"/></group>
  <group position={[7.85, 0.15, -2]}><Planter color="#a76b4f" flowers="#e5bd6c"/></group>
  <group position={[-7.8, 0.15, 4]}><FireHydrant color="#9b4b3b"/></group>
  {[-16, 38, -70].map((z) => <React.Fragment key={z}>
    <group position={[-7.2, 0.15, z - 8]}><TrafficLight state={t < 8 ? 'green' : 'red'}/></group>
    <group position={[7.2, 0.15, z + 8]} rotation={[0, Math.PI, 0]}><TrafficLight state="red"/></group>
  </React.Fragment>)}
  <group position={[-7.2, 0.15, 15]} rotation={[0, Math.PI / 2, 0]}><TrafficSign kind="parking"/></group>
</group>;

/** Reuses the intact tree's exact seeded crown locations as individual clusters are lost. */
const BlastTree: React.FC<{height: number; seed: number; damage: number; foliage: string}> = ({height, seed, damage, foliage}) => {
  if (damage < 0.4) return <Tree height={height} seed={seed} foliage={foliage}/>;
  const random = seeded(seed);
  const wood = new THREE.Color('#866247').lerp(new THREE.Color('#4f4b3b'), smooth(0.38, 0.95, damage)).getStyle();
  const leaf = new THREE.Color(foliage).lerp(new THREE.Color('#746a49'), smooth(0.35, 0.75, damage)).lerp(new THREE.Color('#494737'), smooth(0.6, 1, damage)).getStyle();
  return <group>
    <Cyl p={[0, height * 0.3, 0]} rad={height * 0.035} h={height * 0.6} c={wood} seg={7}/>
    {[0, 1, 2, 3, 4].map((i) => {
      const a = i * 2.4;
      return <group key={i} rotation={[0, a, 0]}>
        <Cyl p={[height * 0.065, height * (0.56 + i % 2 * 0.045), 0]} rad={height * 0.012} h={height * 0.3} r={[0, 0, -0.45]} c={wood} seg={5}/>
      </group>;
    })}
    {Array.from({length: 7}, (_, i) => {
      const a = i * 2.4;
      const distance = (0.3 + random() * 0.3) * height * 0.25;
      const p: V3 = [Math.cos(a) * distance, height * (0.64 + random() * 0.16), Math.sin(a) * distance];
      const radius = height * (0.2 + random() * 0.05);
      const retained = 1 - smooth(0.44 + i % 3 * 0.08, 0.79 + i % 2 * 0.12, damage);
      return retained > 0.02 ? <Ball key={i} p={p} rad={radius * retained} c={leaf} s={[1, 1.15, 1]}/> : null;
    })}
  </group>;
};

/** Local broken glass and uneven scorch patches preserve each car's recognisable paint. */
const VehicleScars: React.FC<{damage: number; variant: 'berline' | 'citadine' | 'utilitaire'}> = ({damage, variant}) => {
  const amount = smooth(0.26, 0.82, damage);
  if (!amount) return null;
  const small = variant === 'citadine', van = variant === 'utilitaire';
  const width = small ? 1.65 : 1.8;
  const cabin = small ? 2.1 : 2.3;
  const cabinZ = small ? 0.15 : 0.2;
  const patches: DetailBlock[] = [];
  for (const side of [-1, 1]) {
    patches.push({p: [side * (width / 2 + 0.018), 0.66, 0.32], s: [0.025, 0.27 * amount, 0.9 * amount], r: [0.15, 0, 0]});
    patches.push({p: [side * (width / 2 + 0.019), 0.8, -0.53], s: [0.026, 0.1 * amount, 0.41 * amount], r: [0.23, 0, 0]});
    if (!van && damage > 0.48) patches.push({p: [side * (width / 2 - 0.052), 1.22, cabinZ], s: [0.025, 0.43, cabin - 0.15]});
  }
  return <group>
    <DetailBlocks blocks={patches} color="#38382f"/>
    {damage > 0.55 && <>
      <Block p={[0, van ? 1.55 : 1.22, van ? -1.525 : cabinZ - cabin / 2 - 0.018]} s={[width - 0.24, van ? 0.54 : 0.43, 0.025]} c="#18272b"/>
      <Block p={[-0.48, van ? 1.38 : 1.07, van ? -1.548 : cabinZ - cabin / 2 - 0.04]} s={[0.26, 0.085, 0.03]} r={[0, 0, 0.2]} c="#92b1b6"/>
    </>}
    {damage > 0.75 && <Block p={[width / 2 + 0.23, 0.09, 0.5]} s={[0.3, 0.065, 0.17]} r={[0.2, 0.9, -0.3]} c={PAL.chrome} metal/>}
  </group>;
};

/** Exterior set only: lighting, Marc, the actual shelter entry and VFX belong to Scene3D. */
export const CityEnvironment: React.FC<CityEnvironmentProps> = ({t, damage, shot}) => {
  const trafficClock = Math.min(t, 8);
  return <group name={`bombe-neighbourhood-${shot ?? 'exterior'}`}>
    <Ground/>
    <UrbanBackdrop seed={7419} radius={1800} parcels={1700} cz={-170} river={false}
      exclude={{minX: -390, maxX: 390, minZ: -365, maxZ: 225}}/>
    <Architecture t={t} damage={damage}/>
    <Commerce t={t} damage={damage}/>
    {FURNITURE.map((item, i) => {
      const d = blastAt(item, t, damage);
      const tilt = d > 0.47 && i % 3 === 0 ? (d - 0.47) * (item.side > 0 ? -1 : 1) * 1.7 : 0;
      return <group key={i} position={[item.x, 0.15, item.z]} rotation={[tilt * 0.2, item.kind === 'bench' ? item.side * Math.PI / 2 : 0, tilt]}>
        {item.kind === 'tree' ? <BlastTree height={5.2 + i % 3 * 0.35} seed={i + 74} damage={d} foliage={['#53785e', '#648363', '#496d55'][i % 3]}/>
          : item.kind === 'lamp' ? <StreetLamp height={4.8} color={IRON}/>
          : item.kind === 'bench' ? <Bench color="#927052" details/>
          : item.kind === 'bin' ? <TrashBin color="#3e6654"/>
          : <Bollard color={IRON}/>}
      </group>;
    })}
    {VEHICLES.map((v, i) => {
      const d = blastAt(v, t, damage);
      return <group key={i} position={[v.x + (d > 0.6 ? (d - 0.6) * 1.4 : 0), 0, v.z]} rotation={[0, v.side > 0 ? 0 : Math.PI + d * 0.16, d > 0.6 ? (d - 0.6) * 0.4 : 0]}>
        <Car color={new THREE.Color(v.color).lerp(new THREE.Color('#534d40'), smooth(0.32, 0.94, d) * 0.66).getStyle()} variant={v.variant} details/>
        <VehicleScars damage={d} variant={v.variant}/>
      </group>;
    })}
    <group position={[-1.8, 0, -51 + trafficClock * 3.2]} rotation={[0, Math.PI, 0]}><Bus color="#3c705c" wheelSpin={trafficClock * 10} details/></group>
    <group position={[1.8, 0, 32 - trafficClock * 4.2]}><Car color="#baaa75" variant="taxi" wheelSpin={trafficClock * 12} details/></group>
    {t < 8 && [-52, -34, -11, 27, 46].map((z, i) => <group key={z} position={[i % 2 ? -7.5 : 7.35, 0.15, z + trafficClock * (i % 2 ? 0.42 : -0.36)]} rotation={[0, i % 2 ? Math.PI : 0, 0]}>
      <Person {...PEOPLE_PRESETS[i % (PEOPLE_PRESETS.length - 1)]} pose="marche" phase={t * 6 + i}/>
    </group>)}
  </group>;
};
