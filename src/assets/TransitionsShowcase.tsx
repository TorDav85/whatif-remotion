import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CameraRig} from '../shared/three/common';
import {SERIF} from '../shared/ui/tokens';
import {CutFx} from '../shared/ui/CutFx';
import type {Cut} from '../shared/ui/transitions';
import {sampleShots, shotStarts} from './city/camera';
import {placeShots, ReferenceScene, useEpisodeSet} from './city/reference';

/**
 * Library sheet of the cut transitions (src/shared/ui/transitions.ts) on six framings of the reference
 * city, with the sound effects rendered from the same cut list (npm run sfx).
 * Regenerate the sound: node scripts/audio/sfx/render.mjs public/sfx-demo/transitions.cues.json public/sfx-demo/transitions.wav
 */
const SHOTS = [
  ...placeShots('place-centrale', {only: ['ensemble']}),
  ...placeShots('rue-marc', {only: ['travelling']}),
  ...placeShots('appartement-marc', {only: ['fenetre']}),
  ...placeShots('place-centrale', {only: ['orbite']}),
  ...placeShots('rue-marc', {only: ['ensemble']}),
  ...placeShots('place-centrale', {only: ['vers-marc']}),
].map((s) => ({...s, duration: 2}));
const KINDS: Cut['kind'][] = ['whip', 'zoom', 'flash', 'dip', 'cut'];
export const TRANSITION_CUTS: Cut[] = shotStarts(SHOTS).slice(1).map((at, i) => ({at, kind: KINDS[i]}));
export const TRANSITIONS_FRAMES = SHOTS.length * 2 * 30;

export const TransitionsShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const view = sampleShots(SHOTS, t);
  const shot = SHOTS[view.index];
  const set = useEpisodeSet({place: shot.place});
  const next = TRANSITION_CUTS[view.index];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <CutFx cuts={TRANSITION_CUTS} t={t} width={width} height={height}>
        <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
          <CameraRig position={view.pos} target={view.target} fov={view.fov} />
          <ReferenceScene set={set} inside={shot.inside} />
        </ThreeCanvas>
      </CutFx>
      <div style={{position: 'absolute', top: 120, left: 60, right: 60, fontFamily: SERIF, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.8)'}}>
        <div style={{fontFamily: 'monospace', fontSize: 44, color: '#F6E05E'}}>{next ? `→ ${next.kind}` : 'fin'}</div>
        <div style={{fontSize: 30, marginTop: 10}}>{shot.id}</div>
      </div>
      <Audio src={staticFile('sfx-demo/transitions.wav')} />
    </AbsoluteFill>
  );
};
