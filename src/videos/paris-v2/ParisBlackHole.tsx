import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig, sampleColor, useGlowTexture, useRingTexture} from '../../shared/three/common';
import {SkyDome} from '../../shared/three/SkyDome';
import {useScenario} from '../whatif/Scenario';
import {rng, smooth} from '../../core/animation';
import {Bld, BOX, CUBE, ICO, Inst, makeWindows, Windows} from '../heat/kit';
import P from './scenario.json';

const ROOF = new THREE.CylinderGeometry(0.55, Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0);
const BLADE = new THREE.ConeGeometry(0.06, 0.65, 3).translate(0, 0.325, 0);
const HOLE_Z = P.camera.startZ - P.hole.startDistanceM;
const effect = (name: keyof typeof P.effects, t: number) => smooth(P.effects[name].from, P.effects[name].to, t);

const Beam: React.FC<{a: [number, number, number]; b: [number, number, number]; width: number; color: THREE.Color}> = ({a, b, width, color}) => {
  const {pos, q, length} = useMemo(() => {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const dir = end.clone().sub(start);
    return {pos: start.add(end).multiplyScalar(0.5), length: dir.length(), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())};
  }, [a.join(','), b.join(',')]);
  return <mesh position={pos} quaternion={q}><boxGeometry args={[width, length, width]} /><meshStandardMaterial color={color} metalness={0.45} roughness={0.6} /></mesh>;
};

/** Silhouette stylisée : quatre pieds évasés, deux plateformes et croisillons. */
export const Eiffel: React.FC<{bend: number; glow: number}> = ({bend, glow}) => {
  const color = new THREE.Color('#74604c').lerp(new THREE.Color('#d28b58'), glow * 0.6);
  const levels = [[0, 12], [22, 6], [43, 3.2], [68, 0.6]] as const;
  return (
    <group position={[0, 0, P.layout.towerZ]} scale={P.layout.towerHeight / 76}>
      <group rotation={[bend * 0.13, 0, -bend * 0.06]}>
        {[-1, 1].flatMap((sx) => [-1, 1].flatMap((sz) => levels.slice(0, -1).map(([y, r], i) => {
          const [ny, nr] = levels[i + 1];
          return <Beam key={`${sx}:${sz}:${i}`} a={[sx * r, y, sz * r]} b={[sx * nr, ny, sz * nr]} width={i === 0 ? 1.1 : 0.65} color={color} />;
        })))}
        {[22, 43].map((y, i) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[i ? 8 : 15, 1.1, i ? 8 : 15]} /><meshStandardMaterial color={color} /></mesh>)}
        {levels.slice(0, -1).flatMap(([y, r], i) => {
          const [ny, nr] = levels[i + 1];
          return [-1, 1].flatMap((sign) => [false, true].flatMap((swap) => [false, true].map((cross) => {
            const a: [number, number, number] = [cross ? -r : r, y + 2, sign * r];
            const b: [number, number, number] = [cross ? nr : -nr, ny - 1, sign * nr];
            return <Beam key={`${i}:${sign}:${swap}:${cross}`} a={swap ? [a[2], a[1], a[0]] : a} b={swap ? [b[2], b[1], b[0]] : b} width={0.22} color={color} />;
          })));
        })}
        {[-1, 1].map((s) => <mesh key={s} position={[0, 6, s * 9]}><torusGeometry args={[8, 0.4, 5, 20, Math.PI]} /><meshStandardMaterial color={color} /></mesh>)}
        <Beam a={[0, 67, 0]} b={[0, 76, 0]} width={0.4} color={color} />
      </group>
    </group>
  );
};

