import React from 'react';
import {Board, SEC, SHOWCASE_FPS, Section} from '../Showcase';
import * as I from './index';

// Planche des assets d'intérieur : une pièce par séquence. Les murs sont côté +z et +x (derrière les objets).
type V3 = [number, number, number];
const At: React.FC<{p: V3; r?: number; children: React.ReactNode}> = ({p, r = 0, children}) => (
  <group position={p} rotation={[0, r, 0]}>
    {children}
  </group>
);
const WALL_RIGHT = Math.PI / 2; // objet plaqué contre le mur +x, tourné vers l'intérieur de la pièce
// le plateau est retourné (façades vers la caméra) : le mur +x apparaît à gauche de l'écran
const cam = (d: number): Pick<Section, 'cam' | 'target'> => ({cam: [-1.0, 3.2, d * 1.5], target: [-0.5, 1.1, 0]});

const SECTIONS: Section[] = [
  {
    name: 'SALON',
    sub: 'canapé · fauteuil · table basse · TV · bibliothèque · lampadaire · tapis · cheminée · plante',
    ...cam(8.5),
    facing: true,
    spin: 0.18,
    room: {w: 7, d: 5, wall: '#e9dcc6', floor: '#a07850'},
    content: () => (
      <>
        <At p={[-0.3, 0, 0.6]}><I.Rug /></At>
        <At p={[-0.3, 0, 1.95]}><I.Sofa /></At>
        <At p={[-0.3, 0, 0.55]}><I.CoffeeTable /></At>
        <At p={[-2.6, 0, 0.9]} r={-0.7}><I.Armchair /></At>
        <At p={[-2.8, 0, 2.3]}><I.Bookshelf /></At>
        <At p={[1.3, 0, 2.1]}><I.FloorLamp lit={0.8} /></At>
        <At p={[3.2, 0, 1.4]} r={WALL_RIGHT}><I.Fireplace fire={1} /></At>
        <At p={[3.15, 0, -0.6]} r={WALL_RIGHT}><I.TvStand /></At>
        <At p={[3.15, 0.47, -0.6]} r={WALL_RIGHT}><I.Television on={1} /></At>
        <At p={[2.2, 0, 2.1]}><I.PottedPlant /></At>
      </>
    ),
  },
  {
    name: 'CUISINE',
    sub: 'éléments bas · évier · cuisinière · frigo · placards · table · chaises · micro-ondes · bouilloire',
    ...cam(8),
    facing: true,
    spin: 0.18,
    room: {w: 6.5, d: 5, wall: '#dfe8e4', floor: '#c9c2b2'},
    content: () => (
      <>
        <At p={[-2.6, 0, 2.15]}><I.Fridge /></At>
        <At p={[-1.85, 0, 2.2]}><I.KitchenCounter /></At>
        <At p={[-0.95, 0, 2.2]}><I.Sink /></At>
        <At p={[-0.15, 0, 2.2]}><I.Stove on={1} /></At>
        <At p={[0.65, 0, 2.2]}><I.KitchenCounter /></At>
        <At p={[0.65, 0.9, 2.25]}><I.Microwave /></At>
        <At p={[-1.85, 0.9, 2.25]}><I.Kettle /></At>
        {[-1.85, -0.95, 0.65].map((x) => (
          <At key={x} p={[x, 1.45, 2.32]}><I.UpperCabinet /></At>
        ))}
        <At p={[0.3, 0, 0.1]}><I.DiningTable /></At>
        {[-0.3, 0.9].map((x) => (
          <React.Fragment key={x}>
            <At p={[x, 0, 0.75]}><I.DiningChair /></At>
            <At p={[x, 0, -0.55]} r={Math.PI}><I.DiningChair /></At>
          </React.Fragment>
        ))}
      </>
    ),
  },
  {
    name: 'CHAMBRE',
    sub: 'lit double · lit enfant · chevets · lampes · armoire · commode · miroir',
    ...cam(8.5),
    facing: true,
    spin: 0.18,
    room: {w: 7, d: 5, wall: '#e3e0ef', floor: '#b08a5e'},
    content: () => (
      <>
        <At p={[-0.6, 0, 1.4]}><I.Bed /></At>
        {[-1.65, 0.45].map((x) => (
          <React.Fragment key={x}>
            <At p={[x, 0, 2.2]}><I.Nightstand /></At>
            <At p={[x, 0.55, 2.2]}><I.BedsideLamp lit={0.8} /></At>
          </React.Fragment>
        ))}
        <At p={[-2.9, 0, 1.5]} r={-WALL_RIGHT}><I.SingleBed /></At>
        <At p={[3.15, 0, 1.4]} r={WALL_RIGHT}><I.Wardrobe /></At>
        <At p={[3.2, 0, -0.4]} r={WALL_RIGHT}><I.Dresser /></At>
        <At p={[1.6, 0, 2.1]} r={-0.3}><I.StandingMirror /></At>
      </>
    ),
  },
  {
    name: 'SALLE DE BAIN',
    sub: 'baignoire · douche · WC · vasque · lave-linge · sèche-serviettes',
    ...cam(7),
    facing: true,
    spin: 0.18,
    room: {w: 5.5, d: 4, wall: '#d6e6ee', floor: '#e8e4dc'},
    content: () => (
      <>
        <At p={[-1.6, 0, 1.55]}><I.Bathtub /></At>
        <At p={[0.4, 0, 1.75]}><I.Washbasin /></At>
        <At p={[2.2, 0, 1.5]}><I.Shower /></At>
        <At p={[2.45, 0, -0.2]} r={WALL_RIGHT}><I.Toilet /></At>
        <At p={[1.4, 0, 1.65]}><I.WashingMachine /></At>
        <At p={[-0.5, 0.4, 1.95]}><I.TowelRail /></At>
      </>
    ),
  },
  {
    name: 'BUREAU',
    sub: 'bureau · chaise à roulettes · ordinateur · étagère murale',
    ...cam(6),
    facing: true,
    spin: 0.2,
    room: {w: 5, d: 4, wall: '#efe6d6', floor: '#8a6a4a'},
    content: () => (
      <>
        <At p={[0, 0, 1.55]}><I.Desk /></At>
        <At p={[-0.15, 0.76, 1.6]}><I.Computer /></At>
        <At p={[-0.1, 0, 0.75]} r={Math.PI}><I.OfficeChair turn={0.3} /></At>
        <At p={[0, 1.5, 1.85]}><I.WallShelf /></At>
        <At p={[1.6, 0, 1.6]}><I.PottedPlant size={0.8} /></At>
      </>
    ),
  },
  {
    name: 'DÉCOR',
    sub: 'porte · fenêtre · radiateur · horloge · tableau · suspension',
    ...cam(7),
    facing: true,
    spin: 0.2,
    room: {w: 6, d: 4, wall: '#e9dcc6', floor: '#a07850'},
    content: () => (
      <>
        <At p={[-1.8, 0, 1.88]}><I.Door open={0.6} /></At>
        <At p={[0.4, 0.9, 1.9]}><I.InteriorWindow /></At>
        <At p={[0.4, 0, 1.82]}><I.Radiator /></At>
        <At p={[2.1, 2.3, 1.92]}><I.WallClock time={14.25} /></At>
        <At p={[2.1, 1.4, 1.92]}><I.PictureFrame /></At>
        <At p={[0.2, 2.8, 0.5]}><I.PendantLamp lit={1} /></At>
      </>
    ),
  },
];

export const INTERIOR_FRAMES = SECTIONS.length * SEC * SHOWCASE_FPS;

/** Composition « AssetsInterieur ». */
export const InteriorShowcase: React.FC = () => <Board sections={SECTIONS} kind="INTÉRIEUR" />;
