import type {Shot} from '../camera';
import {SKY} from '../LayoutScene';
import type {CityLayout, LayoutItem} from '../registry';
import {PLACE_IDS, PLACES, type Interaction, type Place, type PlaceId, type Spot} from './places';
import {REFERENCE_SHOTS, type ReferenceShot} from './shots';
import {REFERENCE_WORLD} from './world';

/**
 * Episode API: an episode names a place, adds its characters and events, and describes its own
 * variants (light, weather, damage, changes). The frozen world is never copied into the episode nor
 * modified: variants produce a new layout at render time.
 */

const isPlaceId = (id: string): id is PlaceId => (PLACE_IDS as readonly string[]).includes(id);

/** A place by id; an unknown id is an error that lists the valid ones. */
export const getPlace = (id: string): Place => {
  if (!isPlaceId(id)) throw new Error(`Lieu inconnu « ${id} ». Lieux de la ville de référence : ${PLACE_IDS.join(', ')}.`);
  return PLACES[id];
};

const pick = <T extends {id: string}>(list: readonly T[], id: string, what: string, place: string): T => {
  const found = list.find((x) => x.id === id);
  if (!found) throw new Error(`${what} « ${id} » inconnu pour le lieu « ${place} » (${list.map((x) => x.id).join(', ')}).`);
  return found;
};

/** Where a character stands in a place: position and facing. */
export const spot = (place: string, id: string): Spot => pick(getPlace(place).spots, id, 'Point de placement', place);
export const interaction = (place: string, id: string): Interaction => pick(getPlace(place).interactions, id, 'Point d’interaction', place);

/**
 * Reference framings of a place, optionally a chosen subset (keys after the "/": 'porte', 'travelling'),
 * followed by the episode's own shots. The reference list itself is never modified.
 */
export const placeShots = (place: string, options: {only?: string[]; extra?: Shot[]} = {}): ReferenceShot[] => {
  const p = getPlace(place);
  const all = REFERENCE_SHOTS[p.id];
  const chosen = options.only
    ? options.only.map((key) => pick(all, `${p.id}/${key}`, 'Cadrage', place))
    : [...all];
  return [...chosen, ...(options.extra ?? []).map((s) => ({...s, place: p.id}))];
};

// ——— Variants ———

export type Lighting = 'jour' | 'crepuscule' | 'nuit';
export type Weather = 'clair' | 'brouillard' | 'pluie' | 'neige';
/** Damage around a point (x, z): 1 = flattened at the centre, fading to nothing at `radius`. */
export type Damage = {center: [number, number]; radius: number; level: number};
/** A change to one world item, for this episode only. */
export type ItemChange = {id: string; remove?: boolean; props?: Record<string, unknown>; move?: Partial<Pick<LayoutItem, 'x' | 'y' | 'z' | 'ry'>>};
export type Variants = {
  lighting?: Lighting;
  weather?: Weather;
  damage?: Damage[];
  changes?: ItemChange[];
  /** objects the episode brings into the world (a crater, a giant object…); ids must be new */
  add?: LayoutItem[];
};

const lerpHex = (a: string, b: string, k: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * k));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
};
/** Repeatable 0..1 value per item (no Math.random): same damage in preview and render. */
const hash01 = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
};

const BUILDINGS = new Set(['haussmann', 'shop', 'modern-block', 'house']);
const FRAGILE = new Set(['person', 'bench', 'trash-bin', 'bollard', 'hydrant', 'cafe', 'bus-shelter', 'street-lamp', 'traffic-light']);
const SOOT = '#4a3f38';

