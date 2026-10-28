import {VoiceTrack} from '../../shared/audio/VoiceTrack';
import React from 'react';
import {AbsoluteFill, Audio, Freeze, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {smooth} from '../../core/animation';
import {City} from './City';
import {Country, Planet, Galaxy} from './Cosmos';
import {SolarLabels, SolarSystem} from './SolarSystem';
import {cameraAt, shotOpacity} from './motion';
import {heroAt} from './story';
import P from './scenario.json';

export const PARIS_TIKTOK=P;
const SCENES: Record<string,React.FC<{from:number}>>={city:City,country:Country,earth:Planet,solar:SolarSystem,galaxy:Galaxy};
const FONT='"Arial Narrow", "Bahnschrift SemiCondensed", Arial, sans-serif';
const Words:React.FC<{text:string}>=({text})=><>{text.split(/(\{[^}]+\})/).map((part,i)=>part.startsWith('{')?<span key={i} style={{color:'#edb195'}}>{part.slice(1,-1)}</span>:<React.Fragment key={i}>{part}</React.Fragment>)}</>;
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
    <circle cx={x} cy={y} r={radius} fill="none" stroke={impact ? '#ffe4b3' : '#ef9a83'} strokeWidth={3} strokeDasharray={impact ? undefined : '15 7'} />
    {!impact && <>
      <path d={`M${x} ${y - radius - 4} v-28 h90`} stroke="#d9e8ed" strokeWidth={2.4} fill="none" />
      <text x={x + 12} y={y - radius - 42} fontSize={19} fontWeight={700} fontFamily="Arial, sans-serif" letterSpacing={1} fill="#e2edf1" stroke="#162631" strokeWidth={4} paintOrder="stroke">SUIS LA ROUGE</text>
    </>}
  </svg>;
};

