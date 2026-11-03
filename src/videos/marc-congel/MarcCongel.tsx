import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import voice from './voice.json';
import {Scene3D, CUTS, SELFIE, coldAt} from './Scene3D';
import {Hud} from './Hud';
import {TextOverlay, EndCard} from './TextOverlay';

export const MarcCongel: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const dip = Math.max(0, ...CUTS.map((c) => 1 - Math.min(1, Math.abs(t - c) / 0.12)));
  const cold = coldAt(t);
  // White flash of the selfie.
  const flash = Math.max(0, 1 - Math.abs(t - SELFIE) / 0.15);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: `saturate(${1 - 0.2 * cold}) contrast(${1 + 0.15 * cold}) brightness(${1 - 0.08 * cold}) hue-rotate(${-8 * cold}deg)`}}>
        <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
          <Scene3D t={t} />
        </ThreeCanvas>
      </AbsoluteFill>
      {/* Frost vignette creeping in from the edges */}
      <AbsoluteFill style={{background: `radial-gradient(ellipse at center, rgba(255,255,255,0) 50%, rgba(190,225,255,${0.35 * cold}) 100%)`, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#ffffff', opacity: flash * 0.45, pointerEvents: 'none'}} />
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
