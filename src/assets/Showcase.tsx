import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CameraRig} from '../scenes/common';
import {SERIF} from '../ui/Hud';
import {smooth} from '../world';
import {Barge, Building, Bus, Car, EiffelTower, House, PEOPLE_PRESETS, Person, TourBoat} from './index';

// Planche de présentation des assets : une famille par séquence, sur un plateau tournant.
export const SHOWCASE_FPS = 30;
export const SEC = 4;

export type Section = {
  name: string;
  sub: string;
  cam: [number, number, number];
  target: [number, number, number];
  water?: boolean;
  /** les façades regardent vers -z : on tourne le plateau d'un demi-tour pour les voir de face */
  facing?: boolean;
  /** décor de pièce (sol + deux murs) derrière les objets, pour les assets d'intérieur */
  room?: {w: number; d: number; wall: string; floor: string};
  dusk?: boolean;
  spin?: number;
  content: (t: number) => React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    name: 'PERSONNAGES',
    sub: 'debout · marche · assis · bras levés · enfant',
    cam: [0, 2.4, 12.5],
    target: [0, 1, 0],
    spin: 0.25,
    content: (t) =>
      PEOPLE_PRESETS.map((p, i) => {
        const pose = i === 1 || i === 3 ? 'marche' : i === 4 ? 'assis' : i === 5 ? 'bras-leves' : 'debout';
        return (
          <group key={i} position={[(i - 3) * 1.15, 0, (i % 2) * 0.6]} rotation={[0, Math.PI + (i - 3) * 0.15, 0]}>
            <Person {...p} pose={pose} phase={t * 7 + i} />
          </group>
        );
      }),
  },
  {
    name: 'VOITURES',
    sub: 'berline · citadine · taxi · utilitaire · bus',
    cam: [0, 8, 33],
    target: [0, 1.2, 0],
    dusk: true,
    spin: 0.2,
    content: (t) => (
      <>
        <group position={[-7.5, 0, 2]} rotation={[0, 0.6, 0]}>
          <Car color="#b8322a" lights={1} wheelSpin={t * 4} />
        </group>
        <group position={[-3, 0, 5]} rotation={[0, 0.6, 0]}>
          <Car variant="citadine" color="#e0b23a" lights={1} />
        </group>
        <group position={[1.5, 0, 5]} rotation={[0, 0.6, 0]}>
          <Car variant="taxi" lights={1} />
        </group>
        <group position={[6, 0, 3]} rotation={[0, 0.6, 0]}>
          <Car variant="utilitaire" color="#f2f2ee" lights={1} />
        </group>
        <group position={[1, 0, -4]} rotation={[0, Math.PI / 2, 0]}>
          <Bus lights={1} />
        </group>
      </>
    ),
  },
  {
    name: 'BATEAUX',
    sub: 'péniche habitée · bateau-mouche',
    cam: [0, 16, 52],
    target: [0, 1.5, 0],
    water: true,
    spin: 0.15,
    content: () => (
      <>
        <group position={[-7, 0, 0]}>
          <Barge />
        </group>
        <group position={[7, 0, 0]}>
          <TourBoat lights={0.3} />
        </group>
      </>
    ),
  },
  {
    name: 'MAISONS',
    sub: 'pavillons · 1 ou 2 niveaux',
    cam: [0, 9, 38],
    target: [0, 3, 0],
    facing: true,
    spin: 0.2,
    content: () => (
      <>
        <group position={[-11, 0, 0]} rotation={[0, 0.3, 0]}>
          <House />
        </group>
        <group position={[0, 0, 4]}>
          <House floors={1} walls="#f3efe6" roof="#5a6370" shutters="#5e8f3c" width={8} />
        </group>
        <group position={[11, 0, 0]} rotation={[0, -0.3, 0]}>
          <House walls="#e9c9a0" shutters="#7a2e2a" door="#2b3a55" lit={0.6} />
        </group>
      </>
    ),
  },
  {
    name: 'IMMEUBLES',
    sub: 'haussmanniens · balcons · toits en zinc',
    cam: [0, 20, 78],
    target: [0, 13, 0],
    facing: true,
    dusk: true,
    spin: 0.12,
    content: () => (
      <>
        {[
          {x: -21, w: 14, seed: 1, awning: '#a8322b'},
          {x: -6.8, w: 14, seed: 2, awning: null, stone: '#e8dcc4'},
          {x: 7.2, w: 13, seed: 3, awning: '#2f5d43', floors: 6},
          {x: 20.4, w: 13, seed: 4, awning: '#6d2440', stone: '#dccdb0'},
        ].map((b) => (
          <group key={b.seed} position={[b.x, 0, 0]}>
            <Building width={b.w} seed={b.seed} awning={b.awning} stone={b.stone} floors={b.floors} lit={0.45} />
          </group>
        ))}
      </>
    ),
  },
  {
    name: 'TOUR EIFFEL',
    sub: 'treillis · arches · deux étages · illuminable',
    cam: [0, 40, 215],
    target: [0, 48, 0],
    dusk: true,
    spin: 0.18,
    content: () => <EiffelTower height={100} lit={0.35} beacon={1} />,
  },
];

