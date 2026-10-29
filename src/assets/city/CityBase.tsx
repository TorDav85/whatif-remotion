import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {BOX_UP, PAL, seeded} from '../kit';
import {Building} from '../Building';
import {Car, Bus} from '../Car';
import {Person, PEOPLE_PRESETS} from '../Person';
import {Barge, TourBoat} from '../Boat';
import {EiffelTower} from '../EiffelTower';
import {SkyDome} from '../../shared/three/SkyDome';
import {useGlowTexture} from '../../shared/three/common';
import {Bench, StreetLamp, Bollard, TrashBin, BusShelter, BicycleRack} from './Street';
import {Tree, Planter} from './Park';
import {TrafficLight} from './Mobility';
import {CafeTerrace, Kiosk} from './CityLife';

/**
 * Reusable Parisian district: a main avenue along z crossed every BLOCK metres by side
 * streets, lined with Haussmann blocks. Units in metres; the avenue axis is x = 0 and the
 * camera usually looks toward -z (the Eiffel Tower closes the perspective).
 */
export type CityBaseProps = {
  /** seconds; drives traffic, pedestrians and lights */
  time?: number;
  /** 0 = day, 1 = night (windows, lamps, headlights) */
  lit?: number;
  eiffel?: boolean;
  seine?: boolean;
  seed?: number;
  ground?: string;
  skyTop?: string;
  skyBottom?: string;
  fogFar?: number;
  traffic?: boolean;
  crowd?: boolean;
  /** z around which street lamps cast real light at night (cost control) */
  focus?: number;
  children?: React.ReactNode;
};

type V3 = [number, number, number];

export const CITY = {
  roadHalf: 5,
  walk: 4,
  facade: 9,
  block: 44,
  crossHalf: 4,
  crossWalk: 3,
  zMin: -150,
  zMax: 60,
  lane: 1.6,
  parking: 4.1,
} as const;
const {roadHalf, facade, block, crossHalf, crossWalk, zMin, zMax} = CITY;
const CROSS_Z = [-132, -88, -44, 0, 44];
const crossFacade = crossHalf + crossWalk;
const nearCross = (z: number, margin: number) => CROSS_Z.some((c) => Math.abs(z - c) < crossHalf + margin);

/** Frontage segments along the avenue, between side streets. */
const SEGMENTS: [number, number][] = (() => {
  const edges = [zMin, ...CROSS_Z.flatMap((c) => [c - crossFacade, c + crossFacade]), zMax];
  const out: [number, number][] = [];
  for (let i = 0; i < edges.length; i += 2) if (edges[i + 1] - edges[i] > 4) out.push([edges[i], edges[i + 1]]);
  return out;
})();

const STONES = [PAL.cream, '#e6d9bf', '#dccfb3', '#e8d5b7', '#d6c6a6'];
const AWNINGS = ['#a8322b', '#2b5a8a', '#3a6a4a', '#8a6a2a', '#5a3a5a', null, null];

type Bld = {x: number; z: number; ry: number; width: number; floors: number; stone: string; awning: string | null; seed: number; depth?: number};

const fill = (r: () => number, from: number, to: number, place: (center: number, width: number) => void) => {
  const len = to - from;
  const n = Math.max(1, Math.round(len / 12));
  const weights = Array.from({length: n}, () => 0.75 + r() * 0.5);
  const sum = weights.reduce((a, b) => a + b, 0);
  let cursor = from;
  for (const w of weights) {
    const width = (w / sum) * len;
    place(cursor + width / 2, width - 0.05);
    cursor += width;
  }
};

const planBuildings = (seed: number): Bld[] => {
  const r = seeded(seed);
  const out: Bld[] = [];
  const pick = <T,>(list: T[]) => list[Math.floor(r() * list.length)];
  const make = (x: number, z: number, ry: number, width: number) =>
    out.push({x, z, ry, width, floors: 4 + Math.floor(r() * 3) + (r() > 0.85 ? 1 : 0), stone: pick(STONES), awning: pick(AWNINGS), seed: Math.floor(r() * 10000)});
  for (const side of [-1, 1]) {
    for (const [a, b] of SEGMENTS) {
      const first = out.length;
      fill(r, a, b, (z, w) => make(side * (facade + 6), z, side * Math.PI / 2, w));
      // Corner buildings get a windowed flank on the side street instead of a blank wall.
      const corners: [Bld, number, number][] = [];
      if (a > zMin) corners.push([out[first], a, 0]);
      if (b < zMax) corners.push([out[out.length - 1], b, Math.PI]);
      for (const [host, edge, ry] of corners) {
        out.push({...host, x: side * (facade + 6), z: edge + (ry === 0 ? 0.3 : -0.3), ry, width: 11.9, depth: 0.6, awning: null});
      }
    }
    for (const c of CROSS_Z) {
      for (const face of [-1, 1]) {
        const z = c + face * (crossFacade + 6);
        if (z < zMin || z > zMax) continue;
        fill(r, facade + 12, facade + 36, (x, w) => make(side * x, z, face > 0 ? 0 : Math.PI, w));
      }
    }
  }
  return out;
};

