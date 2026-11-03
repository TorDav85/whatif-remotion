import React from 'react';
import {Block, Mat, PAL, CYL} from '../kit';

type Props = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  lights?: number;
  wheelSpin?: number;
};

const Wheel: React.FC<{p: [number, number, number]; r: number; spin: number}> = ({p, r, spin}) => (
  <group position={p} rotation={[spin, 0, 0]}>
    <mesh rotation={[0, 0, Math.PI / 2]} scale={[r * 2, 0.3, r * 2]} geometry={CYL}>
      <Mat color={PAL.tire} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]} scale={[r * 1.1, 0.32, r * 1.1]} geometry={CYL}>
      <Mat color={PAL.rim} metal />
    </mesh>
  </group>
);

export const BusCity: React.FC<Props> = ({position = [0, 0, 0], rotation = [0, 0, 0], color = '#3f7f62', lights = 0, wheelSpin = 0}) => {
  const L = 12;
  const W = 2.5;

  return (
    <group position={position} rotation={rotation}>
      <Block p={[0, 1.15, 0]} s={[W, 1.5, L]} c={color} />
      <Block p={[0, 2.35, 0]} s={[W, 0.9, L]} c={PAL.white} />
      {[-1, 1].map((s) => (
        <Block key={s} p={[s * (W / 2 + 0.01), 2.3, 0.3]} s={[0.02, 0.75, L - 1.6]} c={PAL.glass} />
      ))}
      <Block p={[0, 2.05, -L / 2 - 0.01]} s={[W - 0.2, 1.3, 0.02]} c={PAL.glass} />
      <Block p={[0, 2.95, -L / 2 + 0.1]} s={[1.4, 0.22, 0.05]} c="#1d1d1f" e="#ffb040" ei={0.8} />
      {[-1, 1].map((s) => (
        <React.Fragment key={s}>
          <Block p={[s * (W / 2 - 0.3), 0.75, -L / 2 - 0.02]} s={[0.35, 0.16, 0.05]} c={PAL.light} e={PAL.light} ei={lights * 2} />
          <Block p={[s * (W / 2 - 0.25), 0.9, L / 2 + 0.02]} s={[0.25, 0.25, 0.05]} c={PAL.tail} e={PAL.tail} ei={lights * 1.5} />
        </React.Fragment>
      ))}
      {[-1, 1].flatMap((sx) =>
        [-L / 2 + 2.4, L / 2 - 2.6].map((z) => (
          <Wheel key={`${sx}${z}`} p={[sx * (W / 2 - 0.1), 0.48, z]} r={0.48} spin={wheelSpin} />
        )),
      )}
    </group>
  );
};
