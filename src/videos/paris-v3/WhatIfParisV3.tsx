import {VoiceTrack} from '../../shared/audio/VoiceTrack';
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {smooth} from '../../core/animation';
import {SERIF} from '../../shared/ui/tokens';
import {City} from './City';
import {Country, Planet, Galaxy} from './Cosmos';
import {cameraAt, shotOpacity} from './motion';
import {heroAt} from './story';
import P from './scenario.json';

export const PARIS_V3 = P;
const SCENES: Record<string, React.FC<{from: number}>> = {city: City, country: Country, earth: Planet, galaxy: Galaxy};
const ink = '#f5efdf';

const Words: React.FC<{text: string}> = ({text}) => <>{text.split(/(\{[^}]+\})/).map((part, i) =>
  part.startsWith('{') ? <span key={i} style={{color: '#ffcb88', fontStyle: 'normal'}}>{part.slice(1, -1)}</span> : <React.Fragment key={i}>{part}</React.Fragment>,
)}</>;

const FollowCar: React.FC<{t: number}> = ({t}) => {
  const {width, height} = useVideoConfig();
  if (t > P.hero.impactAt + 0.7) return null;
  const cam = cameraAt(t);
  const camera = new THREE.PerspectiveCamera(55, width / height, 0.05, 12000);
  camera.position.set(cam.x, cam.y, cam.z); camera.lookAt(cam.tx, cam.ty, cam.tz); camera.updateMatrixWorld();
  const hero = heroAt(t);
  const impact = t >= P.hero.impactAt;
  const point = impact ? new THREE.Vector3(0, P.hole.height, P.hole.z) : hero.pos.clone().add(new THREE.Vector3(0, hero.size, 0));
  const projected = point.project(camera);
  const x = (projected.x + 1) / 2 * width;
  const y = (1 - projected.y) / 2 * height;
  const opacity = impact ? 1 - smooth(P.hero.impactAt, P.hero.impactAt + 0.7, t) : 1 - smooth(P.hero.absorbTo - 1.4, P.hero.absorbTo - 0.2, t);
  const radius = impact ? 35 + (t - P.hero.impactAt) * 150 : 36 + Math.sin(t * 4) * 2;
  return <svg width={width} height={height} style={{position: 'absolute', inset: 0, opacity}}>
    <circle cx={x} cy={y} r={radius} fill="none" stroke={impact ? '#ffe4b3' : '#ff7558'} strokeWidth={2} strokeDasharray={impact ? undefined : '15 7'} />
    {!impact && <>
      <path d={`M${x} ${y - radius - 4} v-28 h90`} stroke="#ff947a" strokeWidth={1.4} fill="none" />
      <text x={x + 12} y={y - radius - 42} fontSize={19} fontFamily="Arial, sans-serif" letterSpacing={2} fill="#ffe6d5">SUIS LA ROUGE</text>
    </>}
  </svg>;
};

