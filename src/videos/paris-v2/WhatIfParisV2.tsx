import {VoiceTrack} from '../../shared/audio/VoiceTrack';
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {ScenarioProvider} from '../whatif/Scenario';
import {sampleNum, smooth} from '../../core/animation';
import {Hud, SERIF} from '../whatif/ui/Hud';
import {Captions} from '../whatif/ui/Captions';
import {ParisBlackHole} from './ParisBlackHole';
import P from './scenario.json';

export const PARIS_V2 = P;

const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const t = frame / P.fps;
  const outro = smooth(P.outro.t, P.outro.t + 1, t);
  return (
    <AbsoluteFill style={{background: '#101522'}}>
      {/* Un seul canvas, un seul décor, sans coupe pendant les 46 secondes. */}
      <ThreeCanvas width={width} height={height} camera={{fov: P.camera.fov, position: [0, P.camera.height, P.camera.startZ]}}>
        <ParisBlackHole />
      </ThreeCanvas>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,10,20,0.48) 100%)', pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#faf3df', opacity: sampleNum(P.flash, t, 'a'), pointerEvents: 'none'}} />
      <div style={{position: 'absolute', top: 68, left: 72, right: 72, display: 'flex', justifyContent: 'space-between', fontFamily: SERIF, fontSize: 20, letterSpacing: '0.18em', color: '#f3efe6', opacity: (1 - outro) * 0.8, textShadow: '0 2px 12px #000'}}>
        <span>{P.location.city} · {P.location.name}</span><span>WHAT IF / V2</span>
      </div>
      <Hud />
      <Captions />
      {outro > 0 && (
        <AbsoluteFill style={{background: `rgba(7,11,19,${outro * 0.84})`, color: '#f3efe6', fontFamily: SERIF, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 90px', gap: 40, opacity: outro}}>
          <div style={{fontSize: 22, letterSpacing: '0.16em'}}>{P.outro.text}</div>
          <div style={{fontSize: 76, lineHeight: 1.15}}>{P.outro.title}</div>
          <div style={{fontSize: 38, fontStyle: 'italic'}}>{P.outro.question}</div>
          <div style={{fontSize: 22, letterSpacing: '0.1em', lineHeight: 1.8, whiteSpace: 'pre-line', opacity: 0.7}}>{P.outro.note}</div>
          <div style={{fontSize: 24, opacity: 0.7}}>{P.handle}</div>
        </AbsoluteFill>
      )}
      <Audio src={staticFile(P.audio.music)} volume={(f) => interpolate(f, [0, 30, P.duration * P.fps - 60, P.duration * P.fps], [0, 0.85, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />
      <VoiceTrack audio={P.audio} beats={P.beats} />
    </AbsoluteFill>
  );
};

export const WhatIfParisV2: React.FC = () => <ScenarioProvider timeline={P}><Film /></ScenarioProvider>;
