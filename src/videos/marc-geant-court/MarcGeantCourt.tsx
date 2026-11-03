import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import voice from './voice.json';
import captions from './captions.json';
import editorial from './editorial.json';
import {Scene3D} from '../marc-geant/Scene3D';
import {Hud} from '../marc-geant/Hud';
import {CaptionTrack} from '../../shared/captions/CaptionTrack';
import {layerAlpha, OverlayPlan} from '../../shared/ui/OverlayPolicy';
import {Cut, dipAt} from '../../shared/ui/transitions';
import {EndQuestion, Hook, Law} from './Overlay';

type Segment = {at: number; src: number; dur: number; cut: 'cut' | 'dip'};
const EDIT = editorial.edit as Segment[];
const PLAN = editorial.modes as OverlayPlan;
/** First segment has no incoming cut. */
export const CUTS: Cut[] = EDIT.slice(1).map((s) => ({at: s.at, kind: s.cut}));

/** Time in the original MarcGeant film shown at edit time t. */
export const srcTime = (t: number) => {
  let seg = EDIT[0];
  for (const s of EDIT) if (t >= s.at) seg = s;
  return seg.src + Math.min(t - seg.at, seg.dur);
};

const KEYWORDS = /^(Marc|double|corps|genoux|problème|taille|poids|huit|os|quatre|séisme|Eiffel|avions|air|Terre|Lune|bille|minute)/i;

/**
 * Pilot 1.11: a 45 s cut of MarcGeant built from its own shots, with a problem-driven voice-over,
 * synced caption groups, one overlay mode at a time and a single closing question.
 */
export const MarcGeantCourt: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const src = srcTime(t);
  const hookOn = t < 4.4;

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true, logarithmicDepthBuffer: true}}>
        <Scene3D t={src} clearStreet />
      </ThreeCanvas>
      <AbsoluteFill style={{background: '#000', opacity: dipAt(CUTS, t), pointerEvents: 'none'}} />
      <div style={{opacity: layerAlpha(PLAN, t, 'hud')}}><Hud t={src} /></div>
      <Law t={t} alpha={layerAlpha(PLAN, t, 'diagram')} />
      <Hook t={t} />
      <CaptionTrack captions={captions} t={t} keywords={KEYWORDS} hidden={hookOn || layerAlpha(PLAN, t, 'captions') < 0.5} />
      <EndQuestion t={t} alpha={layerAlpha(PLAN, t, 'cta')} />
      <Audio src={staticFile(voice.ambience)} volume={0.9} />
      {voice.beats.map((b) => (
        <Sequence key={b.id} from={Math.round(b.start * fps)} durationInFrames={Math.ceil(b.duration * fps) + 2}>
          <Audio src={staticFile(b.audio)} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
