import React from 'react';
import {Ball, Block, Cyl, PAL} from '../kit';

// Salle de bain. Céramique blanche, robinetterie chromée. L'avant regarde vers -z, le mur est côté +z.
const CERAMIC = '#f4f2ee';

/** Baignoire avec robinet et eau (option). */
export const Bathtub: React.FC<{color?: string; water?: boolean}> = ({color = CERAMIC, water = true}) => (
  <group>
    <Block p={[0, 0.28, 0]} s={[1.7, 0.56, 0.78]} c={color} />
    <Block p={[0, 0.5, 0]} s={[1.5, 0.14, 0.6]} c="#d8dcdf" />
    {water && <Block p={[0, 0.5, 0]} s={[1.48, 0.12, 0.58]} c="#7fb6d6" />}
    <Cyl p={[0.68, 0.7, 0.3]} rad={0.02} h={0.28} c={PAL.chrome} metal />
    <Cyl p={[0.68, 0.82, 0.24]} rad={0.018} h={0.12} r={[Math.PI / 2, 0, 0]} c={PAL.chrome} metal />
    {/* canard en plastique */}
    {water && (
      <>
        <Ball p={[-0.3, 0.6, -0.05]} rad={0.05} s={[1.3, 1, 1]} c="#f2d13a" detail={0} />
        <Ball p={[-0.25, 0.66, -0.05]} rad={0.035} c="#f2d13a" detail={0} />
      </>
    )}
  </group>
);

/** Douche : receveur, paroi vitrée, colonne et pommeau. */
export const Shower: React.FC<{size?: number}> = ({size = 0.9}) => (
  <group>
    <Block p={[0, 0.04, 0]} s={[size, 0.08, size]} c={CERAMIC} />
    <Cyl p={[0, 0.085, 0]} rad={0.04} h={0.01} c={PAL.chrome} metal />
    <mesh position={[0, 1.05, -size / 2]} scale={[size, 1.9, 0.01]}>
      <boxGeometry />
      <meshStandardMaterial color="#cfe6f0" transparent opacity={0.35} roughness={0.1} />
    </mesh>
    <mesh position={[-size / 2, 1.05, 0]} scale={[0.01, 1.9, size]}>
      <boxGeometry />
      <meshStandardMaterial color="#cfe6f0" transparent opacity={0.35} roughness={0.1} />
    </mesh>
    <Cyl p={[0.2, 1.1, size / 2 - 0.05]} rad={0.015} h={1.8} c={PAL.chrome} metal />
    <Cyl p={[0.2, 1.95, size / 2 - 0.2]} rad={0.1} h={0.02} c={PAL.chrome} metal />
  </group>
);

/** WC avec réservoir. */
export const Toilet: React.FC = () => (
  <group>
    <mesh position={[0, 0.2, -0.05]}>
      <cylinderGeometry args={[0.18, 0.13, 0.4, 12]} />
      <meshStandardMaterial color={CERAMIC} flatShading />
    </mesh>
    <Cyl p={[0, 0.41, -0.08]} rad={0.2} h={0.03} c={CERAMIC} />
    <Block p={[0, 0.6, 0.2]} s={[0.4, 0.4, 0.18]} c={CERAMIC} />
    <Block p={[0, 0.81, 0.2]} s={[0.42, 0.03, 0.2]} c={CERAMIC} />
    <Cyl p={[0, 0.83, 0.2]} rad={0.03} h={0.01} c={PAL.chrome} metal />
  </group>
);

/** Meuble-vasque avec miroir. */
export const Washbasin: React.FC<{front?: string}> = ({front = '#6f8a9a'}) => (
  <group>
    <Block p={[0, 0.42, 0]} s={[0.8, 0.5, 0.45]} c={front} />
    <Block p={[0, 0.7, -0.01]} s={[0.84, 0.06, 0.5]} c={CERAMIC} />
    <Block p={[0, 0.69, -0.03]} s={[0.5, 0.05, 0.32]} c="#d8dcdf" />
    <Cyl p={[0, 0.82, 0.17]} rad={0.015} h={0.2} c={PAL.chrome} metal />
    <Cyl p={[0, 0.91, 0.12]} rad={0.012} h={0.1} r={[Math.PI / 2, 0, 0]} c={PAL.chrome} metal />
    <Block p={[0, 1.45, 0.21]} s={[0.7, 0.8, 0.03]} c="#cfe0ea" metal />
    <Block p={[0, 1.88, 0.18]} s={[0.6, 0.05, 0.08]} c={PAL.light} e={PAL.light} ei={0.5} />
    <Block p={[0, 0.42, -0.226]} s={[0.006, 0.42, 0.01]} c="#5a7080" />
  </group>
);

/** Lave-linge à hublot. */
export const WashingMachine: React.FC = () => (
  <group>
    <Block p={[0, 0.43, 0]} s={[0.6, 0.85, 0.6]} c={PAL.white} />
    <Cyl p={[0, 0.4, -0.3]} rad={0.2} h={0.03} r={[Math.PI / 2, 0, 0]} c="#9aa3ab" metal />
    <Cyl p={[0, 0.4, -0.31]} rad={0.15} h={0.02} r={[Math.PI / 2, 0, 0]} c="#3a4a5a" />
    <Block p={[0, 0.77, -0.301]} s={[0.56, 0.1, 0.01]} c="#d8dcdf" />
    <Cyl p={[0.18, 0.77, -0.31]} rad={0.03} h={0.02} r={[Math.PI / 2, 0, 0]} c="#3a3a3c" />
  </group>
);

/** Sèche-serviettes mural avec deux serviettes (à fixer à ~0,4 m du sol, contre un mur côté +z). */
export const TowelRail: React.FC<{towel?: string}> = ({towel = '#e05a6a'}) => (
  <group>
    {[-1, 1].map((s) => (
      <Cyl key={s} p={[s * 0.25, 0.6, 0]} rad={0.02} h={1.2} c={PAL.white} />
    ))}
    {Array.from({length: 8}, (_, i) => (
      <Cyl key={i} p={[0, 0.1 + i * 0.14, 0]} rad={0.012} h={0.5} r={[0, 0, Math.PI / 2]} c={PAL.white} />
    ))}
    <Block p={[-0.08, 0.85, -0.04]} s={[0.3, 0.55, 0.03]} c={towel} />
    <Block p={[0.12, 0.55, -0.05]} s={[0.22, 0.4, 0.03]} c="#f2f0ea" />
  </group>
);
