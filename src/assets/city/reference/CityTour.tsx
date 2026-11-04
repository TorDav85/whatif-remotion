import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CameraRig} from '../../../shared/three/common';
import {SERIF} from '../../../shared/ui/tokens';
import {smooth} from '../../../core/animation';
import {sampleShots, shotsDuration, shotStarts} from '../camera';
import {resolveEpisodeSet, type EpisodeSet} from './episode';
import {PlaceMap} from './PlaceMap';
import {PLACE_IDS, PLACES, type PlaceId} from './places';
import {ReferenceScene} from './ReferenceScene';
import {REFERENCE_SHOTS} from './shots';

/** Visit of the reference city: the map of places and ids, then every reference framing, place by place. */
export const TOUR_MAP_SECONDS = 5;
export const TOUR_SHOTS = PLACE_IDS.flatMap((id) => REFERENCE_SHOTS[id]);
export const tourFrames = (fps: number) => Math.round((TOUR_MAP_SECONDS + shotsDuration(TOUR_SHOTS)) * fps);
/** Middle frame of the map and of each framing: the contact sheet of `npm run stills`. */
export const tourStillFrames = (fps: number) => [
  Math.round(TOUR_MAP_SECONDS * 0.7 * fps),
  ...shotStarts(TOUR_SHOTS).map((s, i) => Math.round((TOUR_MAP_SECONDS + s + TOUR_SHOTS[i].duration / 2) * fps)),
];

/** `lod: false` draws everything in full (benchmark baseline); `detailRadius` forces a radius, to inspect the far blocks. */
export const CityTour: React.FC<{lod?: boolean; detailRadius?: number}> = ({lod = true, detailRadius}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const sets = useMemo(() => Object.fromEntries(PLACE_IDS.map((id) => [id, resolveEpisodeSet({place: id, detailRadius: lod ? detailRadius : Infinity})])) as Record<PlaceId, EpisodeSet>, [lod, detailRadius]);
  if (t < TOUR_MAP_SECONDS) return <AbsoluteFill><PlaceMap width={width} height={height} reveal={smooth(0.4, 1.4, t)} /></AbsoluteFill>;

  const view = sampleShots(TOUR_SHOTS, t - TOUR_MAP_SECONDS);
  const shot = TOUR_SHOTS[view.index];
  const set = sets[shot.place];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
        <CameraRig position={view.pos} target={view.target} fov={view.fov} />
        <ReferenceScene set={set} inside={shot.inside} />
      </ThreeCanvas>
      <div style={{position: 'absolute', top: 120, left: 60, right: 60, fontFamily: SERIF, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.75)'}}>
        <div style={{fontFamily: 'monospace', fontSize: 44, color: '#F6E05E'}}>{shot.id}</div>
        <div style={{fontSize: 34, marginTop: 10}}>{PLACES[shot.place].label} · {shot.name}</div>
        <div style={{fontSize: 26, marginTop: 8, opacity: 0.8}}>
          {view.index + 1}/{TOUR_SHOTS.length} · {lod ? `détail ${set.near.length} objets, ${set.far.length} simplifiés` : `tout en détail (${set.near.length} objets)`}
        </div>
      </div>
    </AbsoluteFill>
  );
};
