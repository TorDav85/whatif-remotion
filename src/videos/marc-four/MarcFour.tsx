import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {smooth} from '../../core/animation';
import voice from './voice.json';
import {Scene3D, CUTS, FIRE, MINUTES, heatAt} from './Scene3D';
import {Hud} from './Hud';
import {TextOverlay, EndCard} from './TextOverlay';

export const MarcFour: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const dip = Math.max(0, ...CUTS.map((c) => 1 - Math.min(1, Math.abs(t - c) / 0.12)));
  const heat = heatAt(t);
  // Heat haze from minute 4 until the door opens.
  const haze = smooth(MINUTES[3], MINUTES[3] + 2, t) * (1 - smooth(68, 69, t));
  // Orange flash when the tee-shirt catches fire.
  const whoomp = Math.max(0, 1 - Math.abs(t - FIRE - 0.1) / 0.35);

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: `saturate(${1 + 0.3 * heat}) contrast(${1 + 0.08 * heat}) blur(${haze * 1.2 * (1 + Math.sin(t * 3.1))}px)`}}>
        <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true}}>
          <Scene3D t={t} />
        </ThreeCanvas>
      </AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(170,50,0,${0.5 * heat * (1 - smooth(68, 69, t))}) 100%)`, pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#ffb040', opacity: whoomp * 0.45, mixBlendMode: 'screen', pointerEvents: 'none'}} />
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
