import React from 'react';
import {PAL} from '../kit';
import {Building} from '../Building';
import {House} from '../House';
import {Car, Bus} from '../Car';
import {Barge, TourBoat} from '../Boat';
import {EiffelTower} from '../EiffelTower';
import {Person, PEOPLE_PRESETS} from '../Person';
import {BuildingA, BuildingB, HouseSmall} from '../buildings';
import {CarRed, CarBlue, BusCity} from '../vehicles';
import {TreeOak, PalmTree, Bench as WoodBench} from '../nature';
import {TrafficLight as TrafficLightSimple, Lamppost, RoadSegment} from '../street';
import {PersonSimple} from '../humans';
import {Bench, StreetLamp, Bollard, TrashBin, BusShelter, BicycleRack} from './Street';
import {Tree, PineTree, Hedge, Planter, Fountain, PicnicTable} from './Park';
import {Bicycle, Scooter, TrafficLight, TrafficSign, Crosswalk, RoadBarrier} from './Mobility';
import {CafeTerrace, MarketStall, Kiosk, ConstructionCrane, TrafficCone, FireHydrant} from './CityLife';
import {Road, Intersection, Sidewalk, Grass, Plaza, Water} from './Ground';
import {Shop, SHOP_KINDS} from './Shops';
import {Tower, ModernBlock, Bridge} from './Towers';
import * as Interior from '../interior';
import type {CameraPlan} from './camera';

/** One placed object in an editable city. Units in metres; ry in radians. */
export type LayoutItem = {id: string; type: string; x: number; y: number; z: number; ry: number; props: Record<string, unknown>};
export type CityLayout = {version: 1; name: string; sky?: 'jour' | 'nuit'; items: LayoutItem[]; camera?: CameraPlan};

export type Param =
  | {key: string; label: string; type: 'number'; min: number; max: number; step: number}
  | {key: string; label: string; type: 'color'}
  | {key: string; label: string; type: 'select'; options: (string | number)[]}
  | {key: string; label: string; type: 'bool'};

export type AssetDef = {
  type: string;
  label: string;
  category: string;
  params?: Param[];
  defaults?: Record<string, unknown>;
  /** objects that light up at night receive `lit` */
  lit?: boolean;
  render: (props: any) => React.ReactElement;
};

export const CATEGORIES = ['Sol & rues', 'Bâtiments', 'Monuments', 'Véhicules', 'Bateaux', 'Nature', 'Mobilier urbain', 'Mobilité', 'Vie de quartier', 'Personnages', 'Intérieur'];

const num = (key: string, label: string, min: number, max: number, step = 1): Param => ({key, label, type: 'number', min, max, step});
const color = (key: string, label: string): Param => ({key, label, type: 'color'});
const sel = (key: string, label: string, options: (string | number)[]): Param => ({key, label, type: 'select', options});
const bool = (key: string, label: string): Param => ({key, label, type: 'bool'});
const C = (key = 'color', label = 'Couleur') => color(key, label);