const damaged = (it: LayoutItem, k: number): LayoutItem | null => {
  if (k <= 0) return it;
  const p = it.props;
  if (BUILDINGS.has(it.type)) {
    const floors = Number(p.floors ?? 5);
    return {...it, props: {...p, floors: Math.max(it.type === 'shop' ? 0 : 1, Math.round(floors * (1 - 0.75 * k))),
      stone: lerpHex(String(p.stone ?? '#e8dcc0'), SOOT, k * 0.8), ...(k > 0.3 ? {awning: null, details: false} : {})}};
  }
  if (it.type === 'car') return {...it, ry: it.ry + (hash01(it.id) - 0.5) * 1.4 * k, props: {...p, color: lerpHex(String(p.color ?? '#b8322a'), SOOT, k)}};
  if (it.type === 'tree') return {...it, props: {...p, height: Number(p.height ?? 5.4) * (1 - 0.55 * k), foliage: lerpHex(String(p.foliage ?? '#608451'), '#6b5a3a', k)}};
  if (FRAGILE.has(it.type) && hash01(it.id) < k * 1.4) return null;
  return it;
};

// Ground.tsx defaults, whitened: snow lies on slabs, roofs and crowns (roads stay cleared).
const SNOW = '#e6ecef';
const SNOW_ON: Record<string, [string, string, number]> = {
  sidewalk: ['color', '#c9c0ae', 0.75], grass: ['color', '#6f9a52', 0.85], plaza: ['color', '#d6c9ad', 0.75],
  haussmann: ['roof', '#6c7a80', 0.85], tree: ['foliage', '#608451', 0.55],
};
const snowy = (it: LayoutItem): LayoutItem => {
  const rule = SNOW_ON[it.type];
  if (!rule) return it;
  const [key, fallback, k] = rule;
  return {...it, props: {...it.props, [key]: lerpHex(String(it.props[key] ?? fallback), SNOW, k)}};
};

/**
 * The world as this episode sees it: a new layout built from the frozen one, which stays untouched.
 * Unknown ids in `changes`, or `add` ids already in the world, are errors.
 */
export const applyVariants = (world: CityLayout, variants: Variants = {}): CityLayout => {
  const ids = new Set(world.items.map((i) => i.id));
  const changes = new Map<string, ItemChange>();
  for (const c of variants.changes ?? []) {
    if (!ids.has(c.id)) throw new Error(`Variante d’épisode : objet « ${c.id} » absent de la ville « ${world.name} ».`);
    changes.set(c.id, c);
  }
  for (const a of variants.add ?? []) if (ids.has(a.id)) throw new Error(`Variante d’épisode : l’id « ${a.id} » existe déjà dans la ville.`);
  const damage = variants.damage ?? [];
  const items: LayoutItem[] = [];
  for (const src of world.items) {
    const c = changes.get(src.id);
    if (c?.remove) continue;
    let it: LayoutItem | null = c ? {...src, ...c.move, props: {...src.props, ...c.props}} : src;
    for (const d of damage) {
      if (!it) break;
      const dist = Math.hypot(it.x - d.center[0], it.z - d.center[1]);
      it = damaged(it, Math.max(0, Math.min(1, d.level)) * Math.max(0, 1 - dist / d.radius));
    }
    if (it && variants.weather === 'neige') it = snowy(it);
    if (it) items.push(it);
  }
  for (const a of variants.add ?? []) items.push({...a, props: {...a.props}});
  return {...world, sky: variants.lighting === 'nuit' ? 'nuit' : 'jour', camera: undefined, items};
};

export type SkyPalette = typeof SKY.jour;
export type Environment = {night: boolean; lit: number; palette: SkyPalette; fogNear: number; fogFar: number; rain: number; snow: number};

const LIGHTING: Record<Lighting, {palette: SkyPalette; lit: number}> = {
  jour: {palette: SKY.jour, lit: 0},
  crepuscule: {palette: {top: '#3b4a7a', bottom: '#f0a46a', sun: '#ffb070', sunI: 0.95, hemi: 0.8, amb: 0.2, ground: '#7a7268'}, lit: 0.6},
  nuit: {palette: SKY.nuit, lit: 1},
};

