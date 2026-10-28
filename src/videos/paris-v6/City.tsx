import React, {useLayoutEffect, useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {CameraRig, sampleColor, useGlowTexture} from '../../shared/three/common';
import {SkyDome} from '../../shared/three/SkyDome';
import {Eiffel} from '../paris-v2/ParisBlackHole';
import {BOX, CUBE, ICO, WHEEL, Inst, Bld, makeWindows, Person, makeWalkers} from '../heat/kit';
import {rng, smooth} from '../../core/animation';
import {cameraAt} from './motion';
import {heroAt} from './story';
import {ColdWater, Snowfall, WetRoad, WinterWorld} from './Winter';
import P from './scenario.json';

const ROOF = new THREE.CylinderGeometry(0.55, 0.707, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0);
const GRASS = new THREE.ConeGeometry(0.075, 0.65, 3).translate(0, 0.325, 0);
const hole = new THREE.Vector3(0, P.hole.height, P.hole.z);

/** L'objet suit une spirale 3D, rétrécit et disparaît au centre, sans téléportation. */
const absorb = (x: number, y: number, z: number, t: number, from: number, to: number) => {
  const k = smooth(from, to, t);
  const v = new THREE.Vector3(x - hole.x, 0, z - hole.z);
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), k * k * 3.5).multiplyScalar(Math.pow(1 - k, 1.25));
  v.y = y * (1 - k) + hole.y * k + Math.sin(k * Math.PI) * 7;
  v.x += hole.x;
  v.z += hole.z;
  return {pos: v, k, size: 1 - smooth(0.7, 1, k)};
};

const FarPlane: React.FC = () => {
  const {camera} = useThree();
  useLayoutEffect(() => {
    // La précision de profondeur doit suivre l'altitude pour les routes et les toits.
    camera.near = Math.max(0.3, camera.position.y / 100);
    camera.far = 12000;
    camera.updateProjectionMatrix();
  });
  return null;
};