const ground: AssetDef[] = [
  {type: 'road', label: 'Tronçon de rue', category: 'Sol & rues', render: (p) => <Road {...p} />, defaults: {width: 10, length: 30, parking: true},
    params: [num('width', 'Largeur', 4, 30, 0.5), num('length', 'Longueur', 4, 200, 1), bool('parking', 'Files de stationnement')]},
  {type: 'intersection', label: 'Carrefour', category: 'Sol & rues', render: (p) => <Intersection {...p} />, defaults: {width: 10, depth: 10, crosswalks: true},
    params: [num('width', 'Largeur', 4, 30, 0.5), num('depth', 'Profondeur', 4, 30, 0.5), bool('crosswalks', 'Passages piétons')]},
  {type: 'sidewalk', label: 'Trottoir / îlot', category: 'Sol & rues', render: (p) => <Sidewalk {...p} />, defaults: {width: 46, depth: 42},
    params: [num('width', 'Largeur', 2, 200, 0.5), num('depth', 'Profondeur', 2, 200, 0.5), C()]},
  {type: 'grass', label: 'Pelouse', category: 'Sol & rues', render: (p) => <Grass {...p} />, defaults: {width: 20, depth: 20},
    params: [num('width', 'Largeur', 1, 200, 0.5), num('depth', 'Profondeur', 1, 200, 0.5), C()]},
  {type: 'plaza', label: 'Place pavée', category: 'Sol & rues', render: (p) => <Plaza {...p} />, defaults: {width: 20, depth: 20},
    params: [num('width', 'Largeur', 1, 200, 0.5), num('depth', 'Profondeur', 1, 200, 0.5), C()]},
  {type: 'water', label: 'Eau / quai', category: 'Sol & rues', render: (p) => <Water {...p} />, defaults: {width: 60, depth: 30},
    params: [num('width', 'Longueur', 4, 400, 1), num('depth', 'Largeur', 4, 120, 1), C()]},
  {type: 'crosswalk', label: 'Passage piéton (dalle)', category: 'Sol & rues', render: (p) => <Crosswalk {...p} />, defaults: {width: 4, stripes: 7},
    params: [num('width', 'Largeur', 1, 20, 0.5), num('stripes', 'Bandes', 2, 20)]},
  {type: 'bridge', label: 'Pont de pierre', category: 'Sol & rues', lit: true, render: (p) => <Bridge {...p} />, defaults: {length: 56, width: 16, arches: 3},
    params: [num('length', 'Longueur', 20, 120, 1), num('width', 'Largeur', 8, 30, 0.5), num('arches', 'Arches', 1, 7), color('stone', 'Pierre')]},
  {type: 'road-segment', label: 'Route simple', category: 'Sol & rues', render: (p) => <RoadSegment {...p} />, defaults: {width: 8, length: 20},
    params: [num('width', 'Largeur', 4, 20, 0.5), num('length', 'Longueur', 4, 100, 1)]},
];

const buildings: AssetDef[] = [
  {type: 'haussmann', label: 'Immeuble haussmannien', category: 'Bâtiments', lit: true, render: (p) => <Building {...p} />,
    defaults: {width: 14, depth: 12, floors: 5, stone: PAL.cream, roof: PAL.zinc, awning: '#a8322b', seed: 1},
    params: [num('width', 'Largeur', 4, 40, 0.5), num('depth', 'Profondeur', 0.6, 30, 0.5), num('floors', 'Étages', 1, 9), color('stone', 'Pierre'),
      color('roof', 'Toit'), color('awning', 'Store'), num('seed', 'Variante', 1, 999)]},
  {type: 'shop', label: 'Magasin', category: 'Bâtiments', lit: true, render: (p) => <Shop {...p} />,
    defaults: {kind: 'boulangerie', width: 8, depth: 9, floors: 2, stone: PAL.cream, display: true},
    params: [sel('kind', 'Enseigne', Object.keys(SHOP_KINDS)), num('width', 'Largeur', 4, 20, 0.5), num('depth', 'Profondeur', 4, 16, 0.5),
      num('floors', 'Étages', 0, 6), color('stone', 'Pierre'), bool('display', 'Étal / devanture')]},
  {type: 'tower', label: 'Tour de bureaux', category: 'Bâtiments', lit: true, render: (p) => <Tower {...p} />,
    defaults: {height: 90, width: 20, depth: 20, color: '#6f8aa8', style: 'bandes'},
    params: [num('height', 'Hauteur', 30, 260, 5), num('width', 'Largeur', 10, 50, 1), num('depth', 'Profondeur', 10, 50, 1), color('color', 'Verre'),
      sel('style', 'Style', ['bandes', 'verre', 'gradins'])]},
  {type: 'modern-block', label: 'Immeuble moderne', category: 'Bâtiments', lit: true, render: (p) => <ModernBlock {...p} />,
    defaults: {width: 30, depth: 12, floors: 8},
    params: [num('width', 'Largeur', 10, 80, 1), num('depth', 'Profondeur', 8, 24, 0.5), num('floors', 'Étages', 2, 20), color('color', 'Béton'), color('accent', 'Garde-corps')]},
  {type: 'house', label: 'Maison (pavillon)', category: 'Bâtiments', lit: true, render: (p) => <House {...p} />,
    defaults: {width: 9, depth: 7, floors: 2, walls: '#efe3c8', roof: PAL.terracotta, shutters: '#3f6b8a', garden: true},
    params: [num('width', 'Largeur', 5, 20, 0.5), num('depth', 'Profondeur', 4, 16, 0.5), sel('floors', 'Niveaux', [1, 2]), color('walls', 'Murs'),
      color('roof', 'Toit'), color('shutters', 'Volets'), bool('garden', 'Jardin')]},
  {type: 'building-a', label: 'Immeuble briques', category: 'Bâtiments', render: (p) => <BuildingA {...p} />, defaults: {height: 15},
    params: [num('height', 'Hauteur', 5, 40, 1), C()]},
  {type: 'building-b', label: 'Tour moderne', category: 'Bâtiments', render: (p) => <BuildingB {...p} />, defaults: {height: 40},
    params: [num('height', 'Hauteur', 10, 120, 1), C()]},
  {type: 'house-small', label: 'Petite maison', category: 'Bâtiments', render: (p) => <HouseSmall {...p} />, params: [C()]},
  {type: 'kiosk', label: 'Kiosque', category: 'Bâtiments', lit: true, render: (p) => <Kiosk {...p} />, params: [C()]},
  {type: 'crane', label: 'Grue de chantier', category: 'Bâtiments', render: (p) => <ConstructionCrane {...p} />, defaults: {height: 12, angle: 0},
    params: [num('height', 'Hauteur', 4, 40, 0.5), num('angle', 'Orientation flèche', -3.14, 3.14, 0.05), num('hookDrop', 'Crochet', 0.2, 30, 0.1), C()]},
];