// ---------- Instanced background (far facades and skyline) ----------
type Box = {p: V3; s: V3; c: string};
const Boxes: React.FC<{items: Box[]}> = ({items}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.scale.set(...it.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(it.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[BOX_UP, undefined, items.length] as any}>
      <meshStandardMaterial flatShading roughness={0.9} />
    </instancedMesh>
  );
};

const planBackground = (seed: number, lit: number): Box[] => {
  const r = seeded(seed + 101);
  const out: Box[] = [];
  const glass = lit > 0.5 ? '#c9a45a' : '#4a5260';
  // The avenue continues into the haze: simple facades with roof and window bands.
  for (const side of [-1, 1]) {
    let z = zMin;
    while (z > -320) {
      const w = 10 + r() * 6;
      const h = 17 + r() * 6;
      const x = side * (facade + 6);
      const stone = STONES[Math.floor(r() * STONES.length)];
      out.push({p: [x, 0, z - w / 2], s: [12, h, w - 0.2], c: stone});
      out.push({p: [x + side * 0.6, h, z - w / 2], s: [10.5, 3.2, w - 0.6], c: PAL.zinc});
      for (let f = 0; f < 5; f++) out.push({p: [side * (facade - 0.02), 4.6 + f * 3.1, z - w / 2], s: [0.05, 1.4, w - 1.4], c: glass});
      z -= w;
    }
  }
  // Rooftop sea around the district.
  for (let i = 0; i < 260; i++) {
    const x = (r() > 0.5 ? 1 : -1) * (48 + r() * 160);
    const z = 80 - r() * 420;
    const w = 12 + r() * 18;
    const d = 12 + r() * 18;
    const h = 14 + r() * 12;
    out.push({p: [x, 0, z], s: [w, h, d], c: STONES[Math.floor(r() * STONES.length)]});
    out.push({p: [x, h, z], s: [w * 0.85, 3, d * 0.85], c: r() > 0.3 ? PAL.zinc : PAL.slate});
  }
  return out;
};

// ---------- Road surfaces and markings ----------
const Flat: React.FC<{p: V3; s: [number, number]; c: string; basic?: boolean}> = ({p, s, c, basic}) => (
  <mesh position={p} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={s} />
    {basic ? <meshBasicMaterial color={c} /> : <meshStandardMaterial color={c} roughness={0.75} />}
  </mesh>
);

