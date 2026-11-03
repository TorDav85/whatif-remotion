import React from 'react';
import {BOX, Block, Mat, PAL, PRISM} from './kit';

/** Proue en pointe : prisme couché à l'avant de la coque. */
const Bow: React.FC<{z: number; w: number; h: number; len: number; y: number; c: string}> = ({z, w, h, len, y, c}) => (
  <mesh position={[0, y, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[w, len, h]} geometry={PRISM}>
    <Mat color={c} />
  </mesh>
);

export type BargeProps = {hull?: string; cabin?: string; trim?: string; plants?: boolean; length?: number};

/** Péniche amarrée (logement), origine au niveau de l'eau, avant vers -z. */
export const Barge: React.FC<BargeProps> = ({hull = PAL.hull, cabin = '#e8e2d2', trim = '#7a2e2a', plants = true, length = 26}) => {
  const L = length;
  const W = 5;
  return (
    <group>
      {/* coque (1 m sous l'eau) et liseré */}
      <Block p={[0, 0.2, 0]} s={[W, 2.4, L]} c={hull} />
      <Bow z={-L / 2} w={W} h={2.4} len={2.2} y={0.2} c={hull} />
      <Block p={[0, 1.44, 0]} s={[W + 0.04, 0.12, L]} c={trim} />
      {/* rouf (partie habitée) */}
      <Block p={[0, 2.35, 2]} s={[W - 1, 1.7, L * 0.55]} c={cabin} />
      <Block p={[0, 3.25, 2]} s={[W - 0.8, 0.12, L * 0.55 + 0.3]} c={trim} />
      {[-1, 1].map((s) =>
        Array.from({length: 6}, (_, i) => (
          <Block key={`${s}${i}`} p={[s * (W / 2 - 0.49), 2.45, 2 - L * 0.24 + i * L * 0.095]} s={[0.04, 0.7, 0.9]} c={PAL.glass} />
        )),
      )}
      {/* timonerie à l'arrière */}
      <Block p={[0, 3.3, L / 2 - 2.2]} s={[2.6, 1.6, 2.2]} c={cabin} />
      <Block p={[0, 3.6, L / 2 - 3.32]} s={[2.3, 0.6, 0.04]} c={PAL.glass} />
      <Block p={[0, 4.15, L / 2 - 2.2]} s={[2.9, 0.1, 2.5]} c={trim} />
      {/* bastingage avant */}
      {[-1, 1].map((s) => (
        <Block key={s} p={[s * (W / 2 - 0.1), 1.85, -L / 2 + 3]} s={[0.05, 0.5, 6]} c={PAL.iron} />
      ))}
      {plants &&
        [-0.42, -0.36, -0.3].map((k, i) => (
          <group key={i} position={[(i - 1) * 1.2, 1.5, k * L]}>
            <Block p={[0, 0.25, 0]} s={[0.6, 0.5, 0.6]} c={PAL.terracotta} />
            <mesh position={[0, 0.85, 0]} scale={0.55}>
              <icosahedronGeometry args={[1, 0]} />
              <Mat color={['#4f7a34', '#5e8f3c', '#3f6a2c'][i]} />
            </mesh>
          </group>
        ))}
    </group>
  );
};

export type TourBoatProps = {hull?: string; roof?: string; lights?: number};

/** Bateau-mouche (bateau de promenade vitré), origine au niveau de l'eau, avant vers -z. */
export const TourBoat: React.FC<TourBoatProps> = ({hull = PAL.white, roof = PAL.white, lights = 0}) => {
  const L = 30;
  const W = 6;
  return (
    <group>
      <Block p={[0, 0.3, 0]} s={[W, 1.8, L]} c={hull} />
      <Bow z={-L / 2} w={W} h={1.8} len={2.6} y={0.3} c={hull} />
      <Block p={[0, 1.15, 0]} s={[W + 0.04, 0.12, L]} c="#2b3a55" />
      {/* grande verrière */}
      <mesh position={[0, 2.25, 1]} scale={[W - 0.6, 2, L - 6]} geometry={BOX}>
        <meshStandardMaterial color="#5f86a6" transparent opacity={0.45} roughness={0.2} emissive={PAL.glassLit} emissiveIntensity={lights * 0.5} />
      </mesh>
      {/* sièges en rangées, visibles à travers la verrière */}
      {Array.from({length: 9}, (_, i) =>
        [-1, 1].map((s) => <Block key={`${i}${s}`} p={[s * 1.3, 1.65, -9 + i * 2.6]} s={[1.6, 0.5, 0.5]} c="#b8322a" />),
      )}
      {/* montants et toit */}
      {Array.from({length: 7}, (_, i) =>
        [-1, 1].map((s) => <Block key={`p${i}${s}`} p={[s * (W / 2 - 0.3), 2.25, -11 + i * 4]} s={[0.1, 2, 0.1]} c={roof} />),
      )}
      <Block p={[0, 3.3, 1]} s={[W - 0.4, 0.14, L - 5.6]} c={roof} />
      {/* poste de pilotage à l'avant, pont arrière ouvert */}
      <Block p={[0, 3.75, -10]} s={[2.4, 0.8, 2.2]} c={roof} />
      <Block p={[0, 3.8, -11.12]} s={[2.1, 0.45, 0.04]} c={PAL.glass} />
      {[-1, 1].map((s) => (
        <Block key={s} p={[s * (W / 2 - 0.08), 1.65, L / 2 - 1.6]} s={[0.05, 0.5, 3]} c={PAL.iron} />
      ))}
      <Block p={[0, 2.2, L / 2 - 0.4]} s={[0.05, 2, 0.05]} c={PAL.iron} />
      <Block p={[0, 2.95, L / 2 - 0.05]} s={[0.02, 0.5, 0.7]} c="#2b3a7a" />
    </group>
  );
};
