import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Marc} from '../../../shared/characters/Marc';
import {Actor, type Look} from '../../../shared/characters/Actor';
import {CameraRig} from '../../../shared/three/common';
import {SERIF} from '../../../shared/ui/tokens';
import {sampleShots, shotsDuration, type Shot} from '../camera';
import {placeShots, spot, type Variants} from './episode';
import type {PlaceId, V3} from './places';
import {ReferenceScene, useEpisodeSet, WeatherOverlay} from './ReferenceScene';
import type {ReferenceShot} from './shots';

/**
 * What an episode looks like with the reference city: it names places, picks reference framings and adds
 * its own, places Marc and Julien on the places' spots, and keeps its variants (night, rain, damage, a
 * changed fountain, an added barrier) to itself. No decor is copied here.
 */
const JULIEN: Look = {shirt: '#16181d', pants: '#16181d', skin: '#d9a27c', hair: '#1e1712'};

type Cast = {marc?: {pos: V3; ry: number; walk?: number}; julien?: {pos: V3; ry: number; walk?: number; armR?: [number, number]}};
/** `cast` gets the segment time (not the shot time): characters keep moving across cuts. */
type Segment = {place: PlaceId; variants?: Variants; shots: ReferenceShot[]; cast: (shot: string, t: number) => Cast};

const v = (pos: V3, target: V3, fov: number) => ({pos, target, fov});
const own = (id: string, name: string, from: ReturnType<typeof v>, to: ReturnType<typeof v>): Shot =>
  ({id, name, duration: 3, from, to, path: 'ligne', ease: 'doux', transition: 'coupe', shake: 0});

const at = (place: PlaceId, id: string) => {
  const s = spot(place, id);
  return {pos: s.pos, ry: s.ry};
};

const SEGMENTS: Segment[] = [
  {
    place: 'appartement-marc',
    shots: placeShots('appartement-marc', {only: ['salon', 'fenetre']}),
    // At the window Marc *is* the camera: he only appears in the wide shot of the room.
    cast: (shot) => ({marc: shot.endsWith('/salon') ? at('appartement-marc', 'fenetre') : undefined,
      julien: {...at('place-centrale', 'fontaine-sud'), ry: Math.PI, armR: [2.6, 0.3]}}),
  },
  {
    place: 'rue-marc',
    shots: placeShots('rue-marc', {only: ['porte'], extra: [
      own('demo/deux-plan', 'Marc et Julien devant la porte (plan propre à l’épisode)',
        v([15.95, 2.4, 24.5], [14.9, 1.2, 31.6], 50), v([15.95, 2.35, 25], [14.9, 1.2, 31.6], 48)),
    ]}),
    cast: (_shot, t) => ({
      // Just out of his door, east of the street tree; Julien comes along the pavement from the corner.
      marc: {pos: [14, 0.15, 31.7], ry: -Math.PI / 2, walk: 0},
      julien: {pos: [19.5 - Math.min(3.9, t * 1.1), 0.15, 31.5], ry: Math.PI / 2, walk: t < 3.55 ? 1 : 0},
    }),
  },
  {
    place: 'place-centrale',
    variants: {
      lighting: 'nuit', weather: 'pluie',
      damage: [{center: [-18, -24], radius: 40, level: 1}],
      changes: [{id: 'fountain-832', props: {flow: 0}}],
      add: [{id: 'demo-barriere', type: 'barrier', x: -6, y: 0.18, z: -6, ry: 0.6, props: {}}],
    },
    shots: placeShots('place-centrale', {only: ['ensemble', 'vers-marc']}),
    // On the fountain's edge, in the axis of the 'vers-marc' framing, facing each other.
    cast: () => ({marc: {pos: [2.9, 0.18, -0.9], ry: -Math.PI / 2}, julien: {pos: [4.3, 0.18, -0.5], ry: Math.PI / 2}}),
  },
];
const LENGTHS = SEGMENTS.map((s) => shotsDuration(s.shots));
export const REFERENCE_DEMO_FRAMES = Math.round(LENGTHS.reduce((a, b) => a + b, 0) * 30);

const SegmentView: React.FC<{segment: Segment; t: number}> = ({segment, t}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const set = useEpisodeSet({place: segment.place, variants: segment.variants});
  const view = sampleShots(segment.shots, t);
  const shot = segment.shots[view.index];
  const cast = segment.cast(shot.id, t);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
        <CameraRig position={view.pos} target={view.target} fov={view.fov} />
        <ReferenceScene set={set} inside={shot.inside}>
          {cast.marc && <group position={cast.marc.pos} rotation={[0, cast.marc.ry, 0]}><Marc t={t} walk={cast.marc.walk ?? 0} /></group>}
          {cast.julien && <group position={cast.julien.pos} rotation={[0, cast.julien.ry, 0]}>
            <Actor look={JULIEN} walk={cast.julien.walk ?? 0} phase={t * 6.5} armR={cast.julien.armR} />
          </group>}
        </ReferenceScene>
      </ThreeCanvas>
      <WeatherOverlay set={set} frame={frame} width={width} height={height} />
      <div style={{position: 'absolute', top: 120, left: 60, right: 60, fontFamily: SERIF, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.8)'}}>
        <div style={{fontFamily: 'monospace', fontSize: 40, color: '#F6E05E'}}>lieu : {segment.place}</div>
        <div style={{fontSize: 30, marginTop: 8}}>{shot.id} · {shot.name}</div>
        {segment.variants && <div style={{fontSize: 26, marginTop: 8, opacity: 0.85}}>
          variantes : {[segment.variants.lighting, segment.variants.weather, segment.variants.damage && 'dégâts', segment.variants.changes && 'fontaine coupée', segment.variants.add && 'barrière'].filter(Boolean).join(' · ')}
        </div>}
      </div>
    </AbsoluteFill>
  );
};

export const ReferenceDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  let t = frame / fps;
  let i = 0;
  while (i < SEGMENTS.length - 1 && t >= LENGTHS[i]) t -= LENGTHS[i++];
  return <SegmentView key={i} segment={SEGMENTS[i]} t={t} />;
};
