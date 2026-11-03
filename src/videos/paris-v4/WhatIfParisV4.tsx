import {VoiceTrack} from '../../shared/audio/VoiceTrack';
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {smooth} from '../../core/animation';
import {City} from './City';
import {Country, Planet, Galaxy} from './Cosmos';
import {SolarLabels, SolarSystem} from './SolarSystem';
import {cameraAt, shotOpacity} from './motion';
import {heroAt} from './story';
import P from './scenario.json';

export const PARIS_V4 = P;
const SCENES: Record<string, React.FC<{from: number}>> = {city: City, country: Country, earth: Planet, solar: SolarSystem, galaxy: Galaxy};
const ink = '#23484c';
const ADVENTURE = '"Palatino Linotype", "Book Antiqua", Georgia, serif';
const paper: React.CSSProperties = {
  background: 'linear-gradient(135deg, #fff0cd, #f1d39a)',
  border: '3px solid #d6ac68', outline: '1px solid rgba(111,79,34,0.28)', outlineOffset: -11,
  boxShadow: '0 5px 0 rgba(82,68,39,0.2), 0 12px 35px rgba(12,54,69,0.2)',
  padding: '24px 32px', borderRadius: '5px 11px 4px 8px',
};

const Compass: React.FC<{t: number}> = ({t}) => <svg width="110" height="110" viewBox="0 0 110 110" style={{position: 'absolute', right: 65, top: 65, filter: 'drop-shadow(0 4px 3px rgba(12,46,57,0.3))'}}>
  <circle cx="55" cy="55" r="48" fill="#dbb66e" stroke="#816340" strokeWidth="3" />
  <circle cx="55" cy="55" r="41" fill="#ffebbe" stroke="#f8e4ad" strokeWidth="4" />
  {[0, 45, 90, 135].map((a) => <path key={a} d="M55 18V26M55 84V92" stroke="#8c7248" strokeWidth="2" transform={`rotate(${a} 55 55)`} />)}
  <g transform={`rotate(${-18 + Math.sin(t * 0.18) * 12} 55 55)`}>
    <path d="M55 22L66 56L55 88L45 56Z" fill="#254e55" /><path d="M55 22L66 56L55 50Z" fill="#cf6b44" />
    <circle cx="55" cy="55" r="5" fill="#e1b861" stroke="#8f713f" />
  </g>
</svg>;

const Words: React.FC<{text: string}> = ({text}) => <>{text.split(/(\{[^}]+\})/).map((part, i) =>
  part.startsWith('{') ? <span key={i} style={{color: '#b34d2f', fontStyle: 'normal', fontWeight: 700}}>{part.slice(1, -1)}</span> : <React.Fragment key={i}>{part}</React.Fragment>,
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
    <circle cx={x} cy={y} r={radius} fill="none" stroke={impact ? '#ffe4b3' : '#c9452e'} strokeWidth={3} strokeDasharray={impact ? undefined : '15 7'} />
    {!impact && <>
      <path d={`M${x} ${y - radius - 4} v-28 h90`} stroke="#fff3d0" strokeWidth={2.4} fill="none" />
      <text x={x + 12} y={y - radius - 42} fontSize={19} fontWeight={700} fontFamily="Arial, sans-serif" letterSpacing={1} fill="#23484c" stroke="#fff0cd" strokeWidth={4} paintOrder="stroke">SUIS LA ROUGE</text>
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
  return <AbsoluteFill style={{fontFamily: ADVENTURE, color: ink, pointerEvents: 'none'}}>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(16,85,119,0.1), transparent 28%, transparent 76%, rgba(8,45,75,0.18))'}} />
    <FollowCar t={t} />
    {shot.id === 'solar' && <SolarLabels t={t} />}
    <Compass t={t} />
    <div style={{position: 'absolute', left: 70, top: 65, padding: '10px 19px', background: '#fff0cd', border: '2px solid #d4b16b', borderRadius: 4, fontSize: 18, fontWeight: 700, letterSpacing: '0.14em'}}>
      WHAT IF / V4 · PARIS
    </div>
    <div style={{...paper, position: 'absolute', left: 70, top: 190, right: 70, opacity: (1 - end) * smooth(2.4, 2.8, t)}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 17, letterSpacing: '0.12em', fontWeight: 700}}><span style={{width: 9, height: 9, transform: 'rotate(45deg)', background: '#ba653d'}} />{String(index + 1).padStart(2, '0')} / {String(P.shots.length).padStart(2, '0')} · {shot.chapter}</div>
      <div style={{fontSize: index === 3 ? 63 : 69, fontWeight: 700, lineHeight: 1, marginTop: 12}}>{index === 0 && t > 25 ? 'PARIS VUE DU CIEL' : shot.label}</div>
      <div style={{fontSize: 18, letterSpacing: '0.1em', marginTop: 12}}>{shot.detail}</div>
    </div>
    {beat?.title && <div style={{...paper, position: 'absolute', left: 70, right: 70, top: 190, textAlign: 'center', fontSize: 79, fontWeight: 700, lineHeight: 1.05, padding: '30px 36px', opacity: a, transform: `translateY(${8 * (1 - smooth(0, 0.3, t))}px)`}}><Words text={beat.title} /></div>}
    {beat?.caption && <div style={{...paper, position: 'absolute', bottom: 240, left: 70, right: 70, textAlign: 'center', fontSize: 53, fontStyle: 'italic', lineHeight: 1.12, opacity: a * (1 - end), transform: `translateY(${10 * (1 - smooth(beat.t, beat.t + 0.22, t))}px)`}}><Words text={beat.caption} /></div>}
    <div style={{...paper, padding: '15px 20px', position: 'absolute', bottom: 110, left: 70, right: 70, display: 'flex', gap: 15, alignItems: 'center', opacity: 1 - end}}>
      {['PARIS', 'FRANCE', 'TERRE', 'SYST. SOLAIRE', 'GALAXIE'].map((label, i) => <React.Fragment key={label}>
        {i > 0 && <div style={{height: 1, flex: 1, background: i <= index ? '#ad753c' : '#d6c39a'}} />}
        <span style={{fontSize: 20, fontWeight: 700, letterSpacing: '0.1em', color: i === index ? '#a34d2c' : ink, opacity: i <= index ? 1 : 0.4}}>{label}</span>
      </React.Fragment>)}
    </div>
    {end > 0 && <AbsoluteFill style={{background: `rgba(3,6,15,${end * 0.25})`, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 70px', opacity: end}}>
      <div style={{...paper, padding: '45px 35px', display: 'flex', flexDirection: 'column', gap: 28, width: '100%'}}>
        <div style={{fontSize: 77, fontWeight: 700, lineHeight: 1.05}}>{P.outro.title}</div>
        <div style={{fontSize: 38, fontStyle: 'italic'}}>{P.outro.text}</div>
        <div style={{fontSize: 16, letterSpacing: '0.07em', opacity: 0.75}}>{P.outro.note}</div>
        <div style={{fontSize: 23, opacity: 0.75}}>{P.handle}</div>
      </div>
    </AbsoluteFill>}
  </AbsoluteFill>;
};

export const WhatIfParisV4: React.FC = () => {
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
