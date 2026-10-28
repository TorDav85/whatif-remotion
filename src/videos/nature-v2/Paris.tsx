import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig, sampleColor, useGlowTexture} from '../../shared/three/common';
import {SkyDome} from '../../shared/three/SkyDome';
import {rng, smooth} from '../../core/animation';
import {FPS, N, camAt, driveTime, flashAt, rainAt, seasonAt, sunElevAt, world} from './time';

// Géographie (mètres) : la Seine suit l'axe z, x = 0 au milieu du fleuve.
const WATER_Y = 0.3;
const QUAY_Y = 0.8; // berge basse
const STREET_Y = 4; // quai haut, niveau de la ville
const RIVER = 11;
const WALL = 14;
const FRONT = 22; // façades qui donnent sur la Seine
const BZ = -45; // le pont
const TOWER: [number, number, number] = [-55, STREET_Y, -260];
const STONE = [70, -135, -215]; // ponts de pierre (ils tiennent)
const nearBridge = (z: number, d: number) => [BZ, ...STONE].some((b) => Math.abs(z - b) < d);
const CITY_Z = 170; // la ville commence derrière la caméra aérienne
const ND = {x: 38, z0: -150, z1: -196}; // emprise de la cathédrale (rive droite)
const BOAT = {x: -1, z0: 100, speed: 4, brake: 6};

const BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const ROOF = new THREE.CylinderGeometry(0.42, Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0); // toit mansardé
const WINDOW = new THREE.PlaneGeometry(1.1, 1.7);
const TRUNK = new THREE.CylinderGeometry(0.15, 0.22, 1, 5).translate(0, 0.5, 0);
const CANOPY = new THREE.IcosahedronGeometry(1.6, 0);
const TUFT = new THREE.ConeGeometry(0.22, 1, 4).translate(0, 0.5, 0);
const POLE = new THREE.CylinderGeometry(0.07, 0.09, 1, 5).translate(0, 0.5, 0);
const BIRD = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-0.6, 0.12, 0, 0, 0, 0.18, 0, 0, -0.18, 0.6, 0.12, 0, 0, 0, -0.18, 0, 0, 0.18], 3),
  );
  g.computeVertexNormals();
  return g;
})();

const C = (h: string) => new THREE.Color(h);
const MOSS = C('#3d5a2c');
const RUST = C('#8a4a2b');
const SNOW = C('#eef2f5');
const AUTUMN = [C('#c8762a'), C('#d9a23a'), C('#a4462a')];
const lerpC = (out: THREE.Color, a: THREE.Color, b: THREE.Color, k: number) => out.copy(a).lerp(b, Math.max(0, Math.min(1, k)));

type Upd = (i: number, d: THREE.Object3D, c: THREE.Color) => void;

/** Mesh instancié recalculé à chaque frame à partir du temps (pas de useFrame). */
const Inst: React.FC<{count: number; geo: THREE.BufferGeometry; update: Upd; basic?: boolean; double?: boolean; opacity?: number}> = ({
  count,
  geo,
  update,
  basic,
  double,
  opacity,
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => ({d: new THREE.Object3D(), c: new THREE.Color()}), []);
  useLayoutEffect(() => {
    const m = ref.current!;
    const {d, c} = tmp;
    for (let i = 0; i < count; i++) {
      d.position.set(0, 0, 0);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);
      c.set('#ffffff');
      update(i, d, c);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor!.needsUpdate = true;
  });
  const side = double ? THREE.DoubleSide : THREE.FrontSide;
  const fade = opacity !== undefined ? {transparent: true, opacity, depthWrite: false} : {};
  return (
    <instancedMesh ref={ref} args={[geo, undefined, count] as any} frustumCulled={false} visible={opacity === undefined || opacity > 0.003}>
      {basic ? <meshBasicMaterial side={side} {...fade} /> : <meshStandardMaterial flatShading side={side} {...fade} />}
    </instancedMesh>
  );
};

/** Quadrupède low-poly (renard, sanglier, cerf), pattes qui marchent selon `walk`. */
const Beast: React.FC<{
  pos: [number, number, number];
  ry: number;
  scale: number;
  body: string;
  dark: string;
  walk: number;
  long?: number;
  tall?: number;
  tail?: string;
}> = ({pos, ry, scale, body, dark, walk, long = 1.2, tall = 0.8, tail}) => (
  <group position={pos} rotation={[0, ry, 0]} scale={scale}>
    <mesh position={[0, tall + 0.2, 0]}>
      <boxGeometry args={[0.45, 0.45, long]} />
      <meshStandardMaterial color={body} flatShading />
    </mesh>
    <mesh position={[0, tall + 0.45, -long / 2]} rotation={[0.5, 0, 0]}>
      <boxGeometry args={[0.22, 0.5, 0.22]} />
      <meshStandardMaterial color={body} flatShading />
    </mesh>
    <mesh position={[0, tall + 0.6, -long / 2 - 0.25]}>
      <boxGeometry args={[0.24, 0.22, 0.42]} />
      <meshStandardMaterial color={dark} flatShading />
    </mesh>
    {tail && (
      <mesh position={[0, tall + 0.2, long / 2 + 0.25]} rotation={[-1.1 + Math.sin(walk * 0.5) * 0.15, 0, 0]}>
        <boxGeometry args={[0.16, 0.6, 0.16]} />
        <meshStandardMaterial color={tail} flatShading />
      </mesh>
    )}
    {[-0.16, 0.16].flatMap((lx) =>
      [-long * 0.38, long * 0.38].map((lz, j) => (
        // pivot à la hanche
        <group key={`${lx}${lz}`} position={[lx, tall, lz]} rotation={[Math.sin(walk + (lx > 0 ? 0 : Math.PI) + j * Math.PI) * 0.45, 0, 0]}>
          <mesh position={[0, -tall / 2, 0]}>
            <boxGeometry args={[0.09, tall, 0.09]} />
            <meshStandardMaterial color={dark} />
          </mesh>
        </group>
      )),
    )}
  </group>
);

const wrap = (x: number, m: number) => ((x % m) + m) % m;

type Bld = {
  x: number; z: number; w: number; d: number; h: number; side: number; col: THREE.Color; ivyAt: number; falls: number;
  awn: number; chim: number; vines: number[];
};

