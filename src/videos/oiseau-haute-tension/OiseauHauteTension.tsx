import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {smooth} from '../../core/animation';
import {dipAt} from '../../shared/ui/transitions';
import {Glitch, glitchAt, glitchStyle} from '../../shared/holo';
import {CONTACT, CLIMAX, RULE, Scene3D, THEME} from './Scene3D';
import {TextOverlay} from './TextOverlay';
import voiceData from './voice.json';

type Voice = {ambience: string; beats: {id: string; audio: string; start: number; duration: number}[]};
const voice = voiceData as Voice;
/** Short glitch bursts: the contact, and the jump to the far shot. */
const GLITCHES: [number, number][] = [[CONTACT - 0.05, CONTACT + 0.45], [CLIMAX - 0.1, CLIMAX + 0.25]];

export const OiseauHauteTension: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const flash = t >= CONTACT ? 0.75 * Math.exp(-(t - CONTACT) * 5) : 0;
  const glitch = glitchAt(t, GLITCHES);
  // Only the reset to the "rule" diagram is a change of register: a short dip.
  const dip = dipAt([{at: RULE, kind: 'dip'}], t, 0.18);
  return (
    <AbsoluteFill style={{background: THEME.bg}}>
      <AbsoluteFill style={glitchStyle(frame, glitch)}>
        <ThreeCanvas width={width} height={height} linear={false} flat gl={{antialias: true}}>
          <Scene3D t={t} frame={frame} />
        </ThreeCanvas>
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#dff8ff', opacity: flash, mixBlendMode: 'screen', pointerEvents: 'none'}} />
      <Glitch frame={frame} amount={glitch} theme={THEME} height={height} />
      <AbsoluteFill style={{background: THEME.bg, opacity: dip, pointerEvents: 'none'}} />
      <TextOverlay t={t} frame={frame} />
      {voice.ambience && <Audio src={staticFile(voice.ambience)} volume={0.85 * (1 - smooth(44.2, 45, t))} />}
      {voice.beats.map((beat) => (
        <Sequence key={beat.id} from={Math.round(beat.start * fps)} durationInFrames={Math.ceil(beat.duration * fps) + 2}>
          <Audio src={staticFile(beat.audio)} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
