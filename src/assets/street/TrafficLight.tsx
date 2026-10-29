import React from 'react';
import {Block, Cyl, Mat, PAL} from '../kit';

type Props = {
  position?: [number, number, number];
  state?: 'red' | 'yellow' | 'green';
};

export const TrafficLight: React.FC<Props> = ({position = [0, 0, 0], state = 'red'}) => {
  const lights = {
    red: state === 'red' ? '#E53E3E' : '#4A1A1A',
    yellow: state === 'yellow' ? '#F6E05E' : '#4A4A1A',
    green: state === 'green' ? '#48BB78' : '#1A4A2A',
  };

  return (
    <group position={position}>
      <Cyl p={[0, 1.6, 0]} rad={0.05} h={3.2} c={PAL.iron} />
      <Block p={[0, 3.7, 0]} s={[0.5, 1.2, 0.35]} c={PAL.slate} />
      {[
        {y: 4.05, c: lights.red, e: state === 'red' ? lights.red : undefined, ei: state === 'red' ? 1.5 : 0},
        {y: 3.7, c: lights.yellow, e: state === 'yellow' ? lights.yellow : undefined, ei: state === 'yellow' ? 1.5 : 0},
        {y: 3.35, c: lights.green, e: state === 'green' ? lights.green : undefined, ei: state === 'green' ? 1.5 : 0},
      ].map((l, i) => (
        <Block key={i} p={[0, l.y, 0.18]} s={[0.2, 0.2, 0.05]} c={l.c} e={l.e} ei={l.ei} />
      ))}
    </group>
  );
};
