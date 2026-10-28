import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig, sampleColor, useGlowTexture} from '../scenes/common';
import {SkyDome} from '../scenes/Park';
import {rng, sampleNum, smooth} from '../world';
import {FPS, G, LIGHT, PEOPLE, driftAt, landTau, liftAt, plumeAt, tauAt} from './time';

// Même géographie que « Et si l'humanité disparaissait » : la Seine suit l'axe z, x = 0 au milieu du fleuve.
// Le sud (rive gauche, côté tour Eiffel) est vers les x négatifs : c'est là que tout dérive.
const WATER_Y = 0.3;
const QUAY_Y = 0.8;
const STREET_Y = 4;
const WALL = 14;
const FRONT = 22;
const BZ = -45; // passerelle métallique
const STONE = [70, -150, -262]; // ponts de pierre ; celui de -150 est le pont d'Iéna, face à la tour
const TOWER: [number, number, number] = [-42, STREET_Y, -150];
const CHAMP = {x0: -64, x1: -250, z: -150, w: 38}; // pelouse du Champ-de-Mars
const ND = {x: 40, z0: -222, z1: -268};
const CITY_Z = 170;
const nearBridge = (z: number, d: number) => [BZ, ...STONE].some((b) => Math.abs(z - b) < d);

const BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const CUBE = new THREE.BoxGeometry(1, 1, 1);
const ROOF = new THREE.CylinderGeometry(0.42, Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0);
const WINDOW = new THREE.PlaneGeometry(1.1, 1.7);
const TRUNK = new THREE.CylinderGeometry(0.15, 0.22, 1, 5).translate(0, 0.5, 0);
const CANOPY = new THREE.IcosahedronGeometry(1.6, 0);
const BALL = new THREE.IcosahedronGeometry(1, 1);
const POLE = new THREE.CylinderGeometry(0.07, 0.09, 1, 5).translate(0, 0.5, 0);
const BIRD = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.6, 0.12, 0, 0, 0, 0.18, 0, 0, -0.18, 0.6, 0.12, 0, 0, 0, -0.18, 0, 0, 0.18], 3));
  g.computeVertexNormals();
  return g;
})();

const C = (h: string) => new THREE.Color(h);
const wrap = (x: number, m: number) => ((x % m) + m) % m;
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

type Bld = {x: number; z: number; w: number; d: number; h: number; side: number; col: THREE.Color; awn: number; chim: number};

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
        const zc = z - w / 2;
        const champ = side < 0 && zc > CHAMP.z - 42 && zc < CHAMP.z + 42; // dégagement du Champ-de-Mars
        const nd = side > 0 && x < ND.x + 30 && z - w > ND.z1 - 4 && z < ND.z0 + 4; // parvis de la cathédrale
        if ((nearBridge(zc, 6) && x === FRONT + 5) || champ || nd) {
          z -= w;
          continue;
        }
        out.push({x: side * x, z: zc, w: w - 0.2, d: 10, h: hMin + r() * hVar, side, col: cream(), awn: r() < 0.45 ? 1 + Math.floor(r() * 3) : 0, chim: r()});
        z -= w;
      }
    };
    for (const side of [-1, 1]) {
      row(front, side, FRONT + 5, 15, 4);
      for (let k = 0; k < 5; k++) row(back, side, FRONT + 23 + k * 18, 14, 6);
    }
    const wins: {b: Bld; y: number; z: number}[] = [];
    for (const b of front) {
      const cols = Math.max(2, Math.floor(b.w / 2.6));
      for (let f = 0; f < 5; f++) for (let c = 0; c < cols; c++) wins.push({b, y: STREET_Y + 4.2 + f * 2.8, z: b.z - b.w / 2 + ((c + 0.5) * b.w) / cols});
    }
    return {front, back, wins};
  }, []);

/** Un objet qui flotte : position de départ + altitude + dérive vers le sud + culbute. */
const floatAt = (tau: number, drag: number, spin: number, ph: number) => {
  const up = liftAt(tau, drag);
  const south = driftAt(tau, drag);
  const s = Math.max(0, Math.min(tau, landTau(drag))); // la culbute s'arrête à l'impact
  return {up, south, rot: spin * s * s * 0.004 + (s > 0 ? Math.sin(s * 0.3 + ph) * 0.05 : 0)};
};

