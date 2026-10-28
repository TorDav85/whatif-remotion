import React from 'react';
import {Ball, Block, Cyl, PAL} from '../kit';

// Cuisine. Hauteur de plan de travail 0,9 m, profondeur 0,6 m. L'avant (portes, façades) regarde vers -z.
const TOP = 0.9;

/** Élément bas : caisson, porte(s), plan de travail. */
export const KitchenCounter: React.FC<{width?: number; front?: string; top?: string}> = ({width = 0.8, front = '#efe9dc', top = '#5a5048'}) => (
  <group>
    <Block p={[0, 0.05, 0.02]} s={[width, 0.1, 0.55]} c="#2a2a2a" />
    <Block p={[0, (TOP - 0.04 + 0.1) / 2, 0]} s={[width, TOP - 0.14, 0.58]} c={front} />
    <Block p={[0, TOP - 0.02, -0.01]} s={[width + 0.02, 0.04, 0.62]} c={top} />
    <Block p={[0, TOP - 0.18, -0.295]} s={[width * 0.35, 0.025, 0.02]} c={PAL.chrome} metal />
    <Block p={[0, 0.5, -0.292]} s={[0.006, 0.7, 0.01]} c="#cfc8b8" />
  </group>
);

/** Évier sur élément bas, avec robinet col de cygne. */
export const Sink: React.FC<{width?: number; front?: string; top?: string}> = ({width = 1.0, front = '#efe9dc', top = '#5a5048'}) => (
  <group>
    <KitchenCounter width={width} front={front} top={top} />
    <Block p={[0, TOP - 0.06, -0.02]} s={[width * 0.6, 0.12, 0.42]} c={PAL.chrome} metal />
    <Block p={[0, TOP - 0.05, -0.02]} s={[width * 0.55, 0.11, 0.37]} c="#8a9097" metal />
    <Cyl p={[0, TOP + 0.15, 0.22]} rad={0.02} h={0.3} c={PAL.chrome} metal />
    <Cyl p={[0, TOP + 0.3, 0.15]} rad={0.018} h={0.16} r={[Math.PI / 2, 0, 0]} c={PAL.chrome} metal />
  </group>
);

/** Cuisinière : 4 feux, four vitré, boutons. `on` : un feu allumé. */
export const Stove: React.FC<{color?: string; on?: number}> = ({color = PAL.white, on = 0}) => (
  <group>
    <Block p={[0, TOP / 2, 0]} s={[0.6, TOP, 0.6]} c={color} />
    <Block p={[0, TOP + 0.005, 0]} s={[0.58, 0.01, 0.58]} c="#1d1d1f" />
    {[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) => (
        <Cyl key={`${sx}${sz}`} p={[sx * 0.14, TOP + 0.015, sz * 0.14]} rad={0.09} h={0.01} c={sx < 0 && sz < 0 && on ? '#ff5020' : '#3a3a3c'} e="#ff3a10" ei={sx < 0 && sz < 0 ? on * 1.5 : 0} />
      )),
    )}
    <Block p={[0, 0.42, -0.302]} s={[0.48, 0.38, 0.01]} c="#1a1e24" />
    <Block p={[0, 0.66, -0.31]} s={[0.4, 0.025, 0.02]} c={PAL.chrome} metal />
    {[-0.2, -0.07, 0.07, 0.2].map((x) => (
      <Cyl key={x} p={[x, 0.8, -0.31]} rad={0.022} h={0.03} r={[Math.PI / 2, 0, 0]} c="#3a3a3c" />
    ))}
  </group>
);

/** Réfrigérateur combiné. */
export const Fridge: React.FC<{color?: string}> = ({color = '#d9dcdf'}) => (
  <group>
    <Block p={[0, 0.95, 0]} s={[0.65, 1.9, 0.65]} c={color} />
    <Block p={[0, 1.3, -0.33]} s={[0.63, 0.006, 0.01]} c="#9aa3ab" />
    {[1.55, 0.95].map((y) => (
      <Block key={y} p={[0.26, y, -0.345]} s={[0.025, 0.35, 0.03]} c="#9aa3ab" metal />
    ))}
    {/* magnets et un dessin d'enfant */}
    <Block p={[-0.12, 1.55, -0.33]} s={[0.2, 0.26, 0.005]} c="#f2f0ea" />
    <Block p={[-0.12, 1.58, -0.334]} s={[0.1, 0.08, 0.002]} c="#e05a9a" />
  </group>
);

