import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import voice from './voice.json';
import {smooth} from '../../core/animation';
import {Scene3D, CUTS, IMPACT} from './Scene3D';
import {Hud} from './Hud';
import {TextOverlay, EndCard} from './TextOverlay';

export const AsteroideParis: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  // Very short dip to black on cuts (none on the impact: the flash covers it).
  const dip = Math.max(0, ...CUTS.filter((c) => c !== IMPACT).map((c) => 1 - Math.min(1, Math.abs(t - c) / 0.12)));
  const flash = t >= IMPACT ? 0.9 * Math.exp(-(t - IMPACT) * 3) : 0;
  // The dust wall swallows the camera just before the end card.
  const dust = smooth(35.95, 36.45, t);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
        <Scene3D t={t} />
      </ThreeCanvas>
      <AbsoluteFill style={{background: '#000', opacity: dip, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#fff8ea', opacity: flash, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#8a6e52', opacity: dust, pointerEvents: 'none'}} />
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