const Overlay:React.FC=()=>{
  const t=useCurrentFrame()/P.fps;
  const index=P.shots.reduce((current,s,i)=>t>=s.from+(s.from===0?0:.5)?i:current,0);
  const shot=P.shots[index];
  const beat=P.beats.find(b=>t>=b.t&&t<b.end);
  const a=beat?Math.min(beat.t===0?1:smooth(beat.t,beat.t+.16,t),1-smooth(beat.end-.16,beat.end,t)):0;
  const end=smooth(P.outro.t,P.outro.t+.45,t);
  const chapter=smooth(2.4,2.9,t)*(1-end);
  const countdown=Math.max(0,P.hero.impactAt-t);

  return <AbsoluteFill style={{fontFamily:FONT,color:'#edf3f5',pointerEvents:'none'}}>
    <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 48%, transparent 32%, rgba(3,13,23,.34) 100%)'}} />
    <AbsoluteFill style={{background:'linear-gradient(180deg, rgba(4,13,22,.65), transparent 25%, transparent 70%, rgba(3,10,18,.88))'}} />
    <div style={{position:'absolute',top:0,left:0,right:0,height:37,background:'#060b10'}} />
    <div style={{position:'absolute',bottom:0,left:0,right:0,height:37,background:'#060b10'}} />
    <FollowCar t={t}/>
    {shot.id==='solar'&&<SolarLabels t={t}/>}
    <div style={{position:'absolute',top:105,left:72,right:158,display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:23,letterSpacing:'.22em'}}>
      <span style={{fontWeight:700}}>#WHATIF <span style={{fontWeight:400,opacity:.6}}> / PARIS</span></span>
      <span style={{fontSize:17,opacity:.7}}>ET SI…</span>
    </div>
    <div style={{position:'absolute',top:156,left:72,right:158,height:1,background:'#b8cbd244'}}>
      <div style={{height:2,width:`${t/P.duration*100}%`,background:'#e6b298'}}/>
    </div>
    <div style={{position:'absolute',left:72,right:158,top:206,opacity:chapter}}>
      <div style={{fontSize:16,letterSpacing:'.19em',color:'#b6cbd4'}}>{String(index+1).padStart(2,'0')} / 05 — {shot.chapter}</div>
      <div style={{fontSize:shot.id==='solar'?58:72,fontWeight:700,lineHeight:1.05,letterSpacing:'-.025em',marginTop:20,textShadow:'0 3px 22px #07121c'}}>{index===0&&t>21?'PARIS VUE DU CIEL':shot.label}</div>
      <div style={{fontSize:16,letterSpacing:'.13em',color:'#c3d2d9',marginTop:18}}>{shot.detail}</div>
    </div>
    {beat?.title&&<div style={{position:'absolute',top:214,left:72,right:158,fontWeight:700,fontSize:94,lineHeight:1.03,letterSpacing:'-.035em',textShadow:'0 4px 30px #0009',opacity:a}}><Words text={beat.title}/><div style={{width:74,height:3,background:'#edb195',marginTop:30}}/></div>}
    {beat?.caption&&<div style={{position:'absolute',left:72,right:158,bottom:435,textAlign:'center',opacity:a*(1-end),transform:`translateY(${12*(1-smooth(beat.t,beat.t+.2,t))}px)`}}>
      <div style={{width:36,height:2,background:'#d0e1e8',margin:'0 auto 24px'}}/>
      <div style={{fontSize:58,lineHeight:1.14,fontWeight:600,textShadow:'0 3px 12px #000, 0 0 40px #07121c'}}><Words text={beat.caption}/></div>
    </div>}
    <div style={{position:'absolute',bottom:255,left:72,right:158,opacity:1-end}}>
      <div style={{height:1,background:'#b8cbd244',marginBottom:24}}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>{['PARIS','FRANCE','TERRE','SYST. SOLAIRE','GALAXIE'].map((label,i)=><div key={label} style={{fontSize:16,letterSpacing:'.1em',color:i===index?'#edb195':'#d3e2e8',opacity:i<=index?1:.35}}><span style={{display:'block',fontSize:12,letterSpacing:'.18em',marginBottom:8,opacity:.7}}>0{i+1}</span>{label}</div>)}</div>
    </div>
    {t<P.hero.impactAt&&<div style={{position:'absolute',right:158,top:478,padding:'16px 22px',border:'1px solid #edb19588',background:'#07121cbf',textAlign:'right'}}>
      <div style={{fontSize:15,letterSpacing:'.14em',color:'#edb195'}}>DISPARITION DANS</div>
      <div style={{fontSize:65,fontVariantNumeric:'tabular-nums',fontWeight:700,lineHeight:1.1}}>{countdown.toFixed(1).replace('.',',')}<span style={{fontSize:25}}> s</span></div>
    </div>}
    {end>0&&<div style={{position:'absolute',left:72,right:158,top:355,opacity:end}}>
      <div style={{fontSize:62,fontWeight:700,lineHeight:1.08}}>{P.outro.title}</div>
      <div style={{fontSize:25,color:'#c9dfe8',marginTop:24}}>RETOUR À PARIS ↘</div>
    </div>}
    <div style={{position:'absolute',left:72,bottom:206,fontSize:14,letterSpacing:'.08em',color:'#c8d8e0',opacity:.65}}>FICTION VISUELLE · ABSORPTION ET TEMPS STYLISÉS</div>
  </AbsoluteFill>;
};

export const WhatIfParisTikTok:React.FC=()=>{
  const t=useCurrentFrame()/P.fps;
  const {width,height}=useVideoConfig();
  return <AbsoluteFill style={{background:'#040916'}}>
    {P.shots.map(shot=>{
      const Scene=SCENES[shot.id];
      return <Sequence key={shot.id} from={shot.from*P.fps} durationInFrames={(shot.to-shot.from)*P.fps}>
        <AbsoluteFill style={{opacity:shotOpacity(t,shot.from,shot.to)}}>
          <ThreeCanvas width={width} height={height} camera={{fov:55,position:[0,40,88]}}><Scene from={shot.from}/></ThreeCanvas>
        </AbsoluteFill>
      </Sequence>;
    })}
    <Overlay/>
    <Sequence from={Math.round(P.loop.from*P.fps)}>
      <AbsoluteFill style={{opacity:smooth(P.loop.from,P.loop.fadeTo,t)}}>
        <Freeze frame={0}>
          <ThreeCanvas width={width} height={height} camera={{fov:55,position:[0,40,88]}}><City from={0}/></ThreeCanvas>
          <Overlay/>
        </Freeze>
      </AbsoluteFill>
    </Sequence>
    <Audio src={staticFile(P.audio.music)} volume={f=>interpolate(f,[0,30,P.duration*P.fps-75,P.duration*P.fps],[0,.13,.13,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}/>
    <VoiceTrack audio={P.audio} beats={P.beats} volume={1.05} />
  </AbsoluteFill>;
};