export const SHOWCASE_FRAMES = SECTIONS.length * SEC * SHOWCASE_FPS;

const Stage: React.FC<{s: Section; from: number}> = ({s, from}) => {
  const frame = useCurrentFrame();
  const t = frame / SHOWCASE_FPS;
  const sky = s.dusk ? '#2c2a4a' : '#9cc3e6';
  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 120, 600]} />
      <CameraRig position={s.cam} target={s.target} fov={45} />
      <hemisphereLight color={s.dusk ? '#9aa6d8' : '#ffffff'} groundColor="#5a5040" intensity={s.dusk ? 0.7 : 1.1} />
      <directionalLight color={s.dusk ? '#ffc890' : '#fff4e0'} intensity={s.dusk ? 1.4 : 2} position={[30, 50, 40]} />
      <directionalLight color="#9fb6d8" intensity={0.4} position={[-40, 20, -30]} />
      {/* plateau */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[Math.max(14, s.cam[2] * 0.6), 64]} />
        <meshStandardMaterial color={s.water ? '#3a6f9e' : s.dusk ? '#4a4a52' : '#c9c2b2'} roughness={s.water ? 0.4 : 0.9} />
      </mesh>
      <group rotation={[0, (s.facing ? Math.PI : 0) + Math.sin(t * (s.spin ?? 0.2)) * 0.6, 0]}>
        {s.room && (
          <>
            <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[s.room.w, s.room.d]} />
              <meshStandardMaterial color={s.room.floor} />
            </mesh>
            <mesh position={[0, 1.4, s.room.d / 2]} scale={[s.room.w, 2.8, 0.1]}>
              <boxGeometry />
              <meshStandardMaterial color={s.room.wall} />
            </mesh>
            <mesh position={[s.room.w / 2, 1.4, 0]} scale={[0.1, 2.8, s.room.d]}>
              <boxGeometry />
              <meshStandardMaterial color={s.room.wall} />
            </mesh>
          </>
        )}
        {s.content(from + t)}
      </group>
    </>
  );
};

const Label: React.FC<{s: Section; i: number; n: number; kind: string}> = ({s, i, n, kind}) => {
  const frame = useCurrentFrame();
  const t = frame / SHOWCASE_FPS;
  const a = Math.min(smooth(0, 0.4, t), 1 - smooth(SEC - 0.4, SEC, t));
  return (
    <div style={{position: 'absolute', top: 150, left: 72, right: 72, fontFamily: SERIF, color: '#f3efe6', opacity: a, textShadow: '0 2px 14px rgba(0,0,0,0.5)'}}>
      <div style={{fontSize: 24, letterSpacing: '0.14em', opacity: 0.78}}>
        {kind} · {String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
      </div>
      <div style={{fontSize: 72, marginTop: 10}}>{s.name}</div>
      <div style={{fontSize: 26, letterSpacing: '0.08em', opacity: 0.85, marginTop: 6}}>{s.sub}</div>
    </div>
  );
};

/** Planche générique : une famille d'assets par séquence de SEC secondes. */
export const Board: React.FC<{sections: Section[]; kind: string}> = ({sections, kind}) => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {sections.map((s, i) => (
        <Sequence key={s.name} from={i * SEC * SHOWCASE_FPS} durationInFrames={SEC * SHOWCASE_FPS}>
          <ThreeCanvas width={width} height={height} camera={{fov: 45, position: [0, 0, 5]}}>
            <Stage s={s} from={0} />
          </ThreeCanvas>
          <Label s={s} i={i} n={sections.length} kind={kind} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** Composition « Assets » : la planche de présentation, pour valider les modèles avant de les utiliser. */
export const Showcase: React.FC = () => <Board sections={SECTIONS} kind="ASSETS" />;
