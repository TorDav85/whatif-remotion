import {generateCity, type GenOptions} from '../generator';
import type {CityLayout} from '../registry';
import frozen from '../../../../public/city-layouts/ville-reference.json';

/**
 * The series' reference city: generated once from a fixed seed and complete options, then frozen
 * in public/city-layouts/ville-reference.json. Every episode reads that file; nothing regenerates it
 * during a render. `npm run city:freeze -- --check` proves the file still matches the generator.
 */
export const REFERENCE_NAME = 'ville-reference';

/** Complete options (not a partial over DEFAULT_GEN): a change of the defaults never moves the city. */
export const REFERENCE_OPTIONS: GenOptions = {
  seed: 286, cols: 5, rows: 3, blockW: 40, blockD: 34, street: 10, walk: 3, parks: 0.15,
  floorsMin: 4, floorsMax: 7, trees: true, furniture: true, cars: 0.7, people: 6, eiffel: true,
  seine: true, bridges: 2, boats: true, shops: 0.35, modern: 0.1, towers: 3,
};

/** What the frozen file must contain: used by the freeze script and the reproducibility test. */
export const generateReferenceWorld = (): CityLayout => generateCity(REFERENCE_OPTIONS, REFERENCE_NAME);

/** Recursively frozen: any attempt to modify the source world during a render throws (strict mode). */
export const deepFreeze = <T,>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
};

/** The frozen world, bundled with the code (no fetch, no delayRender) and read-only. */
export const REFERENCE_WORLD: CityLayout = deepFreeze(frozen as CityLayout);

/** Item lookup in the frozen world; an unknown id is a broken reference, never a silent skip. */
const BY_ID = new Map(REFERENCE_WORLD.items.map((it) => [it.id, it]));
export const worldItem = (id: string) => {
  const it = BY_ID.get(id);
  if (!it) throw new Error(`Objet « ${id} » absent de la ville de référence (${REFERENCE_NAME}.json).`);
  return it;
};
