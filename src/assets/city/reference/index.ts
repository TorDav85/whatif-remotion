/** Reference city of the series: frozen world, named places, reference framings, episode API. */
export {REFERENCE_NAME, REFERENCE_OPTIONS, REFERENCE_WORLD, generateReferenceWorld, worldItem, deepFreeze} from './world';
export {PLACES, PLACE_IDS} from './places';
export type {Place, PlaceId, Spot, Interaction, Interior, Zone, V3} from './places';
export {REFERENCE_SHOTS} from './shots';
export type {ReferenceShot} from './shots';
export {getPlace, spot, interaction, placeShots, applyVariants, environmentFor, splitDetail, resolveEpisodeSet} from './episode';
export type {Variants, Lighting, Weather, Damage, ItemChange, EpisodeSet, EpisodeSetSpec, Environment} from './episode';
export {ReferenceScene, WeatherOverlay, useEpisodeSet} from './ReferenceScene';
export {ApartmentInterior} from './ApartmentInterior';
export {FarBlocks} from './FarBlocks';
