import React from 'react';
import {Board, SEC, SHOWCASE_FPS, type Section} from '../Showcase';
import * as C from './index';

const SECTIONS: Section[] = [
  {
    name: 'LA RUE', sub: 'banc · lampadaire · potelet · corbeille · abribus · arceaux',
    cam: [0, 9, 31], target: [0, 1.6, 0], spin: 0.15,
    content: () => <>
      <group position={[-4.8, 0, 1]} rotation={[0, Math.PI, 0]}><C.Bench /></group>
      <group position={[-4, 0, -2.6]}><C.StreetLamp lit={1} /></group>
      <group position={[-1.2, 0, 2]}><C.Bollard /></group>
      <group position={[0.1, 0, 2]}><C.TrashBin /></group>
      <group position={[3.3, 0, -1.8]} rotation={[0, Math.PI, 0]}><C.BusShelter /></group>
      <group position={[3.3, 0, 2.2]}><C.BicycleRack /></group>
    </>,
  },
  {
    name: 'LE SQUARE', sub: 'arbre · sapin · haie · fleurs · fontaine · table de pique-nique',
    cam: [0, 10, 37], target: [0, 2, 0], spin: 0.12,
    content: () => <>
      <group position={[-4.3, 0, -2]}><C.Tree /></group>
      <group position={[4.3, 0, -2]}><C.PineTree /></group>
      <group position={[0, 0, -3.5]}><C.Hedge width={3.2} /></group>
      <group position={[-4.5, 0, 2]}><C.Planter /></group>
      <group position={[0, 0, 1.2]}><C.Fountain /></group>
      <group position={[4.4, 0, 1.6]}><C.PicnicTable /></group>
    </>,
  },
  {
    name: 'EN MOUVEMENT', sub: 'vélo · trottinette · feu · panneau · passage piéton · barrière',
    cam: [0, 9, 31], target: [0, 1.3, 0], spin: 0.13,
    content: (t) => <>
      <group position={[-4.6, 0, 1]} rotation={[0, 1.1, 0]}><C.Bicycle wheelSpin={t * 3} /></group>
      <group position={[-2.7, 0, 2]} rotation={[0, 1.1, 0]}><C.Scooter wheelSpin={t * 4} /></group>
      <group position={[-3, 0, -2.7]} rotation={[0, Math.PI, 0]}><C.TrafficLight state={Math.floor(t) % 3 === 0 ? 'green' : 'red'} /></group>
      <group position={[0, 0, -3]} rotation={[0, Math.PI, 0]}><C.TrafficSign kind="parking" /></group>
      <group position={[2.5, 0, 1]}><C.Crosswalk width={2.4} /></group>
      <group position={[4.3, 0, -2]}><C.RoadBarrier /></group>
    </>,
  },
  {
    name: 'LA VIE DE QUARTIER', sub: 'terrasse de café · étal de marché · kiosque',
    cam: [0, 7, 28], target: [0, 1.2, 0], spin: 0.15,
    content: () => <>
      <group position={[-3.8, 0, 1]}><C.CafeTerrace /></group>
      <group position={[0, 0, -1.7]} rotation={[0, Math.PI, 0]}><C.MarketStall /></group>
      <group position={[3.7, 0, 0.8]} rotation={[0, Math.PI, 0]}><C.Kiosk /></group>
    </>,
  },
  {
    name: 'CHANTIER & SERVICES', sub: 'grue orientable · cône · borne incendie',
    cam: [0, 10, 32], target: [0, 3.1, 0], spin: 0.1,
    content: (t) => <>
      <group position={[-1.3, 0, -1.6]}><C.ConstructionCrane height={8} angle={Math.PI / 2 + Math.sin(t * 0.4) * 0.1} hookDrop={3.1} /></group>
      <group position={[-4, 0, 2]}><C.TrafficCone /></group>
      <group position={[3.6, 0, 2]}><C.FireHydrant /></group>
    </>,
  },
];

export const CITY_FRAMES = SECTIONS.length * SEC * SHOWCASE_FPS;
export const CityShowcase: React.FC = () => <Board sections={SECTIONS} kind="VILLE · 24 OBJETS" />;
