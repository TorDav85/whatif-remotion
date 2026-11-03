import React from 'react';
import {PAL} from './kit';
import {CharacterBlock as Block, CharacterHead} from '../shared/characters/CharacterParts';

export type PersonProps = {
  shirt?: string;
  pants?: string;
  skin?: string;
  hair?: string;
  shoes?: string;
  hairStyle?: 'court' | 'long' | 'chauve' | 'chignon';
  /** debout, marche (utiliser `phase`), assis, bras levés (flotte / panique) */
  pose?: 'debout' | 'marche' | 'assis' | 'bras-leves';
  /** phase de la marche en radians (ex. t * 7) */
  phase?: number;
  /** taille relative (1 = 1,75 m) */
  height?: number;
  bag?: string;
  /** Inclinaison du buste sans déplacer les pieds. */
  bend?: number;
};

/** Personnage articulé, origine aux pieds, regard vers −z. */
export const Person: React.FC<PersonProps> = ({
  shirt = '#2b3a55', pants = '#3a3f47', skin = '#e8b894', hair = '#3a2a1e',
  shoes = '#1d1d1f', hairStyle = 'court', pose = 'debout', phase = 0, height = 1, bag, bend = 0,
}) => {
  const moving = pose === 'marche';
  const walk = moving ? Math.sin(phase) * 0.46 : 0;
  const seated = pose === 'assis';
  const raised = pose === 'bras-leves';
  const hip = seated ? 0.48 : 0.9;
  const leg = (side: number) => {
    const swing = side * walk;
    const knee = seated ? -Math.PI / 2 : -Math.max(0, -side * Math.sin(phase)) * (moving ? 0.45 : 0);
    return <group key={side} position={[side * 0.105, hip, 0]} rotation={[seated ? Math.PI / 2 : swing, 0, 0]}>
      <Block p={[0, -0.21, 0]} s={[0.17, 0.43, 0.2]} c={pants} />
      <group position={[0, -0.42, 0]} rotation={[knee, 0, 0]}>
        <Block p={[0, -0.2, 0]} s={[0.145, 0.41, 0.17]} c={pants} />
        <Block p={[0, -0.425, -0.055]} s={[0.18, 0.11, 0.29]} c={shoes} />
      </group>
    </group>;
  };
  const arm = (side: number) => <group key={side} position={[side * 0.26, 0.53, 0]}
    rotation={[raised ? Math.PI * 0.86 : -side * walk * 0.8, 0, side * (raised ? -0.22 : 0.07)]}>
    <Block p={[0, -0.13, 0]} s={[0.135, 0.28, 0.15]} c={shirt} />
    <group position={[0, -0.26, 0]} rotation={[seated ? 0.4 : 0.08, 0, 0]}>
      <Block p={[0, -0.125, 0]} s={[0.105, 0.25, 0.12]} c={shirt} />
      <Block p={[0, -0.28, -0.006]} s={[0.105, 0.12, 0.13]} c={skin} />
    </group>
  </group>;
  return <group scale={height} position={[0, moving ? Math.abs(Math.sin(phase * 2)) * 0.022 : 0, 0]}>
    {leg(-1)}{leg(1)}
    <group position={[0, hip, 0]} rotation={[bend, 0, 0]}>
      <Block p={[0, 0.3, 0]} s={[0.45, 0.6, 0.27]} c={shirt} />
      <Block p={[0, 0.035, 0]} s={[0.42, 0.07, 0.26]} c={pants} />
      <Block p={[0, 0.65, 0]} s={[0.135, 0.15, 0.13]} c={skin} />
      {[-1, 1].map((side) => <Block key={side} p={[side * 0.065, 0.568, -0.135]} s={[0.09, 0.065, 0.022]} r={[0, 0, side * -0.45]} c={shirt} />)}
      {arm(-1)}{arm(1)}
      <group position={[0, 0.8, 0]} scale={0.85}><CharacterHead skin={skin} hair={hair} hairStyle={hairStyle} worried={raised ? 0.65 : 0} /></group>
      {bag && <>
        <Block p={[0.3, 0.05, 0.02]} s={[0.12, 0.3, 0.3]} c={bag} />
        <Block p={[0.245, 0.3, 0]} s={[0.04, 0.5, 0.04]} c={bag} />
      </>}
    </group>
  </group>;
};

/** Quelques silhouettes prêtes à l'emploi (vêtements, peau, cheveux variés). */
export const PEOPLE_PRESETS: PersonProps[] = [
  {shirt: '#b8322a', pants: '#2b3a55', skin: '#f1c9a5', hair: '#6b4a2c', hairStyle: 'court'},
  {shirt: '#e8e2d2', pants: '#3a3f47', skin: '#a8704a', hair: '#1d1612', hairStyle: 'long'},
  {shirt: '#3f6b4a', pants: '#d9cfb8', skin: '#e8b894', hair: '#c9a46a', hairStyle: 'chignon', bag: '#7a2e2a'},
  {shirt: '#d9a23a', pants: '#1d1d1f', skin: '#6e4630', hair: '#1d1612', hairStyle: 'court'},
  {shirt: '#2b3a55', pants: '#6a7f8c', skin: '#d9a07a', hair: '#8a8a8a', hairStyle: 'chauve', height: 0.97},
  {shirt: '#8a5a8a', pants: '#2b3a55', skin: '#f1c9a5', hair: '#b0402a', hairStyle: 'long', height: 0.93},
  {shirt: '#c86a3a', pants: '#3a3f47', skin: '#e8b894', hair: '#3a2a1e', hairStyle: 'court', height: 0.6}, // enfant
];

export {PAL};
