import {rng} from '../../core/animation';

export type FabricBuilding = {x: number; z: number; width: number; depth: number; height: number; yaw: number; tone: number; edge: number};
export type Exclusion = {minX: number; maxX: number; minZ: number; maxZ: number};
export type FabricOptions = {
  seed?: number; radius?: number; parcels?: number; cx?: number; cz?: number;
  exclude?: Exclusion; river?: boolean;
};
export const riverZ = (x: number) => -790 + 120 * Math.sin(x / 700);

/** Voronoi parcels share their boundaries: irregular streets without isolated repeating islands. */
export const planUrbanFabric = ({seed = 42, radius = 2400, parcels = 420, cx = 0, cz = -400, exclude, river = true}: FabricOptions = {}): FabricBuilding[] => {
  const random = rng(seed + 613);
  const out: FabricBuilding[] = [];
  const count = Math.ceil(Math.sqrt(parcels * 4 / Math.PI));
  const spacing = radius * 2 / count;
  const sites = new Map<string, {x: number; z: number}>();
  for (let ix = -2; ix <= count + 2; ix++) for (let iz = -2; iz <= count + 2; iz++) {
    const x = (ix - count / 2 + (random() - 0.5) * 0.82) * spacing;
    const z = (iz - count / 2 + (random() - 0.5) * 0.82) * spacing;
    sites.set(`${ix}:${iz}`, {x: cx + x * 0.952 - z * 0.306, z: cz + x * 0.306 + z * 0.952});
  }
  for (let ix = 0; ix <= count; ix++) for (let iz = 0; iz <= count; iz++) {
    const {x, z} = sites.get(`${ix}:${iz}`)!;
    if (Math.hypot(x - cx, z - cz) > radius - spacing * 0.3) continue;
    let cell = [{x: x - spacing * 3, z: z - spacing * 3}, {x: x + spacing * 3, z: z - spacing * 3},
      {x: x + spacing * 3, z: z + spacing * 3}, {x: x - spacing * 3, z: z + spacing * 3}];
    // Intersect the half-planes defined by nearby sites.
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      if (dx === 0 && dz === 0) continue;
      const other = sites.get(`${ix + dx}:${iz + dz}`);
      if (!other) continue;
      const nx = other.x - x, nz = other.z - z;
      const limit = (other.x * other.x + other.z * other.z - x * x - z * z) / 2;
      const next: typeof cell = [];
      for (let i = 0; i < cell.length; i++) {
        const a = cell[i], b = cell[(i + 1) % cell.length];
        const da = a.x * nx + a.z * nz - limit, db = b.x * nx + b.z * nz - limit;
        if (da <= 0) next.push(a);
        if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
          const t = da / (da - db);
          next.push({x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t});
        }
      }
      cell = next;
    }
    if (random() < 0.025) continue;
    const corners = cell.map((p) => ({x: x + (p.x - x) * 0.9, z: z + (p.z - z) * 0.9}));
    const sides = corners.length;
    for (let side = 0; side < sides; side++) {
      const a = corners[side], b = corners[(side + 1) % sides];
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      const n = Math.max(1, Math.floor(length / (11 + random() * 7)));
      const weights = Array.from({length: n}, () => 0.7 + random() * 0.6);
      const sum = weights.reduce((s, w) => s + w, 0);
      let cursor = 0;
      for (const weight of weights) {
        const width = length * weight / sum;
        const t = (cursor + width / 2) / length;
        cursor += width;
        const bx = a.x + dx * t, bz = a.z + dz * t;
        const depth = Math.min(28, spacing * 0.3) * (0.8 + random() * 0.2);
        const margin = Math.hypot(width, depth) / 2 + 2;
        if (exclude && bx + margin > exclude.minX && bx - margin < exclude.maxX && bz + margin > exclude.minZ && bz - margin < exclude.maxZ) continue;
        if (river && Math.abs(bz - riverZ(bx)) < 60 + margin) continue;
        if (Math.abs(bx) < 145 && bz > -1100 && bz < -540) continue; // Champ de Mars
        const edge = Math.max(0, Math.min(1, (Math.hypot(bx - cx, bz - cz) / radius - 0.72) / 0.28));
        out.push({x: bx, z: bz, width: width * 0.96, depth, height: (15 + random() * 15) * (1 - edge * 0.95),
          yaw: -Math.atan2(dz, dx), tone: Math.floor(random() * 5), edge});
      }
    }
  }
  return out;
};
