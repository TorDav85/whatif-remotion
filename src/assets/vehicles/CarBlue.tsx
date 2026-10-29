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

export const CarBlue: React.FC<Props> = ({position = [0, 0, 0], rotation = [0, 0, 0], lights = 0, wheelSpin = 0}) => {
  const W = 1.65;
  const L = 3.6;

  return (
    <group position={position} rotation={rotation}>
      <Block p={[0, 0.6, 0]} s={[W, 0.6, L]} c={COLORS.carBlue} />
      <Block p={[0, 1.05, 0.15]} s={[W - 0.14, 0.5, 2.1]} c={PAL.glass} />
      <Block p={[0, 1.33, 0.2]} s={[W - 0.1, 0.07, 1.8]} c={COLORS.carBlue} />
      {[-1, 1].map((s) => (
        <React.Fragment key={s}>
          <Block p={[s * (W / 2 - 0.22), 0.65, -L / 2 - 0.02]} s={[0.28, 0.12, 0.05]} c={PAL.light} e={PAL.light} ei={lights * 2} />
          <Block p={[s * (W / 2 - 0.2), 0.68, L / 2 + 0.02]} s={[0.22, 0.1, 0.05]} c={PAL.tail} e={PAL.tail} ei={lights * 1.5} />
        </React.Fragment>
      ))}
      <Block p={[0, 0.38, -L / 2 - 0.03]} s={[W - 0.1, 0.14, 0.06]} c={PAL.chrome} metal />
      <Block p={[0, 0.38, L / 2 + 0.03]} s={[W - 0.1, 0.14, 0.06]} c={PAL.chrome} metal />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Wheel key={`${sx}${sz}`} p={[sx * (W / 2 - 0.05), 0.3, sz * (L / 2 - 0.65)]} r={0.3} spin={wheelSpin} />
        )),
      )}
    </group>
  );
};
