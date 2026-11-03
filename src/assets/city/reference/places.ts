import type {LayoutItem} from '../registry';
import {worldItem} from './world';

/**
 * Named places of the reference city. They only point into the frozen world (item ids, coordinates):
 * the world never knows about them, and cameras live apart in shots.ts.
 * Units in metres, world coordinates; the front of a place faces (-sin ry, -cos ry), like the assets.
 */
export type V3 = [number, number, number];
/** World-aligned box: the streets of the reference city run along x and z. */
export type Zone = {x0: number; x1: number; z0: number; z1: number; y0: number; y1: number};
/** Where a character stands (or sits), and the direction it faces. */
export type Spot = {id: string; label: string; pos: V3; ry: number; pose?: 'debout' | 'assis'};
/** Something a character can use or look at: a door, a window, a bench… `item` when it is a world object. */
export type Interaction = {id: string; label: string; pos: V3; item?: string};
export type Interior = {
  /** host building (world item) and floor above the ground floor (0 = 1er étage) */
  building: string;
  floor: number;
  /** room box in the building's local frame (x along the facade, z from the facade inwards, y from the floor) */
  room: {x0: number; x1: number; z0: number; z1: number; height: number};
  /** world position of the floor slab and of each facade window opening the room (centre of the glass) */
  floorY: number;
  windows: V3[];
};
export type Place = {
  id: PlaceId;
  label: string;
  description: string;
  /** main world item, and every item that makes the place */
  anchor: string;
  items: string[];
  pos: V3;
  ry: number;
  zone: Zone;
  spots: Spot[];
  interactions: Interaction[];
  /** full detail within this distance of `detailCenter` (default: `pos`); simplified blocks beyond */
  detailRadius: number;
  /** (x, z) the place looks at: a window opens on one side, so its visible neighbourhood is off-centre */
  detailCenter?: [number, number];
  interior?: Interior;
};

export const PLACE_IDS = ['appartement-marc', 'rue-marc', 'place-centrale'] as const;
export type PlaceId = typeof PLACE_IDS[number];

// Building.tsx: ground floor 4.2 m, then 3.1 m per floor; one window column every width / cols.
const GROUND_H = 4.2;
const FLOOR_H = 3.1;
const local = (b: LayoutItem, x: number, y: number, z: number): V3 => {
  const c = Math.cos(b.ry);
  const s = Math.sin(b.ry);
  return [r3(b.x + x * c + z * s), r3(y), r3(b.z - x * s + z * c)];
};
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Marc's flat: 4e étage (floor index 3) of haussmann-894, the building facing the square across rue-marc. */
const apartment = (): Place => {
  const b = worldItem('haussmann-894');
  const width = Number(b.props.width);
  const depth = Number(b.props.depth);
  const floor = 3;
  const cols = Math.max(2, Math.floor(width / 2.6));
  const colX = (c: number) => -width / 2 + ((c + 0.5) * width) / cols;
  const front = -depth / 2;
  const floorY = r3(b.y + GROUND_H + floor * FLOOR_H);
  // Three window columns wide, 6 m deep; the facade wall is 0.25 m thick.
  const room = {x0: r3(colX(1) - 1.5), x1: r3(colX(3) + 1.5), z0: front + 0.25, z1: front + 6.25, height: 2.9};
  // Building-local (x, z) at a height above the flat's floor → world.
  const w = (x: number, y: number, z: number): V3 => {
    const p = local(b, x, 0, z);
    return [p[0], r3(floorY + y), p[2]];
  };
  const [x0, , z0] = w(room.x0, 0, room.z0);
  const [x1, , z1] = w(room.x1, 0, room.z1);
  return {
    id: 'appartement-marc',
    label: 'Appartement de Marc',
    description: '4e étage de haussmann-894, trois fenêtres plein nord sur rue-marc et la place centrale.',
    anchor: b.id,
    items: [b.id],
    pos: w(0, 0, (room.z0 + room.z1) / 2),
    ry: b.ry,
    zone: {x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0: floorY, y1: r3(floorY + room.height)},
    spots: [
      {id: 'fenetre', label: 'Debout à la fenêtre, regarde dehors', pos: w(colX(2), 0, room.z0 + 0.7), ry: b.ry},
      {id: 'canape', label: 'Assis sur le canapé', pos: w(colX(1) - 0.2, 0, room.z1 - 1.3), ry: b.ry, pose: 'assis'},
      {id: 'table', label: 'À la table, près de la fenêtre droite', pos: w(colX(3) + 1.1, 0, room.z0 + 1.4), ry: b.ry + Math.PI / 2, pose: 'assis'},
      {id: 'entree', label: 'Porte d’entrée', pos: w(colX(3), 0, room.z1 - 0.6), ry: b.ry},
    ],
    interactions: [
      ...[1, 2, 3].map((c, i) => ({id: ['fenetre-gauche', 'fenetre-centre', 'fenetre-droite'][i], label: 'Fenêtre sur la place', pos: w(colX(c), 1.55, front + 0.1)})),
      {id: 'television', label: 'Télévision (mur ouest)', pos: w(room.x0 + 0.3, 1.0, (room.z0 + room.z1) / 2)},
      {id: 'porte', label: 'Porte palière', pos: w(colX(3), 1.0, room.z1 - 0.05)},
    ],
    // The windows look north over the square: detail centred between the flat and the square.
    detailRadius: 85,
    detailCenter: [4, 4],
    interior: {building: b.id, floor, room, floorY, windows: [1, 2, 3].map((c) => w(colX(c), 1.55, front))},
  };
};

