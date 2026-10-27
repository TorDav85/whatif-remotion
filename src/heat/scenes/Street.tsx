import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig} from '../../scenes/common';
import {rng, smooth} from '../../world';
import {FPS, tempAt} from '../curve';
import {Bld, Buildings, C, Car, Cars, Embers, Flames, HeatEnv, Lamps, Shards, Smoke, Src, TOY, Windows, glowOf, heatColor, makeWindows} from '../kit';

const HALF = 9; // demi-largeur de la rue

export const Street: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const c = tempAt(t);
  const k = (t - from) / 12.6;

  const {list, wins, fires} = useMemo(() => {
    const r = rng(101);
    const out: Bld[] = [];
    for (const s of [-1, 1]) {
      let z = 20;
      while (z > -170) {
        const w = 9 + r() * 6;
        out.push({x: s * (HALF + 6), z: z - w / 2, w: 12, d: w - 0.4, h: 16 + r() * 26, col: C(TOY[Math.floor(r() * TOY.length)]), k: r()});
        z -= w;
      }
    }
    // seulement les fenêtres qui donnent sur la rue
    const all = makeWindows(out, 102, 3);
    const facing = all.filter((w) => Math.sin(w.ry) * Math.sign(w.b.x) < -0.5);
    // des flammes sortent d'une fenêtre sur trois après l'éclatement
    const fl: Src[] = facing
      .filter((_, i) => i % 3 === 0)
      .map((w) => ({x: w.x - Math.sign(w.b.x) * 0.5, y: w.y - 0.4, z: w.z, s: 0.65 + ((w.ph * 7) % 1) * 0.5, atC: w.burstC}));
    return {list: out, wins: facing, fires: fl};
  }, []);

  const cars = useMemo<Car[]>(() => {
    const r = rng(103);
    return Array.from({length: 10}, (_, i) => ({
      x: (i % 2 ? 1 : -1) * (HALF - 2.2), z: 8 - i * 14 - r() * 5, ry: (r() - 0.5) * 0.3 + (i % 2 ? 0 : Math.PI),
      col: C(TOY[Math.floor(r() * TOY.length)]), v: 0, lane: 0,
    }));
  }, []);
  const carFires = useMemo<Src[]>(() => cars.filter((cr, i) => i % 3 === 1 && cr.z < -30).map((cr) => ({x: cr.x, y: 1.2, z: cr.z, s: 1.1, atC: 480})), [cars]);
  const lamps = useMemo<[number, number][]>(() => {
    const out: [number, number][] = [];
    for (const s of [-1, 1]) for (let z = 10; z > -160; z -= 16) out.push([s * (HALF - 0.6), z]);
    return out;
  }, []);
  // la grande colonne de fumée noire au bout de la rue
  const column: Src[] = [{x: 2, y: 0, z: -150, s: 5, atC: 300}];

  const ground = heatColor(new THREE.Color(), C('#3a3b40'), c, 1);
  const walk = heatColor(new THREE.Color(), C('#8a8478'), c, 1);

  return (
    <>
      <CameraRig position={[1.2, 3 + k * 1.2, 14 - k * 34]} target={[-0.5, 6.5 + k * 2, -90 - k * 30]} fov={60} />
      <HeatEnv c={c} sunDir={[0.12, 0.13, -1]} sunScale={2.3} fogScale={1.6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color={walk} emissive={glowOf(c)} />
      </mesh>
      <mesh position={[0, 0.02, -80]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HALF * 2 - 3, 400]} />
        <meshStandardMaterial color={ground} roughness={0.4} emissive={glowOf(c)} />
      </mesh>
      <Buildings list={list} c={c} />
      <Windows list={wins} c={c} t={t} />
      <Shards list={wins} t={t} per={4} />
      <Flames list={fires} c={c} t={t} />
      <Cars list={cars} c={c} pos={(cr) => [cr.x, cr.z]} />
      <Flames list={carFires} c={c} t={t} />
      <Smoke list={carFires} c={c} t={t} puffs={8} height={14} />
      <Lamps list={lamps} c={c} />
      <Smoke list={column} c={c} t={t} puffs={34} height={36} drift={[0.18, 0.05]} />
      <Embers n={500} c={c} t={t} box={[-HALF, HALF, 0, 30, -80, 12]} startC={220} size={0.16} />
    </>
  );
};
