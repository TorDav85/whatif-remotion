import React from 'react';
import {Person, type PersonProps} from '../Person';

type Props = Pick<PersonProps, 'shirt' | 'pants' | 'skin' | 'hair' | 'shoes'> & {
  position?: [number, number, number]; rotation?: [number, number, number];
  scale?: number; walkPhase?: number;
};

/** Compatibility wrapper: all reusable people now share the same face and articulation. */
export const PersonSimple: React.FC<Props> = ({position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, walkPhase = 0, ...look}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <Person {...look} pose={walkPhase === 0 ? 'debout' : 'marche'} phase={walkPhase} />
  </group>
);