const street = (): Place => ({
  id: 'rue-marc',
  label: 'Rue de Marc',
  description: 'Tronçon est-ouest road-54 entre la place centrale (nord) et l’immeuble de Marc (sud).',
  anchor: 'road-54',
  items: ['road-54', 'intersection-10', 'intersection-14', 'sidewalk-891', 'haussmann-894', 'shop-893', 'cafe-912'],
  pos: [0, 0, 25],
  // Front towards the square (north, -z): the view from Marc's door.
  ry: 0,
  zone: {x0: -23, x1: 23, z0: 17, z1: 33, y0: 0, y1: 40},
  spots: [
    {id: 'porte-immeuble', label: 'Devant la porte cochère de Marc', pos: [12.364, 0.15, 31.6], ry: 0},
    {id: 'trottoir-nord', label: 'Trottoir côté immeubles', pos: [0, 0.15, 31.2], ry: -Math.PI / 2},
    {id: 'trottoir-sud', label: 'Trottoir côté place', pos: [-2, 0.15, 18.6], ry: Math.PI / 2},
    {id: 'terrasse', label: 'Terrasse du café', pos: [9.6, 0.15, 31.4], ry: 0, pose: 'assis'},
    {id: 'chaussee', label: 'Milieu de la chaussée', pos: [0, 0, 25], ry: -Math.PI / 2},
  ],
  interactions: [
    {id: 'porte-immeuble', label: 'Porte cochère de haussmann-894', pos: [12.364, 1.9, 33]},
    {id: 'terrasse-cafe', label: 'Terrasse de café', pos: [8, 0.15, 32.6], item: 'cafe-912'},
    {id: 'banc', label: 'Banc', pos: [4.534, 0.15, 31.8], item: 'bench-910'},
    {id: 'lampadaire', label: 'Lampadaire', pos: [6.5, 0.15, 30.45], item: 'street-lamp-909'},
    {id: 'fleuriste', label: 'Fleuriste', pos: [-2.17, 1.5, 33], item: 'shop-893'},
  ],
  // The street runs east-west: detail stretched along it, so the far end of a travelling stays complete.
  detailRadius: 80,
  detailCenter: [18, 25],
});

const square = (): Place => ({
  id: 'place-centrale',
  label: 'Place centrale',
  description: 'Square à fontaine au centre de la ville (îlot 2,1), bordé au sud par rue-marc.',
  anchor: 'fountain-832',
  items: ['fountain-832', 'grass-829', 'plaza-830', 'plaza-831', 'sidewalk-828', 'bench-841', 'bench-842', 'bench-844', 'bench-845', 'hedge-843', 'hedge-846', 'picnic-847'],
  pos: [0, 0.18, 0],
  // Front towards rue-marc and Marc's building (south, +z).
  ry: Math.PI,
  zone: {x0: -23, x1: 23, z0: -20, z1: 20, y0: 0, y1: 40},
  spots: [
    {id: 'fontaine-sud', label: 'Au bord de la fontaine, côté sud', pos: [0, 0.18, 3.2], ry: 0},
    {id: 'banc-ouest', label: 'Assis sur le banc ouest', pos: [-5, 0.19, 3.6], ry: 0, pose: 'assis'},
    {id: 'banc-est', label: 'Assis sur le banc est', pos: [5, 0.19, 3.6], ry: 0, pose: 'assis'},
    {id: 'allee-est', label: 'Allée est', pos: [9, 0.18, 0.6], ry: -Math.PI / 2},
    {id: 'entree-sud', label: 'Entrée sud, face à rue-marc', pos: [0, 0.18, 15.5], ry: Math.PI},
  ],
  interactions: [
    {id: 'fontaine', label: 'Fontaine', pos: [0, 0.19, 0], item: 'fountain-832'},
    {id: 'banc-ouest', label: 'Banc ouest', pos: [-5, 0.19, 3.2], item: 'bench-841'},
    {id: 'banc-est', label: 'Banc est', pos: [5, 0.19, 3.2], item: 'bench-844'},
    {id: 'pique-nique', label: 'Table de pique-nique', pos: [12, 0.2, -9.52], item: 'picnic-847'},
  ],
  detailRadius: 80,
});

/** Built once from the frozen world. */
export const PLACES: Readonly<Record<PlaceId, Place>> = Object.freeze({
  'appartement-marc': apartment(),
  'rue-marc': street(),
  'place-centrale': square(),
});
