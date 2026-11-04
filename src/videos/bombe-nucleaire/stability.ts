import {rng} from '../../core/animation';

export const CITY_CROSSINGS = [-286, -232, -178, -124, -70, -16, 38, 92, 146] as const;
export type RoadFootprint = {minX: number; maxX: number; minZ: number; maxZ: number};

/** The same street network, partitioned into touching surfaces rather than stacked slabs. */
export const cityRoadFootprints = (): RoadFootprint[] => {
  const halfCrossing = 6;
  const roads: RoadFootprint[] = CITY_CROSSINGS.map((z) => ({
    minX: -625, maxX: 625, minZ: z - halfCrossing, maxZ: z + halfCrossing,
  }));
  const lanes = [
    {x: 0, width: 13.8, minZ: -710, maxZ: 390},
    ...[-57, 57, -100, 100, -143, 143, -186, 186, -229, 229, -298, 298]
      .map((x) => ({x, width: 9, minZ: -630, maxZ: 370})),
  ];
  for (const lane of lanes) {
    let from = lane.minZ;
    for (const z of CITY_CROSSINGS) {
      const to = Math.min(lane.maxZ, z - halfCrossing);
      if (to > from) roads.push({minX: lane.x - lane.width / 2, maxX: lane.x + lane.width / 2, minZ: from, maxZ: to});
      from = Math.max(from, z + halfCrossing);
    }
    if (from < lane.maxZ) roads.push({minX: lane.x - lane.width / 2, maxX: lane.x + lane.width / 2, minZ: from, maxZ: lane.maxZ});
  }
  return roads;
};

/** Every window has its own random stream, independent of which other windows have broken. */
export const windowDamageAt = (damage: number, building: number, face: number, floor: number, column: number) => {
  const random = rng(11489 + building * 104729 + face * 7919 + floor * 211 + column * 17);
  const threshold = random();
  const scarHeight = 0.9 + random() * 0.8;
  return {broken: damage > 0.19 && threshold < damage * 0.94, scarHeight};
};

/** Debris already on the ground stays put when more pieces appear. */
export const debrisVariation = (building: number, piece: number) => {
  const random = rng(48157 + building * 104729 + piece * 313);
  return Array.from({length: 8}, () => random());
};