const useCity = () =>
  useMemo(() => {
    const r = rng(41);
    const front: Bld[] = [];
    const back: Bld[] = [];
    const cream = () => new THREE.Color().setHSL(0.1 + r() * 0.02, 0.28 + r() * 0.1, 0.74 + r() * 0.08);
    const row = (out: Bld[], side: number, x: number, hMin: number, hVar: number) => {
      let z = CITY_Z;
      let n = 0;
      while (z > -470) {
        if (n++ % 4 === 3) z -= 9; // rue transversale
        const w = 10 + r() * 7;
        if (nearBridge(z - w / 2, 6) && x === FRONT + 5) {
          z -= 12; // dégagement au débouché du pont
          continue;
        }
        if (side > 0 && x < ND.x + 30 && z - w > ND.z1 - 4 && z < ND.z0 + 4) {
          z -= w; // parvis de la cathédrale
          continue;
        }
        const fr = r();
        out.push({
          x: side * x, z: z - w / 2, w: w - 0.2, d: 10, h: hMin + r() * hVar, side, col: cream(), ivyAt: r(),
          falls: fr < 0.45 ? 0.3 + fr * 0.6 : 0,
          awn: r() < 0.45 ? 1 + Math.floor(r() * 3) : 0, // store de café ou de boutique
          chim: r(),
          vines: [r(), r(), r(), r()],
        });
        z -= w;
      }
    };
    for (const side of [-1, 1]) {
      row(front, side, FRONT + 5, 15, 4);
      for (let k = 0; k < 5; k++) row(back, side, FRONT + 23 + k * 18, 14, 6);
    }
    // fenêtres des façades sur la Seine
    const wins: {b: Bld; y: number; z: number; thr: number; floor: number}[] = [];
    for (const b of front) {
      const cols = Math.max(2, Math.floor(b.w / 2.6));
      for (let f = 0; f < 5; f++)
        for (let c = 0; c < cols; c++)
          wins.push({b, y: STREET_Y + 4.2 + f * 2.8, z: b.z - b.w / 2 + ((c + 0.5) * b.w) / cols, thr: r(), floor: f});
    }
    return {front, back, wins};
  }, []);

const collapseOf = (b: Bld, collapse: number) => (b.falls ? b.falls * smooth(b.ivyAt * 0.5, b.ivyAt * 0.5 + 0.5, collapse) : 0);
const ivyOf = (b: Bld, ivy: number) => smooth(b.ivyAt * 0.6, b.ivyAt * 0.6 + 0.4, ivy);

const useTrees = () =>
  useMemo(() => {
    const r = rng(7);
    const out: {x: number; y: number; z: number; base: number; max: number; at: number; col: THREE.Color}[] = [];
    const green = () => new THREE.Color().setHSL(0.26 + r() * 0.08, 0.42 + r() * 0.15, 0.24 + r() * 0.12);
    // platanes des quais (déjà là au jour 0)
    for (const side of [-1, 1])
      for (let z = CITY_Z - 8; z > -300; z -= 7) {
        if (nearBridge(z, 7)) continue;
        out.push({x: side * 18.5, y: STREET_Y, z, base: 0.85, max: 1.5, at: 0, col: green()});
      }
    // végétation sauvage : berges, rues, ruines
    for (let i = 0; i < 900; i++) {
      const side = r() < 0.5 ? -1 : 1;
      const quay = r() < 0.16;
      const x = quay ? side * (11.6 + r() * 2) : side * (WALL + 1 + Math.pow(r(), 1.3) * 120);
      const z = CITY_Z - 10 - r() * 490;
      const at = r();
      out.push({x, y: quay ? QUAY_Y : STREET_Y, z, base: 0, max: quay ? 0.8 + r() * 0.8 : 1.2 + at * 2.4 + r() * 0.6, at, col: green()});
    }
    // l'îlot qui se forme dans la Seine
    for (let i = 0; i < 6; i++) out.push({x: 1 + (r() - 0.5) * 6, y: 0.75, z: -22 + (r() - 0.5) * 6, base: 0, max: 0.6 + r() * 0.6, at: 0.4 + r() * 0.4, col: green()});
    return out;
  }, []);

