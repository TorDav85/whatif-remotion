import type {Shot, View} from '../camera';
import type {PlaceId, V3} from './places';

/**
 * Reference framings (9:16) of each place, kept apart from the places themselves.
 * Plain `Shot`s of camera.ts: sampleShots, viewAt, the editor and the stills script all read them.
 * `inside` marks a camera inside the host building of an interior (the flat): the scene then draws
 * the interior and hides that building's shell. Ids are "<place>/<plan>" and never change.
 */
export type ReferenceShot = Shot & {place: PlaceId; inside?: boolean};

const v = (pos: V3, target: V3, fov: number): View => ({pos, target, fov});
const shot = (place: PlaceId, key: string, name: string, duration: number, from: View, to: View, extra: Partial<ReferenceShot> = {}): ReferenceShot => ({
  id: `${place}/${key}`, name, place, duration, from, to, path: 'ligne', ease: 'doux', transition: 'coupe', shake: 0, ...extra,
});

export const REFERENCE_SHOTS: Readonly<Record<PlaceId, readonly ReferenceShot[]>> = Object.freeze({
  'appartement-marc': [
    shot('appartement-marc', 'salon', 'Salon, vers les fenêtres', 3,
      v([9.364, 15.4, 38.95], [11.7, 14.75, 33.25], 58), v([9.464, 15.35, 38.5], [11.7, 14.75, 33.25], 58), {inside: true}),
    shot('appartement-marc', 'fenetre', 'Par la fenêtre, la place', 3,
      v([12.9, 15.3, 34.6], [2, 6, -8], 55), v([12.6, 15.3, 34.05], [2, 6, -8], 55), {inside: true}),
    shot('appartement-marc', 'facade', 'Les fenêtres de Marc, depuis la place', 3,
      v([5, 9.5, 5], [12.364, 15, 33], 50), v([5.6, 9.5, 7], [12.364, 15, 33], 50)),
    shot('appartement-marc', 'approche', 'Approche de la fenêtre (raccord intérieur)', 3,
      v([12.364, 16, 6], [12.364, 15.2, 33], 50), v([12.364, 15.6, 18], [12.364, 15.2, 33], 50)),
  ],
  'rue-marc': [
    shot('rue-marc', 'ensemble', 'Rue de Marc, vue d’ensemble', 3.5,
      v([-14, 24, -4], [8, 6, 30], 50), v([-12, 22, -1], [8, 6, 30], 50)),
    shot('rue-marc', 'travelling', 'Travelling dans la rue', 4,
      v([-22, 1.8, 25.6], [10, 3, 25.6], 58), v([-4, 1.8, 25.6], [28, 3, 25.6], 58), {ease: 'lineaire'}),
    shot('rue-marc', 'porte', 'Regard piéton vers la porte de Marc', 3,
      v([22, 1.65, 30.3], [12.364, 2.3, 33], 52), v([19.5, 1.65, 30.5], [12.364, 2.3, 33], 52)),
    shot('rue-marc', 'contre-plongee', 'Contre-plongée vers la fenêtre de Marc', 3,
      v([14, 0.6, 25.5], [12.364, 14.5, 33], 62), v([14, 0.55, 26], [12.364, 15, 33], 64)),
  ],
  'place-centrale': [
    shot('place-centrale', 'ensemble', 'Place centrale, vue d’ensemble 3/4', 3.5,
      v([42, 42, 48], [0, 0, 0], 48), v([36, 37, 41], [0, 0, 0], 48)),
    shot('place-centrale', 'orbite', 'Orbite autour de la fontaine', 5,
      v([25, 18, 16.5], [0, 1, 0], 52), v([-25, 18, 16.5], [0, 1, 0], 52), {path: 'orbite'}),
    shot('place-centrale', 'plongee', 'Plongée zénithale', 3,
      v([0, 75, 9], [0, 0, 0], 50), v([0, 60, 7], [0, 0, 0], 50)),
    shot('place-centrale', 'vers-marc', 'Depuis la fontaine, vers l’immeuble de Marc', 3,
      v([1.5, 1.65, -9], [12.364, 9, 33], 55), v([2, 1.65, -6.5], [12.364, 9, 33], 55)),
  ],
});