const Roads: React.FC = () => {
  const len = zMax - zMin;
  const mid = (zMax + zMin) / 2;
  const marks = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let z = zMin + 2; z < zMax; z += 6) {
      if (nearCross(z, 4)) continue;
      out.push(<Flat key={`c${z}`} p={[0, 0.02, z]} s={[0.14, 3]} c="#ece6d6" basic />);
      for (const s of [-1, 1]) out.push(<Flat key={`p${s}${z}`} p={[s * 3.2, 0.02, z]} s={[0.1, 6]} c="#d8d2c2" basic />);
    }
    for (const c of CROSS_Z) {
      for (const face of [-1, 1]) {
        const zc = c + face * (crossHalf + 1.6);
        for (let x = -roadHalf + 0.5; x < roadHalf; x += 0.9) out.push(<Flat key={`zb${c}${face}${x}`} p={[x, 0.021, zc]} s={[0.45, 2.6]} c="#f1ece0" basic />);
        out.push(<Flat key={`st${c}${face}`} p={[face * roadHalf / 2, 0.021, c + face * (crossHalf + 3.3)]} s={[roadHalf, 0.35]} c="#f1ece0" basic />);
        for (const s of [-1, 1]) {
          const xc = s * (facade + 1.6);
          for (let z = c - crossHalf + 0.5; z < c + crossHalf; z += 0.9) out.push(<Flat key={`zx${c}${face}${s}${z}`} p={[xc, 0.021, z]} s={[2.6, 0.45]} c="#f1ece0" basic />);
        }
      }
      for (let x = facade + 6; x < 60; x += 6) for (const s of [-1, 1]) out.push(<Flat key={`cx${c}${s}${x}`} p={[s * x, 0.02, c]} s={[3, 0.14]} c="#ece6d6" basic />);
    }
    return out;
  }, []);
  return (
    <>
      <Flat p={[0, 0.01, mid]} s={[roadHalf * 2, len]} c="#3c3d42" />
      {CROSS_Z.map((c) => [-1, 1].map((s) => (
        <Flat key={`r${c}${s}`} p={[s * (roadHalf + 27.5), 0.01, c]} s={[55, crossHalf * 2]} c="#3c3d42" />
      )))}
      {/* Avenue sidewalks wrap the corners; side-street sidewalks start at the facade line. */}
      {[-1, 1].map((s) => {
        const edges = [zMin, ...CROSS_Z.flatMap((c) => [c - crossHalf, c + crossHalf]), zMax];
        const parts: React.ReactNode[] = [];
        for (let i = 0; i < edges.length; i += 2) {
          const a = edges[i];
          const b = edges[i + 1];
          parts.push(
            <mesh key={`w${s}${a}`} position={[s * (roadHalf + CITY.walk / 2), 0.075, (a + b) / 2]}>
              <boxGeometry args={[CITY.walk, 0.15, b - a]} />
              <meshStandardMaterial color={PAL.stone} flatShading roughness={0.85} />
            </mesh>,
            <mesh key={`k${s}${a}`} position={[s * (roadHalf + 0.1), 0.08, (a + b) / 2]}>
              <boxGeometry args={[0.2, 0.16, b - a]} />
              <meshStandardMaterial color="#b9ad93" flatShading />
            </mesh>,
          );
        }
        return parts;
      })}
      {CROSS_Z.map((c) => [-1, 1].map((s) => [-1, 1].map((face) => (
        <mesh key={`cw${c}${s}${face}`} position={[s * (facade + 25.5), 0.075, c + face * (crossHalf + crossWalk / 2)]}>
          <boxGeometry args={[51, 0.15, crossWalk]} />
          <meshStandardMaterial color={PAL.stone} flatShading roughness={0.85} />
        </mesh>
      ))))}
      {marks}
    </>
  );
};

// ---------- Street furniture, planned once ----------
type Item = {kind: string; p: V3; ry: number; v?: number};

const planFurniture = (seed: number): Item[] => {
  const r = seeded(seed + 7);
  const out: Item[] = [];
  const foliage = ['#608451', '#567a46', '#6a8d55', '#4f7240'];
  for (const s of [-1, 1]) {
    const face = s * Math.PI / 2;
    for (const [a, b] of SEGMENTS) {
      for (let z = a + 5; z < b - 4; z += 8) out.push({kind: 'tree', p: [s * 6.1, 0.15, z], ry: 0, v: Math.floor(r() * foliage.length)});
      for (let z = a + 9; z < b - 4; z += 16) out.push({kind: 'lamp', p: [s * 5.55, 0.15, z], ry: 0});
      const len = b - a;
      if (len > 20) {
        const zc = (a + b) / 2;
        const roll = r();
        if (roll < 0.35) out.push({kind: 'cafe', p: [s * 7.9, 0.15, zc - 3], ry: 0}, {kind: 'cafe', p: [s * 7.9, 0.15, zc + 3], ry: 0});
        else if (roll < 0.55) out.push({kind: 'shelter', p: [s * 6.6, 0.15, zc], ry: face});
        else out.push({kind: 'bench', p: [s * 6.9, 0.15, zc - 4], ry: face}, {kind: 'bench', p: [s * 6.9, 0.15, zc + 4], ry: face});
        out.push({kind: 'bin', p: [s * 5.8, 0.15, zc + 7.5], ry: 0});
        if (r() > 0.5) out.push({kind: 'bikes', p: [s * 6.4, 0.15, a + 3], ry: face});
        if (r() > 0.6) out.push({kind: 'planter', p: [s * 8.3, 0.15, b - 2.5], ry: 0});
      }
    }
    for (const c of CROSS_Z) {
      for (const face of [-1, 1]) {
        const z = c + face * (crossHalf + 0.5);
        for (let k = 0; k < 3; k++) out.push({kind: 'bollard', p: [s * (roadHalf + 0.45), 0.15, z + face * k * 1.2], ry: 0});
      }
      out.push({kind: 'light', p: [5.6, 0.15, c + crossHalf + 0.9], ry: Math.PI, v: c});
      out.push({kind: 'light', p: [-5.6, 0.15, c - crossHalf - 0.9], ry: 0, v: c});
    }
  }
  out.push({kind: 'kiosk', p: [-7.4, 0.15, -crossHalf - 2.2], ry: Math.PI / 2});
  return out;
};

