import React from 'react';
import {Block, PAL} from '../kit';

type Props = {
  position?: [number, number, number];
  rotation?: [number, number, number];
};

export const Bench: React.FC<Props> = ({position = [0, 0, 0], rotation = [0, 0, 0]}) => (
  <group position={position} rotation={rotation}>
    <Block p={[0, 0.45, 0]} s={[1.8, 0.08, 0.5]} c={PAL.wood} />
    <Block p={[0, 0.7, -0.22]} s={[1.8, 0.5, 0.06]} c={PAL.wood} />
    {[-0.7, 0.7].map((x) => (
      <React.Fragment key={x}>
        <Block p={[x, 0.22, 0.18]} s={[0.06, 0.45, 0.06]} c={PAL.iron} />
        <Block p={[x, 0.22, -0.18]} s={[0.06, 0.45, 0.06]} c={PAL.iron} />
      </React.Fragment>
    ))}
  </group>
);