/** Sky, lights and fog of an episode variant (the world's geometry is not involved). */
export const environmentFor = (variants: Variants = {}): Environment => {
  const base = LIGHTING[variants.lighting ?? 'jour'];
  const p = {...base.palette};
  let fogNear = 225;
  let fogFar = 900;
  let rain = 0;
  let snow = 0;
  switch (variants.weather ?? 'clair') {
    case 'brouillard':
      p.top = lerpHex(p.top, '#aab4bd', 0.7); p.bottom = lerpHex(p.bottom, '#c9cdd0', 0.8); p.sunI *= 0.6;
      fogNear = 15; fogFar = 240;
      break;
    case 'pluie':
      p.top = lerpHex(p.top, '#5d6873', 0.75); p.bottom = lerpHex(p.bottom, '#a9b0b5', 0.75); p.sunI *= 0.45; p.hemi *= 0.85;
      p.ground = lerpHex(p.ground, '#5f5a52', 0.6);
      fogNear = 60; fogFar = 420; rain = 1;
      break;
    case 'neige':
      p.top = lerpHex(p.top, '#a9bccb', 0.7); p.bottom = lerpHex(p.bottom, '#e9eef2', 0.8); p.ground = '#e8edf0';
      fogNear = 50; fogFar = 380; snow = 1;
      break;
    default:
  }
  return {night: (variants.lighting ?? 'jour') === 'nuit', lit: base.lit, palette: p, fogNear, fogFar, rain, snow};
};

// ——— Level of detail ———

/** Always drawn in full: ground (continuity of streets) and landmarks (the city's bearings in the background). */
const ALWAYS = new Set(['road', 'intersection', 'sidewalk', 'grass', 'plaza', 'water', 'crosswalk', 'road-segment', 'bridge', 'eiffel', 'tower', 'barge', 'tour-boat']);
/** Far away, these become simple instanced shapes; every other far object is dropped. */
export const FAR_BLOCKS = new Set(['haussmann', 'shop', 'modern-block', 'house', 'building-a', 'building-b']);
export const FAR_TREES = new Set(['tree', 'pine', 'oak']);
/** Parked rows must not stop short at the edge of the detail: far cars stay, as two boxes. */
export const FAR_CARS = new Set(['car']);

/**
 * Full detail for the place and its visible neighbourhood (within `radius` of `center`, measured to the
 * nearest edge of a building), simplified shapes beyond. `keep`: ids always in full (the place itself).
 */
export const splitDetail = (items: readonly LayoutItem[], center: [number, number], radius: number, keep: ReadonlySet<string> = new Set()) => {
  const near: LayoutItem[] = [];
  const far: LayoutItem[] = [];
  for (const it of items) {
    if (ALWAYS.has(it.type) || keep.has(it.id)) {
      near.push(it);
      continue;
    }
    const reach = FAR_BLOCKS.has(it.type) ? Math.max(Number(it.props.width ?? 10), Number(it.props.depth ?? 10)) / 2 : 0;
    const d = Math.hypot(it.x - center[0], it.z - center[1]) - reach;
    if (d <= radius) near.push(it);
    else if (FAR_BLOCKS.has(it.type) || FAR_TREES.has(it.type) || FAR_CARS.has(it.type)) far.push(it);
  }
  return {near, far};
};

export type EpisodeSetSpec = {place: string; variants?: Variants; /** overrides the place's detail radius; Infinity = everything in full */ detailRadius?: number};
export type EpisodeSet = {place: Place; layout: CityLayout; near: LayoutItem[]; far: LayoutItem[]; environment: Environment};

/** Everything a scene needs to film a place of the reference city with this episode's variants. */
export const resolveEpisodeSet = (spec: EpisodeSetSpec, world: CityLayout = REFERENCE_WORLD): EpisodeSet => {
  const place = getPlace(spec.place);
  const layout = applyVariants(world, spec.variants);
  const {near, far} = splitDetail(layout.items, place.detailCenter ?? [place.pos[0], place.pos[2]], spec.detailRadius ?? place.detailRadius, new Set(place.items));
  return {place, layout, near, far, environment: environmentFor(spec.variants)};
};
