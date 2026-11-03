import type {CityLayout, LayoutItem} from '../registry';
import type {V3, Zone} from './places';

/** Pure checks on the reference city (no WebGL): used by the tests and usable from scripts. */

export const inZone = (z: Zone, p: V3, margin = 0) =>
  p[0] >= z.x0 - margin && p[0] <= z.x1 + margin && p[2] >= z.z0 - margin && p[2] <= z.z1 + margin && p[1] >= z.y0 - margin && p[1] <= z.y1 + margin;

/** Same storey heights as Building.tsx, Shops.tsx and ModernBlock; the mansard roof adds 4.2 m. */
const HEIGHT: Record<string, (p: Record<string, unknown>) => number> = {
  haussmann: (p) => 4.2 + Number(p.floors ?? 5) * 3.1 + 4.2,
  shop: (p) => 4.2 + Number(p.floors ?? 2) * 3.1,
  'modern-block': (p) => 3.5 + Number(p.floors ?? 8) * 2.9,
  tower: (p) => Number(p.height ?? 90),
};
export type BuildingBox = {id: string; type: string; x0: number; x1: number; z0: number; z1: number; y0: number; y1: number};

/** World-aligned volume of every building of the city (rotations are multiples of 90° in the generator). */
export const buildingBoxes = (world: CityLayout): BuildingBox[] => world.items.filter((it) => HEIGHT[it.type]).map((it: LayoutItem) => {
  const w = Number(it.props.width ?? 14);
  const d = Number(it.props.depth ?? 12);
  const c = Math.abs(Math.cos(it.ry));
  const s = Math.abs(Math.sin(it.ry));
  const hw = (w * c + d * s) / 2;
  const hd = (w * s + d * c) / 2;
  return {id: it.id, type: it.type, x0: it.x - hw, x1: it.x + hw, z0: it.z - hd, z1: it.z + hd, y0: it.y, y1: it.y + HEIGHT[it.type](it.props)};
});

/** The building whose volume contains the point, if any. */
export const buildingAt = (boxes: BuildingBox[], p: V3) =>
  boxes.find((b) => p[0] > b.x0 && p[0] < b.x1 && p[2] > b.z0 && p[2] < b.z1 && p[1] > b.y0 && p[1] < b.y1);
