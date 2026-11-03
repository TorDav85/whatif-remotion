import {layoutBounds} from '../assets/city/LayoutScene';
import {shotStarts} from '../assets/city/camera';
import {resolveEpisodeSet} from '../assets/city/reference/episode';
import {TOUR_MAP_SECONDS, TOUR_SHOTS, tourFrames} from '../assets/city/reference/tour';
import {CUTS, DURATION as BOMBE_DURATION} from '../videos/bombe-nucleaire-ville/Scene3D';
import type {Plan3D, Plans3DManifest} from './plans3d';

/**
 * Compositions whose 3D shots are cached by scripts/project/plans3d.mjs (docs/acceleration-rendu.md).
 * Read in Node: only plain data and pure functions here. A composition joins by drawing its 3D with
 * <Layer3D> and declaring its shots below; anything else keeps the ordinary render.
 */

/** Shots cut at given times (seconds), with the absolute times in the inputs (the scene reads `t`). */
const cutAt = (times: number[], duration: number, fps: number, name: (i: number) => string): Plan3D[] => {
  const bounds = [0, ...times, duration].map((s) => Math.round(s * fps));
  return bounds.slice(0, -1).map((from, i) => ({id: name(i), from, durationInFrames: bounds[i + 1] - from, inputs: {from, to: bounds[i + 1]}}));
};

/**
 * Reference city visit: each framing depends on its own camera data, its place's resolved set (items
 * near and far, light, sky) and its sub-frame phase, not on when it starts in the visit. Moving an object
 * of the frozen world re-renders the framings of the places that draw it; reordering reuses everything.
 */
const tour = (composition: string, lod: boolean): Plans3DManifest => ({
  composition,
  scene: ['src/assets/city/reference/ReferenceScene.tsx', 'src/shared/three/common.tsx', 'src/assets/city/camera.ts', 'src/core/plans3d.tsx'],
  perPlan: ['public/city-layouts/ville-reference.json', 'src/assets/city/reference/shots.ts'],
  plans: (fps) => {
    const starts = shotStarts(TOUR_SHOTS).map((s) => (TOUR_MAP_SECONDS + s) * fps);
    const end = tourFrames(fps);
    const sets = new Map<string, unknown>();
    const setOf = (place: string) => {
      if (!sets.has(place)) {
        const s = resolveEpisodeSet({place, detailRadius: lod ? undefined : Infinity});
        sets.set(place, {place: s.place, near: s.near, far: s.far, environment: s.environment, bounds: layoutBounds(s.layout)});
      }
      return sets.get(place);
    };
    return TOUR_SHOTS.map((shot, i) => {
      const from = Math.round(starts[i]);
      const to = i + 1 < starts.length ? Math.round(starts[i + 1]) : end;
      return {id: shot.id, from, durationInFrames: to - from,
        inputs: {shot, next: TOUR_SHOTS[i + 1]?.transition ?? null, phase: starts[i] - from, fps, set: setOf(shot.place)}};
    });
  },
});

export const PLANS3D_MANIFESTS: Plans3DManifest[] = [
  tour('VilleReferenceVisite', true),
  tour('VilleReferenceVisiteSansLOD', false),
  {
    composition: 'BombeNucleaireVille',
    scene: ['src/videos/bombe-nucleaire-ville/Scene3D.tsx', 'src/core/plans3d.tsx'],
    plans: (fps) => cutAt(CUTS, BOMBE_DURATION, fps, (i) => `plan-${String(i + 1).padStart(2, '0')}`),
  },
];
