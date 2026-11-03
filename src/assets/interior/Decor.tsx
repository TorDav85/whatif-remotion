import React from 'react';
import {Ball, Block, Cyl, PAL} from '../kit';

// Éléments de décor et d'architecture intérieure. Les objets muraux sont centrés sur leur point d'accroche
// et leur face visible regarde vers -z (on les plaque contre un mur situé côté +z).

/** Horloge murale. `time` en heures (ex. 14.5 = 14 h 30) pour placer les aiguilles. */
export const WallClock: React.FC<{time?: number; rim?: string}> = ({time = 10.1, rim = '#2a2d31'}) => {
  const h = ((time % 12) / 12) * Math.PI * 2;
  const m = ((time % 1) * Math.PI * 2);
  return (
    <group>
      <Cyl p={[0, 0, 0]} rad={0.2} h={0.05} r={[Math.PI / 2, 0, 0]} c={rim} />
      <Cyl p={[0, 0, -0.02]} rad={0.18} h={0.02} r={[Math.PI / 2, 0, 0]} c={PAL.white} />
      {Array.from({length: 12}, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <Block key={i} p={[Math.sin(a) * 0.15, Math.cos(a) * 0.15, -0.035]} s={[0.012, 0.03, 0.005]} r={[0, 0, a]} c="#2a2a2a" />;
      })}
      {/* le cadran regarde vers -z : vu de face, le sens horaire correspond à une rotation positive autour de z */}
      <group position={[0, 0, -0.04]} rotation={[0, 0, h]}>
        <Block p={[0, 0.05, 0]} s={[0.02, 0.1, 0.005]} c="#1a1a1a" />
      </group>
      <group position={[0, 0, -0.045]} rotation={[0, 0, m]}>
        <Block p={[0, 0.07, 0]} s={[0.012, 0.14, 0.005]} c="#1a1a1a" />
      </group>
    </group>
  );
};

/** Tableau encadré : un paysage simple (ciel, colline, soleil). */
export const PictureFrame: React.FC<{frame?: string; w?: number; h?: number; sky?: string; land?: string}> = ({
  frame = '#c9a45a',
  w = 0.8,
  h = 0.6,
  sky = '#9cc3e6',
  land = '#5f9a43',
}) => (
  <group>
    <Block p={[0, 0, 0]} s={[w, h, 0.04]} c={frame} />
    <Block p={[0, h * 0.12, -0.021]} s={[w - 0.1, h * 0.55, 0.005]} c={sky} />
    <Block p={[0, -h * 0.2, -0.021]} s={[w - 0.1, h * 0.28, 0.005]} c={land} />
    <Cyl p={[w * 0.22, h * 0.2, -0.025]} rad={h * 0.08} h={0.005} r={[Math.PI / 2, 0, 0]} c="#f2c46d" />
  </group>
);

/** Suspension (lampe de plafond). Origine au plafond. `lit` (0..1). */
export const PendantLamp: React.FC<{shade?: string; drop?: number; lit?: number}> = ({shade = '#2f5d43', drop = 0.8, lit = 0}) => (
  <group>
    <Cyl p={[0, -0.02, 0]} rad={0.07} h={0.04} c={shade} />
    <Cyl p={[0, -drop / 2, 0]} rad={0.006} h={drop} c="#1a1a1a" />
    <mesh position={[0, -drop - 0.1, 0]}>
      <coneGeometry args={[0.25, 0.22, 14, 1, true]} />
      <meshStandardMaterial color={shade} side={2} flatShading />
    </mesh>
    <Ball p={[0, -drop - 0.17, 0]} rad={0.06} c={PAL.light} e={PAL.light} ei={lit * 2} />
    {lit > 0 && <pointLight position={[0, -drop - 0.3, 0]} intensity={lit * 2.5} distance={6} color="#ffd9a0" />}
  </group>
);

/** Radiateur en fonte (sous une fenêtre). */
export const Radiator: React.FC<{color?: string; fins?: number}> = ({color = '#f2f0ea', fins = 12}) => (
  <group>
    {Array.from({length: fins}, (_, i) => (
      <Block key={i} p={[(i - (fins - 1) / 2) * 0.065, 0.42, 0]} s={[0.05, 0.62, 0.14]} c={color} />
    ))}
    <Block p={[0, 0.72, 0]} s={[fins * 0.065, 0.04, 0.08]} c={color} />
    <Block p={[0, 0.12, 0]} s={[fins * 0.065, 0.04, 0.08]} c={color} />
    {[-1, 1].map((s) => (
      <Block key={s} p={[s * fins * 0.03, 0.05, 0]} s={[0.04, 0.1, 0.04]} c={color} />
    ))}
  </group>
);

/** Porte intérieure dans son encadrement, avec poignée. `open` : angle d'ouverture (radians). */
export const Door: React.FC<{color?: string; frame?: string; open?: number}> = ({color = '#efe9dc', frame = '#e4d6bb', open = 0}) => (
  <group>
    {[-1, 1].map((s) => (
      <Block key={s} p={[s * 0.47, 1.05, 0]} s={[0.07, 2.1, 0.14]} c={frame} />
    ))}
    <Block p={[0, 2.13, 0]} s={[1.01, 0.07, 0.14]} c={frame} />
    {/* le battant pivote autour du gond gauche */}
    <group position={[-0.43, 0, 0]} rotation={[0, open, 0]}>
      <Block p={[0.43, 1.03, 0]} s={[0.86, 2.04, 0.04]} c={color} />
      <Block p={[0.43, 1.45, -0.022]} s={[0.66, 0.8, 0.005]} c="#e2dccd" />
      <Block p={[0.43, 0.55, -0.022]} s={[0.66, 0.65, 0.005]} c="#e2dccd" />
      <Block p={[0.78, 1.0, -0.04]} s={[0.12, 0.025, 0.03]} c="#c9a45a" metal />
    </group>
  </group>
);

/** Fenêtre à la française (deux battants, petits bois), avec appui et rideaux. Origine au bas de l'ouverture. */
export const InteriorWindow: React.FC<{frame?: string; curtain?: string; light?: number; view?: string}> = ({
  frame = PAL.white,
  curtain = '#b8322a',
  light = 0.6,
  view = '#9cc3e6',
}) => (
  <group>
    <Block p={[0, 0.75, 0.02]} s={[1.0, 1.5, 0.02]} c={view} e={view} ei={light} />
    {[-1, 1].map((s) => (
      <React.Fragment key={s}>
        <Block p={[s * 0.5, 0.75, 0]} s={[0.06, 1.56, 0.08]} c={frame} />
        {[0.5, 1.0].map((y) => (
          <Block key={y} p={[s * 0.25, y, -0.01]} s={[0.45, 0.025, 0.03]} c={frame} />
        ))}
        {/* rideau drapé de chaque côté */}
        <Block p={[s * 0.68, 0.85, -0.12]} s={[0.28, 1.9, 0.06]} c={curtain} />
      </React.Fragment>
    ))}
    <Block p={[0, 0.75, -0.01]} s={[0.04, 1.5, 0.05]} c={frame} />
    <Block p={[0, 1.52, 0]} s={[1.06, 0.06, 0.08]} c={frame} />
    <Block p={[0, -0.03, -0.08]} s={[1.15, 0.05, 0.22]} c={frame} />
    <Cyl p={[0, 1.83, -0.12]} rad={0.015} h={1.7} r={[0, 0, Math.PI / 2]} c={PAL.iron} />
  </group>
);