const monuments: AssetDef[] = [
  {type: 'eiffel', label: 'Tour Eiffel', category: 'Monuments', lit: true, render: (p) => <EiffelTower {...p} />, defaults: {height: 110},
    params: [num('height', 'Hauteur', 20, 330, 5), C(), num('beacon', 'Balise', 0, 1, 0.1)]},
  {type: 'fountain', label: 'Fontaine', category: 'Monuments', render: (p) => <Fountain {...p} />, params: [C(), num('flow', 'Débit', 0, 1.5, 0.1)]},
];

const CAR_COLORS = '#b8322a';
const vehicles: AssetDef[] = [
  {type: 'car', label: 'Voiture', category: 'Véhicules', lit: true, render: ({lit, ...p}) => <Car {...p} lights={lit} />, defaults: {color: CAR_COLORS, variant: 'berline'},
    params: [C(), sel('variant', 'Modèle', ['berline', 'citadine', 'taxi', 'utilitaire'])]},
  {type: 'bus', label: 'Bus parisien', category: 'Véhicules', lit: true, render: ({lit, ...p}) => <Bus {...p} lights={lit} />, params: [C()]},
  {type: 'car-red', label: 'Voiture rouge (héros)', category: 'Véhicules', render: () => <CarRed />},
  {type: 'car-blue', label: 'Voiture bleue', category: 'Véhicules', render: () => <CarBlue />},
  {type: 'bus-city', label: 'Bus (simple)', category: 'Véhicules', render: (p) => <BusCity {...p} />, params: [C()]},
  {type: 'bicycle', label: 'Vélo', category: 'Véhicules', render: (p) => <Bicycle {...p} />, params: [C(), bool('basket', 'Panier')]},
  {type: 'scooter', label: 'Trottinette', category: 'Véhicules', render: (p) => <Scooter {...p} />, params: [C()]},
];

const boats: AssetDef[] = [
  {type: 'barge', label: 'Péniche', category: 'Bateaux', render: (p) => <Barge {...p} />, defaults: {length: 26},
    params: [num('length', 'Longueur', 12, 40, 1), color('hull', 'Coque'), color('cabin', 'Rouf'), color('trim', 'Liseré'), bool('plants', 'Plantes')]},
  {type: 'tour-boat', label: 'Bateau-mouche', category: 'Bateaux', lit: true, render: ({lit, ...p}) => <TourBoat {...p} lights={lit} />, params: [color('hull', 'Coque'), color('roof', 'Toit')]},
];