export const City: React.FC<{from: number}> = ({from}) => {
  const t = from + useCurrentFrame() / P.fps;
  const cam = cameraAt(t);
  const pull = smooth(P.effects.pullFrom, P.effects.absorbTo, t);
  const urban = smooth(P.effects.cityFrom, P.effects.cityTo, t);
  const hero = heroAt(t);
  const impact = Math.exp(-Math.pow((t - P.hero.impactAt) / 0.2, 2));
  const glow = useGlowTexture();
  const skyTop = sampleColor(P.sky, t, 'top');
  const skyBottom = sampleColor(P.sky, t, 'bottom');
  const city = useMemo(() => {
    const r = rng(P.city.seed);
    const list: Bld[] = [];
    for (const side of [-1, 1]) for (let col = 0; col < P.city.blocks; col++) for (let row = 0; row < P.city.rows; row++) {
      const x = side * (50 + col * P.city.streetPitch);
      const z = 300 - row * P.city.streetPitch;
      if (Math.abs(z + 250 - Math.sin(x / 160) * 22) < 26) continue;
      list.push({x, z, w: 22 + r() * 3, d: 23 + r() * 2, h: 14 + r() * 11, col: new THREE.Color().setHSL(0.57 + r() * 0.035, 0.08 + r() * 0.08, 0.28 + r() * 0.14), k: r()});
    }
    // Quartier d'affaires stylisé derrière la tour Eiffel, hors de l'axe du parc.
    for (let i = 0; i < 20; i++) {
      const x = -130 - (i % 5) * 29;
      const z = -330 - Math.floor(i / 5) * 32;
      list.push({x, z, w: 17 + r() * 5, d: 19 + r() * 4, h: 55 + r() * 75, col: new THREE.Color().setHSL(0.57, 0.18, 0.23 + r() * 0.17), k: r()});
    }
    return {list, windows: makeWindows(list.filter((b) => Math.abs(b.x) < 95 || b.h > 50), 306, 3.5)};
  }, []);
  const trees = useMemo(() => [-1, 1].flatMap((s) => Array.from({length: 25}, (_, i) => ({x: s * 19, z: 22 - i * 7.2, s: 1 + (i % 4) * 0.1}))), []);
  const walkers = useMemo(() => makeWalkers(P.city.people, 308, (r) => ({x: (r() - 0.5) * 23, z: 17 - r() * 148, dir: r() < 0.5 ? -1 : 1})), []);
  const grass = useMemo(() => {
    const r = rng(309);
    return Array.from({length: 800}, () => ({x: (r() - 0.5) * 24, z: 25 - r() * 178, s: 0.12 + r() * 0.2, ph: r()}));
  }, []);
  const cars = useMemo(() => {
    const r = rng(310);
    return Array.from({length: P.city.cars}, (_, i) => ({
      road: i < 42 ? (i % 2 ? -30 : 30) : (i % 2 ? -1 : 1) * (30 + Math.floor(r() * 7) * 34),
      horizontal: i % 4 === 0, z: -480 + r() * 790, speed: 5 + r() * 5, sign: i % 3 ? 1 : -1,
      col: new THREE.Color(['#b39b76', '#cfba83', '#47748d', '#e8e4db', '#3e4951', '#4d8175'][i % 6]),
      delay: r() * 4,
    }));
  }, []);
  const carState = (i: number) => {
    const car = cars[i];
    const flow = Math.min(t, P.effects.absorbFrom + car.delay);
    const along = ((car.z + car.sign * flow * car.speed + 1500) % 800) - 500;
    const x = car.horizontal ? along : car.road + car.sign * 1.8;
    const z = car.horizontal ? [45, 113, -193, -295, 181][i % 5] + car.sign * 1.8 : along;
    const distance = Math.hypot(x, z - P.hole.z);
    const start = P.effects.absorbFrom + car.delay + Math.min(9, distance / 70);
    const a = absorb(x, 0, z, t, start, start + 8);
    const ry = (car.horizontal ? Math.PI / 2 : 0) + (car.sign < 0 ? Math.PI : 0);
    return {...a, ry, car, quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(a.k * 1.5, ry + a.k * 3, a.k))};
  };
  const buildingState = (b: Bld) => {
    const delay = Math.min(7, Math.hypot(b.x, b.z - P.hole.z) / 100);
    const a = absorb(b.x, 0, b.z, t, P.effects.cityFrom + delay, P.effects.cityTo + delay);
    const rotation = new THREE.Euler(a.k * 0.5, a.k, Math.sign(b.x) * a.k * 0.6);
    return {...a, rotation, quaternion: new THREE.Quaternion().setFromEuler(rotation)};
  };
  const debris = useMemo(() => {
    const r = rng(311);
    return Array.from({length: 600}, () => ({a: r() * Math.PI * 2, r: 12 + r() * 70, ph: r(), h: r() * 2, s: 0.06 + r() * 0.25}));
  }, []);
  const river = useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i <= 60; i++) {const x = -650 + i * 22; const z = -250 + Math.sin(x / 160) * 22 - 24; i ? shape.lineTo(x, -z) : shape.moveTo(x, -z);}
    for (let i = 60; i >= 0; i--) {const x = -650 + i * 22; shape.lineTo(x, 250 - Math.sin(x / 160) * 22 - 24);}
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  return <>
    <CameraRig position={[cam.x, cam.y, cam.z]} target={[cam.tx, cam.ty, cam.tz]} fov={55} />
    <FarPlane />
    <color attach="background" args={[skyTop]} />
    {t < P.shots[0].to && <group scale={8}><SkyDome top={skyTop} bottom={skyBottom} /></group>}
    <Snowfall t={t} />
    <fog attach="fog" args={[skyBottom, 150 + cam.y * 1.2, 1150 + cam.y * 3]} />
    <hemisphereLight color="#c9e0f4" groundColor="#4c5054" intensity={1.35} />
    <directionalLight color="#e8edf1" position={[-180, 300, 180]} intensity={1.8} />
    <pointLight position={hole} color="#ffb562" intensity={pull * 300 + impact * 280} distance={160} decay={1} />
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[5000, 5000]} /><meshStandardMaterial color="#a3b1b8" /></mesh>
    <mesh position={[0, 0.015, -80]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[700, 1000]} /><meshStandardMaterial color="#8c9ca5" /></mesh>
    <mesh geometry={river} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}><ColdWater t={t} /></mesh>
    {[-1, 1].flatMap((s) => Array.from({length: P.city.blocks + 1}, (_, i) => <mesh key={`${s}:${i}`} position={[s * (30 + i * 34), 0.08, -100]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[9, 1000]} /><WetRoad /></mesh>))}
    {Array.from({length: 27}, (_, i) => <group key={i}>
      <mesh position={[-178, 0.065, 317 - i * 34]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[310, 9]} /><WetRoad /></mesh>
      <mesh position={[178, 0.065, 317 - i * 34]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[310, 9]} /><WetRoad /></mesh>
    </group>)}
    {/* Marquages des deux avenues principales et passages piétons. */}
    <Inst count={240} geo={CUBE} update={(i, d, c) => {
      d.position.set(i % 2 ? -30 : 30, 0.095, 290 - Math.floor(i / 2) * 7);
      d.scale.set(0.13, 0.025, 2.8); c.set('#e7dec4');
    }} />
    <Inst count={96} geo={CUBE} update={(i, d, c) => {
      const crossing = Math.floor(i / 12);
      d.position.set((crossing % 2 ? -30 : 30) - 3.5 + (i % 12) * 0.64, 0.11, 10 - Math.floor(crossing / 2) * 68);
      d.scale.set(0.4, 0.025, 3.1); c.set('#e7e4d7');
    }} />
    <mesh position={[0, 0.12, -63]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[24, 178]} /><meshStandardMaterial color="#b2bfc4" /></mesh>

    {/* Réverbères, feux et bornes donnent une échelle aux avenues. */}
    {[-1, 1].flatMap((s) => Array.from({length: 10}, (_, i) => <group key={`lamp:${s}:${i}`} position={[s * 24.5, 0, 22 - i * 20]}>
      <mesh position={[0, 2.8, 0]}><cylinderGeometry args={[0.07, 0.11, 5.6, 6]} /><meshStandardMaterial color="#33433e" /></mesh>
      <mesh position={[-s * 0.5, 5.6, 0]}><boxGeometry args={[1.15, 0.12, 0.32]} /><meshStandardMaterial color="#394943" /></mesh>
      <mesh position={[-s*.7,.135,1.5]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[1.2,8]} /><meshBasicMaterial map={glow} color="#e8c38e" transparent opacity={.22} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
      <mesh position={[-s * 0.7, 5.48, 0]}><boxGeometry args={[0.5, 0.04, 0.26]} /><meshBasicMaterial color="#ffe8b1" /></mesh>
    </group>))}
    {[-1, 1].map((s) => <group key={`signal:${s}`} position={[s * 24, 0, 9]}>
      <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.09, 0.09, 3, 6]} /><meshStandardMaterial color="#38433d" /></mesh>
      <mesh position={[0, 3.2, 0]}><boxGeometry args={[0.5, 1.2, 0.4]} /><meshStandardMaterial color="#172723" /></mesh>
      {[0, 1, 2].map((k) => <mesh key={k} position={[0, 3.55 - k * 0.35, 0.22]}><circleGeometry args={[0.12, 12]} /><meshBasicMaterial color={k === (t < 4 ? 2 : 0) ? ['#ff5e48', '#e9bb4d', '#5ee99a'][k] : '#26392c'} /></mesh>)}
    </group>)}

    <Inst count={city.list.length} geo={BOX} update={(i, d, c) => {
      const b = city.list[i]; const a = buildingState(b);
      d.position.copy(a.pos); d.rotation.copy(a.rotation);
      d.scale.set(b.w * a.size, b.h * a.size, b.d * a.size); c.copy(b.col);
    }} />
    <Inst count={city.list.length} geo={ROOF} update={(i, d, c) => {
      const b = city.list[i]; const a = buildingState(b);
      d.position.set(0, b.h * a.size, 0).applyQuaternion(a.quaternion).add(a.pos); d.rotation.copy(a.rotation);
      d.scale.set(b.w * a.size, (b.h > 50 ? 1 : 3.5) * a.size, b.d * a.size); c.set(b.h > 50 ? '#869ea9' : '#485a67');
    }} />
    <Inst count={city.windows.length} geo={CUBE} basic update={(i, d, c) => {
      const w = city.windows[i]; const a = buildingState(w.b);
      d.position.set(w.x - w.b.x, w.y, w.z - w.b.z).multiplyScalar(a.size).applyQuaternion(a.quaternion).add(a.pos);
      d.quaternion.copy(a.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), w.ry));
      d.scale.set(a.size, 1.3 * a.size, 0.035 * a.size);
      c.set(i % 7 === 0 ? '#f6cf82' : w.b.h > 50 ? '#627d8e' : '#253e50');
    }} />

    <Inst count={city.windows.length} geo={CUBE} update={(i,d,c)=>{
      const w=city.windows[i]; const a=buildingState(w.b);
      d.position.set(w.x-w.b.x,w.y-.8,w.z-w.b.z).multiplyScalar(a.size).applyQuaternion(a.quaternion).add(a.pos);
      d.quaternion.copy(a.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),w.ry));
      d.scale.set(1.4*a.size,.16*a.size,.3*a.size); c.set('#9eafb7');
    }} />
    <Inst count={city.list.length*3} geo={CUBE} update={(i,d,c)=>{
      const b=city.list[Math.floor(i/3)];const a=buildingState(b);const level=i%3;
      d.position.set(0,(level===2?b.h:b.h*(level+1)/3)*a.size,0).applyQuaternion(a.quaternion).add(a.pos);
      d.quaternion.copy(a.quaternion);d.scale.set((b.w+.3)*a.size,.35*a.size,(b.d+.3)*a.size);c.set('#889da9');
    }} />
    <group position={absorb(0, 0, -170, t, P.timing.towerFrom, P.timing.towerTo).pos} scale={1 - smooth(P.timing.towerTo - 6, P.timing.towerTo, t)}>
      <group position={[0, 0, 170]}><Eiffel bend={urban} glow={pull} /></group>
    </group>
    <Inst count={grass.length} geo={GRASS} update={(i, d, c) => {
      const g = grass[i]; const a = absorb(g.x, 0.15, g.z, t, P.timing.grassFrom + g.ph * 4, P.timing.grassTo + g.ph * 4);
      d.position.copy(a.pos); d.rotation.set(a.k, g.ph * 6, a.k * 0.6); d.scale.set(a.size, g.s * a.size, a.size);
      c.setHSL(0.56, 0.08, 0.5 + g.ph * 0.2);
    }} />
    {trees.map((tr, i) => {const a = absorb(tr.x, 0, tr.z, t, P.timing.treesFrom + i % 4, P.timing.treesTo + i % 4); return <group key={i} position={a.pos} rotation={[a.k, a.k * 2, Math.sign(tr.x) * a.k * 0.7]} scale={a.size * tr.s}>
      <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.18, 0.28, 4, 6]} /><meshStandardMaterial color="#6e513a" /></mesh>
      <mesh position={[0, 4.6, 0]} geometry={ICO} scale={[1.8, 2.2, 1.8]}><meshStandardMaterial color={i % 2 ? '#c1ccd0' : '#93a8af'} flatShading /></mesh>
    </group>;})}
    {walkers.map((w, i) => {const z = w.z + Math.min(t, P.timing.peopleFrom) * w.dir * w.speed * 0.45; const a = absorb(w.x, 0, z, t, P.timing.peopleFrom + i % 4, P.timing.peopleTo + i % 4); return <group key={i} position={a.pos} rotation={[a.k, a.k * 2, a.k * 0.6]} scale={a.size}>
      <Person w={w} t={t} c={22} pace={1 - a.k} pos={[0, 0, 0]} rot={w.dir < 0 ? Math.PI : 0} />
    </group>;})}
    {[-1, 1].flatMap((s) => Array.from({length: 8}, (_, i) => {const a = absorb(s * 14, 0, 15 - i * 20, t, P.timing.benchesFrom + i % 3, P.timing.benchesTo + i % 3); return <group key={`${s}:${i}`} position={a.pos} rotation={[a.k, s * Math.PI / 2 + a.k * 2, a.k]} scale={a.size}>
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[2.6, 0.18, 0.7]} /><meshStandardMaterial color="#3d5058" /></mesh>
      <mesh position={[0, 1, -0.3]}><boxGeometry args={[2.6, 0.65, 0.12]} /><meshStandardMaterial color="#3d5058" /></mesh>
      {[-1, 1].map((leg) => <mesh key={leg} position={[leg, 0.3, 0]}><boxGeometry args={[0.15, 0.6, 0.5]} /><meshStandardMaterial color="#374439" /></mesh>)}
    </group>;}))}

    {/* Voiture héroïne : un seul groupe garde carrosserie, vitres et roues solidaires. */}
    <group position={hero.pos} rotation={[hero.k * 1.1, Math.PI + hero.k * 3, hero.k * 0.7]} scale={hero.size}>
      <mesh position={[0, 0.72, 0]}><boxGeometry args={[2.15, 0.9, 4.7]} /><meshStandardMaterial color="#ed3a25" roughness={0.3} metalness={0.25} /></mesh>
      <mesh position={[0, 1.38, 0]}><boxGeometry args={[1.85, 0.65, 2.5]} /><meshStandardMaterial color="#263c4b" roughness={0.2} /></mesh>
      <mesh position={[0, 1.73, 0]}><boxGeometry args={[1.9, 0.09, 1.4]} /><meshStandardMaterial color="#d72e20" /></mesh>
      {[-1, 1].flatMap((s) => [-1.5, 1.5].map((z) => <mesh key={`${s}:${z}`} position={[s * 1.05, 0.4, z]} geometry={WHEEL} scale={[0.3, 0.8, 0.8]}><meshStandardMaterial color="#182126" /></mesh>))}
      {[-0.75, 0.75].map((x) => <mesh key={x} position={[x, 0.8, -2.37]}><boxGeometry args={[0.4, 0.25, 0.05]} /><meshBasicMaterial color="#fff1c8" /></mesh>)}
    </group>
    <Inst count={cars.length} geo={CUBE} update={(i, d, c) => {
      const a = carState(i); d.position.set(0, 0.75 * a.size, 0).applyQuaternion(a.quaternion).add(a.pos);
      d.quaternion.copy(a.quaternion); d.scale.set(2.1 * a.size, 0.9 * a.size, 4.7 * a.size); c.copy(a.car.col);
    }} />
    <Inst count={cars.length} geo={CUBE} update={(i, d, c) => {
      const a = carState(i); d.position.set(0, 1.4 * a.size, 0).applyQuaternion(a.quaternion).add(a.pos);
      d.quaternion.copy(a.quaternion); d.scale.set(1.8 * a.size, 0.7 * a.size, 2.4 * a.size); c.set('#314a59');
    }} />
    <Inst count={cars.length * 4} geo={WHEEL} update={(i, d, c) => {
      const a = carState(Math.floor(i / 4)); const k = i % 4;
      const off = new THREE.Vector3(k % 2 ? 1.03 : -1.03, 0.4, k < 2 ? 1.5 : -1.5).applyQuaternion(a.quaternion).multiplyScalar(a.size);
      d.position.copy(a.pos).add(off); d.quaternion.copy(a.quaternion); d.scale.set(0.3 * a.size, 0.8 * a.size, 0.8 * a.size); c.set('#20272b');
    }} />
    <Inst count={debris.length} geo={CUBE} basic update={(i, d, c) => {
      const p = debris[i]; const on = smooth(P.effects.pullFrom + p.ph * 4, P.effects.pullFrom + 5 + p.ph * 4, t);
      const age = ((t * 0.18 + p.ph) % 1 + 1) % 1; const a = p.a + age * age * 7; const radius = p.r * Math.pow(1 - age, 1.5);
      d.position.set(Math.cos(a) * radius, p.h * (1 - age) + P.hole.height * age + Math.sin(age * Math.PI) * 7, P.hole.z + Math.sin(a) * radius);
      d.scale.setScalar(p.s * on * (1 - smooth(0.8, 1, age))); d.rotation.set(i + t, i + t * 2, 0); c.set(i % 5 ? '#c7b28a' : '#ffc47d');
    }} />
    {t >= P.hole.appearsAt && <group position={hole} scale={smooth(P.hole.appearsAt, P.hole.appearsAt + 1.5, t)}>
      <sprite scale={[10 + pull * 15, 10 + pull * 15, 1]}><spriteMaterial map={glow} color="#ffb36a" transparent opacity={0.2 + pull * 0.35} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
      <group rotation={[0.25, 0, 0.12]}>
        {[0, 1, 2].map((i) => <group key={i} rotation={[0, t * (1 + i * 0.25) + i * 2.1, 0]}><mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.2 + i * 0.5 + pull * (1 + i * 0.3), 0.075 + i * 0.025, 8, 72, Math.PI * 1.6]} /><meshBasicMaterial color={i ? '#e28b3b' : '#fff0b5'} transparent opacity={0.9 - i * 0.18} /></mesh></group>)}
      </group>
      <mesh rotation={[0.2, 0, 0.12]}><torusGeometry args={[1.15 + pull * 0.4, 0.035, 8, 72]} /><meshBasicMaterial color="#ffc473" transparent opacity={0.6} /></mesh>
      <mesh renderOrder={30}><sphereGeometry args={[0.65 + pull * 0.5, 32, 24]} /><meshBasicMaterial color="#010207" /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><ringGeometry args={[2.5, 2.55, 96]} /><meshBasicMaterial color="#ffd4a0" side={THREE.DoubleSide} transparent opacity={0.35} /></mesh>
    </group>}
    {/* Balise conservée pendant le recul pour suivre le lieu de départ. */}
    {t > P.timing.beaconFrom && <sprite position={hole} scale={[cam.y * 0.06, cam.y * 0.06, 1]}><spriteMaterial map={glow} color="#ffd699" transparent opacity={smooth(P.timing.beaconFrom, P.timing.beaconTo, t) * 0.9} depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>}
    {t >= P.hero.impactAt && t < P.hero.impactAt + 0.8 && <mesh position={hole} rotation={[-Math.PI / 2, 0, 0]} scale={1 + (t - P.hero.impactAt) * 22}><ringGeometry args={[1, 1.04, 96]} /><meshBasicMaterial color="#ffdc9b" side={THREE.DoubleSide} transparent opacity={1 - smooth(P.hero.impactAt, P.hero.impactAt + 0.8, t)} depthWrite={false} /></mesh>}

    <WinterWorld />
  </>;
};
