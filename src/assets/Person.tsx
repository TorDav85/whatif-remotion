import React from 'react';
import {Block, Mat, PAL} from './kit';

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
};

/** Personnage low-poly, origine aux pieds, regarde vers -z. */
export const Person: React.FC<PersonProps> = ({
  shirt = '#2b3a55',
  pants = '#3a3f47',
  skin = '#e8b894',
  hair = '#3a2a1e',
  shoes = '#1d1d1f',
  hairStyle = 'court',
  pose = 'debout',
  phase = 0,
  height = 1,
  bag,
}) => {
  const walk = pose === 'marche' ? Math.sin(phase) * 0.5 : 0;
  const sit = pose === 'assis';
  const raise = pose === 'bras-leves';
  const hip = sit ? 0.48 : 0.9;
  const legRot = sit ? Math.PI / 2 : 0; // jambes tendues vers l'avant (-z)
  const bob = pose === 'marche' ? Math.abs(Math.cos(phase)) * 0.04 : 0;

  const leg = (side: number, swing: number) => (
    <group position={[side * 0.1, hip, 0]} rotation={[legRot + swing, 0, 0]}>
      <Block p={[0, -0.42, 0]} s={[0.15, 0.84, 0.17]} c={pants} />
      <Block p={[0, -0.86, -0.05]} s={[0.16, 0.1, 0.27]} c={shoes} />
    </group>
  );
  const arm = (side: number, swing: number) => (
    <group position={[side * 0.27, hip + 0.55, 0]} rotation={[raise ? Math.PI * 0.85 : swing, 0, side * (raise ? -0.25 : 0.06)]}>
      <Block p={[0, -0.27, 0]} s={[0.11, 0.56, 0.13]} c={shirt} />
      <Block p={[0, -0.6, 0]} s={[0.1, 0.12, 0.11]} c={skin} />
    </group>
  );

  return (
    <group scale={height} position={[0, bob, 0]}>
      {leg(-1, walk)}
      {leg(1, -walk)}
      {/* torse */}
      <Block p={[0, hip + 0.31, 0]} s={[0.44, 0.62, 0.25]} c={shirt} />
      {arm(-1, -walk * 0.8)}
      {arm(1, walk * 0.8)}
      {bag && <Block p={[0.3, hip + 0.1, 0.02]} s={[0.08, 0.3, 0.3]} c={bag} />}
      {/* tête */}
      <Block p={[0, hip + 0.8, 0]} s={[0.25, 0.27, 0.25]} c={skin} />
      <Block p={[0, hip + 0.79, -0.13]} s={[0.05, 0.05, 0.02]} c="#2a1c14" />
      {hairStyle !== 'chauve' && <Block p={[0, hip + 0.95, 0.01]} s={[0.27, 0.07, 0.27]} c={hair} />}
      {hairStyle === 'court' && <Block p={[0, hip + 0.86, 0.11]} s={[0.27, 0.14, 0.06]} c={hair} />}
      {hairStyle === 'long' && <Block p={[0, hip + 0.72, 0.11]} s={[0.28, 0.42, 0.08]} c={hair} />}
      {hairStyle === 'chignon' && (
        <mesh position={[0, hip + 1.0, 0.1]} scale={0.1}>
          <icosahedronGeometry args={[1, 0]} />
          <Mat color={hair} />
        </mesh>
      )}
    </group>
  );
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
