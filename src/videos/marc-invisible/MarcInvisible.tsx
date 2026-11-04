import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import voice from './voice.json';
import {Scene3D, DIPS, isThermal, blindDark} from './Scene3D';
import {Hud} from './Hud';
import {TextOverlay, EndCard} from './TextOverlay';

/** Luminance → "ironbow" false colours, like a thermal camera. */
const ThermalFilter: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <filter id="marc-invisible-thermal" colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" />
      <feComponentTransfer>
        <feFuncR type="table" tableValues="0 0.15 0.45 0.75 0.95 1 1 1" />
        <feFuncG type="table" tableValues="0 0 0.02 0.1 0.35 0.65 0.9 1" />
        <feFuncB type="table" tableValues="0.05 0.35 0.55 0.45 0.1 0.05 0.3 0.9" />
      </feComponentTransfer>
    </filter>
  </svg>
);

export const MarcInvisible: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const dip = Math.max(0, ...DIPS.map((c) => 1 - Math.min(1, Math.abs(t - c) / 0.15)));
  const thermal = isThermal(t);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThermalFilter />
      <AbsoluteFill style={{filter: thermal ? 'url(#marc-invisible-thermal)' : undefined}}>
        <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
          <Scene3D t={t} />
        </ThreeCanvas>
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#000', opacity: blindDark(t), pointerEvents: 'none'}} />
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