/** Élément haut (placard mural), à poser à ~1,45 m du sol. */
export const UpperCabinet: React.FC<{width?: number; front?: string}> = ({width = 0.8, front = '#efe9dc'}) => (
  <group>
    <Block p={[0, 0.35, 0]} s={[width, 0.7, 0.35]} c={front} />
    <Block p={[0, 0.35, -0.176]} s={[0.006, 0.66, 0.01]} c="#cfc8b8" />
    {[-1, 1].map((s) => (
      <Block key={s} p={[s * 0.06, 0.08, -0.185]} s={[0.02, 0.1, 0.02]} c={PAL.chrome} metal />
    ))}
  </group>
);

/** Table à manger rectangulaire. */
export const DiningTable: React.FC<{wood?: string; w?: number; d?: number}> = ({wood = '#9a7450', w = 1.6, d = 0.9}) => (
  <group>
    <Block p={[0, 0.74, 0]} s={[w, 0.05, d]} c={wood} />
    {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Block key={`${sx}${sz}`} p={[sx * (w / 2 - 0.08), 0.36, sz * (d / 2 - 0.08)]} s={[0.07, 0.72, 0.07]} c={wood} />))}
    {/* coupe de fruits */}
    <Cyl p={[0, 0.8, 0]} rad={0.15} h={0.07} c={PAL.white} />
    <Ball p={[-0.05, 0.86, 0]} rad={0.05} c="#d8342c" detail={0} />
    <Ball p={[0.05, 0.86, 0.03]} rad={0.05} c="#e8b83a" detail={0} />
    <Ball p={[0.01, 0.87, -0.05]} rad={0.05} c="#6fa83a" detail={0} />
  </group>
);

/** Chaise de salle à manger (dossier vers +z). */
export const DiningChair: React.FC<{wood?: string; seat?: string}> = ({wood = '#9a7450', seat = '#b8322a'}) => (
  <group>
    <Block p={[0, 0.46, 0]} s={[0.44, 0.04, 0.44]} c={wood} />
    <Block p={[0, 0.49, 0]} s={[0.38, 0.03, 0.38]} c={seat} />
    {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Block key={`${sx}${sz}`} p={[sx * 0.19, 0.22, sz * 0.19]} s={[0.04, 0.44, 0.04]} c={wood} />))}
    {[-1, 1].map((s) => (
      <Block key={s} p={[s * 0.19, 0.72, 0.19]} s={[0.04, 0.5, 0.04]} c={wood} />
    ))}
    <Block p={[0, 0.88, 0.19]} s={[0.42, 0.14, 0.03]} c={wood} />
  </group>
);

/** Four à micro-ondes (à poser sur un plan de travail). */
export const Microwave: React.FC<{color?: string; on?: number}> = ({color = '#2a2d31', on = 0}) => (
  <group>
    <Block p={[0, 0.15, 0]} s={[0.5, 0.3, 0.38]} c={color} />
    <Block p={[-0.06, 0.15, -0.192]} s={[0.32, 0.22, 0.01]} c="#151719" e="#ffcf80" ei={on} />
    <Block p={[0.18, 0.2, -0.193]} s={[0.08, 0.04, 0.01]} c="#3fe08a" e="#3fe08a" ei={0.8} />
  </group>
);

/** Bouilloire et deux tasses (à poser sur un plan de travail). */
export const Kettle: React.FC<{color?: string}> = ({color = '#c8463a'}) => (
  <group>
    <Cyl p={[0, 0.012, 0]} rad={0.1} h={0.025} c="#2a2a2a" />
    <mesh position={[0, 0.13, 0]}>
      <cylinderGeometry args={[0.07, 0.1, 0.22, 12]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
    <Block p={[0, 0.27, 0.02]} s={[0.04, 0.03, 0.14]} c="#2a2a2a" />
    <Block p={[0, 0.17, -0.11]} s={[0.03, 0.03, 0.06]} r={[0.6, 0, 0]} c={color} />
    {[0.22, 0.32].map((x) => (
      <Cyl key={x} p={[x, 0.045, 0]} rad={0.04} h={0.09} c={x > 0.3 ? '#3a6f9e' : PAL.white} />
    ))}
  </group>
);