export const City: React.FC<{from: number; shot: keyof typeof G.cams}> = ({from, shot}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const tau = tauAt(t);
  const keys = G.cams[shot] as any;
  const cam = (f: string) => sampleNum(keys, t, f);
  const [cx, cy, cz] = [cam('x'), cam('y'), cam('z')];
  const top = sampleColor(G.sky, t, 'top');
  const bottom = sampleColor(G.sky, t, 'bottom');
  const glow = useGlowTexture();
  const {front, back, wins} = useCity();
  const heavy = floatAt(tau, 0, 0, 0);
  const landH = landTau(0);
  const landed = smooth(landH - 0.05, landH, tau); // la Seine et les voitures touchent le sol
  const wake = tau > landH ? tau - landH : -1; // secondes réelles depuis l'impact

  const trees = useMemo(() => {
    const r = rng(7);
    const out: {x: number; z: number; s: number; col: THREE.Color}[] = [];
    const green = () => new THREE.Color().setHSL(0.26 + r() * 0.08, 0.42 + r() * 0.15, 0.26 + r() * 0.1);
    for (const side of [-1, 1])
      for (let z = CITY_Z - 8; z > -330; z -= 7) if (!nearBridge(z, 7)) out.push({x: side * 18.5, z, s: 1.1 + r() * 0.3, col: green()});
    // allées d'arbres du Champ-de-Mars
    for (const dz of [-CHAMP.w / 2 - 5, CHAMP.w / 2 + 5]) for (let x = CHAMP.x0 - 6; x > CHAMP.x1; x -= 8) out.push({x, z: CHAMP.z + dz, s: 1.2 + r() * 0.3, col: green()});
    return out;
  }, []);

  const cars = useMemo(() => {
    const r = rng(17);
    const pal = ['#b8322a', '#d9d9d9', '#2b3a55', '#1d1d1f', '#6a7f8c', '#e0b23a', '#f2f2ee'];
    const out: {x: number; z: number; col: THREE.Color; ry: number; spin: number; ph: number; bus: boolean}[] = [];
    // embouteillage sur les quais hauts : des files presque continues
    for (const side of [-1, 1])
      for (let z = 150; z > -300 && out.length < G.traffic.cars * 2; z -= 5.4 + r() * 4) {
        if (nearBridge(z, 6) || r() < 0.35) continue;
        out.push({x: side * (15.9 + (r() - 0.5) * 0.4), z, col: C(pal[Math.floor(r() * pal.length)]), ry: (r() - 0.5) * 0.06, spin: (r() - 0.5) * 2, ph: r() * 6, bus: r() < 0.07});
      }
    return out;
  }, []);

  const people = useMemo(() => {
    const r = rng(19);
    const clothes = ['#2b3a55', '#b8322a', '#e8e2d2', '#1d1d1f', '#6a7f8c', '#d9a23a', '#3f6b4a', '#8a5a8a', '#c86a3a', '#e0e0e0'];
    const skin = ['#f1c9a5', '#d9a07a', '#a8704a', '#6e4630', '#e8b894'];
    const mk = (o: {x: number; y: number; z: number; bridge?: boolean; sit?: boolean}) => ({
      ...o,
      dir: r() < 0.5 ? -1 : 1,
      sp: o.sit ? 0 : G.traffic.walkSpeed * (0.7 + r() * 0.6),
      ph: r() * 6,
      h: 0.85 + r() * 0.25,
      drag: PEOPLE * (0.7 + r() * 0.6),
      spin: (r() - 0.5) * 4,
      col: C(clothes[Math.floor(r() * clothes.length)]),
      skin: C(skin[Math.floor(r() * skin.length)]),
    });
    const out = [];
    for (let i = 0; i < G.traffic.people; i++) {
      const k = r();
      const side = r() < 0.5 ? -1 : 1;
      if (k > 0.86) out.push(mk({bridge: true, x: (r() - 0.5) * 26, y: STREET_Y, z: [BZ, ...STONE][Math.floor(r() * 4)] + (r() - 0.5) * 5}));
      else if (k < 0.6) out.push(mk({x: side * (19.6 + r() * 1.8), y: STREET_Y, z: 150 - r() * 450}));
      else out.push(mk({x: side * (11.7 + r() * 1.6), y: QUAY_Y, z: 150 - r() * 450}));
    }
    // pique-niqueurs sur la pelouse
    for (let i = 0; i < G.traffic.picnic; i++)
      out.push(mk({sit: r() < 0.7, x: CHAMP.x0 - 6 - r() * 130, y: STREET_Y + 0.05, z: CHAMP.z + (r() - 0.5) * (CHAMP.w - 4)}));
    return out;
  }, []);

  // nappes de pique-nique, ballons, feuilles : très légers, l'air qui monte les emporte vite
  const lightStuff = useMemo(() => {
    const r = rng(23);
    const pal = ['#d8342c', '#f2f0ea', '#3a6ab0', '#e8b83a', '#e05a9a'];
    return Array.from({length: 160}, (_, i) => {
      const blanket = i < 70;
      const leaf = i >= 110;
      const onChamp = !leaf || r() < 0.5;
      return {
        kind: blanket ? 0 : leaf ? 2 : 1,
        x: onChamp ? CHAMP.x0 - 6 - r() * 130 : (r() < 0.5 ? -1 : 1) * 18.5,
        z: onChamp ? CHAMP.z + (r() - 0.5) * (CHAMP.w - 4) : 120 - r() * 380,
        y: leaf ? STREET_Y + 4 + r() * 2 : STREET_Y + 0.06,
        drag: LIGHT * (0.3 + r() * 0.9) * (blanket ? 0.5 : 1),
        spin: (r() - 0.5) * 8,
        ph: r() * 6,
        col: leaf ? new THREE.Color().setHSL(0.27, 0.5, 0.3 + r() * 0.15) : C(pal[Math.floor(r() * pal.length)]),
      };
    });
  }, []);

  const books = useMemo(() => {
    const r = rng(53);
    const out: {x: number; z: number; spin: number; ph: number}[] = [];
    for (const side of [-1, 1]) for (let z = 150; z > -230; z -= 2.3) if (!nearBridge(z, 8) && r() > 0.3) out.push({x: side * 14.15, z, spin: (r() - 0.5) * 3, ph: r() * 6});
    return out;
  }, []);

  const barges = useMemo(() => {
    const r = rng(61);
    return [
      {x: -8.9, z: 20, len: 24},
      {x: 8.9, z: -8, len: 20},
      {x: -8.9, z: -92, len: 26},
      {x: 8.9, z: -122, len: 22},
    ].map((b) => ({...b, cabin: C(['#e8e2d2', '#7a2e2a', '#2f4b5e', '#e3c26a'][Math.floor(r() * 4)]), spin: (r() - 0.5) * 2}));
  }, []);

  // la Seine se découpe en grosses gouttes sur les bords, avec ses poissons
  const blobs = useMemo(() => {
    const r = rng(31);
    return Array.from({length: 260}, () => ({x: (r() - 0.5) * 26, z: 150 - r() * 450, s: 0.3 + r() * 1.1, dy: (r() - 0.3) * 3, ph: r() * 6, fish: r() < 0.25}));
  }, []);

  const lamps = useMemo(() => {
    const out: [number, number, number][] = [];
    for (const side of [-1, 1]) for (let z = CITY_Z - 10; z > -260; z -= 14) out.push([side * 15.2, STREET_Y, z]);
    return out;
  }, []);

  const birdOffs = useMemo(() => {
    const r = rng(29);
    return Array.from({length: 50}, () => [(r() - 0.5) * 16, (r() - 0.5) * 5, (r() - 0.5) * 14, r() * 6] as const);
  }, []);

  const splash = useMemo(() => {
    const r = rng(37);
    return Array.from({length: 90}, () => ({x: (r() - 0.5) * 30, z: 90 - r() * 300, s: 4 + r() * 8, vy: 4 + r() * 10}));
  }, []);

  const walk = (p: (typeof people)[number]) => {
    const step = tau * p.sp * p.dir; // sans gravité on ne marche plus : chacun garde sa vitesse et dérive
    if (p.bridge) return {x: -13 + wrap(p.x + 13 + step, 26), z: p.z, ry: p.dir > 0 ? Math.PI / 2 : -Math.PI / 2};
    if (p.sp === 0) return {x: p.x, z: p.z, ry: p.ph};
    return {x: p.x, z: -300 + wrap(p.z + 300 + step, 450), ry: p.dir > 0 ? 0 : Math.PI};
  };

  const water = C('#3a6f9e').lerp(C('#8fb3c9'), 0.25);
  const stone = C('#b3a58e');
  const steel = C('#56606a');
  const towerCol = C('#6e4a32');
  const sunDir = new THREE.Vector3(-0.45, 0.65, 0.6).normalize(); // éclaire les faces vues par les caméras (vers +z et vers -x)

  // la tour : quatre pieds, deux plateformes, une flèche (silhouette inspirée de la tour Eiffel)
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

  const plume = plumeAt(tau);
  const wind = smooth(0, 6, tau) * (1 - smooth(60, 61, tau)); // l'air qui monte

  return (
    <>
      <CameraRig position={[cx, cy, cz]} target={[cam('tx'), cam('ty'), cam('tz')]} fov={60} />
      <group position={[cx, cy, cz]}>
        <SkyDome top={top} bottom={bottom} />
      </group>
      <fog attach="fog" args={[bottom, 90 + cy * 0.5, 560 + cy * 1.1]} />
      <hemisphereLight color={top} groundColor="#4a4a3a" intensity={1.05} />
      <directionalLight color="#fff2dc" intensity={1.9} position={[sunDir.x * 200, sunDir.y * 200, sunDir.z * 200]} />
      <directionalLight color="#9fb6d8" intensity={0.5} position={[-30, 40, 80]} />

      {/* sol : banlieue verte autour de Paris (vue d'en haut), rues, quais, lit de la Seine */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * (14.4 + 1500), STREET_Y - 0.05, -150]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3000, 6000]} />
          <meshStandardMaterial color="#7f8a6a" />
        </mesh>
      ))}
      <mesh position={[0, -1.4, -150]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 3000]} />
        <meshStandardMaterial color="#5a4a35" />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 12.5, -1.4, -150]} scale={[3, QUAY_Y + 1.4, 3000]} geometry={BOX}>
            <meshStandardMaterial color="#a89f8c" />
          </mesh>
          <mesh position={[s * 14, -1.4, -150]} scale={[0.8, STREET_Y + 1.4, 3000]} geometry={BOX}>
            <meshStandardMaterial color="#b9ad95" />
          </mesh>
          <mesh position={[s * 14, STREET_Y, -150]} scale={[0.7, 0.9, 3000]} geometry={BOX}>
            <meshStandardMaterial color="#b9ad95" />
          </mesh>
          <mesh position={[s * 214.4, STREET_Y, -150]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[400, 1300]} />
            <meshStandardMaterial color="#6b6d70" />
          </mesh>
        </group>
      ))}

      {/* la Seine : un seul bloc d'eau qui monte et glisse vers le sud, puis s'écrase sur la rive gauche */}
      {tau < landH + 0.1 && (
        <mesh position={[-heavy.south, WATER_Y - 1.7 + heavy.up, -150]} rotation={[0, 0, heavy.rot * 0.2]} scale={[22, 1.7, 3000]} geometry={BOX}>
          <meshStandardMaterial color={water} roughness={0.5} transparent opacity={0.88} />
        </mesh>
      )}
      <Inst
        count={blobs.length}
        geo={BALL}
        opacity={0.85 * smooth(1, 6, tau) * (1 - landed)}
        update={(i, d, c) => {
          const b = blobs[i];
          const f = floatAt(tau, 0.0004 * (b.ph - 3), 0, b.ph);
          d.position.set(b.x * 1.05 - f.south, WATER_Y + f.up + b.dy * smooth(0, 20, tau) + Math.sin(tau * 0.5 + b.ph) * 0.2, b.z);
          d.scale.setScalar(b.fish ? 0.001 : b.s * smooth(2, 10, tau));
          c.copy(water);
        }}
      />
      {/* poissons qui flottent hors de l'eau */}
      <Inst
        count={blobs.length}
        geo={CUBE}
        update={(i, d, c) => {
          const b = blobs[i];
          if (!b.fish || tau < 3 || landed > 0.99) return void d.scale.set(0, 0, 0);
          const f = floatAt(tau, 0.0006 * b.ph, 0, b.ph);
          d.position.set(b.x - f.south, WATER_Y + f.up + 1 + b.dy + Math.sin(tau * 2 + b.ph) * 0.3, b.z);
          d.rotation.set(0, b.ph + tau * 0.6, Math.sin(tau * 5 + b.ph) * 0.3);
          d.scale.set(0.12, 0.25, 0.7);
          c.set('#b8c4cc');
        }}
      />
      {/* l'eau retombée : inondation des quais rive gauche */}
      {landed > 0 && (
        <>
          <mesh position={[-47, STREET_Y + 0.5, -150]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[66, 3000]} />
            <meshStandardMaterial color={water} roughness={0.4} transparent opacity={0.85 * landed * (1 - 0.3 * smooth(0, 8, wake))} />
          </mesh>
          {/* une partie de l'eau redescend dans le lit */}
          <mesh position={[0, -1.3 + 1.2 * smooth(0, 6, wake), -150]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[24, 3000]} />
            <meshStandardMaterial color={water} roughness={0.5} />
          </mesh>
        </>
      )}
      {splash.map((s, i) => {
        if (wake < 0 || wake > 2.5) return null;
        const u = wake / 2.5;
        return (
          <sprite key={i} position={[s.x - heavy.south, STREET_Y + s.vy * u * (1.4 - u), s.z]} scale={[s.s * (0.6 + u), s.s * (0.6 + u), 1]}>
            <spriteMaterial map={glow} color="#eef4f8" transparent opacity={0.75 * (1 - u)} depthWrite={false} />
          </sprite>
        );
      })}

      {/* immeubles */}
      {[front, back].map((list, k) => (
        <React.Fragment key={k}>
          <Inst
            count={list.length}
            geo={BOX}
            update={(i, d, c) => {
              const b = list[i];
              d.position.set(b.x, STREET_Y, b.z);
              d.scale.set(b.d, b.h, b.w);
              c.copy(b.col);
            }}
          />
          <Inst
            count={list.length}
            geo={ROOF}
            update={(i, d, c) => {
              const b = list[i];
              d.position.set(b.x, STREET_Y + b.h, b.z);
              d.scale.set(b.d, 4, b.w);
              c.set('#6f7c8c');
            }}
          />
        </React.Fragment>
      ))}
      <Inst
        count={wins.length}
        geo={WINDOW}
        basic
        update={(i, d, c) => {
          const wn = wins[i];
          d.position.set(wn.b.side * (FRONT - 0.06), wn.y, wn.z);
          d.rotation.y = wn.b.side > 0 ? -Math.PI / 2 : Math.PI / 2;
          c.set('#5b6672');
        }}
      />
      <Inst
        count={front.length * 2}
        geo={BOX}
        update={(i, d, c) => {
          const b = front[i >> 1];
          d.position.set(b.side * (FRONT - 0.4), STREET_Y + 4.2 + (i & 1 ? 4 : 1) * 2.8 - 1.05, b.z);
          d.scale.set(0.8, 0.14, b.w - 0.6);
          c.copy(b.col);
        }}
      />
      <Inst
        count={front.length}
        geo={BOX}
        update={(i, d, c) => {
          const b = front[i];
          if (!b.awn) return void d.scale.set(0, 0, 0);
          d.position.set(b.side * (FRONT - 1.1), STREET_Y + 3.1, b.z);
          d.rotation.z = b.side * 0.4;
          d.scale.set(2.2, 0.08, b.w - 1.5);
          c.set(['#a8322b', '#2f5d43', '#6d2440'][b.awn - 1]);
        }}
      />

      {/* arbres (enracinés : ils restent) */}
      <Inst
        count={trees.length}
        geo={TRUNK}
        update={(i, d, c) => {
          const tr = trees[i];
          d.position.set(tr.x, STREET_Y, tr.z);
          d.scale.set(tr.s, 2.6 * tr.s, tr.s);
          c.set('#5a3d25');
        }}
      />
      <Inst
        count={trees.length}
        geo={CANOPY}
        update={(i, d, c) => {
          const tr = trees[i];
          d.position.set(tr.x, STREET_Y + 3.6 * tr.s, tr.z);
          // le vent vertical plaque les feuillages vers le haut
          d.scale.set(tr.s * (1 - 0.15 * wind), tr.s * (1.05 + 0.3 * wind), tr.s * (1 - 0.15 * wind));
          d.rotation.y = i;
          c.copy(tr.col);
        }}
      />
      <Inst
        count={lamps.length}
        geo={POLE}
        update={(i, d, c) => {
          const [x, y, z] = lamps[i];
          d.position.set(x, y, z);
          d.scale.set(1, 4.5, 1);
          c.set('#2d3236');
        }}
      />

      {/* Champ-de-Mars : pelouse, allées, école au fond */}
      <mesh position={[(CHAMP.x0 + CHAMP.x1) / 2, STREET_Y + 0.02, CHAMP.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CHAMP.x0 - CHAMP.x1, CHAMP.w]} />
        <meshStandardMaterial color="#5f9a43" />
      </mesh>
      <mesh position={[(CHAMP.x0 + CHAMP.x1) / 2, STREET_Y + 0.01, CHAMP.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[CHAMP.x0 - CHAMP.x1 + 10, CHAMP.w + 22]} />
        <meshStandardMaterial color="#cdbb93" />
      </mesh>
      <mesh position={[CHAMP.x1 - 14, STREET_Y, CHAMP.z]} scale={[18, 14, 80]} geometry={BOX}>
        <meshStandardMaterial color="#d8c9a8" />
      </mesh>
      <mesh position={[CHAMP.x1 - 14, STREET_Y + 14, CHAMP.z]} scale={[18, 5, 80]} geometry={ROOF}>
        <meshStandardMaterial color="#6f7c8c" />
      </mesh>

      {/* voitures prises dans l'embouteillage */}
      {[0, 1].map((part) => (
        <Inst
          key={part}
          count={cars.length}
          geo={BOX}
          update={(i, d, c) => {
            const car = cars[i];
            if (part && car.bus) return void d.scale.set(0, 0, 0);
            const f = floatAt(tau, 0, car.spin, car.ph);
            d.position.set(car.x - f.south, STREET_Y + (part ? 0.9 : 0) + f.up, car.z + (part ? 0.2 : 0));
            d.rotation.set(f.rot * 0.6, car.ry, f.rot);
            if (part) d.scale.set(1.6, 0.7, 2.2);
            else d.scale.set(car.bus ? 2.5 : 1.8, car.bus ? 2.6 : 0.9, car.bus ? 11 : 4.2);
            c.copy(part ? C('#2a3038') : car.bus ? C('#3f7f62') : car.col);
          }}
        />
      ))}

      {/* piétons et pique-niqueurs */}
      {[0, 1].map((part) => (
        <Inst
          key={part}
          count={people.length}
          geo={BOX}
          update={(i, d, c) => {
            const p = people[i];
            const w = walk(p);
            const f = floatAt(tau, p.drag, p.spin, p.ph);
            const flying = smooth(0, 4, tau);
            const bob = tau < 0 && p.sp ? Math.abs(Math.sin(tau * 7 * p.sp + p.ph)) * 0.06 : 0;
            const sitH = p.sit ? 0.55 : 1;
            const bodyH = 1.25 * p.h * sitH;
            const y = p.y + f.up + bob;
            // en l'air, les bras et jambes s'écartent un peu : on élargit le corps
            const spread = 1 + 0.35 * flying * (tau < landTau(p.drag) ? 1 : 0);
            if (part === 0) {
              d.position.set(w.x - f.south, y, w.z);
              d.rotation.set(f.rot, w.ry, f.rot * 0.5);
              d.scale.set(0.5 * spread, bodyH, 0.32);
              c.copy(p.col);
            } else {
              const tilt = f.rot;
              d.position.set(w.x - f.south - Math.sin(tilt) * bodyH, y + Math.cos(tilt) * bodyH + 0.15, w.z);
              d.scale.setScalar(0.3);
              c.copy(p.skin);
            }
          }}
        />
      ))}

      {/* nappes, ballons, feuilles */}
      <Inst
        count={lightStuff.length}
        geo={CUBE}
        update={(i, d, c) => {
          const o = lightStuff[i];
          const f = floatAt(tau, o.drag, o.spin, o.ph);
          const sway = smooth(0, 3, tau) * Math.sin(tau * 0.8 + o.ph) * 1.5;
          d.position.set(o.x - f.south + sway, o.y + f.up, o.z + sway * 0.5);
          d.rotation.set(f.rot, o.ph, f.rot * 0.7);
          if (o.kind === 0) d.scale.set(1.8, 0.04, 1.4);
          else if (o.kind === 1) d.scale.setScalar(0.35);
          else d.scale.set(0.25, 0.02, 0.18);
          c.copy(o.col);
        }}
      />

      {/* boîtes des bouquinistes */}
      <Inst
        count={books.length}
        geo={BOX}
        update={(i, d, c) => {
          const b = books[i];
          const f = floatAt(tau, 0, b.spin, b.ph);
          d.position.set(b.x - f.south, STREET_Y + 0.9 + f.up, b.z);
          d.rotation.set(f.rot * 0.3, 0, f.rot);
          d.scale.set(0.8, 0.75, 2);
          c.set('#2e5a3c');
        }}
      />

      {/* péniches et bateau-mouche : ils montent avec la Seine */}
      {barges.map((bg, i) => {
        const f = floatAt(tau, 0, bg.spin, i);
        return (
          <group key={i} position={[bg.x - f.south, WATER_Y - 0.7 + f.up, bg.z]} rotation={[f.rot * 0.2, 0, f.rot * 0.4]}>
            <mesh position={[0, 0.75, 0]} scale={[3.6, 1.5, bg.len]} geometry={BOX}>
              <meshStandardMaterial color="#1f2a30" flatShading />
            </mesh>
            <mesh position={[0, 2.2, bg.len * 0.15]} scale={[2.6, 1.6, bg.len * 0.45]} geometry={BOX}>
              <meshStandardMaterial color={bg.cabin} flatShading />
            </mesh>
          </group>
        );
      })}
      {(() => {
        const f = floatAt(tau, 0, 0.6, 2);
        const z = 40 - 1.5 * Math.min(tau, landH); // il garde sa vitesse jusqu'à ce qu'il retombe
        return (
          <group position={[-1 - f.south, WATER_Y - 0.5 + f.up, z]} rotation={[0, 0.1 * f.rot, f.rot * 0.3]}>
            <mesh position={[0, 0.6, 0]} scale={[4.6, 1.2, 24]} geometry={BOX}>
              <meshStandardMaterial color="#f2f0ea" flatShading />
            </mesh>
            <mesh position={[0, 1.8, -1]} scale={[3.8, 1.5, 19]} geometry={BOX}>
              <meshStandardMaterial color="#3a5468" flatShading />
            </mesh>
          </group>
        );
      })()}

      {/* passerelle métallique */}
      <mesh position={[0, STREET_Y - 0.6, BZ]} scale={[28, 0.6, 7]} geometry={BOX}>
        <meshStandardMaterial color={steel} flatShading />
      </mesh>
      {[-5.5, 5.5].map((x) => (
        <mesh key={x} position={[x, -1.4, BZ]} scale={[2.2, STREET_Y + 0.9, 7.6]} geometry={BOX}>
          <meshStandardMaterial color={stone} flatShading />
        </mesh>
      ))}

      {/* ponts de pierre */}
      {STONE.map((bz) => (
        <group key={bz} position={[0, 0, bz]}>
          <mesh position={[0, STREET_Y - 0.5, 0]} scale={[28.8, 1, bz === CHAMP.z ? 14 : 8]} geometry={BOX}>
            <meshStandardMaterial color={stone} flatShading />
          </mesh>
          {[-6, 6].map((x) => (
            <mesh key={x} position={[x, -1.4, 0]} scale={[1.8, STREET_Y + 0.9, bz === CHAMP.z ? 14.4 : 8.4]} geometry={BOX}>
              <meshStandardMaterial color={stone} flatShading />
            </mesh>
          ))}
          {[
            [-10, 4],
            [0, 6],
            [10, 4],
          ].map(([x, rr]) =>
            [-1, 1].map((sd) => (
              <mesh key={`${x}${sd}`} position={[x, WATER_Y, sd * (bz === CHAMP.z ? 6.6 : 3.6)]} scale={[1, (STREET_Y - 1 - WATER_Y) / rr, 1]}>
                <torusGeometry args={[rr, 0.55, 5, 18, Math.PI]} />
                <meshStandardMaterial color={stone} flatShading />
              </mesh>
            )),
          )}
        </group>
      ))}

      {/* cathédrale (silhouette inspirée de Notre-Dame) */}
      <group position={[ND.x, STREET_Y, (ND.z0 + ND.z1) / 2]}>
        <mesh position={[0, 0, 4]} scale={[13, 20, 36]} geometry={BOX}>
          <meshStandardMaterial color={stone} flatShading />
        </mesh>
        <mesh position={[0, 20, 4]} scale={[13, 8, 36]} geometry={ROOF}>
          <meshStandardMaterial color="#6f7c8c" flatShading />
        </mesh>
        {[-4.2, 4.2].map((x) => (
          <mesh key={x} position={[x, 0, 21]} scale={[6.5, 34, 7]} geometry={BOX}>
            <meshStandardMaterial color={stone} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 26, 0]} scale={[1.2, 22, 1.2]} geometry={ROOF}>
          <meshStandardMaterial color="#4a4a4a" flatShading />
        </mesh>
      </group>

      {/* la tour, au bout du Champ-de-Mars, face au pont d'Iéna */}
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
        <mesh position={[0, 61.6, 0]} scale={[8.5, 38, 8.5]} geometry={ROOF}>
          <meshStandardMaterial color={towerCol} flatShading />
        </mesh>
        <mesh position={[0, 99.6, 0]} scale={[1, 10, 1]} geometry={POLE}>
          <meshStandardMaterial color={towerCol} />
        </mesh>
      </group>

      {/* pigeons : eux savent voler, ils tournent au-dessus de tout ça */}
      <Inst
        count={birdOffs.length}
        geo={BIRD}
        basic
        double
        update={(i, d, c) => {
          const [ox, oy, oz, ph] = birdOffs[i];
          const a = t * 0.22 + ph * 0.05;
          d.position.set(Math.sin(a) * 14 + ox, 36 + oy + Math.sin(t * 0.5) * 2, -60 + Math.cos(a) * 20 + oz);
          d.rotation.y = -a;
          const flap = Math.sin(t * 9 + ph * 3);
          d.scale.set(1.5 * (0.55 + 0.45 * Math.abs(flap)), 1.5 * flap, 1.5);
          c.set('#1d1f24');
        }}
      />

      {/* le geyser d'air : une brume qui monte au-dessus de Paris (visible quand on prend de la hauteur) */}
      {Array.from({length: 14}, (_, i) => {
        const y = 40 + i * 90;
        const vis = smooth(y, y + 200, plume) * smooth(80, 300, cy);
        if (vis <= 0) return null;
        return (
          <sprite key={i} position={[-20 + Math.sin(i) * 30, y, -80 + Math.cos(i * 1.3) * 40]} scale={[380 + i * 25, 380 + i * 25, 1]}>
            <spriteMaterial map={glow} color="#f4f6f8" transparent opacity={0.13 * vis} depthWrite={false} fog={false} />
          </sprite>
        );
      })}
    </>
  );
};
