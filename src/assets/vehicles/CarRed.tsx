import React from 'react';
import {Block, Mat, PAL, CYL} from '../kit';
import {COLORS} from '../colors';

type Props = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  lights?: number;
  wheelSpin?: number;
};

const Wheel: React.FC<{p: [number, number, number]; r: number; spin: number}> = ({p, r, spin}) => (
  <group position={p} rotation={[spin, 0, 0]}>
    <mesh rotation={[0, 0, Math.PI / 2]} scale={[r * 2, 0.24, r * 2]} geometry={CYL}>
      <Mat color={PAL.tire} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]} scale={[r * 1.1, 0.26, r * 1.1]} geometry={CYL}>
      <Mat color={PAL.rim} metal />
    </mesh>
  </group>
);

export const CarRed: React.FC<Props> = ({position = [0, 0, 0], rotation = [0, 0, 0], lights = 0, wheelSpin = 0}) => {
  const W = 1.8;
  const L = 4.4;

  return (
    <group position={position} rotation={rotation}>
      <Block p={[0, 0.63, 0]} s={[W, 0.63, L]} c={COLORS.carRed} />
      <Block p={[0, 1.12, 0.2]} s={[W - 0.14, 0.54, 2.3]} c={PAL.glass} />
      <Block p={[0, 1.39, 0.25]} s={[W - 0.1, 0.07, 2.0]} c={COLORS.carRed} />
      {[-1, 1].map((s) => (
        <React.Fragment key={s}>
          <Block p={[s * (W / 2 - 0.25), 0.72, -L / 2 - 0.02]} s={[0.32, 0.14, 0.05]} c={PAL.light} e={PAL.light} ei={lights * 2} />
          <Block p={[s * (W / 2 - 0.22), 0.75, L / 2 + 0.02]} s={[0.26, 0.12, 0.05]} c={PAL.tail} e={PAL.tail} ei={lights * 1.5} />
        </React.Fragment>
      ))}
      <Block p={[0, 0.42, -L / 2 - 0.03]} s={[W - 0.1, 0.16, 0.08]} c={PAL.chrome} metal />
      <Block p={[0, 0.42, L / 2 + 0.03]} s={[W - 0.1, 0.16, 0.08]} c={PAL.chrome} metal />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Wheel key={`${sx}${sz}`} p={[sx * (W / 2 - 0.05), 0.34, sz * (L / 2 - 0.8)]} r={0.34} spin={wheelSpin} />
        )),
      )}
    </group>
  );
};