export const Paris: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const w = (f: string) => world(t, f);
  const lights = w('lights');
  const rain = rainAt(t);
  const flash = flashAt(t);
  const {autumn, winter} = seasonAt(t);
  const sun = w('sun') * (1 - 0.6 * rain);
  const grass = w('grass');
  const ivy = w('ivy');
  const trees = w('trees');
  const collapse = w('collapse');
  const bridge = w('bridge');
  const rust = w('rust');
  const tower = w('tower');
  const birds = w('birds');
  const island = w('island');

  const top = sampleColor(N.sky, t, 'top');
  const bottom = sampleColor(N.sky, t, 'bottom');
  const [cx, cy, cz, ctx, cty, ctz] = camAt(t);
  const glow = useGlowTexture();
  const {front, back, wins} = useCity();
  const treeList = useTrees();

  const stars = useMemo(() => {
    const r = rng(5);
    const pts = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      const a = r() * Math.PI * 2;
      const u = 0.08 + r() * 0.92;
      const s = Math.sqrt(1 - u * u);
      pts.set([s * Math.cos(a) * 450, u * 450, s * Math.sin(a) * 450], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    return g;
  }, []);

  const tufts = useMemo(() => {
    const r = rng(13);
    return Array.from({length: 4200}, () => {
      const side = r() < 0.5 ? -1 : 1;
      let ax = 11.3 + r() * 10.5;
      if (ax > 13.6 && ax < 14.6) ax += 1;
      return {x: side * ax, y: ax < WALL ? QUAY_Y : STREET_Y, z: 150 - Math.pow(r(), 1.4) * 340, at: r(), s: 0.5 + r() * 0.9, col: new THREE.Color().setHSL(0.24 + r() * 0.08, 0.5, 0.3 + r() * 0.15)};
    });
  }, []);

  // circulation : les voitures roulent sur les quais hauts, puis s'arrêtent là où leurs conducteurs ont disparu
  const cars = useMemo(() => {
    const r = rng(17);
    const pal = ['#b8322a', '#d9d9d9', '#2b3a55', '#1d1d1f', '#6a7f8c', '#e0b23a', '#f2f2ee'];
    return Array.from({length: N.traffic.cars}, () => {
      const side = r() < 0.5 ? -1 : 1;
      return {
        side, x: side * (15.9 + (r() - 0.5) * 0.5), z0: r() * 360, dir: side < 0 ? 1 : -1,
        sp: N.traffic.carSpeed * (0.75 + r() * 0.5), col: C(pal[Math.floor(r() * pal.length)]), ry: (r() - 0.5) * 0.5,
        bus: r() < 0.08,
      };
    });
  }, []);
  // piétons : quais hauts, berges basses, ponts
  const people = useMemo(() => {
    const r = rng(19);
    const clothes = ['#2b3a55', '#b8322a', '#e8e2d2', '#1d1d1f', '#6a7f8c', '#d9a23a', '#3f6b4a', '#8a5a8a', '#c86a3a'];
    const skin = ['#f1c9a5', '#d9a07a', '#a8704a', '#6e4630', '#e8b894'];
    return Array.from({length: N.traffic.people}, () => {
      const kind = r();
      const side = r() < 0.5 ? -1 : 1;
      const onBridge = kind > 0.86;
      const bz = [BZ, ...STONE][Math.floor(r() * 4)];
      return {
        bridge: onBridge,
        x: onBridge ? (r() - 0.5) * 26 : kind < 0.62 ? side * (19.6 + r() * 1.8) : side * (11.7 + r() * 1.6),
        y: onBridge || kind < 0.62 ? STREET_Y : QUAY_Y,
        z: onBridge ? bz + (r() - 0.5) * 5 : r() * 380,
        dir: r() < 0.5 ? -1 : 1,
        sp: N.traffic.walkSpeed * (0.7 + r() * 0.6),
        ph: r() * 6,
        h: 0.85 + r() * 0.25,
        gone: N.vanish + r() * N.traffic.fadeSec,
        col: C(clothes[Math.floor(r() * clothes.length)]),
        skin: C(skin[Math.floor(r() * skin.length)]),
      };
    });
  }, []);

  const lamps = useMemo(() => {
    const out: [number, number, number][] = [];
    for (const side of [-1, 1]) for (let z = CITY_Z - 10; z > -220; z -= 14) out.push([side * 15.2, STREET_Y, z]);
    for (const x of [-12.5, -7.5, 7.5, 12.5]) out.push([x, STREET_Y + 0.4, BZ + (x < 0 ? 3.3 : -3.3)]);
    for (const z of STONE) for (const x of [-10, -3.5, 3.5, 10]) out.push([x, STREET_Y + 0.5, z + (x < 0 ? 3.9 : -3.9)]);
    return out;
  }, []);

  const birdOffs = useMemo(() => {
    const r = rng(29);
    return Array.from({length: 60}, () => [(r() - 0.5) * 16, (r() - 0.5) * 5, (r() - 0.5) * 14, r() * 6] as const);
  }, []);

  // boîtes des bouquinistes sur le parapet
  const books = useMemo(() => {
    const r = rng(53);
    const out: {x: number; z: number; side: number; at: number; tip: number}[] = [];
    for (const side of [-1, 1])
      for (let z = 150; z > -220; z -= 2.3) {
        if (nearBridge(z, 8) || r() < 0.3) continue;
        out.push({x: side * 14.15, z, side, at: r(), tip: r()});
      }
    return out;
  }, []);

  // péniches amarrées : elles prennent l'eau puis coulent
  const barges = useMemo(() => {
    const r = rng(61);
    return [
      {side: -1, z: 20, len: 24},
      {side: 1, z: -8, len: 20},
      {side: -1, z: -92, len: 26},
      {side: 1, z: -132, len: 22},
    ].map((b) => ({...b, x: b.side * 8.9, at: 0.15 + r() * 0.5, cabin: C(['#e8e2d2', '#7a2e2a', '#2f4b5e', '#e3c26a'][Math.floor(r() * 4)])}));
  }, []);

  const ducks = useMemo(() => {
    const r = rng(71);
    return Array.from({length: 14}, () => ({x: (r() - 0.5) * 14, z: 28 - r() * 40, ph: r() * 6, sp: 0.15 + r() * 0.25, brown: r() < 0.6}));
  }, []);

  // particules autour de la caméra : pluie et graines/pollen dans la lumière
  const drops = useMemo(() => {
    const r = rng(83);
    return Array.from({length: 700}, () => [r(), r(), r(), 0.7 + r() * 0.6] as const);
  }, []);
  const seeds = useMemo(() => {
    const r = rng(89);
    return Array.from({length: 260}, () => [r(), r(), r(), r() * 6] as const);
  }, []);

  const carAt = (car: (typeof cars)[number]) => {
    const z = -200 + wrap(car.z0 + car.dir * car.sp * driveTime(t, N.traffic.brakeSec), 360);
    return {z, ry: car.ry * smooth(N.vanish, N.vanish + N.traffic.brakeSec, t)}; // les voitures sans conducteur finissent de travers
  };
  const walkerAt = (p: (typeof people)[number]) => {
    const k = 1 - smooth(p.gone, p.gone + 0.15, t);
    if (k <= 0) return null;
    const step = t * p.sp * p.dir;
    const bob = Math.abs(Math.sin(t * 7 * p.sp + p.ph)) * 0.06;
    if (p.bridge) return {x: -13 + wrap(p.x + 13 + step, 26), y: p.y + bob, z: p.z, ry: p.dir > 0 ? Math.PI / 2 : -Math.PI / 2, k};
    return {x: p.x, y: p.y + bob, z: -220 + wrap(p.z + step, 380), ry: p.dir > 0 ? 0 : Math.PI, k};
  };

  // couleurs qui évoluent
  const tmpA = new THREE.Color();
  const street = lerpC(new THREE.Color(), C('#6b6d70'), C('#5b7d3e'), grass)
    .lerp(C('#3f6230'), trees * 0.6)
    .lerp(C('#8a7a3e'), autumn * grass * 0.5)
    .lerp(SNOW, winter * 0.75)
    .lerp(C('#4c5258'), rain * 0.35); // sol mouillé
  const quayCol = lerpC(new THREE.Color(), C('#a89f8c'), C('#62893f'), grass).lerp(SNOW, winter * 0.7);
  const roofCol = lerpC(new THREE.Color(), C('#7b8794'), SNOW, winter * 0.85);
  const ironCol = lerpC(new THREE.Color(), C('#23272b'), RUST, rust * 0.8);
  // soleil bas, presque dans l'axe de la Seine : contre-jour doré
  const sunDir = new THREE.Vector3(0.06, sunElevAt(t), -1).normalize();
  // le soir du jour 0 : la tour et la cathédrale sont illuminées
  const floodlit = lights * (1 - smooth(0.5, 0.9, sun));
  const sunVis = smooth(0.25, 0.6, sun) * (1 - rain);
  const wallCol = lerpC(new THREE.Color(), C('#b9ad95'), MOSS, ivy * 0.7);
  const water = lerpC(new THREE.Color(), C('#3f5666'), C('#3e6150'), ivy).lerp(C('#8fb3c9'), 0.3 * sun).lerp(bottom, 0.35 * (1 - 0.5 * rain)); // reflet du ciel
  const steel = lerpC(new THREE.Color(), C('#56606a'), RUST, rust);
  const stone = lerpC(new THREE.Color(), C('#b3a58e'), MOSS, ivy * 0.55);
  const towerCol = lerpC(new THREE.Color(), C('#5e4b3d'), C('#93502c'), Math.max(rust * 0.6, tower));
  const winLit = C('#ffcf80');
  const winOff = lerpC(new THREE.Color(), C('#1a202c'), C('#59646f'), sun);

  // pont : la travée centrale casse en deux et bascule dans la Seine
  const fall = bridge * 1.1;
  const span = (x0: number, x1: number, key: string) => {
    const len = x1 - x0;
    const cx = (x0 + x1) / 2;
    return (
      <group key={key} position={[cx, 0, BZ]}>
        <mesh position={[0, STREET_Y - 0.3, 0]}>
          <boxGeometry args={[len, 0.6, 7]} />
          <meshStandardMaterial color={steel} flatShading />
        </mesh>
        {[-3.4, 3.4].map((dz) => (
          <mesh key={dz} position={[0, STREET_Y + 0.5, dz]}>
            <boxGeometry args={[len, 0.12, 0.12]} />
            <meshStandardMaterial color={steel} />
          </mesh>
        ))}
        {[-2.8, 2.8].map((dz) => (
          <mesh key={dz} position={[0, 1.2, dz]} scale={[1, 2.8 / (len / 2), 1]}>
            <torusGeometry args={[len / 2, 0.28, 5, 24, Math.PI]} />
            <meshStandardMaterial color={steel} flatShading />
          </mesh>
        ))}
      </group>
    );
  };
  const half = (sign: number) => {
    // demi-travée accrochée à la pile en x = sign * 5.5, qui pivote vers le bas
    const L = 5.5;
    return (
      <group position={[sign * L, STREET_Y, BZ]} rotation={[0, 0, sign * fall]}>
        <mesh position={[-sign * L / 2, -0.3, 0]}>
          <boxGeometry args={[L, 0.6, 7]} />
          <meshStandardMaterial color={steel} flatShading />
        </mesh>
        {[-3.4, 3.4].map((dz) => (
          <mesh key={dz} position={[-sign * L / 2, 0.5, dz]}>
            <boxGeometry args={[L, 0.12, 0.12]} />
            <meshStandardMaterial color={steel} />
          </mesh>
        ))}
        {[-2.8, 2.8].map((dz) => (
          <group key={dz} position={[-sign * L, 1.2 - STREET_Y, dz]} scale={[1, 2.8 / L, 1]}>
            <mesh rotation={[0, 0, sign < 0 ? Math.PI / 2 : 0]}>
              <torusGeometry args={[L, 0.28, 5, 12, Math.PI / 2]} />
              <meshStandardMaterial color={steel} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    );
  };

  // tour (silhouette inspirée de la tour Eiffel)
  const legs = useMemo(
    () =>
      [-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => {
          const a = new THREE.Vector3(sx * 15, 0, sz * 15);
          const b = new THREE.Vector3(sx * 6, 30, sz * 6);
          const dir = b.clone().sub(a);
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
          return {pos: a.clone().add(b).multiplyScalar(0.5), len: dir.length(), q};
        }),
      ),
    [],
  );

  return (
    <>
      <CameraRig
        position={[cx + Math.sin(t * 0.35) * 0.4, cy + Math.sin(t * 0.5) * 0.15, cz]}
        target={[ctx, cty, ctz]}
        fov={60}
      />
      <SkyDome top={top.clone().lerp(C('#c9d6ff'), flash * 0.6)} bottom={bottom.clone().lerp(C('#e6ecff'), flash * 0.6)} />
      <points geometry={stars}>
        <pointsMaterial color="#ffffff" size={2} sizeAttenuation={false} transparent opacity={w('stars')} fog={false} depthWrite={false} />
      </points>
      {/* brume plus lointaine quand la caméra est haute (plan aérien du début) */}
      <fog attach="fog" args={[bottom, 80 - 50 * rain + Math.max(0, cy - 15) * 3, 520 - 300 * rain + Math.max(0, cy - 15) * 4.5]} />
      <hemisphereLight color={top} groundColor="#4a4a3a" intensity={0.25 + 0.95 * sun + 2.2 * flash} />
      <directionalLight
        color={tmpA.copy(bottom).lerp(C('#ffd9a0'), 0.5)}
        intensity={0.15 + 1.9 * sun}
        position={[sunDir.x * 200 + 40, sunDir.y * 200 + 40, sunDir.z * 200]}
      />
      {/* fill froid depuis la caméra, pour que les faces à contre-jour ne soient pas bouchées */}
      <directionalLight color="#9fb6d8" intensity={0.25 + 0.35 * sun} position={[-30, 40, 80]} />

      {/* le soleil et son reflet sur la Seine */}
      <sprite position={[cx + sunDir.x * 420, cy + sunDir.y * 420, cz + sunDir.z * 420]} scale={[95, 95, 1]}>
        <spriteMaterial map={glow} color="#ffd8a0" transparent opacity={0.85 * sunVis} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </sprite>
      {Array.from({length: 9}, (_, i) => {
        const d = 30 + i * i * 4;
        const tw = 0.6 + 0.4 * Math.sin(t * 5 + i * 2.1);
        return (
          <sprite key={i} position={[cx + sunDir.x * d, WATER_Y + 0.1, cz - d]} scale={[1.4 + d * 0.02, 0.5 + d * 0.035, 1]}>
            <spriteMaterial map={glow} color="#ffe2b0" transparent opacity={0.5 * sunVis * tw} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
          </sprite>
        );
      })}

      {/* la Seine, les berges, les murs de quai, la ville */}
      <mesh position={[0, WATER_Y, -150]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 900]} />
        <meshStandardMaterial color={water} roughness={0.7} metalness={0} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 12.5, 0, -150]} scale={[3, QUAY_Y, 900]} geometry={BOX}>
            <meshStandardMaterial color={quayCol} />
          </mesh>
          <mesh position={[s * 14, 0, -150]} scale={[0.8, STREET_Y, 900]} geometry={BOX}>
            <meshStandardMaterial color={wallCol} />
          </mesh>
          <mesh position={[s * 214.4, STREET_Y, -150]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[400, 900]} />
            <meshStandardMaterial color={street} />
          </mesh>
        </group>
      ))}

      {/* îlot de sédiments qui émerge */}
      <mesh position={[1, -0.9 + island * 1.25, -22]} scale={[5, 1, 7]}>
        <sphereGeometry args={[1, 14, 8]} />
        <meshStandardMaterial color={lerpC(tmpA.clone(), C('#b5a77f'), C('#6f8f45'), island)} flatShading />
      </mesh>

      {/* immeubles haussmanniens */}
      <Inst
        count={front.length}
        geo={BOX}
        update={(i, d, c) => {
          const b = front[i];
          const k = collapseOf(b, collapse);
          d.position.set(b.x, STREET_Y, b.z);
          d.scale.set(b.d, b.h * (1 - k), b.w);
          d.rotation.z = b.side * k * 0.06;
          lerpC(c, b.col, MOSS, ivyOf(b, ivy) * 0.8);
        }}
      />
      <Inst
        count={front.length}
        geo={ROOF}
        update={(i, d, c) => {
          const b = front[i];
          const k = collapseOf(b, collapse);
          const gone = smooth(0, 0.25, k);
          d.position.set(b.x, STREET_Y + b.h * (1 - k), b.z);
          d.scale.set(b.d, Math.max(0.001, 4 * (1 - gone)), b.w);
          d.rotation.z = b.side * k * 0.06;
          lerpC(c, roofCol, MOSS, ivyOf(b, ivy) * 0.6);
        }}
      />
      <Inst
        count={back.length}
        geo={BOX}
        update={(i, d, c) => {
          const b = back[i];
          const k = collapseOf(b, collapse);
          d.position.set(b.x, STREET_Y, b.z);
          d.scale.set(b.d, b.h * (1 - k), b.w);
          lerpC(c, b.col, MOSS, ivyOf(b, ivy) * 0.7);
        }}
      />
      <Inst
        count={back.length}
        geo={ROOF}
        update={(i, d, c) => {
          const b = back[i];
          const k = collapseOf(b, collapse);
          d.position.set(b.x, STREET_Y + b.h * (1 - k), b.z);
          d.scale.set(b.d, Math.max(0.001, 4 * (1 - smooth(0, 0.25, k))), b.w);
          lerpC(c, roofCol, MOSS, ivyOf(b, ivy) * 0.6);
        }}
      />
      <Inst
        count={wins.length}
        geo={WINDOW}
        basic
        update={(i, d, c) => {
          const wn = wins[i];
          const b = wn.b;
          const k = collapseOf(b, collapse);
          if (wn.y + 1 > STREET_Y + b.h * (1 - k)) {
            d.scale.set(0, 0, 0);
            return;
          }
          d.position.set(b.side * (FRONT - 0.06), wn.y, wn.z);
          d.rotation.y = b.side > 0 ? -Math.PI / 2 : Math.PI / 2;
          const lit = lights > wn.thr * 0.96 + 0.02;
          c.copy(lit ? winLit : winOff);
          // le lierre recouvre les fenêtres, du bas vers le haut
          lerpC(c, c.clone(), MOSS, ivyOf(b, ivy) * (1.1 - wn.floor * 0.12));
        }}
      />

      {/* détails des façades : rez-de-chaussée, balcons filants, corniche, cheminées, stores */}
      <Inst
        count={front.length}
        geo={BOX}
        update={(i, d, c) => {
          const b = front[i];
          d.position.set(b.side * (FRONT - 0.1), STREET_Y, b.z);
          d.scale.set(0.2, 3.3, b.w - 0.3);
          lerpC(c, C('#5e5448'), MOSS, ivyOf(b, ivy));
        }}
      />
      <Inst
        count={front.length * 2}
        geo={BOX}
        update={(i, d, c) => {
          const b = front[i >> 1];
          const y = STREET_Y + 4.2 + (i & 1 ? 4 : 1) * 2.8 - 1.05;
          if (y + 1 > STREET_Y + b.h * (1 - collapseOf(b, collapse))) return void d.scale.set(0, 0, 0);
          d.position.set(b.side * (FRONT - 0.4), y, b.z);
          d.scale.set(0.8, 0.14, b.w - 0.6);
          lerpC(c, b.col, MOSS, ivyOf(b, ivy) * 0.8);
        }}
      />
      <Inst
        count={front.length * 2}
        geo={BOX}
        update={(i, d, c) => {
          const b = front[i >> 1];
          const y = STREET_Y + 4.2 + (i & 1 ? 4 : 1) * 2.8 - 0.9;
          if (y + 1 > STREET_Y + b.h * (1 - collapseOf(b, collapse))) return void d.scale.set(0, 0, 0);
          d.position.set(b.side * (FRONT - 0.78), y, b.z);
          d.scale.set(0.06, 0.85, b.w - 0.6);
          lerpC(c, ironCol, MOSS, ivyOf(b, ivy) * 0.7);
        }}
      />
      <Inst
        count={front.length}
        geo={BOX}
        update={(i, d, c) => {
          const b = front[i];
          const k = collapseOf(b, collapse);
          d.position.set(b.side * (FRONT - 0.3), STREET_Y + b.h * (1 - k) - 0.6, b.z);
          d.scale.set(0.6, 0.6, b.w);
          d.rotation.z = b.side * k * 0.06;
          lerpC(c, b.col, C('#ffffff'), 0.12).lerp(MOSS, ivyOf(b, ivy) * 0.7);
        }}
      />
      <Inst
        count={front.length * 2}
        geo={BOX}
        update={(i, d, c) => {
          const b = front[i >> 1];
          const k = collapseOf(b, collapse);
          if (k > 0.12) return void d.scale.set(0, 0, 0);
          const s = i & 1 ? 1 : -1;
          d.position.set(b.x + b.side * (b.chim - 0.5) * 3, STREET_Y + b.h * (1 - k) + 1.2, b.z + s * b.w * 0.3);
          d.scale.set(0.9, 2.4, 1.6);
          lerpC(c, C('#a5674a'), MOSS, ivyOf(b, ivy) * 0.6).lerp(SNOW, winter * 0.4);
        }}
      />
      <Inst
        count={front.length}
        geo={BOX}
        update={(i, d, c) => {
          const b = front[i];
          const torn = smooth(0.15 + b.chim * 0.3, 0.5 + b.chim * 0.3, rust);
          if (!b.awn || torn > 0.98) return void d.scale.set(0, 0, 0);
          d.position.set(b.side * (FRONT - 1.1), STREET_Y + 3.1 - torn * 0.8, b.z);
          d.rotation.z = b.side * (0.4 + torn * 0.7);
          d.scale.set(2.2 * (1 - torn * 0.5), 0.08, (b.w - 1.5) * (1 - torn * 0.6));
          lerpC(c, C(['#a8322b', '#2f5d43', '#6d2440'][b.awn - 1]), C('#8a8478'), rust * 0.8).lerp(MOSS, ivy * 0.4);
        }}
      />
      {/* rideaux de lierre qui montent depuis la rue */}
      <Inst
        count={front.length * 4}
        geo={BOX}
        update={(i, d, c) => {
          const b = front[i >> 2];
          const v = b.vines[i & 3];
          const top = b.h * (1 - collapseOf(b, collapse));
          const h = Math.min(top, top * ivyOf(b, ivy) * (0.5 + v));
          if (h < 0.05) return void d.scale.set(0, 0, 0);
          const wv = b.w / 4;
          d.position.set(b.side * (FRONT - 0.18), STREET_Y, b.z - b.w / 2 + ((i & 3) + 0.5) * wv);
          d.scale.set(0.25, h, wv * (0.55 + 0.45 * v));
          c.setHSL(0.27 + v * 0.06, 0.45, 0.2 + v * 0.1);
          lerpC(c, c.clone(), AUTUMN[(i & 3) % 3], autumn * 0.7).lerp(C('#5a4a38'), winter * 0.6);
        }}
      />

      {/* parapet et boîtes des bouquinistes */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 14, STREET_Y, -150]} scale={[0.7, 0.9, 900]} geometry={BOX}>
          <meshStandardMaterial color={wallCol} />
        </mesh>
      ))}
      <Inst
        count={books.length}
        geo={BOX}
        update={(i, d, c) => {
          const bk = books[i];
          const k = smooth(0.4 + bk.at * 0.4, 0.6 + bk.at * 0.4, collapse) * (bk.tip < 0.5 ? 1 : 0);
          d.position.set(bk.x + bk.side * k * 0.8, STREET_Y + 0.9 - k * 0.6, bk.z);
          d.rotation.z = bk.side * k * 1.2;
          d.scale.set(0.8, 0.75, 2);
          lerpC(c, C('#2e5a3c'), RUST, rust * 0.7).lerp(MOSS, ivyOf({ivyAt: bk.at} as Bld, ivy) * 0.7).lerp(SNOW, winter * 0.5);
        }}
      />

      {/* péniches : coque, cabine, et la végétation qui finit par pousser sur le pont */}
      {barges.map((bg, i) => {
        const k = smooth(bg.at, bg.at + 0.35, rust);
        const y = WATER_Y - 0.7 - k * 1.5;
        return (
          <group key={i} position={[bg.x, y, bg.z]} rotation={[k * 0.05, 0, bg.side * k * 0.16]}>
            <mesh position={[0, 0.75, 0]} scale={[3.6, 1.5, bg.len]} geometry={BOX}>
              <meshStandardMaterial color={lerpC(new THREE.Color(), C('#1f2a30'), RUST, rust * 0.8)} flatShading />
            </mesh>
            <mesh position={[0, 2.2, bg.len * 0.15]} scale={[2.6, 1.6, bg.len * 0.45]} geometry={BOX}>
              <meshStandardMaterial color={lerpC(new THREE.Color(), bg.cabin, MOSS, ivy * 0.6).lerp(SNOW, winter * 0.3)} flatShading />
            </mesh>
            {[-0.3, 0.05, 0.38].map((dz, j) => {
              const s = smooth(0.35 + j * 0.1, 0.8 + j * 0.05, trees) * (0.6 + j * 0.15);
              if (s < 0.01) return null;
              return (
                <mesh key={j} position={[0, 3 + s * 1.2, dz * bg.len]} scale={[s, s * 1.1, s]} geometry={CANOPY}>
                  <meshStandardMaterial color={lerpC(new THREE.Color(), C('#4f7a34'), AUTUMN[j], autumn * 0.8)} flatShading />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* circulation : les voitures roulent, puis s'immobilisent quand leurs conducteurs disparaissent */}
      <Inst
        count={cars.length}
        geo={BOX}
        update={(i, d, c) => {
          const car = cars[i];
          const p = carAt(car);
          d.position.set(car.x, STREET_Y + 0.25 - grass * 0.35 - trees * 0.4, p.z);
          d.rotation.y = p.ry;
          d.scale.set(car.bus ? 2.5 : 1.8, car.bus ? 2.6 : 0.9, car.bus ? 11 : 4.2);
          lerpC(c, car.bus ? C('#3f7f62') : car.col, RUST, rust * 0.9).lerp(MOSS, ivy * 0.5);
        }}
      />
      <Inst
        count={cars.length}
        geo={BOX}
        update={(i, d, c) => {
          const car = cars[i];
          if (car.bus) return void d.scale.set(0, 0, 0);
          const p = carAt(car);
          d.position.set(car.x, STREET_Y + 1.15 - grass * 0.35 - trees * 0.4, p.z + 0.2 * car.dir);
          d.rotation.y = p.ry;
          d.scale.set(1.6, 0.7, 2.2);
          lerpC(c, C('#2a3038'), MOSS, ivy * 0.6);
        }}
      />
      {/* phares (avant) et feux (arrière), allumés le soir, éteints quand la batterie lâche */}
      <Inst
        count={cars.length * 2}
        geo={BOX}
        basic
        opacity={Math.min(1, lights * 1.5) * (1 - smooth(N.vanish + 2, N.vanish + 6, t))}
        update={(i, d, c) => {
          const car = cars[i >> 1];
          const p = carAt(car);
          const back = i & 1 ? -1 : 1;
          const len = car.bus ? 11 : 4.2;
          d.position.set(car.x, STREET_Y + 0.55, p.z + car.dir * back * (len / 2 + 0.05));
          d.rotation.y = p.ry;
          d.scale.set(1.5, 0.22, 0.1);
          c.set(back > 0 ? '#fff1c8' : '#ff3020');
        }}
      />

      {/* piétons : ils se baladent, puis s'évaporent tous en moins d'une seconde */}
      <Inst
        count={people.length}
        geo={BOX}
        update={(i, d, c) => {
          const p = walkerAt(people[i]);
          if (!p) return void d.scale.set(0, 0, 0);
          d.position.set(p.x, p.y, p.z);
          d.rotation.y = p.ry;
          d.scale.set(0.5 * p.k, 1.25 * people[i].h * p.k, 0.32 * p.k);
          c.copy(people[i].col);
        }}
      />
      <Inst
        count={people.length}
        geo={BOX}
        update={(i, d, c) => {
          const p = walkerAt(people[i]);
          if (!p) return void d.scale.set(0, 0, 0);
          d.position.set(p.x, p.y + (1.25 * people[i].h + 0.02) * p.k, p.z);
          d.scale.setScalar(0.3 * p.k);
          c.copy(people[i].skin);
        }}
      />
      {/* l'éclair blanc de chaque disparition */}
      <Inst
        count={people.length}
        geo={CANOPY}
        basic
        opacity={0.8 * smooth(N.vanish - 0.05, N.vanish + 0.1, t) * (1 - smooth(N.vanish + N.traffic.fadeSec, N.vanish + N.traffic.fadeSec + 0.5, t))}
        update={(i, d, c) => {
          const pp = people[i];
          const u = (t - pp.gone) / 0.35;
          if (u < 0 || u > 1) return void d.scale.set(0, 0, 0);
          const p = walkerAt({...pp, gone: 1e9})!;
          d.position.set(p.x, p.y + 0.9, p.z);
          d.scale.setScalar(0.12 + u * 0.3);
          c.set('#fff6e0');
        }}
      />

      {/* bateau-mouche : il descend la Seine, puis dérive, moteur coupé, et finit par couler */}
      {(() => {
        const z = BOAT.z0 - BOAT.speed * driveTime(t, BOAT.brake);
        const drift = smooth(N.vanish, N.vanish + 8, t);
        const sink = smooth(0.45, 0.8, rust);
        return (
          <group position={[BOAT.x + drift * 1.5, WATER_Y - 0.5 - sink * 2.2, z]} rotation={[sink * 0.08, drift * 0.35, sink * 0.12]}>
            <mesh position={[0, 0.6, 0]} scale={[4.6, 1.2, 24]} geometry={BOX}>
              <meshStandardMaterial color={lerpC(new THREE.Color(), C('#f2f0ea'), RUST, rust * 0.8).lerp(MOSS, ivy * 0.4)} flatShading />
            </mesh>
            <mesh position={[0, 1.8, -1]} scale={[3.8, 1.5, 19]} geometry={BOX}>
              <meshStandardMaterial
                color={lerpC(new THREE.Color(), C('#3a5468'), MOSS, ivy * 0.6)}
                emissive="#ffc070"
                emissiveIntensity={floodlit * 0.9 * (1 - smooth(N.vanish + 3, N.vanish + 7, t))}
                flatShading
              />
            </mesh>
            <mesh position={[0, 3.35, -1]} scale={[3.9, 0.15, 19.2]} geometry={BOX}>
              <meshStandardMaterial color="#e8e6e0" flatShading />
            </mesh>
          </group>
        );
      })()}

      {/* ponts de pierre en arches : ils tiennent trois siècles, couverts de lierre */}
      {STONE.map((bz) => (
        <group key={bz} position={[0, 0, bz]}>
          <mesh position={[0, STREET_Y - 0.5, 0]} scale={[28.8, 1, 8]} geometry={BOX}>
            <meshStandardMaterial color={stone} flatShading />
          </mesh>
          {[-3.7, 3.7].map((dz) => (
            <mesh key={dz} position={[0, STREET_Y + 0.5, dz]} scale={[28.8, 0.8, 0.5]} geometry={BOX}>
              <meshStandardMaterial color={stone} flatShading />
            </mesh>
          ))}
          {[-6, 6].map((x) => (
            <mesh key={x} position={[x, 0, 0]} scale={[1.8, STREET_Y - 0.5, 8.4]} geometry={BOX}>
              <meshStandardMaterial color={stone} flatShading />
            </mesh>
          ))}
          {[
            [-10, 4],
            [0, 6],
            [10, 4],
          ].map(([x, rr]) =>
            [-3.6, 3.6].map((dz) => (
              <mesh key={`${x}${dz}`} position={[x, WATER_Y, dz]} scale={[1, (STREET_Y - 1 - WATER_Y) / rr, 1]}>
                <torusGeometry args={[rr, 0.55, 5, 18, Math.PI]} />
                <meshStandardMaterial color={stone} flatShading />
              </mesh>
            )),
          )}
        </group>
      ))}

      {/* cathédrale (silhouette inspirée de Notre-Dame), rive droite */}
      <group position={[ND.x, STREET_Y, (ND.z0 + ND.z1) / 2]}>
        <mesh position={[0, 0, 4]} scale={[13, 20, 36]} geometry={BOX}>
          <meshStandardMaterial color={stone} emissive="#ffb060" emissiveIntensity={floodlit * 0.15} flatShading />
        </mesh>
        <mesh position={[0, 20, 4]} scale={[13, 8, 36]} geometry={ROOF}>
          <meshStandardMaterial color={roofCol} flatShading />
        </mesh>
        {[-4.2, 4.2].map((x) => (
          <mesh key={x} position={[x, 0, 21]} scale={[6.5, 34, 7]} geometry={BOX}>
            <meshStandardMaterial color={stone} emissive="#ffb060" emissiveIntensity={floodlit * 0.2} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0, 21.5]} scale={[2, 26, 6]} geometry={BOX}>
          <meshStandardMaterial color={stone} emissive="#ffb060" emissiveIntensity={floodlit * 0.18} flatShading />
        </mesh>
        <mesh position={[0, 26, 0]} scale={[1.2, 22 * (1 - smooth(0.4, 0.8, collapse)), 1.2]} geometry={ROOF}>
          <meshStandardMaterial color={towerCol} emissive="#ffa040" emissiveIntensity={floodlit * 0.22} flatShading />
        </mesh>
      </group>

      {/* arc de triomphe, au bout de la perspective */}
      <group position={[46, STREET_Y, -440]}>
        {[-11, 11].map((x) => (
          <mesh key={x} position={[x, 0, 0]} scale={[12, 34, 16]} geometry={BOX}>
            <meshStandardMaterial color={stone} emissive="#ffb060" emissiveIntensity={floodlit * 0.12} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 34, 0]} scale={[34, 15, 16]} geometry={BOX}>
          <meshStandardMaterial color={stone} emissive="#ffb060" emissiveIntensity={floodlit * 0.12} flatShading />
        </mesh>
      </group>

      {/* réverbères */}
      <Inst
        count={lamps.length}
        geo={POLE}
        update={(i, d, c) => {
          const [x, y, z] = lamps[i];
          d.position.set(x, y, z);
          d.scale.set(1, 4.5, 1);
          d.rotation.z = (i % 3 === 0 ? 1 : 0) * smooth(0.5, 1, collapse) * 0.5 * Math.sign(x);
          lerpC(c, C('#2d3236'), RUST, rust);
        }}
      />
      {lamps.map(([x, y, z], i) => (
        <sprite key={i} position={[x, y + 4.6, z]} scale={[2.4, 2.4, 1]}>
          <spriteMaterial map={glow} transparent opacity={lights * 0.9} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
        </sprite>
      ))}

      {/* le pont : piles en pierre, travées en acier */}
      {[-5.5, 5.5].map((x) => (
        <mesh key={x} position={[x, 0, BZ]} scale={[2.2, STREET_Y - 0.5, 7.6]} geometry={BOX}>
          <meshStandardMaterial color={stone} flatShading />
        </mesh>
      ))}
      {span(-WALL, -5.5, 'l')}
      {span(5.5, WALL, 'r')}
      {half(-1)}
      {half(1)}

      {/* arbres */}
      <Inst
        count={treeList.length}
        geo={TRUNK}
        update={(i, d, c) => {
          const tr = treeList[i];
          const s = tr.base + (tr.max - tr.base) * smooth(tr.at * 0.75, tr.at * 0.75 + 0.25, trees);
          if (s < 0.01 || (tr.y < 1 && Math.abs(tr.x) < 9 && island < 0.3)) return void d.scale.set(0, 0, 0);
          d.position.set(tr.x, tr.y, tr.z);
          d.scale.set(s, 2.6 * s, s);
          c.set('#5a3d25');
        }}
      />
      <Inst
        count={treeList.length}
        geo={CANOPY}
        update={(i, d, c) => {
          const tr = treeList[i];
          const s = tr.base + (tr.max - tr.base) * smooth(tr.at * 0.75, tr.at * 0.75 + 0.25, trees);
          if (s < 0.01 || (tr.y < 1 && Math.abs(tr.x) < 9 && island < 0.3)) return void d.scale.set(0, 0, 0);
          const bare = 1 - 0.35 * winter; // feuillage clairsemé en hiver
          d.position.set(tr.x, tr.y + 3.6 * s, tr.z);
          d.scale.set(s * bare, s * 1.05 * bare, s * bare);
          d.rotation.y = i;
          lerpC(c, tr.col, AUTUMN[i % 3], autumn * (0.6 + 0.4 * ((i * 0.618) % 1))).lerp(C('#6b5a45'), winter * 0.7);
        }}
      />
      <Inst
        count={tufts.length}
        geo={TUFT}
        update={(i, d, c) => {
          const g = tufts[i];
          const s = g.s * smooth(g.at * 0.6, g.at * 0.6 + 0.4, grass);
          if (s < 0.01) return void d.scale.set(0, 0, 0);
          d.position.set(g.x, g.y, g.z);
          d.scale.set(s * 1.4, s, s * 1.4);
          d.rotation.y = i;
          lerpC(c, g.col, C('#b39a52'), autumn * 0.7).lerp(SNOW, winter * 0.8);
        }}
      />

      {/* oiseaux */}
      <Inst
        count={birdOffs.length}
        geo={BIRD}
        basic
        double
        update={(i, d, c) => {
          if (i >= birds * birdOffs.length) return void d.scale.set(0, 0, 0);
          const [ox, oy, oz, ph] = birdOffs[i];
          const a = t * 0.22 + ph * 0.05;
          d.position.set(Math.sin(a) * 14 + ox + Math.sin(t * 1.3 + ph) * 0.6, 30 + oy + Math.sin(t * 0.5) * 2, -115 + Math.cos(a) * 20 + oz);
          d.rotation.y = -a;
          const flap = Math.sin(t * 9 + ph * 3);
          d.scale.set(1.5 * (0.55 + 0.45 * Math.abs(flap)), 1.5 * flap, 1.5);
          c.set('#1d1f24');
        }}
      />

      {/* cerfs sur l'îlot, à la fin */}
      {[0, 1, 2].map((k) => {
        const [d0, d1] = N.fauna.deer;
        const on = smooth(d0, d0 + 1.5, t) * (1 - smooth(d1 - 0.3, d1, t));
        if (on <= 0) return null;
        return (
          <Beast
            key={k}
            pos={[-2.8 + k * 1.4, -0.9 + island * 1.25 + 0.45, -15.6 - k * 0.9 - (t - d0) * 0.1]}
            ry={k === 1 ? 0.5 : -0.2}
            scale={on * (k === 2 ? 1 : 1.3)}
            body="#8a5a35"
            dark="#5e3d22"
            walk={Math.sin(t * 0.8 + k) * 0.3}
          />
        );
      })}

      {/* renards la première année, laie et marcassins sur la berge ensuite */}
      {[0, 1].map((k) => {
        const [a, b] = N.fauna.foxes;
        const on = smooth(a, a + 0.4, t) * (1 - smooth(b - 0.4, b, t));
        if (on <= 0) return null;
        return (
          <Beast
            key={k}
            pos={[(k ? 1 : -1) * (16.8 + k * 0.6), STREET_Y, 30 - k * 3 - (t - a) * 2.4]}
            ry={0}
            scale={on * 0.75}
            body="#c8642a"
            dark="#3a2418"
            tail="#e8a060"
            long={1}
            tall={0.45}
            walk={t * 11 + k}
          />
        );
      })}
      {[1.25, 0.6, 0.55, 0.5, 0.6].map((s, k) => {
        const [a, b] = N.fauna.boars;
        const on = smooth(a, a + 0.5, t) * (1 - smooth(b - 0.5, b, t));
        if (on <= 0) return null;
        return (
          <Beast
            key={k}
            pos={[-12.3 + (k % 2) * 0.5, QUAY_Y, 6 - k * 1.1 + (t - a) * 1.6]}
            ry={Math.PI}
            scale={on * s}
            body={k ? '#7a5a3c' : '#3b2e26'}
            dark="#2a201a"
            long={1.3}
            tall={0.5}
            walk={t * 9 + k * 1.7}
          />
        );
      })}
      {/* canards sur la Seine */}
      {ducks.map((dk, i) => {
        const [a, b] = N.fauna.ducks;
        const on = smooth(a + i * 0.15, a + i * 0.15 + 0.6, t) * (1 - smooth(b - 0.5, b, t)) * (1 - winter);
        if (on <= 0.01) return null;
        const a2 = dk.ph + t * dk.sp;
        return (
          <group key={i} position={[dk.x + Math.sin(a2) * 2, WATER_Y + 0.08 + Math.sin(t * 3 + dk.ph) * 0.03, dk.z + Math.cos(a2) * 2]} rotation={[0, -a2, 0]} scale={on * 0.9}>
            <mesh scale={[0.3, 0.22, 0.55]} geometry={BOX}>
              <meshStandardMaterial color={dk.brown ? '#7a5e40' : '#f2efe6'} flatShading />
            </mesh>
            <mesh position={[0, 0.3, -0.22]} scale={[0.16, 0.16, 0.18]} geometry={BOX}>
              <meshStandardMaterial color={dk.brown ? '#2f5a3a' : '#f2efe6'} flatShading />
            </mesh>
            <mesh position={[0, 0.3, -0.36]} scale={[0.08, 0.05, 0.12]} geometry={BOX}>
              <meshStandardMaterial color="#e09a2a" />
            </mesh>
          </group>
        );
      })}

      {/* reflets des réverbères sur l'eau, la nuit */}
      {lamps.filter(([x]) => Math.abs(x) > 15).map(([x, , z], i) => (
        <sprite key={i} position={[Math.sign(x) * 10.2, WATER_Y + 0.6, z]} scale={[0.9, 4.5, 1]}>
          <spriteMaterial map={glow} color="#ffb060" transparent opacity={lights * 0.4} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
        </sprite>
      ))}

      {/* brume sur la Seine, le premier matin sans personne */}
      {Array.from({length: 12}, (_, i) => {
        const m = smooth(15.8, 16.8, t) * (1 - smooth(18.5, 20.5, t));
        if (m <= 0) return null;
        return (
          <sprite key={i} position={[((i * 7.3) % 14) - 7 + Math.sin(t * 0.3 + i) * 1.5, 2.6, 30 - i * 14]} scale={[26, 4, 1]}>
            <spriteMaterial map={glow} color="#dfe6ee" transparent opacity={0.3 * m} depthWrite={false} />
          </sprite>
        );
      })}

      {/* pluie : traits autour de la caméra */}
      <Inst
        count={drops.length}
        geo={BOX}
        basic
        opacity={0.4 * rain}
        update={(i, d, c) => {
          const [rx, ry, rz, sp] = drops[i];
          d.position.set(cx + (rx - 0.5) * 30, cy - 10 + wrap(ry * 22 - t * 18 * sp, 22), cz - 3.5 - rz * 30);
          d.rotation.z = 0.12;
          d.scale.set(0.025, 0.8, 0.025);
          c.set('#c8d4de');
        }}
      />
      {/* graines et pollen qui flottent dans la lumière */}
      <Inst
        count={seeds.length}
        geo={CANOPY}
        basic
        opacity={0.75 * smooth(17, 19, t) * smooth(0.4, 0.9, sun) * (1 - rain) * (1 - winter)}
        update={(i, d, c) => {
          const [sx, sy, sz, ph] = seeds[i];
          d.position.set(
            cx - 10 + wrap(sx * 20 + t * 0.7 + Math.sin(t * 0.6 + ph) * 0.4, 20),
            cy - 6 + wrap(sy * 12 + Math.sin(t * 0.9 + ph) * 0.6 - t * 0.15, 12),
            cz - 5 - sz * 24,
          );
          d.scale.setScalar(0.012 + 0.012 * ((ph * 7) % 1));
          c.set(autumn > 0.3 ? '#ffd27a' : '#fff4d6');
        }}
      />

      {/* la tour, au loin : la rouille ronge le sommet, qui finit par basculer */}
      <group position={TOWER}>
        {legs.map((l, i) => (
          <mesh key={i} position={l.pos} quaternion={l.q}>
            <boxGeometry args={[3, l.len, 3]} />
            <meshStandardMaterial color={towerCol} emissive="#ffa040" emissiveIntensity={floodlit * 0.22} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 30, 0]} scale={[19, 2.2, 19]} geometry={BOX}>
          <meshStandardMaterial color={towerCol} emissive="#ffa040" emissiveIntensity={floodlit * 0.22} flatShading />
        </mesh>
        <mesh position={[0, 32, 0]} scale={[17, 28, 17]} geometry={ROOF}>
          <meshStandardMaterial color={towerCol} emissive="#ffa040" emissiveIntensity={floodlit * 0.22} flatShading />
        </mesh>
        <mesh position={[0, 60, 0]} scale={[10, 1.6, 10]} geometry={BOX}>
          <meshStandardMaterial color={towerCol} emissive="#ffa040" emissiveIntensity={floodlit * 0.22} flatShading />
        </mesh>
        <group position={[0, 61.6, 0]} rotation={[0, 0, -smooth(0.35, 1, tower) * 1.5]}>
          <group position={[-smooth(0.35, 1, tower) * 6, -smooth(0.35, 1, tower) * 55, 0]}>
            <mesh scale={[8.5, 38, 8.5]} geometry={ROOF}>
              <meshStandardMaterial color={towerCol} emissive="#ffa040" emissiveIntensity={floodlit * 0.22} flatShading />
            </mesh>
            <mesh position={[0, 38, 0]} scale={[2.8, 4, 2.8]} geometry={BOX}>
              <meshStandardMaterial color={towerCol} emissive="#ffa040" emissiveIntensity={floodlit * 0.22} flatShading />
            </mesh>
            <mesh position={[0, 42, 0]} scale={[1, 8, 1]} geometry={POLE}>
              <meshStandardMaterial color={towerCol} />
            </mesh>
          </group>
        </group>
        {/* balise rouge du sommet, éteinte avec le réseau */}
        <sprite position={[0, 113, 0]} scale={[6, 6, 1]}>
          <spriteMaterial map={glow} color="#ff5040" transparent opacity={lights} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
        </sprite>
      </group>
    </>
  );
};
