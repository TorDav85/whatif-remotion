import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {CameraRig} from '../../scenes/common';
import {rng, smooth} from '../../world';
import {FPS, tempAt, timeAtTemp} from '../curve';
import {Buildings, C, CYL, Embers, Flames, HeatEnv, Inst, Lava, Smoke} from '../kit';
import {useCityGrid} from './Drone';

/** Vue zénithale : la grille rougeoie, la cendre se dépose, le sol devient lave. */
export const Aerial: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = from + frame / FPS;
  const c = tempAt(t);
  const {list, fires} = useCityGrid();
  // la roche fond à partir de 1 000 °C : le reste découle de l'instant où ce seuil est franchi
  const t1000 = useMemo(() => timeAtTemp(1000), []);
  const lava = smooth(t1000 - 1.5, t1000 + 4, t);
  const sink = smooth(t1000, t1000 + 11, t);
  const ash = smooth(840, 960, c);

  const ashSpots = useMemo(() => {
    const r = rng(121);
    return Array.from({length: 160}, () => [(r() - 0.5) * 300, (r() - 0.5) * 360, 2 + r() * 7, r()] as const);
  }, []);
  const plumes = useMemo(() => fires.filter((_, i) => i % 5 === 0).map((f) => ({...f, s: 1.6})), [fires]);

  // lente rotation au-dessus de la ville, en légère descente
  const a = (t - from) * 0.05 + 0.4;
  const y = 165 - (t - from) * 2.2;
  const street = C('#1e1412'); // rues carbonisées, plus sombres que les toits qui rougeoient

  return (
    <>
      <CameraRig position={[Math.sin(a) * 14, y, Math.cos(a) * 14]} target={[0, 0, 0]} fov={60} />
      <HeatEnv c={c} noSun fogScale={7} />
      {/* rues qui rougeoient, puis lave qui monte et recouvre tout */}
      <mesh position={[0, -lava * 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color={street} emissive={C('#ff3a10').multiplyScalar(0.06 + smooth(900, 1050, c) * 0.3)} />
      </mesh>
      <Lava t={t} heat={0.25 + 0.75 * lava} y={-1.4 + lava * 2.6} />
      <Buildings list={list} c={c} sink={sink} />
      {/* taches de cendre sur les toits et au sol */}
      <Inst
        count={ashSpots.length}
        geo={CYL}
        update={(i, d, col) => {
          const [x, z, s, k] = ashSpots[i];
          const on = smooth(k * 0.6, k * 0.6 + 0.4, ash) * (1 - lava * 0.9);
          if (on < 0.02) return d.scale.set(0, 0, 0);
          const b = list.find((bb) => Math.abs(bb.x - x) < bb.w / 2 && Math.abs(bb.z - z) < bb.d / 2);
          const melt = b ? sink * (0.4 + b.k * 0.6) : 0;
          d.position.set(x, b ? b.h * (1 - melt * 0.35) - melt * b.h * 0.6 + 0.05 : 0.4, z);
          d.scale.set(s * on, 0.05, s * on * 0.8);
          d.rotation.y = i;
          col.set('#9a948e').lerp(C('#4a4440'), k);
        }}
      />
      <Flames list={fires} c={c} t={t} />
      <Smoke list={plumes} c={c} t={t} puffs={10} height={30} drift={[0.4, 0.2]} />
      <Embers n={500} c={c} t={t} box={[-90, 90, 0, y - 10, -110, 110]} startC={200} size={0.6} />
    </>
  );
};