const Furniture: React.FC<{items: Item[]; lit: number; focus: number}> = React.memo(({items, lit, focus}) => (
  <>
    {items.map((it, i) => {
      const key = `${it.kind}${i}`;
      const g = (child: React.ReactNode) => <group key={key} position={it.p} rotation={[0, it.ry, 0]}>{child}</group>;
      switch (it.kind) {
        case 'tree': return g(<Tree height={5.4} seed={i} foliage={['#608451', '#567a46', '#6a8d55', '#4f7240'][it.v ?? 0]} />);
        case 'lamp': return g(<StreetLamp lit={Math.abs(it.p[2] - focus) < 36 ? lit : 0} />);
        case 'cafe': return g(<CafeTerrace color={['#bb704f', '#8a322b', '#3f6b4a'][i % 3]} />);
        case 'shelter': return g(<BusShelter />);
        case 'bench': return g(<Bench />);
        case 'bin': return g(<TrashBin />);
        case 'bikes': return g(<BicycleRack spaces={3} />);
        case 'planter': return g(<Planter />);
        case 'bollard': return g(<Bollard />);
        case 'kiosk': return g(<Kiosk lit={lit} />);
        default: return null;
      }
    })}
  </>
));

const Static: React.FC<{seed: number; lit: number; eiffel: boolean; seine: boolean; ground: string; focus: number}> = React.memo(
  ({seed, lit, eiffel, seine, ground, focus}) => {
    const buildings = useMemo(() => planBuildings(seed), [seed]);
    const background = useMemo(() => planBackground(seed, lit), [seed, lit > 0.5]);
    const furniture = useMemo(() => planFurniture(seed), [seed]);
    return (
      <>
        <Flat p={[0, -0.01, -100]} s={[900, 900]} c={ground} />
        <Roads />
        {buildings.map((b, i) => (
          <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.ry, 0]}>
            <Building width={b.width} depth={b.depth ?? 12} floors={b.floors} stone={b.stone} awning={b.awning} lit={lit} seed={b.seed} />
          </group>
        ))}
        <Boxes items={background} />
        <Furniture items={furniture} lit={lit} focus={focus} />
        {eiffel && (
          <group position={[0, 0, -360]}>
            <EiffelTower height={120} lit={lit * 0.9} beacon={lit} />
          </group>
        )}
        {seine && (
          <group position={[0, 0, zMax + 22]}>
            <Flat p={[0, -1.2, 0]} s={[600, 36]} c="#41606e" />
            {[-1, 1].map((s) => (
              <mesh key={s} position={[0, -0.55, s * 19]}>
                <boxGeometry args={[600, 1.4, 2]} />
                <meshStandardMaterial color={PAL.stoneDark} flatShading />
              </mesh>
            ))}
            <group position={[-30, -1.2, -4]} rotation={[0, Math.PI / 2, 0]}><Barge /></group>
          </group>
        )}
      </>
    );
  },
);

// ---------- Moving parts ----------
const wrap = (z: number) => {
  const len = zMax - zMin;
  return ((((z - zMin) % len) + len) % len) + zMin;
};

