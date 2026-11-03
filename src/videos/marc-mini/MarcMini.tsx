import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {Scene3D, CUTS, BLUR} from './Scene3D';
import {Hud} from './Hud';
import {TextOverlay, EndCard} from './TextOverlay';

export const MarcMini: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const dip = Math.max(0, ...CUTS.map((c) => 1 - Math.min(1, Math.abs(t - c) / 0.12)));
  // Smaller than visible light: the picture blurs, then comes back as an electron-microscope grey.
  const blur = smooth(BLUR[0], BLUR[1], t) * (1 - smooth(BLUR[1] + 0.4, BLUR[2] + 0.2, t));
  const grey = smooth(BLUR[1], BLUR[2], t);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: `blur(${blur * 26}px) grayscale(${grey}) contrast(${1 + 0.25 * grey}) brightness(${1 + 0.05 * grey})`}}>
        {/* Logarithmic depth: the same scene goes from a 1.8 m man down to an atom. */}
        <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true, logarithmicDepthBuffer: true}}>
          <Scene3D t={t} />
        </ThreeCanvas>
      </AbsoluteFill>
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
