import React from 'react';
import {Block, Mat, PAL, BOX_UP, PRISM} from '../kit';
import {COLORS} from '../colors';

type Props = {
  position?: [number, number, number];
  color?: string;
};

export const HouseSmall: React.FC<Props> = ({position = [0, 0, 0], color = COLORS.buildingBeige}) => {
  return (
    <group position={position}>
      <mesh geometry={BOX_UP} scale={[3, 3, 4]} castShadow receiveShadow>
        <Mat color={color} />
      </mesh>
      <mesh position={[0, 3, 0]} scale={[3.2, 2.2, 4.2]} geometry={PRISM}>
        <Mat color={COLORS.roofDark} />
      </mesh>
      <Block p={[0, 0.75, 2.01]} s={[0.8, 1.5, 0.05]} c={PAL.wood} />
      {[-0.9, 0.9].map((x) => (
        <Block key={x} p={[x, 1.8, 2.01]} s={[0.6, 0.6, 0.05]} c={PAL.glass} />
      ))}
    </group>
  );
};
