import React from 'react';
import {Block, Cyl, PAL} from '../kit';

type Props = {
  position?: [number, number, number];
  height?: number;
  on?: number;
};

export const Lamppost: React.FC<Props> = ({position = [0, 0, 0], height = 4.2, on = 0}) => (
  <group position={position}>
    <Cyl p={[0, height / 2, 0]} rad={0.06} h={height} c={PAL.iron} metal />
    <group position={[0, height, 0]} rotation={[0, 0, -0.5]}>
      <Cyl p={[0.2, 0, 0]} rad={0.03} h={0.5} c={PAL.iron} metal />
    </group>
    <Block p={[0.55, height + 0.15, 0]} s={[0.4, 0.25, 0.4]} c={PAL.light} e={PAL.light} ei={on * 2} />
  </group>
);