export const ParisBlackHole: React.FC = () => {
  const t = useCurrentFrame() / P.fps;
  const {holeStateAt} = useScenario();
  const st = holeStateAt(t);
  const pull = effect('pull', t);
  const suction = effect('suction', t);
  const glowK = effect('glow', t);
  const debrisK = effect('debris', t);
  const glow = useGlowTexture();
  const ring = useRingTexture();
  const top = sampleColor(P.sky, t, 'top');
  const bottom = sampleColor(P.sky, t, 'bottom');
  const hole = new THREE.Vector3(0, P.layout.holeY, HOLE_Z);

  const city = useMemo(() => {
    const r = rng(204);
    const list: Bld[] = [];
    for (const side of [-1, 1]) for (let i = 0; i < 14; i++) {
      list.push({x: side * P.layout.buildingX, z: 18 - i * 16, w: 15, d: 14.8, h: 14 + r() * 5, col: new THREE.Color().setHSL(0.1, 0.22, 0.71 + r() * 0.1), k: r()});
    }
    return {list, windows: makeWindows(list, 205, 2.9)};
  }, []);
  const trees = useMemo(() => {
    const r = rng(207);
    return [-1, 1].flatMap((side) => Array.from({length: 22}, (_, i) => ({x: side * P.layout.treeX, z: 17 - i * 7, s: 0.9 + r() * 0.35})));
  }, []);
  const grass = useMemo(() => {
    const r = rng(208);
    return Array.from({length: 3200}, () => ({x: (r() - 0.5) * P.layout.lawnWidth, z: 24 - r() * 170, s: 0.6 + r() * 0.8, tone: r()}));
  }, []);
  const people = useMemo(() => {
    const r = rng(209);
    return Array.from({length: 18}, (_, i) => ({x: (r() - 0.5) * 22, z: 6 - r() * 75, phase: r(), color: ['#c75b45', '#44779c', '#dbbb72', '#528875'][i % 4]}));
  }, []);
  const particles = useMemo(() => {
    const r = rng(210);
    return Array.from({length: 320}, () => ({angle: r() * Math.PI * 2, radius: 8 + r() * 40, phase: r(), height: r() * 14, scale: 0.05 + r() * 0.25}));
  }, []);
  const move = (x: number, y: number, z: number, amount: number) => new THREE.Vector3(x, y, z).lerp(hole, amount);
  const tilt = (x: number, z: number, k: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(HOLE_Z - z, 0, x).normalize(), k);

  return (
    <>
      <CameraRig position={[0, P.camera.height, P.camera.startZ - (P.hole.startDistanceM - st.r)]} target={[0, P.camera.targetY, -95]} fov={P.camera.fov} />
      <SkyDome top={top} bottom={bottom} />
      <fog attach="fog" args={[bottom, 160, 550]} />
      <hemisphereLight color={top.clone().lerp(new THREE.Color('#ffffff'), 0.4)} groundColor="#606344" intensity={1.8} />
      <directionalLight color={bottom} intensity={2.1} position={[-45, 80, 30]} />
      <pointLight position={hole} color="#ffad65" intensity={glowK * 180} distance={100} decay={1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[700, 700]} /><meshStandardMaterial color="#c9bda5" /></mesh>
      <mesh position={[0, 0.02, -62]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[P.layout.lawnWidth, 178]} /><meshStandardMaterial color={new THREE.Color('#588446').lerp(new THREE.Color('#70623c'), glowK * 0.6)} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 30, 0.03, -70]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[7, 260]} /><meshStandardMaterial color="#777975" /></mesh>)}

      <Inst count={grass.length} geo={BLADE} update={(i, d, c) => {
        const g = grass[i];
        d.position.copy(move(g.x, 0.03, g.z, suction * 0.32));
        d.quaternion.copy(tilt(g.x, g.z, pull * 1.35));
        d.scale.set(1, g.s, 1);
        c.setHSL(0.25 + g.tone * 0.06, 0.42, 0.29 + g.tone * 0.14);
      }} />

      <Inst count={city.list.length} geo={BOX} update={(i, d, c) => {
        const b = city.list[i];
        d.position.set(b.x, 0, b.z);
        d.scale.set(b.w, b.h, b.d);
        c.copy(b.col);
      }} />
      <Inst count={city.list.length} geo={ROOF} update={(i, d, c) => {
        const b = city.list[i];
        d.position.set(b.x, b.h, b.z);
        d.scale.set(b.w, 3.5, b.d);
        c.set('#536174');
      }} />
      <Windows list={city.windows} c={22} t={t} />
      <Eiffel bend={effect('towerBend', t)} glow={glowK} />

      {trees.map((tr, i) => {
        const k = suction * (0.2 + 0.18 * (i % 3));
        const pos = move(tr.x, 0, tr.z, k);
        pos.y += Math.sin(k * Math.PI) * 5;
        return <group key={i} position={pos} quaternion={tilt(tr.x, tr.z, suction * 0.85)} scale={tr.s}>
          <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.2, 0.32, 4, 7]} /><meshStandardMaterial color="#68513b" /></mesh>
          <mesh position={[0, 5, 0]} scale={[1.2, 1.4, 1]} geometry={ICO}><meshStandardMaterial color={i % 2 ? '#4c7944' : '#638b50'} flatShading /></mesh>
          <mesh position={[0.4, 4.3, 0]} scale={[1.65, 1.5, 1.5]} geometry={ICO}><meshStandardMaterial color="#527d45" flatShading /></mesh>
        </group>;
      })}

      {/* Les mêmes bancs restent identifiables puis sont attirés vers le centre. */}
      {[-1, 1].flatMap((s) => Array.from({length: 6}, (_, i) => {
        const x = s * 13.8;
        const z = 8 - i * 19;
        const k = suction * (0.4 + i * 0.035);
        const pos = move(x, 0, z, k);
        pos.y += k * 4;
        return <group key={`${s}:${i}`} position={pos} rotation={[k * 0.7, s * Math.PI / 2 + k, k * 0.4]}>
          <mesh position={[0, 0.6, 0]}><boxGeometry args={[2.4, 0.16, 0.6]} /><meshStandardMaterial color="#405e4c" /></mesh>
          <mesh position={[0, 1, -0.28]}><boxGeometry args={[2.4, 0.65, 0.12]} /><meshStandardMaterial color="#405e4c" /></mesh>
          {[-0.85, 0.85].map((leg) => <mesh key={leg} position={[leg, 0.3, 0]}><boxGeometry args={[0.12, 0.6, 0.5]} /><meshStandardMaterial color="#313b36" /></mesh>)}
        </group>;
      }))}

      {people.map((p, i) => {
        const k = smooth(23 + p.phase * 3, 35 + p.phase * 3, t);
        return <group key={i} position={move(p.x, 0, p.z, k * 0.92)} quaternion={tilt(p.x, p.z, k * 1.3)} scale={1 - k * 0.75}>
          <mesh position={[0, 0.8, 0]}><boxGeometry args={[0.45, 0.7, 0.3]} /><meshStandardMaterial color={p.color} /></mesh>
          <mesh position={[0, 1.4, 0]}><sphereGeometry args={[0.2, 8, 6]} /><meshStandardMaterial color="#d6aa83" /></mesh>
          {[-0.13, 0.13].map((x) => <mesh key={x} position={[x, 0.24, 0]}><boxGeometry args={[0.17, 0.5, 0.22]} /><meshStandardMaterial color="#334355" /></mesh>)}
        </group>;
      })}

      <Inst count={particles.length} geo={CUBE} basic update={(i, d, c) => {
        const p = particles[i];
        const on = smooth(p.phase * 0.5, p.phase * 0.5 + 0.5, debrisK);
        if (on <= 0) return void d.scale.set(0, 0, 0);
        const age = ((t - P.effects.debris.from) * 0.12 + p.phase) % 1;
        const a = p.angle + age * 6;
        const radius = p.radius * (1 - age);
        d.position.set(Math.cos(a) * radius, P.layout.holeY + Math.sin(age * Math.PI) * p.height, HOLE_Z + Math.sin(a) * radius);
        d.rotation.set(t + i, t * 2 + i, i);
        d.scale.setScalar(p.scale * on * (1 - age));
        c.set(i % 3 ? '#c1a47b' : '#ffca7e');
      }} />

      {t >= P.hole.appearsAt && <group position={hole}>
        <mesh><sphereGeometry args={[0.085, 24, 16]} /><meshBasicMaterial color="#000000" /></mesh>
        <sprite scale={[1.8, 1.8, 1]}><spriteMaterial map={ring} color="#e7d2a0" transparent opacity={1 - smooth(22, 30, t)} fog={false} depthTest={false} /></sprite>
        <group rotation={[0.25, 0, -0.15]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.4 + glowK * 1.2, 0.035 + glowK * 0.08, 8, 64]} /><meshBasicMaterial color="#ffce83" transparent opacity={glowK} /></mesh>
        </group>
        <sprite scale={[1 + 32 * glowK, 1 + 32 * glowK, 1]} renderOrder={10}><spriteMaterial map={glow} color="#ffbd78" opacity={glowK * 0.85} transparent blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} fog={false} /></sprite>
        <sprite scale={[0.2 + 6 * glowK, 0.2 + 6 * glowK, 1]} renderOrder={11}><spriteMaterial map={glow} opacity={glowK} transparent blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} fog={false} /></sprite>
      </group>}
    </>
  );
};
