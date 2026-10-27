import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {CameraRig} from '../../scenes/common';
import {rng, smooth} from '../../world';
import {FPS, tempAt} from '../curve';
import {Bld, Buildings, C, Car, Cars, CUBE, HeatEnv, Inst, Lamps, Person, Smoke, Src, TOY, TreeT, Trees, Windows, heatColor, makeWalkers, makeWindows} from '../kit';

const AV = 8; // demi-largeur de l'avenue (axe z)
const ST = 6; // demi-largeur de Park St (axe x)
const LEN = 160;

/** Temps de conduite cumulé : les voitures ralentissent puis s'arrêtent quand les moteurs surchauffent. */
const useDriveTime = () =>
  useMemo(() => {
    const out = [0];
    const dt = 1 / FPS;
    for (let f = 1; f <= 80 * FPS; f++) out.push(out[f - 1] + dt * (1 - smooth(70, 96, tempAt(f * dt))));
    return out;
  }, []);

export const Cctv: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const c = tempAt(t);
  const drive = useDriveTime()[Math.round(t * FPS)];

  const {list, wins} = useMemo(() => {
    const r = rng(31);
    const out: Bld[] = [];
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        for (let k = 0; k < 6; k++) {
          const w = 8 + r() * 4;
          const along = ST + 3 + k * 13 + w / 2;
          out.push({x: sx * (AV + 4 + 5), z: sz * along, w: 10, d: w, h: 10 + r() * 22, col: C(TOY[Math.floor(r() * TOY.length)]), k: r()});
          out.push({x: sx * (ST + 3 + k * 13 + w / 2), z: sz * (AV + 9), w, d: 10, h: 10 + r() * 22, col: C(TOY[Math.floor(r() * TOY.length)]), k: r()});
        }
    const uniq = out.filter((b, i) => out.findIndex((o) => Math.abs(o.x - b.x) < 6 && Math.abs(o.z - b.z) < 6) === i);
    return {list: uniq, wins: makeWindows(uniq, 32)};
  }, []);

  const cars = useMemo<Car[]>(() => {
    const r = rng(37);
    const out: Car[] = [];
    // 4 voies sur l'avenue (z), 2 voies sur Park St (x)
    [-6, -2.2, 2.2, 6].forEach((lx, lane) => {
      const v = 7 + r() * 3;
      for (let k = 0; k < 9; k++)
        out.push({x: lx, z: k * (LEN / 9) + r() * 3, ry: lx > 0 ? 0 : Math.PI, col: C(TOY[Math.floor(r() * TOY.length)]), v: lx > 0 ? -v : v, lane});
    });
    [-2.6, 2.6].forEach((lz, lane) => {
      for (let k = 0; k < 5; k++)
        out.push({x: k * 22 + r() * 4, z: lz, ry: lz > 0 ? Math.PI / 2 : -Math.PI / 2, col: C(TOY[Math.floor(r() * TOY.length)]), v: lz > 0 ? 6 : -6, lane: 4 + lane});
    });
    return out;
  }, []);
  // les voitures de Park St sont arrêtées au feu rouge ; l'avenue roule
  const carPos = (car: Car): [number, number] => {
    if (car.lane >= 4) {
      const x = car.x - 40;
      return [x < -ST - 3 && x > -ST - 50 ? x : x, car.z];
    }
    const z = ((((car.z + car.v * drive) % LEN) + LEN) % LEN) - LEN / 2;
    return [car.x, z];
  };
  const hoods: Src[] = cars.map((car, i) => {
    const [x, z] = carPos(car);
    const fwd = car.lane >= 4 ? 0 : car.v > 0 ? 1 : -1;
    return {x: x + (car.lane >= 4 ? Math.sign(car.v) * 1.6 : 0), y: 0.9, z: z + fwd * 1.7, s: 0.35, atC: 70 + (i % 7) * 4};
  });

  const trees = useMemo<TreeT[]>(() => {
    const r = rng(41);
    const out: TreeT[] = [];
    for (const sx of [-1, 1]) for (let z = -70; z < 70; z += 10) if (Math.abs(z) > ST + 3) out.push({x: sx * (AV + 2.3), z, s: 0.8 + r() * 0.3, tone: r()});
    return out;
  }, []);
  const lamps = useMemo<[number, number][]>(() => {
    const out: [number, number][] = [];
    for (const sx of [-1, 1]) for (let z = -65; z < 70; z += 18) out.push([sx * (AV + 1.2), z]);
    return out;
  }, []);
  const walkers = useMemo(
    () => makeWalkers(18, 44, (r) => ({x: (r() < 0.5 ? -1 : 1) * (AV + 3.6 + r() * 0.8), z: r() * 120 - 60, dir: r() < 0.5 ? 1 : -1})),
    [],
  );
  const pace = 1 - smooth(60, 95, c);
  const gone = smooth(92, 104, c); // les derniers passants s'abritent

  const asphalt = C('#55595f').lerp(C('#1c1b1d'), smooth(70, 110, c));
  const walk = heatColor(new THREE.Color(), C('#d9d3c7'), c, 0.4);

  return (
    <>
      {/* caméra de surveillance fixe, léger balayage */}
      <CameraRig position={[4.5, 27, 30]} target={[-1.5 + Math.sin(t * 0.25) * 2.5, 0, -6]} fov={62} />
      <HeatEnv c={c} sunDir={[-0.6, 0.45, -1]} fogScale={1.4} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={walk} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[AV * 2, 400]} />
        <meshStandardMaterial color={asphalt} roughness={0.9 - smooth(70, 100, c) * 0.65} metalness={smooth(70, 100, c) * 0.25} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[400, ST * 2]} />
        <meshStandardMaterial color={asphalt} roughness={0.9 - smooth(70, 100, c) * 0.65} metalness={smooth(70, 100, c) * 0.25} />
      </mesh>
      {/* marquages : passages piétons + ligne centrale */}
      <Inst
        count={40}
        geo={CUBE}
        update={(i, d, col) => {
          if (i < 28) {
            const k = i % 7;
            const side = Math.floor(i / 7);
            const horiz = side < 2;
            const off = (side % 2 ? 1 : -1) * (horiz ? ST + 1.6 : AV + 1.6);
            const u = -AV + 1.2 + k * 2.3;
            d.position.set(horiz ? u : off, 0.05, horiz ? off : u * 0.8);
            d.scale.set(horiz ? 1 : 2.6, 0.02, horiz ? 2.6 : 1);
          } else {
            const z = -70 + (i - 28) * 12;
            if (Math.abs(z) < ST + 3) return d.scale.set(0, 0, 0);
            d.position.set(0, 0.05, z);
            d.scale.set(0.25, 0.02, 4);
          }
          col.set('#f4f1e8').lerp(C('#8a8478'), smooth(80, 140, c));
        }}
      />
      <Buildings list={list} c={c} />
      <Windows list={wins} c={c} t={t} />
      <Trees list={trees} c={c} />
      <Lamps list={lamps} c={c} />
      <Cars list={cars} c={c} pos={carPos} />
      <Smoke list={hoods} c={c} t={t} puffs={7} height={9} dark={0.6} drift={[0.15, 0.25]} light />
      {walkers.map((w, i) => {
        if (gone >= 0.99) return null;
        const z = ((w.z + w.dir * t * 1.3 * w.speed * pace + 180) % 120) - 60;
        return (
          <group key={i} scale={1 - gone}>
            <Person w={w} t={t} pace={pace} slump={smooth(70, 95, c) * 0.4} c={c} pos={[w.x, 0, z]} rot={w.dir > 0 ? 0 : Math.PI} />
          </group>
        );
      })}
    </>
  );
};
