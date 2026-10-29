import React from 'react';
import {Ball, Cyl, Mat, PAL} from '../kit';
import {COLORS} from '../colors';

type Props = {
  position?: [number, number, number];
  scale?: number;
};

export const TreeOak: React.FC<Props> = ({position = [0, 0, 0], scale: s = 1}) => (
  <group position={position} scale={s}>
    <Cyl p={[0, 1.2, 0]} rad={0.18} h={2.4} c={PAL.wood} />
    {[0, 2.1, 4.2].map((angle, i) => (
      <group key={i} position={[0, 2.2, 0]} rotation={[0.75 * Math.cos(angle), angle, 0.75 * Math.sin(angle)]}>
        <Cyl p={[0, 0.7, 0]} rad={0.07} h={1.4} c={PAL.wood} />
      </group>
    ))}
    <Ball p={[0, 3.4, 0]} rad={1.5} c={COLORS.treeGreen} s={[1, 0.9, 1]} detail={0} />
    <Ball p={[0.6, 2.8, 0.4]} rad={0.9} c={COLORS.treeDark} detail={0} />
    <Ball p={[-0.5, 3.0, -0.3]} rad={0.8} c={COLORS.treeGreen} detail={0} />
  </group>
);
