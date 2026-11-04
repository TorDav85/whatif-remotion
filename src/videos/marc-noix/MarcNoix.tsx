import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import voice from './voice.json';
import {Scene3D, DIPS} from './Scene3D';
import {Hud} from './Hud';
import {TextOverlay, EndCard} from './TextOverlay';

export const MarcNoix: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const dip = Math.max(0, ...DIPS.map((c) => 1 - Math.min(1, Math.abs(t - c) / 0.15)));

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
        <Scene3D t={t} />
      </ThreeCanvas>
      <AbsoluteFill style={{background: '#000', opacity: dip, pointerEvents: 'none'}} />
      <Hud t={t} />
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