const Overlay: React.FC = () => {
  const t = useCurrentFrame() / P.fps;
  const index = P.shots.reduce((current, s, i) => t >= s.from + (s.from === 0 ? 0 : 0.5) ? i : current, 0);
  const shot = P.shots[index];
  const beat = P.beats.find((b) => t >= b.t && t < b.end);
  const a = beat ? Math.min(beat.t === 0 ? 1 : smooth(beat.t, beat.t + 0.14, t), 1 - smooth(beat.end - 0.14, beat.end, t)) : 0;
  const end = smooth(P.outro.t, P.outro.t + 1, t);
  return <AbsoluteFill style={{fontFamily: SERIF, color: ink, pointerEvents: 'none', textShadow: '0 2px 18px rgba(0,0,0,0.7)'}}>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(3,8,18,0.58), transparent 28%, transparent 68%, rgba(3,8,18,0.75))'}} />
    <FollowCar t={t} />
    <div style={{position: 'absolute', left: 70, right: 70, top: 68, display: 'flex', justifyContent: 'space-between', fontSize: 20, letterSpacing: '0.18em', opacity: 0.8}}>
      <span>WHAT IF / V3</span><span>ORIGINE · PARIS</span>
    </div>
    <div style={{position: 'absolute', left: 70, top: 132, right: 70, opacity: (1 - end) * smooth(2.4, 2.8, t)}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, fontSize: 19, letterSpacing: '0.16em'}}><span style={{width: 9, height: 9, borderRadius: 10, background: '#efac62'}} />{String(index + 1).padStart(2, '0')} / 04 · {shot.chapter}</div>
      <div style={{fontSize: index === 3 ? 65 : 74, lineHeight: 1.1, marginTop: 12}}>{index === 0 && t > 25 ? 'PARIS VUE DU CIEL' : shot.label}</div>
      <div style={{fontSize: 21, letterSpacing: '0.14em', marginTop: 14, opacity: 0.8}}>{shot.detail}</div>
    </div>
    {beat?.title && <div style={{position: 'absolute', left: 85, right: 85, top: 180, textAlign: 'center', fontSize: 88, lineHeight: 1.1, opacity: a, transform: `translateY(${8 * (1 - smooth(0, 0.3, t))}px)`}}><Words text={beat.title} /></div>}
    {beat?.caption && <div style={{position: 'absolute', bottom: 260, left: 85, right: 85, textAlign: 'center', fontSize: 58, fontStyle: 'italic', lineHeight: 1.2, opacity: a * (1 - end), transform: `translateY(${10 * (1 - smooth(beat.t, beat.t + 0.22, t))}px)`}}><Words text={beat.caption} /></div>}
    <div style={{position: 'absolute', bottom: 125, left: 70, right: 70, display: 'flex', gap: 15, alignItems: 'center', opacity: 1 - end}}>
      {['PARIS', 'FRANCE', 'TERRE', 'GALAXIE'].map((label, i) => <React.Fragment key={label}>
        {i > 0 && <div style={{height: 1, flex: 1, background: i <= index ? '#e2ba83' : 'rgba(244,237,222,0.2)'}} />}
        <span style={{fontSize: 20, letterSpacing: '0.12em', color: i === index ? '#ffcf8c' : ink, opacity: i <= index ? 1 : 0.35}}>{label}</span>
      </React.Fragment>)}
    </div>
    {end > 0 && <AbsoluteFill style={{background: `rgba(3,6,15,${end * 0.5})`, alignItems: 'center', justifyContent: 'center', gap: 36, textAlign: 'center', padding: '0 75px', opacity: end}}>
      <div style={{fontSize: 84, lineHeight: 1.14}}>{P.outro.title}</div>
      <div style={{fontSize: 41, fontStyle: 'italic', marginTop: 10}}>{P.outro.text}</div>
      <div style={{fontSize: 18, letterSpacing: '0.1em', opacity: 0.7}}>{P.outro.note}</div>
      <div style={{fontSize: 24, opacity: 0.7}}>{P.handle}</div>
    </AbsoluteFill>}
  </AbsoluteFill>;
};

export const WhatIfParisV3: React.FC = () => {
  const t = useCurrentFrame() / P.fps;
  const {width, height} = useVideoConfig();
  return <AbsoluteFill style={{background: '#040916'}}>
    {P.shots.map((shot) => {
      const Scene = SCENES[shot.id];
      return <Sequence key={shot.id} from={shot.from * P.fps} durationInFrames={(shot.to - shot.from) * P.fps}>
        <AbsoluteFill style={{opacity: shotOpacity(t, shot.from, shot.to)}}>
          <ThreeCanvas width={width} height={height} camera={{fov: 55, position: [0, 40, 88]}}><Scene from={shot.from} /></ThreeCanvas>
        </AbsoluteFill>
      </Sequence>;
    })}
    <Overlay />
    <Audio src={staticFile(P.audio.music)} volume={(f) => interpolate(f, [0, 30, P.duration * P.fps - 75, P.duration * P.fps], [0, 0.88, 0.88, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />
    <VoiceTrack audio={P.audio} beats={P.beats} />
  </AbsoluteFill>;
};
