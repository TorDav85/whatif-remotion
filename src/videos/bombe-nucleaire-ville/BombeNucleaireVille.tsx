import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {smooth} from '../../core/animation';
import {Scene3D, IMPACT, BLACKOUT} from './Scene3D';
import {TextOverlay} from './TextOverlay';
import voiceData from './voice.json';

type Voice = {ambience: string; beats: {id: string; audio: string; start: number; duration: number}[]};
const voice = voiceData as Voice;

export const BombeNucleaireVille: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const flash = t >= IMPACT ? 0.82 * Math.exp(-(t - IMPACT) * 3.8) : 0;
  // Only the actual changes of scale/location receive a short dip.
  const dip = Math.max(...[40, 46].map((at) => 0.65 * (1 - Math.min(1, Math.abs(t - at) / 0.14))));
  return (
    <AbsoluteFill style={{background: '#101820'}}>
      <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true, logarithmicDepthBuffer: true}}>
        <Scene3D t={t} />
      </ThreeCanvas>
      <AbsoluteFill style={{background: '#fff2d5', opacity: flash, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#0b1118', opacity: dip, pointerEvents: 'none'}} />
      <AbsoluteFill style={{
        background: 'linear-gradient(180deg, rgba(4,10,18,.32), transparent 29%, transparent 65%, rgba(4,10,18,.42))',
        pointerEvents: 'none',
      }} />
      <AbsoluteFill style={{background: '#05090b', opacity: smooth(BLACKOUT - 0.08, BLACKOUT + 0.08, t), pointerEvents: 'none'}} />
      <TextOverlay t={t} />
      {voice.ambience && <Audio src={staticFile(voice.ambience)} volume={0.9 * (1 - smooth(59.1, 60, t))} />}
      {voice.beats.map((beat) => (
        <Sequence key={beat.id} from={Math.round(beat.start * fps)} durationInFrames={Math.ceil(beat.duration * fps) + 2}>
          <Audio src={staticFile(beat.audio)} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