const nature: AssetDef[] = [
  {type: 'tree', label: 'Arbre', category: 'Nature', render: (p) => <Tree {...p} />, defaults: {height: 5.4, seed: 5},
    params: [num('height', 'Hauteur', 2, 14, 0.2), color('foliage', 'Feuillage'), color('trunk', 'Tronc'), num('seed', 'Variante', 1, 999)]},
  {type: 'pine', label: 'Sapin', category: 'Nature', render: (p) => <PineTree {...p} />, defaults: {height: 5.6},
    params: [num('height', 'Hauteur', 2, 16, 0.2), color('foliage', 'Feuillage')]},
  {type: 'oak', label: 'Chêne low-poly', category: 'Nature', render: (p) => <TreeOak {...p} />, defaults: {scale: 1}, params: [num('scale', 'Taille', 0.3, 3, 0.1)]},
  {type: 'palm', label: 'Palmier', category: 'Nature', render: (p) => <PalmTree {...p} />, defaults: {scale: 1}, params: [num('scale', 'Taille', 0.3, 3, 0.1)]},
  {type: 'hedge', label: 'Haie', category: 'Nature', render: (p) => <Hedge {...p} />, defaults: {width: 2.6, height: 1.1},
    params: [num('width', 'Longueur', 0.5, 20, 0.1), num('height', 'Hauteur', 0.3, 3, 0.1), C()]},
  {type: 'planter', label: 'Jardinière', category: 'Nature', render: (p) => <Planter {...p} />, params: [C(), color('flowers', 'Fleurs')]},
];

const furniture: AssetDef[] = [
  {type: 'bench', label: 'Banc', category: 'Mobilier urbain', render: (p) => <Bench {...p} />, params: [C(), num('width', 'Largeur', 0.8, 4, 0.1), bool('backrest', 'Dossier')]},
  {type: 'bench-wood', label: 'Banc bois simple', category: 'Mobilier urbain', render: () => <WoodBench />},
  {type: 'street-lamp', label: 'Lampadaire parisien', category: 'Mobilier urbain', lit: true, render: (p) => <StreetLamp {...p} />, params: [C(), num('height', 'Hauteur', 2, 8, 0.1)]},
  {type: 'lamppost', label: 'Lampadaire simple', category: 'Mobilier urbain', lit: true, render: ({lit, ...p}) => <Lamppost {...p} on={lit} />, params: [num('height', 'Hauteur', 2, 8, 0.1)]},
  {type: 'bollard', label: 'Potelet', category: 'Mobilier urbain', render: (p) => <Bollard {...p} />, params: [C()]},
  {type: 'trash-bin', label: 'Corbeille', category: 'Mobilier urbain', render: (p) => <TrashBin {...p} />, params: [C()]},
  {type: 'bus-shelter', label: 'Abribus', category: 'Mobilier urbain', render: (p) => <BusShelter {...p} />, params: [C()]},
  {type: 'bike-rack', label: 'Arceaux vélos', category: 'Mobilier urbain', render: (p) => <BicycleRack {...p} />, params: [C(), num('spaces', 'Places', 1, 12)]},
  {type: 'picnic', label: 'Table de pique-nique', category: 'Mobilier urbain', render: (p) => <PicnicTable {...p} />, params: [C()]},
  {type: 'hydrant', label: 'Borne incendie', category: 'Mobilier urbain', render: (p) => <FireHydrant {...p} />, params: [C()]},
];

const mobility: AssetDef[] = [
  {type: 'traffic-light', label: 'Feu tricolore', category: 'Mobilité', render: (p) => <TrafficLight {...p} />, defaults: {state: 'green'},
    params: [sel('state', 'État', ['red', 'amber', 'green']), num('height', 'Hauteur', 2, 5, 0.1)]},
  {type: 'traffic-light-simple', label: 'Feu simple', category: 'Mobilité', render: (p) => <TrafficLightSimple {...p} />, params: [sel('state', 'État', ['red', 'yellow', 'green'])]},
  {type: 'sign', label: 'Panneau', category: 'Mobilité', render: (p) => <TrafficSign {...p} />, params: [sel('kind', 'Type', ['parking', 'crossing', 'no-entry'])]},
  {type: 'barrier', label: 'Barrière de chantier', category: 'Mobilité', render: (p) => <RoadBarrier {...p} />, params: [C()]},
  {type: 'cone', label: 'Cône', category: 'Mobilité', render: (p) => <TrafficCone {...p} />, params: [C()]},
];

