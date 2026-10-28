import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig, sampleColor, useGlowTexture} from '../../shared/three/common';
import {SkyDome} from '../../shared/three/SkyDome';
import {rng, sampleNum, smooth} from '../../core/animation';
import {FPS, N, world} from './time';

// Géographie (mètres) : la Seine suit l'axe z, x = 0 au milieu du fleuve.
const WATER_Y = 0.3;
const QUAY_Y = 0.8; // berge basse
const STREET_Y = 4; // quai haut, niveau de la ville
const RIVER = 11;
const WALL = 14;
const FRONT = 22; // façades qui donnent sur la Seine
const BZ = -45; // le pont
const TOWER: [number, number, number] = [-55, STREET_Y, -260];

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
const lerpC = (out: THREE.Color, a: THREE.Color, b: THREE.Color, k: number) => out.copy(a).lerp(b, Math.max(0, Math.min(1, k)));

type Upd = (i: number, d: THREE.Object3D, c: THREE.Color) => void;

/** Mesh instancié recalculé à chaque frame à partir du temps (pas de useFrame). */
const Inst: React.FC<{count: number; geo: THREE.BufferGeometry; update: Upd; basic?: boolean; double?: boolean}> = ({
  count,
  geo,
  update,
  basic,
  double,
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
  return (
    <instancedMesh ref={ref} args={[geo, undefined, count] as any} frustumCulled={false}>
      {basic ? <meshBasicMaterial side={side} /> : <meshStandardMaterial flatShading side={side} />}
    </instancedMesh>
  );
};

type Bld = {x: number; z: number; w: number; d: number; h: number; side: number; col: THREE.Color; ivyAt: number; falls: number};

const useCity = () =>
  useMemo(() => {
    const r = rng(41);
    const front: Bld[] = [];
    const back: Bld[] = [];
    const cream = () => new THREE.Color().setHSL(0.1 + r() * 0.02, 0.28 + r() * 0.1, 0.74 + r() * 0.08);
    const row = (out: Bld[], side: number, x: number, hMin: number, hVar: number) => {
      let z = 42;
      let n = 0;
      while (z > -340) {
        if (n++ % 4 === 3) z -= 9; // rue transversale
        const w = 10 + r() * 7;
        if (Math.abs(z - w / 2 - BZ) < 6 && x === FRONT + 5) {
          z -= 12; // dégagement au débouché du pont
          continue;
        }
        const fr = r();
        out.push({
          x: side * x, z: z - w / 2, w: w - 0.2, d: 10, h: hMin + r() * hVar, side, col: cream(), ivyAt: r(),
          falls: fr < 0.45 ? 0.3 + fr * 0.6 : 0,
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
      for (let z = 36; z > -300; z -= 7) {
        if (Math.abs(z - BZ) < 7) continue;
        out.push({x: side * 18.5, y: STREET_Y, z, base: 0.85, max: 1.5, at: 0, col: green()});
      }
    // végétation sauvage : berges, rues, ruines
    for (let i = 0; i < 700; i++) {
      const side = r() < 0.5 ? -1 : 1;
      const quay = r() < 0.16;
      const x = quay ? side * (11.6 + r() * 2) : side * (WALL + 1 + Math.pow(r(), 1.3) * 120);
      const z = 40 - r() * 360;
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
  const sun = w('sun');
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
  const cam = (f: string) => sampleNum(N.camera as any, t, f);
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
    return Array.from({length: 3200}, () => {
      const side = r() < 0.5 ? -1 : 1;
      let ax = 11.3 + r() * 10.5;
      if (ax > 13.6 && ax < 14.6) ax += 1;
      return {x: side * ax, y: ax < WALL ? QUAY_Y : STREET_Y, z: 40 - Math.pow(r(), 1.4) * 230, at: r(), s: 0.5 + r() * 0.9, col: new THREE.Color().setHSL(0.24 + r() * 0.08, 0.5, 0.3 + r() * 0.15)};
    });
  }, []);

  const cars = useMemo(() => {
    const r = rng(17);
    const pal = ['#b8322a', '#d9d9d9', '#2b3a55', '#1d1d1f', '#6a7f8c', '#e0b23a'];
    return Array.from({length: 18}, () => {
      let z = 36 - r() * 190;
      if (Math.abs(z - BZ) < 6) z -= 12;
      return {x: (r() < 0.5 ? -1 : 1) * (15.6 + r() * 1.2), z, col: C(pal[Math.floor(r() * pal.length)]), ry: (r() - 0.5) * 0.08};
    });
  }, []);

  const lamps = useMemo(() => {
    const out: [number, number, number][] = [];
    for (const side of [-1, 1]) for (let z = 36; z > -200; z -= 14) out.push([side * 15.2, STREET_Y, z]);
    for (const x of [-12.5, -7.5, 7.5, 12.5]) out.push([x, STREET_Y + 0.4, BZ + (x < 0 ? 3.3 : -3.3)]);
    return out;
  }, []);

  const birdOffs = useMemo(() => {
    const r = rng(29);
    return Array.from({length: 60}, () => [(r() - 0.5) * 16, (r() - 0.5) * 5, (r() - 0.5) * 14, r() * 6] as const);
  }, []);

  // couleurs qui évoluent
  const tmpA = new THREE.Color();
  const street = lerpC(new THREE.Color(), C('#6b6d70'), C('#5b7d3e'), grass).lerp(C('#3f6230'), trees * 0.6);
  const quayCol = lerpC(new THREE.Color(), C('#a89f8c'), C('#62893f'), grass);
  const wallCol = lerpC(new THREE.Color(), C('#b9ad95'), MOSS, ivy * 0.7);
  const water = lerpC(new THREE.Color(), C('#3f5666'), C('#3e6150'), ivy).lerp(C('#8fb3c9'), 0.3 * sun); // reflet du ciel
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
        position={[cam('x') + Math.sin(t * 0.35) * 0.4, cam('y') + Math.sin(t * 0.5) * 0.15, cam('z')]}
        target={[cam('tx'), cam('ty'), cam('tz')]}
        fov={60}
      />
      <SkyDome top={top} bottom={bottom} />
      <points geometry={stars}>
        <pointsMaterial color="#ffffff" size={2} sizeAttenuation={false} transparent opacity={w('stars')} fog={false} depthWrite={false} />
      </points>
      <fog attach="fog" args={[bottom, 80, 520]} />
      <hemisphereLight color={top} groundColor="#4a4a3a" intensity={0.25 + 0.95 * sun} />
      <directionalLight color={tmpA.copy(bottom).lerp(C('#ffffff'), 0.4)} intensity={0.15 + 1.7 * sun} position={[60, 80, 40]} />

      {/* la Seine, les berges, les murs de quai, la ville */}
      <mesh position={[0, WATER_Y, -150]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 900]} />
        <meshStandardMaterial color={water} roughness={0.35} metalness={0} />
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
          lerpC(c, C('#7b8794'), MOSS, ivyOf(b, ivy) * 0.6);
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
          lerpC(c, C('#7b8794'), MOSS, ivyOf(b, ivy) * 0.6);
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

      {/* voitures abandonnées */}
      <Inst
        count={cars.length}
        geo={BOX}
        update={(i, d, c) => {
          const car = cars[i];
          d.position.set(car.x, STREET_Y + 0.25 - grass * 0.35 - trees * 0.4, car.z);
          d.rotation.y = car.ry;
          d.scale.set(1.8, 0.9, 4.2);
          lerpC(c, car.col, RUST, rust * 0.9).lerp(MOSS, ivy * 0.5);
        }}
      />
      <Inst
        count={cars.length}
        geo={BOX}
        update={(i, d, c) => {
          const car = cars[i];
          d.position.set(car.x, STREET_Y + 1.15 - grass * 0.35 - trees * 0.4, car.z + 0.2);
          d.rotation.y = car.ry;
          d.scale.set(1.6, 0.7, 2.2);
          lerpC(c, C('#2a3038'), MOSS, ivy * 0.6);
        }}
      />

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
          d.position.set(tr.x, tr.y + 3.6 * s, tr.z);
          d.scale.set(s, s * 1.05, s);
          d.rotation.y = i;
          c.copy(tr.col);
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
          c.copy(g.col);
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
        const on = smooth(34, 35.5, t);
        if (on <= 0) return null;
        const z = -15.6 - k * 0.9 - (t - 34) * 0.1;
        return (
          <group key={k} position={[-2.8 + k * 1.4, -0.9 + island * 1.25 + 0.45, z]} rotation={[0, k === 1 ? 0.5 : -0.2, 0]} scale={on * (k === 2 ? 1 : 1.3)}>
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[0.45, 0.45, 1.2]} />
              <meshStandardMaterial color="#8a5a35" flatShading />
            </mesh>
            <mesh position={[0, 1.45, -0.6]} rotation={[0.5, 0, 0]}>
              <boxGeometry args={[0.22, 0.6, 0.22]} />
              <meshStandardMaterial color="#8a5a35" flatShading />
            </mesh>
            <mesh position={[0, 1.75, -0.8]}>
              <boxGeometry args={[0.22, 0.22, 0.4]} />
              <meshStandardMaterial color="#7a4c2c" flatShading />
            </mesh>
            {[-0.16, 0.16].flatMap((lx) =>
              [-0.45, 0.45].map((lz) => (
                <mesh key={`${lx}${lz}`} position={[lx, 0.4, lz]}>
                  <boxGeometry args={[0.09, 0.8, 0.09]} />
                  <meshStandardMaterial color="#5e3d22" />
                </mesh>
              )),
            )}
          </group>
        );
      })}

      {/* la tour, au loin : la rouille ronge le sommet, qui finit par basculer */}
      <group position={TOWER}>
        {legs.map((l, i) => (
          <mesh key={i} position={l.pos} quaternion={l.q}>
            <boxGeometry args={[3, l.len, 3]} />
            <meshStandardMaterial color={towerCol} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 30, 0]} scale={[19, 2.2, 19]} geometry={BOX}>
          <meshStandardMaterial color={towerCol} flatShading />
        </mesh>
        <mesh position={[0, 32, 0]} scale={[17, 28, 17]} geometry={ROOF}>
          <meshStandardMaterial color={towerCol} flatShading />
        </mesh>
        <mesh position={[0, 60, 0]} scale={[10, 1.6, 10]} geometry={BOX}>
          <meshStandardMaterial color={towerCol} flatShading />
        </mesh>
        <group position={[0, 61.6, 0]} rotation={[0, 0, -smooth(0.35, 1, tower) * 1.5]}>
          <group position={[-smooth(0.35, 1, tower) * 6, -smooth(0.35, 1, tower) * 55, 0]}>
            <mesh scale={[8.5, 38, 8.5]} geometry={ROOF}>
              <meshStandardMaterial color={towerCol} flatShading />
            </mesh>
            <mesh position={[0, 38, 0]} scale={[2.8, 4, 2.8]} geometry={BOX}>
              <meshStandardMaterial color={towerCol} flatShading />
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
