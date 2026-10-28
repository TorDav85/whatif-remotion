import React from 'react';
import {Ball, Block, Cyl, PAL} from '../kit';

// Bureau. L'utilisateur s'assoit côté -z, face à l'écran.

/** Bureau avec caisson à tiroirs. */
export const Desk: React.FC<{top?: string; legs?: string; width?: number}> = ({top = '#e8dcc4', legs = '#3a3f47', width = 1.4}) => (
  <group>
    <Block p={[0, 0.74, 0]} s={[width, 0.04, 0.7]} c={top} />
    {[-1, 1].map((s) => (
      <Block key={s} p={[-width / 2 + 0.05, 0.36, s * 0.3]} s={[0.04, 0.72, 0.04]} c={legs} />
    ))}
    <Block p={[-width / 2 + 0.05, 0.05, 0]} s={[0.05, 0.03, 0.66]} c={legs} />
    <Block p={[width / 2 - 0.22, 0.36, 0]} s={[0.4, 0.72, 0.62]} c={top} />
    {[0.18, 0.42, 0.62].map((y) => (
      <Block key={y} p={[width / 2 - 0.22, y, -0.315]} s={[0.12, 0.02, 0.02]} c={legs} />
    ))}
  </group>
);

/** Chaise de bureau à roulettes (pivot sur pied étoile). */
export const OfficeChair: React.FC<{color?: string; turn?: number}> = ({color = '#2a2d31', turn = 0}) => (
  <group>
    {Array.from({length: 5}, (_, i) => {
      const a = (i / 5) * Math.PI * 2;
      return (
        <group key={i} rotation={[0, a, 0]}>
          <Block p={[0, 0.07, 0.17]} s={[0.05, 0.04, 0.34]} c="#1a1a1c" />
          <Ball p={[0, 0.03, 0.33]} rad={0.03} c="#111" detail={0} />
        </group>
      );
    })}
    <Cyl p={[0, 0.27, 0]} rad={0.03} h={0.36} c={PAL.chrome} metal />
    <group rotation={[0, turn, 0]}>
      <Block p={[0, 0.48, 0]} s={[0.5, 0.08, 0.48]} c={color} />
      <Block p={[0, 0.85, 0.24]} s={[0.46, 0.62, 0.06]} r={[0.12, 0, 0]} c={color} />
      {[-1, 1].map((s) => (
        <Block key={s} p={[s * 0.27, 0.64, 0.02]} s={[0.05, 0.04, 0.3]} c="#1a1a1c" />
      ))}
    </group>
  </group>
);

/** Ordinateur : écran, clavier, souris (à poser sur un bureau). `on` : écran allumé. */
export const Computer: React.FC<{on?: number; screen?: string}> = ({on = 1, screen = '#3a7ad6'}) => (
  <group>
    <Block p={[0, 0.01, 0.1]} s={[0.22, 0.02, 0.16]} c="#2a2d31" />
    <Block p={[0, 0.12, 0.13]} s={[0.04, 0.2, 0.03]} c="#2a2d31" />
    <Block p={[0, 0.34, 0.12]} s={[0.6, 0.36, 0.03]} c="#1a1c1f" />
    <Block p={[0, 0.34, 0.104]} s={[0.56, 0.32, 0.005]} c={on ? screen : '#14171b'} e={screen} ei={on * 1.2} />
    <Block p={[0, 0.012, -0.15]} s={[0.45, 0.02, 0.15]} c="#d9dcdf" />
    <Ball p={[0.33, 0.015, -0.15]} rad={0.035} s={[0.8, 0.5, 1.2]} c="#d9dcdf" detail={0} />
  </group>
);

/** Étagère murale avec livres, plante et objets (à fixer à ~1,4 m, contre un mur côté +z). */
export const WallShelf: React.FC<{wood?: string}> = ({wood = '#8a6440'}) => (
  <group>
    <Block p={[0, 0, 0]} s={[1.0, 0.03, 0.22]} c={wood} />
    {['#b8322a', '#2b3a55', '#d9a23a', '#3f6b4a'].map((c, i) => (
      <Block key={c} p={[-0.4 + i * 0.05, 0.13, 0]} s={[0.04, 0.22 + (i % 2) * 0.03, 0.16]} c={c} />
    ))}
    <Block p={[-0.12, 0.12, 0]} s={[0.04, 0.22, 0.16]} r={[0, 0, -0.35]} c="#6d2440" />
    <Cyl p={[0.15, 0.07, 0]} rad={0.06} h={0.11} c={PAL.terracotta} />
    <Ball p={[0.15, 0.2, 0]} rad={0.09} c="#4f7a34" detail={0} />
    <Ball p={[0.38, 0.08, 0]} rad={0.06} c="#e8e2d2" />
  </group>
);
