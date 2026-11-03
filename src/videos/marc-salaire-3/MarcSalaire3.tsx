import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {Scene3D, CUTS, REVEAL} from './Scene3D';
import {TextOverlay, EndCard} from './TextOverlay';

export const MarcSalaire3: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const dip = Math.max(0, ...CUTS.map((c) => 1 - Math.min(1, Math.abs(t - c) / 0.12)));
  // Dark and tense until the reveal, then a warm, bright comedy look.
  const warm = smooth(REVEAL - 0.2, REVEAL + 0.6, t);
  const flash = Math.max(0, 1 - Math.abs(t - REVEAL) / 0.2);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: `saturate(${0.8 + 0.35 * warm}) contrast(1.06)`}}>
        <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
          <Scene3D t={t} />
        </ThreeCanvas>
      </AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,10,${0.6 - 0.4 * warm}) 100%)`, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#fff', opacity: flash * 0.5, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#000', opacity: dip, pointerEvents: 'none'}} />
      <TextOverlay t={t} />
      <EndCard t={t} />
      <Audio src={staticFile(voice.ambience)} volume={0.9} />
      {voice.beats.map((b) => (
        <Sequence key={b.id} from={Math.round(b.start * fps)} durationInFrames={Math.ceil(b.duration * fps) + 2}>
          <Audio src={staticFile(b.audio)} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