export const CityBase: React.FC<CityBaseProps> = ({
  time = 0,
  lit = 0,
  eiffel = true,
  seine = false,
  seed = 42,
  ground = '#8a8478',
  skyTop = '#5b8fd1',
  skyBottom = '#e9e1cf',
  fogFar = 420,
  traffic = true,
  crowd = true,
  focus = 0,
  children,
}) => {
  const glow = useGlowTexture();
  const top = useMemo(() => new THREE.Color(skyTop), [skyTop]);
  const bottom = useMemo(() => new THREE.Color(skyBottom), [skyBottom]);
  const night = lit > 0.5;

  const parked = useMemo(() => {
    const r = seeded(seed + 3);
    const colors = ['#b8322a', '#2b5a8a', '#1d1d1f', '#e8e2d2', '#3f6b4a', '#8a6a2a', '#9aa3ab', '#d9b46a'];
    const out: {x: number; z: number; ry: number; color: string; variant: 'berline' | 'citadine' | 'taxi' | 'utilitaire'}[] = [];
    for (const s of [-1, 1]) {
      for (let z = zMin + 4; z < zMax - 3; z += 5.6 + r() * 1.6) {
        if (nearCross(z, 7) || r() < 0.22) continue;
        const v = r();
        out.push({x: s * CITY.parking, z, ry: s > 0 ? 0 : Math.PI, color: colors[Math.floor(r() * colors.length)],
          variant: v > 0.9 ? 'utilitaire' : v > 0.55 ? 'citadine' : 'berline'});
      }
    }
    return out;
  }, [seed]);

  const moving = useMemo(() => {
    const r = seeded(seed + 4);
    const colors = ['#b8322a', '#2b5a8a', '#e8e2d2', '#1d1d1f', '#3f6b4a', '#d9b46a'];
    return Array.from({length: 10}, (_, i) => {
      const dir = i % 2 ? 1 : -1;
      return {x: -dir * CITY.lane, z0: zMin + (i / 10) * (zMax - zMin) + r() * 8, dir, v: 8 + r() * 3,
        color: colors[Math.floor(r() * colors.length)], taxi: r() > 0.8};
    });
  }, [seed]);

  const walkers = useMemo(() => {
    const r = seeded(seed + 5);
    return Array.from({length: 40}, () => {
      const s = r() > 0.5 ? 1 : -1;
      return {x: s * (6.9 + r() * 1.6), z0: zMin + r() * (zMax - zMin), dir: r() > 0.5 ? 1 : -1, v: 1.1 + r() * 0.4,
        ph: r() * 10, preset: PEOPLE_PRESETS[Math.floor(r() * (PEOPLE_PRESETS.length - 1))]};
    });
  }, [seed]);

  const signal = (c: number): 'red' | 'amber' | 'green' => {
    const p = (time + c * 0.37 + 100) % 14;
    return p < 7 ? 'green' : p < 8.5 ? 'amber' : 'red';
  };

  return (
    <>
      <SkyDome top={top} bottom={bottom} />
      <fog attach="fog" args={[bottom, 70, fogFar]} />
      <hemisphereLight color={top} groundColor="#8a7e6a" intensity={night ? 0.45 : 1.15} />
      <directionalLight color={night ? '#7a8cc8' : '#fff1d8'} intensity={night ? 0.25 : 1.55} position={[60, 80, 40]} />
      <ambientLight intensity={night ? 0.12 : 0.22} />
      {!night && (
        <sprite position={[160, 120, -420]} scale={[140, 140, 1]}>
          <spriteMaterial map={glow} color="#fff2cf" opacity={0.75} fog={false} depthWrite={false} transparent blending={THREE.AdditiveBlending} />
        </sprite>
      )}

      <Static seed={seed} lit={lit} eiffel={eiffel} seine={seine} ground={ground} focus={focus} />

      {CROSS_Z.map((c) => (
        <React.Fragment key={c}>
          <group position={[5.6, 0.15, c + crossHalf + 0.9]} rotation={[0, Math.PI, 0]}><TrafficLight state={signal(c)} /></group>
          <group position={[-5.6, 0.15, c - crossHalf - 0.9]}><TrafficLight state={signal(c)} /></group>
        </React.Fragment>
      ))}

      {parked.map((c, i) => (
        <group key={`pk${i}`} position={[c.x, 0, c.z]} rotation={[0, c.ry, 0]}>
          <Car color={c.color} variant={c.variant} lights={lit * 0.3} />
        </group>
      ))}

      {traffic && moving.map((c, i) => {
        const z = wrap(c.z0 + c.dir * c.v * time);
        return (
          <group key={`mv${i}`} position={[c.x, 0, z]} rotation={[0, c.dir > 0 ? Math.PI : 0, 0]}>
            <Car color={c.color} variant={c.taxi ? 'taxi' : 'berline'} lights={lit} wheelSpin={time * c.v * 3} />
          </group>
        );
      })}
      {traffic && [-1, 1].map((dir) => {
        const z = wrap(dir * 6 * time + (dir > 0 ? -60 : 20));
        return (
          <group key={`bus${dir}`} position={[-dir * CITY.lane, 0, z]} rotation={[0, dir > 0 ? Math.PI : 0, 0]}>
            <Bus lights={lit} wheelSpin={time * 12} />
          </group>
        );
      })}

      {crowd && walkers.map((w, i) => (
        <group key={`ped${i}`} position={[w.x, 0.15, wrap(w.z0 + w.dir * w.v * time)]} rotation={[0, w.dir > 0 ? Math.PI : 0, 0]}>
          <Person {...w.preset} pose="marche" phase={time * 6.5 * w.v + w.ph} />
        </group>
      ))}

      {children}
    </>
  );
};