const life: AssetDef[] = [
  {type: 'cafe', label: 'Terrasse de café', category: 'Vie de quartier', render: (p) => <CafeTerrace {...p} />, params: [C(), bool('umbrella', 'Parasol')]},
  {type: 'market', label: 'Étal de marché', category: 'Vie de quartier', render: (p) => <MarketStall {...p} />, params: [C(), color('produce', 'Produits')]},
];

const POSES = ['debout', 'marche', 'assis', 'bras-leves'];
const people: AssetDef[] = [
  {type: 'person', label: 'Passant', category: 'Personnages',
    render: ({preset = 0, ...p}) => <Person {...PEOPLE_PRESETS[Number(preset) % PEOPLE_PRESETS.length]} {...p} />,
    defaults: {preset: 0, pose: 'debout', phase: 0},
    params: [sel('preset', 'Silhouette', PEOPLE_PRESETS.map((_, i) => i)), sel('pose', 'Pose', POSES), num('phase', 'Pas', 0, 6.28, 0.1),
      color('shirt', 'Haut'), color('pants', 'Bas')]},
  {type: 'person-simple', label: 'Personnage simple', category: 'Personnages', render: (p) => <PersonSimple {...p} />,
    params: [color('shirt', 'Haut'), color('pants', 'Bas'), num('walkPhase', 'Pas', 0, 6.28, 0.1)]},
];

const interiorLabels: Record<string, string> = {
  Armchair: 'Fauteuil', Bookshelf: 'Bibliothèque', CoffeeTable: 'Table basse', Fireplace: 'Cheminée', FloorLamp: 'Lampadaire de salon',
  PottedPlant: 'Plante en pot', Rug: 'Tapis', Sofa: 'Canapé', Television: 'Télévision', TvStand: 'Meuble TV', DiningChair: 'Chaise',
  DiningTable: 'Table à manger', Fridge: 'Réfrigérateur', Kettle: 'Bouilloire', KitchenCounter: 'Plan de travail', Microwave: 'Micro-ondes',
  Sink: 'Évier', Stove: 'Cuisinière', UpperCabinet: 'Placard haut', Bed: 'Lit double', BedsideLamp: 'Lampe de chevet', Dresser: 'Commode',
  Nightstand: 'Table de nuit', SingleBed: 'Lit simple', StandingMirror: 'Miroir sur pied', Wardrobe: 'Armoire', Bathtub: 'Baignoire',
  Shower: 'Douche', Toilet: 'Toilettes', TowelRail: 'Porte-serviettes', Washbasin: 'Lavabo', WashingMachine: 'Lave-linge', Computer: 'Ordinateur',
  Desk: 'Bureau', OfficeChair: 'Chaise de bureau', WallShelf: 'Étagère murale', Door: 'Porte', InteriorWindow: 'Fenêtre', PendantLamp: 'Suspension',
  PictureFrame: 'Cadre', Radiator: 'Radiateur', WallClock: 'Horloge murale',
};
const interior: AssetDef[] = Object.entries(Interior).map(([name, Comp]) => ({
  type: `interior-${name}`,
  label: interiorLabels[name] ?? name,
  category: 'Intérieur',
  render: (p: any) => React.createElement(Comp as React.FC<any>, p),
}));

export const ASSETS: AssetDef[] = [...ground, ...buildings, ...monuments, ...vehicles, ...boats, ...nature, ...furniture, ...mobility, ...life, ...people, ...interior];
export const ASSET_BY_TYPE: Record<string, AssetDef> = Object.fromEntries(ASSETS.map((a) => [a.type, a]));

/** Renders one layout item exactly as the editor shows it. */
export const CityItem: React.FC<{item: LayoutItem; lit?: number}> = React.memo(({item, lit = 0}) => {
  const def = ASSET_BY_TYPE[item.type];
  if (!def) return null;
  const props = {...def.defaults, ...item.props, ...(def.lit ? {lit} : {})};
  return (
    <group position={[item.x, item.y, item.z]} rotation={[0, item.ry, 0]}>
      {def.render(props)}
    </group>
  );
});

export const CityLayoutItems: React.FC<{layout: CityLayout; lit?: number}> = ({layout, lit = layout.sky === 'nuit' ? 1 : 0}) => (
  <>{layout.items.map((it) => <CityItem key={it.id} item={it} lit={lit} />)}</>
);
