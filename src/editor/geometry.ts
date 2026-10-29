import type {LayoutItem} from '../assets/city/registry';

export const GROUND_TYPES = new Set(['road', 'intersection', 'sidewalk', 'grass', 'plaza', 'water', 'crosswalk', 'road-segment', 'bridge']);
const SLAB_TOP: Record<string, number> = {sidewalk: 0.15, grass: 0.2, plaza: 0.18};

/** Height of the walkable surface at (x, z): on a sidewalk slab, lawn or plaza, objects sit on top. */
export const surfaceY = (items: LayoutItem[], x: number, z: number, ignore?: string) => {
  let y = 0;
  for (const it of items) {
    const top = SLAB_TOP[it.type];
    if (top === undefined || it.id === ignore) continue;
    const w = Number(it.props.width ?? 20);
    const d = Number(it.props.depth ?? 20);
    const dx = x - it.x;
    const dz = z - it.z;
    const c = Math.cos(-it.ry);
    const s = Math.sin(-it.ry);
    const lx = dx * c + dz * s;
    const lz = -dx * s + dz * c;
    if (Math.abs(lx) <= w / 2 && Math.abs(lz) <= d / 2) y = Math.max(y, top);
  }
  return y;
};

/** Axis-aligned footprint of a box-shaped item (width along its local x, depth along local z). */
export const footprint = (it: LayoutItem, width: number, depth: number) => {
  const c = Math.abs(Math.cos(it.ry));
  const s = Math.abs(Math.sin(it.ry));
  const hw = (width * c + depth * s) / 2;
  const hd = (width * s + depth * c) / 2;
  return {x0: it.x - hw, x1: it.x + hw, z0: it.z - hd, z1: it.z + hd};
};
