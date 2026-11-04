import {shotsDuration, shotStarts} from '../camera';
import {PLACE_IDS} from './places';
import {REFERENCE_SHOTS} from './shots';

/** Visit of the reference city (CityTour): timing only, without React, for the scripts and the shot cache. */
export const TOUR_MAP_SECONDS = 5;
export const TOUR_SHOTS = PLACE_IDS.flatMap((id) => REFERENCE_SHOTS[id]);
export const tourFrames = (fps: number) => Math.round((TOUR_MAP_SECONDS + shotsDuration(TOUR_SHOTS)) * fps);
/** Middle frame of the map and of each framing: the contact sheet of `npm run stills`. */
export const tourStillFrames = (fps: number) => [
  Math.round(TOUR_MAP_SECONDS * 0.7 * fps),
  ...shotStarts(TOUR_SHOTS).map((s, i) => Math.round((TOUR_MAP_SECONDS + s + TOUR_SHOTS[i].duration / 2) * fps)),
];
