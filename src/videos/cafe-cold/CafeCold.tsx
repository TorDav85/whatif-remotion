import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {Block, Ball, Cyl} from '../../assets/kit';
import {Person} from '../../assets/Person';
import {CafeTerrace} from '../../assets/city/CityLife';
import {Planter} from '../../assets/city/Park';
import {CameraRig} from '../../shared/three/common';
import {smooth} from '../../core/animation';
import originalTiming from './timing.json';

export type CafeTimeline = {
  fps: number; width: number; height: number; duration: number;
  ambience?: string;
  beats: {id: string; text: string; caption: string; start: number; end: number; duration: number; audio: string}[];
};

/** Each version retains its own measured audio timeline and media files. */
export const createCafeCold = (timing: CafeTimeline): React.FC => {

type V3 = [number, number, number];
const RED = '#b13e33';
const TEAL = '#245b57';
const CREAM = '#fff0d5';
const at = (id: string) => timing.beats.find((b) => b.id === id)!.start;
const end = (id: string) => timing.beats.find((b) => b.id === id)!.end;
const prog = (id: string, t: number, delay = 0, dur = 0.8) => smooth(at(id) + delay, at(id) + delay + dur, t);
const mix = (a: number, b: number, p: number) => a + (b-a)*p;
const color = (a: string, b: string, p: number) => new THREE.Color(a).lerp(new THREE.Color(b), p);

/** Canvas lettering lives on the café architecture; all editorial text stays in HTML. */
const Lettering: React.FC<{text: string; p: V3; w: number; h: number; ink?: string; bg?: string; size?: number}> = ({text,p,w,h,ink=CREAM,bg=TEAL,size=76}) => {
  const tex = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width=1024; canvas.height=256;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=bg;ctx.fillRect(0,0,1024,256);
    ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.strokeRect(15,15,994,226);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=ink;
    ctx.font=`600 ${size}px Georgia`;ctx.fillText(text,512,128);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    return texture;
  },[text,ink,bg,size]);
  return <mesh position={p} rotation={[0,Math.PI,0]}><planeGeometry args={[w,h]}/><meshBasicMaterial map={tex}/></mesh>;
};

const Chair: React.FC<{dressed?: boolean; t: number; frost: number}> = ({dressed=false,t,frost}) => <group>
  {[-0.22,0.22].flatMap(x=>[-0.22,0.22].map(z=><Block key={`${x}-${z}`} p={[x,0.24,z]} s={[0.035,0.48,0.035]} c={TEAL}/>))}
  <Block p={[0,0.48,0]} s={[0.54,0.065,0.54]} c={RED}/>
  {[-0.23,0.23].map(x=><Block key={x} p={[x,0.81,0.22]} s={[0.035,0.67,0.035]} c={TEAL}/>)}
  {[0.75,0.92,1.09].map(y=><Block key={y} p={[0,y,0.23]} s={[0.54,0.12,0.045]} c={RED}/>)}
  {frost>0&&<Block p={[0,1.155,0.23]} s={[0.55,0.012,0.055]} c="#d9edf1" o={frost*0.75}/>}
  {dressed&&<>
    <group position={[0,1.03,0.21]}><Hat/></group>
    <group position={[0,1.17,0.21]}><Scarf t={t} chair/></group>
  </>}
</group>;

const Hat: React.FC = () => <group>
  <mesh position={[0,0.12,0]}><sphereGeometry args={[0.22,16,10,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#d5a34f" roughness={1}/></mesh>
  <Cyl p={[0,0.12,0]} rad={0.225} h={0.095} c="#e8bc69"/>
  <Ball p={[0,0.355,0]} rad={0.065} c="#f3d28b"/>
  {Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return <Cyl key={i} p={[Math.sin(a)*0.225,0.125,Math.cos(a)*0.225]} rad={0.006} h={0.07} c="#bb8740"/>;})}
</group>;

const Scarf: React.FC<{t:number;chair?:boolean}> = ({t,chair=false}) => <group>
  <Block p={[0,chair?-0.19:0,chair?-0.07:-0.015]} s={[chair?0.62:0.47,0.14,0.32]} c="#d39146"/>
  <group position={[0.15,chair?-0.22:-0.035,-0.22]} rotation={[Math.sin(t*2)*0.025,0,-0.12]}>
    <Block p={[0,-0.24,0]} s={[0.14,0.53,0.045]} c="#e5b25f"/>
    {[-0.4,-0.29,-0.18,-0.07].map(y=><Block key={y} p={[0,y,-0.025]} s={[0.145,0.025,0.006]} c="#fff0d5"/>)}
  </group>
</group>;

const Mug: React.FC<{p:V3;t:number;steam?:number}> = ({p,t,steam=1}) => <group position={p}>
  <Cyl p={[0,0.015,0]} rad={0.14} h={0.024} c="#eee0c6"/>
  <mesh position={[0,0.095,0]}><cylinderGeometry args={[0.09,0.07,0.15,20]}/><meshStandardMaterial color="#fff8e5" roughness={0.3}/></mesh>
  <Cyl p={[0,0.172,0]} rad={0.079} h={0.004} c="#482e25"/>
  <mesh position={[0.10,0.105,0]}><torusGeometry args={[0.047,0.014,8,16]}/><meshStandardMaterial color="#fff8e5"/></mesh>
  {steam>0&&Array.from({length:8},(_,i)=>{const q=((t*0.55+i/8)%1);return <mesh key={i} position={[Math.sin(t*1.7+i)*0.035+q*0.04,0.23+q*0.42,Math.cos(i)*0.02]} scale={[0.018+q*0.025,0.06,0.025]}><sphereGeometry args={[1,8,6]}/><meshBasicMaterial color="#fff4df" transparent opacity={0.30*(1-q)} depthWrite={false}/></mesh>;})}
</group>;

/** Articulated lead character: sleeves, shoulders, hands and gaze are independent. */
const Marc: React.FC<{t:number;stand?:number;inside?:boolean}> = ({t,stand=0,inside=false}) => {
  const jacket=inside?1:prog('jacket',t,0.7,1.1);
  const blanket=inside?1:prog('blanket',t,0.5,0.75);
  const chill=prog('chill',t,1.6,1.4);
  const cold=prog('guests',t,0,1.5);
  const hasHat=!inside&&t>at('guests')+1;
  const shiver=(inside?0:cold)*Math.sin(t*28)*0.009;
  const hip=mix(0.55,0.96,stand);
  const order=t>=at('coffee')&&t<end('coffee')+0.1;
  const torsoColor=color('#faf0d7','#385f68',jacket).getStyle();
  const hold=inside?1:0;
  return <group position={[shiver,0,0]} rotation={[0,Math.sin(t*1.2)*0.025*(1-cold),0]}>
    {[-1,1].map(s=><group key={s} position={[s*0.13,hip,0]} rotation={[mix(Math.PI/2,0,stand),0,0]}>
      <Block p={[0,-0.20,0]} s={[0.18,0.42,0.20]} c="#40515b"/>
      <group position={[0,-0.40,0]} rotation={[-mix(Math.PI/2,0,stand),0,0]}>
        <Block p={[0,-0.20,0]} s={[0.16,0.42,0.18]} c="#40515b"/>
        <Block p={[0,-0.40,-0.055]} s={[0.18,0.11,0.31]} c="#644536"/>
      </group>
    </group>)}
    <group position={[0,hip,0]}>
      <Block p={[0,0.32,0]} s={[0.49,0.64,0.29]} c={torsoColor}/>
      {jacket>0.4&&[-0.11,0.11].map(x=><Block key={x} p={[x,0.47,-0.155]} s={[0.1,0.24,0.025]} r={[0,0,x*2]} c="#294a52"/>)}
      <Block p={[0,0.68,0]} s={[0.16,0.18,0.15]} c="#e6ae84"/>
      <group position={[0,0.82+chill*0.015,0]} rotation={[cold*0.10,inside?-0.10:0,0]}>
        <Block p={[0,0.04,0]} s={[0.30,0.34,0.29]} c="#efbd96"/>
        <Block p={[0,0.235,0.015]} s={[0.32,0.10,0.30]} c="#583e30"/>
        <Block p={[-0.12,0.16,0]} s={[0.065,0.14,0.28]} c="#583e30"/>
        <Block p={[0,-0.005,-0.168]} s={[0.07,0.07,0.065]} c="#d99570"/>
        {[-1,1].map(s=><group key={s}>
          <Block p={[s*0.081,0.078,-0.151]} s={[0.041,0.046,0.016]} c="#2a3431"/>
          <Block p={[s*0.081,0.091,-0.161]} s={[0.011,0.012,0.005]} c="#fff5e4"/>
          <Block p={[s*0.081,0.14,-0.152]} s={[0.065,0.015,0.015]} r={[0,0,s*(inside?-0.12:cold?0.2:-0.12)]} c="#583e30"/>
          <Ball p={[s*0.16,0.015,0]} rad={0.044} c="#e6ae84"/>
        </group>)}
        <Block p={[0,-0.067,-0.153]} s={[inside?0.08:0.06,0.014,0.012]} c="#985b48"/>
        {inside&&[-1,1].map(s=><Block key={s} p={[s*0.04,-0.055,-0.154]} s={[0.015,0.03,0.012]} c="#985b48"/>)}
        {hasHat&&<group position={[0,0.16,0]}><Hat/></group>}
      </group>
      {[-1,1].map(s=><group key={s} position={[s*0.29,0.56+chill*0.035,0]} rotation={[inside?1.1:order&&s===-1?2.0:chill*0.35,0,s*(inside?-0.45:chill*-0.35)]}>
        <Block p={[0,-0.17,0]} s={[0.15,mix(0.23,0.37,Math.max(chill,jacket)),0.16]} c={torsoColor}/>
        <group position={[0,-0.31,0]} rotation={[(inside?1.0:chill*1.1),0,0]}>
          <Block p={[0,-0.12,0]} s={[0.13,0.24,0.14]} c={jacket>0.5?torsoColor:'#efbd96'}/>
          <Ball p={[0,-0.27,0]} rad={0.083} c="#efbd96" s={[0.8,1,0.85]}/>
        </group>
      </group>)}
      {cold>0&&!inside&&<group position={[0,0.65,0]}><Scarf t={t}/></group>}
      {blanket>0&&<group scale={[1,blanket,1]}>
        <Block p={[0,0.19,-0.19]} s={[0.66,0.59,0.075]} c="#d7b67e"/>
        <Block p={[0,-0.14,-0.29]} s={[0.66,0.12,0.5]} c="#d7b67e"/>
        {[-0.24,-0.12,0,0.12,0.24].map(x=><Block key={x} p={[x,0.19,-0.232]} s={[0.027,0.59,0.009]} c="#f4dba8"/>)}
        {[0.0,0.16,0.32].map(y=><Block key={y} p={[0,y,-0.239]} s={[0.67,0.018,0.009]} c="#ad8254"/>)}
      </group>}
      {hold>0&&<Mug p={[0,0.42,-0.53]} t={t}/>}
    </group>
  </group>;
};

const Waiter: React.FC<{t:number;action:number;walking:boolean}> = ({t,action,walking}) => <group>
  <Person pose={walking?'marche':'debout'} phase={t*8} shirt="#f5ead3" pants="#263e3d" hair="#353b36"/>
  <Block p={[0,0.99,-0.14]} s={[0.36,0.42,0.018]} c={TEAL}/>
  <Block p={[0,1.36,-0.15]} s={[0.08,0.11,0.02]} c={RED}/>
  <group position={[-0.26,1.44,0]} rotation={[-action*1.4,0,-action*0.7]}>
    <Block p={[0,-0.28,0]} s={[0.115,0.54,0.14]} c="#f5ead3"/>
    <Ball p={[0,-0.58,0]} rad={0.065} c="#e8b894"/>
  </group>
  {t<at('jacket')+1.25&&<group position={[-0.27,1.04,-0.24]} scale={1-prog('jacket',t,0.8,0.45)}><Block p={[0,0,0]} s={[0.4,0.22,0.25]} c="#385f68"/><Block p={[0,0.12,0]} s={[0.22,0.025,0.24]} c="#294a52"/></group>}
  {t>at('blanket')-0.5&&t<at('blanket')+1.1&&<group position={[-0.27,1.04,-0.24]} scale={1-prog('blanket',t,0.5,0.6)}><Block p={[0,0,0]} s={[0.44,0.24,0.29]} c="#d7b67e"/><Block p={[0,0.025,-0.15]} s={[0.44,0.025,0.01]} c="#f4dba8"/></group>}
</group>;

const Frost: React.FC<{p:V3;s:V3;amount:number;seed?:number}> = ({p,s,amount,seed=0}) => <group position={p}>
  {Array.from({length:32},(_,i)=>{
    const u=((i*0.61803398875+seed)%1)-0.5;
    const v=((i*0.41421356237+seed*0.7)%1)-0.5;
    const q=Math.max(0,Math.min(1,amount*1.6-(i%7)/9));
    return q>0&&<group key={i} position={[u*s[0],0,v*s[2]]} scale={q}>
      <Block p={[0,0.004,0]} s={[0.13,0.006,0.009]} r={[0,i,0]} c="#e7f6f7"/>
      <Block p={[0,0.005,0]} s={[0.009,0.006,0.11]} r={[0,i,0]} c="#d4eff5"/>
    </group>;
  })}
</group>;

const Cafe: React.FC<{t:number;frost:number}> = ({t,frost}) => <group>
  <Block p={[0,2.75,3.1]} s={[15,5.5,0.45]} c="#e3c9a0"/>
  <Block p={[0,0.28,2.83]} s={[15,0.56,0.12]} c={TEAL}/>
  <Block p={[0,3.4,2.8]} s={[15,0.16,0.32]} c="#f5dfb5"/>
  <Block p={[0,0.08,2.35]} s={[15,0.16,1.5]} c="#c8b598"/>
  {/* Real shallow interior behind an open frame, with a thin transparent front pane. */}
  <Block p={[0,1.65,3.02]} s={[4.1,2.55,0.05]} c="#452e24" e="#cc8d4d" ei={0.32}/>
  <Block p={[0,0.25,2.9]} s={[4.1,0.15,0.3]} c="#b89461"/>
  <Block p={[0.15,1.62,3.00]} s={[3.6,2.25,0.03]} c="#e4af6a" e="#eab76f" ei={0.35}/>
  {[-1.9,1.9].map(x=><Block key={x} p={[x,1.6,2.48]} s={[0.15,2.7,0.22]} c={TEAL}/>)}
  {[0.32,2.88].map(y=><Block key={y} p={[0,y,2.48]} s={[3.95,0.14,0.22]} c={TEAL}/>)}
  <Block p={[-1.05,1.62,2.5]} s={[0.08,2.5,0.18]} c={TEAL}/>
  <Block p={[1.06,0.93,2.78]} s={[0.8,0.075,0.45]} c="#9e6c43"/>
  <Cyl p={[1.06,0.61,2.78]} rad={0.035} h={0.62} c={TEAL}/>
  {t>=at('inside')&&<group position={[0.66,0.32,2.75]} scale={0.83} rotation={[0,0.12,0]}><Chair t={t} frost={0}/><Marc t={t} inside/></group>}
  <Block p={[0,1.63,2.40]} s={[3.65,2.35,0.012]} c="#b7d4d1" o={0.06+frost*0.035}/>
  {/* Frost grows along the edges and leaves the indoor character readable. */}
  {Array.from({length:20},(_,i)=>{const x=-1.8+i*0.18;const h=frost*(0.09+0.11*((i*7)%5));return <Block key={i} p={[x,0.41+h/2,2.37]} s={[0.18,h,0.015]} c="#dcf1ed" o={0.6}/>;})}
  {[-1.76,1.76].map(x=><Block key={x} p={[x,1.63,2.37]} s={[frost*0.15,2.25,0.018]} c="#dcf1ed" o={0.6}/>)}
  <Lettering text="CAFÉ DU SOLEIL" p={[0,2.69,2.32]} w={3.5} h={0.31}/>
  {/* Striped canopy; its shadow visibly withdraws from Marc. */}
  <group position={[0,3.0,1.74]} rotation={[0.12,0,0]}>
    {Array.from({length:20},(_,i)=><Block key={i} p={[-2.85+i*0.3,0,0]} s={[0.30,0.075,1.4]} c={i%2?CREAM:'#b74936'}/>)}
    {Array.from({length:20},(_,i)=><Block key={i} p={[-2.85+i*0.3,-0.13,-0.70]} s={[0.3,0.25,0.04]} c={i%2?CREAM:'#b74936'}/>)}
  </group>
  <group position={[-2.55,0.05,2.15]} scale={0.55}><Planter color="#926b4c" flowers="#e4ab4f"/></group>
  <group position={[2.55,0.05,2.15]} scale={0.55}><Planter color="#926b4c" flowers="#e4ab4f"/></group>
  <Lettering text="CAFÉ · CHOCOLAT" p={[-3.65,1.8,2.8]} w={1.9} h={0.65} size={58}/>
  <Lettering text="BIENVENUE" p={[3.6,1.8,2.8]} w={1.8} h={0.65} size={65}/>
  {[-4.9,4.9].map(x=><group key={x}>
    <Block p={[x,1.45,2.80]} s={[0.92,2.5,0.05]} c={TEAL}/>
    {[0.55,0.77,0.99,1.21,1.43,1.65,1.87,2.09,2.31].map(y=><Block key={y} p={[x,y,2.74]} s={[0.8,0.035,0.06]} c="#467571"/>)}
  </group>)}
  <pointLight position={[0.5,2.1,2.15]} color="#ffbb68" intensity={7} distance={4} decay={2}/>
</group>;

const Scene: React.FC<{t:number}> = ({t}) => {
  const cold=smooth(at('chill'),at('offer'),t);
  const frost=prog('frost',t,0.9,4.0);
  const shade=prog('shadow',t,1,Math.max(1,end('shadow')-at('shadow')-1.7));
  const rise=prog('rise',t,0.6,0.7);
  const exit=prog('rise',t,1.6,1.5);
  const inside=t>=at('inside');
  const final=t>=at('chair');
  const shift=0.36*prog('shadow',t,0.5,1.3);
  const chairX=-0.72+shift;
  let cam:V3=[3.4,2.9,-8.8]; let target:V3=[-0.05,1.44,0.2];let fov=34;
  if(t<at('chill')){const q=smooth(0,at('chill'),t);cam=[mix(3.4,2.65,q),mix(3.1,2.7,q),mix(-9.4,-8.4,q)];}
  else if(t<at('guests')){cam=[1.5,2.35,-6.3];target=[-0.35,1.35,-0.05];fov=35;}
  else if(t<at('frost')){cam=[3.3,3.2,-11.6];target=[-0.1,1.4,0.3];}
  else if(t<at('shadow')){cam=[1.6,2.9,-5.6];target=[0.1,1.15,-0.2];fov=38;}
  else if(t<at('rise')){cam=[1.9,2.6,-7.2];target=[0,1.35,0];}
  else if(!inside){cam=[3.2,2.9,-8.9];}
  else if(!final){cam=[1.7,2.1,-2.2];target=[0.5,1.5,2.5];fov=34;}
  else {const q=smooth(at('chair'),end('chair'),t);cam=[mix(2.7,3.4,q),mix(2.8,3.1,q),mix(-8.2,-9.4,q)];target=[0,1.4,0.3];}
  const leave=prog('guests',t,0.7,2.4);
  const waiterArrive=prog('jacket',t,0,1.2);
  const offer=prog('offer',t,0.8,0.5);
  return <>
    <color attach="background" args={[color('#f6dfb9','#b2c8d2',cold)]}/>
    <fog attach="fog" args={[color('#f6dfb9','#b2c8d2',cold),18,45]}/>
    <CameraRig position={cam} target={target} fov={fov}/>
    <hemisphereLight args={[color('#fff1cd','#d9efff',cold),'#7c8277',1.8]}/>
    <directionalLight position={[-3,9,-6]} color={color('#ffdf9e','#dcefff',cold)} intensity={mix(2.5,1.5,cold)}/>
    <directionalLight position={[6,5,1]} color="#fff2d6" intensity={0.6}/>
    <Block p={[0,-0.11,0]} s={[80,0.2,60]} c={color('#cbbca0','#a1b2b7',cold).getStyle()}/>
    {Array.from({length:17},(_,i)=><Block key={i} p={[0,-0.002,-5+i*0.55]} s={[20,0.007,0.014]} c={color('#b5a68e','#8c9da5',cold).getStyle()}/>)}
    {Array.from({length:24},(_,i)=><Block key={i} p={[-9+i*0.8,0,0]} s={[0.012,0.008,10]} c={color('#b5a68e','#8c9da5',cold).getStyle()}/>)}
    <Cafe t={t} frost={frost}/>
    {/* Neighbouring tables and customers use the repository's existing assets. */}
    <group position={[-2.0,0,0.7]} scale={0.65}><CafeTerrace color="#648a7c" umbrella={false}/></group>
    <group position={[2.3,0,0.85]} scale={0.65}><CafeTerrace color="#648a7c" umbrella={false}/></group>
    {leave<1&&[-1,1].map((side,i)=><group key={side} position={[side*1.55*(1-leave),leave*0.10,0.9+leave*1.8]} rotation={[0,leave*Math.PI,0]}>
      <Person pose={leave>0?'marche':'assis'} phase={t*8} shirt={i?'#c58748':'#667d87'} height={0.9}/>
    </group>)}
    {/* Warm patch retreats instead of an unrelated weather effect. */}
    {shade<1&&<Block p={[chairX+0.10,-0.001,-0.55]} s={[1.9*(1-shade),0.012,2.8]} r={[0,-0.35,0]} c="#f0d498" o={(1-cold*0.4)*0.46}/>}
    <group position={[chairX,0,-0.3]} rotation={[0,-0.12*(1-smooth(at('normal'),end('sunny'),t)),0]}>
      <Chair t={t} frost={frost} dressed={inside}/>
      {!inside&&exit<1&&<group position={[exit*1.0,0,exit*2.8]} rotation={[0,exit*Math.PI*0.8,0]}><Marc t={t} stand={rise}/></group>}
    </group>
    <group position={[0.40,0,-1.05]}>
      <Cyl p={[0,0.75,0]} rad={0.49} h={0.065} c={color('#d1ac76','#a8bdc4',frost*0.8).getStyle()}/>
      <Cyl p={[0,0.375,0]} rad={0.035} h={0.75} c={TEAL}/>
      <Cyl p={[0,0.035,0]} rad={0.26} h={0.07} c={TEAL}/>
      <Mug p={[-0.17,0.79,-0.05]} t={t} steam={inside?0:1}/>
      {t>=at('coffee')+0.8&&<Mug p={[0.13,0.79,0.15]} t={t} steam={inside?0:1}/>}
      <Cyl p={[0.22,0.795,-0.17]} rad={0.105} h={0.016} c="#f5e5c6"/>
      <Block p={[0.22,0.82,-0.17]} s={[0.12,0.04,0.08]} c="#a47143" r={[0,0.4,0]}/>
      <Frost p={[0,0.788,0]} s={[0.8,0.01,0.8]} amount={frost}/>
    </group>
    <Frost p={[0,-0.001,-0.2]} s={[4,0.01,2.5]} amount={frost*0.5} seed={1.3}/>
    {t>=at('jacket')&&t<at('inside')&&<group position={[mix(1.4,0.72,waiterArrive),0,mix(2.2,0.6,waiterArrive)]} rotation={[0,-0.5-offer*1.3,0]}>
      <Waiter t={t} action={offer} walking={waiterArrive<1}/>
    </group>}
  </>;
};

const Temperature: React.FC<{t:number}> = ({t}) => {
  const milestones=[{id:'normal',value:20,min:0},{id:'chill',value:10,min:1},{id:'jacket',value:0,min:2},{id:'guests',value:-10,min:3},{id:'frost',value:-20,min:4},{id:'offer',value:-30,min:5}];
  const current=[...milestones].reverse().find(m=>t>=at(m.id))??milestones[0];
  const warm=current.value>0;
  return <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'1px solid #fff2dc66',paddingTop:22,marginTop:24}}>
    <div><div style={{fontSize:19,letterSpacing:4,opacity:0.7}}>TEMPÉRATURE EXTÉRIEURE</div><div style={{fontSize:28,marginTop:6,fontWeight:500}}>{current.min===0?'DÉPART':`${current.min} MIN PLUS TARD`}</div></div>
    <div style={{fontSize:76,fontWeight:700,letterSpacing:-4,color:warm?'#ffe2a0':'#d7f2ff',fontVariantNumeric:'tabular-nums'}}>{current.value>0?'+':current.value<0?'−':''}{Math.abs(current.value)}<span style={{fontSize:38,letterSpacing:-1}}> °C</span></div>
  </div>;
};

const CafeCold: React.FC = () => {
  const frame=useCurrentFrame();const {fps,width,height}=useVideoConfig();const t=frame/fps;
  const cold=smooth(at('chill'),at('offer'),t);
  const final=t>=at('chair');
  const beat=timing.beats.find(b=>t>=b.start&&t<b.end);
  const part=t<at('chill')?'AVANT':t<at('inside')?'PENDANT':'APRÈS';
  const fade=smooth(0,0.45,t)*(1-smooth(timing.duration-0.55,timing.duration,t));
  return <AbsoluteFill style={{background:'#263e3e',fontFamily:'Arial, sans-serif'}}>
    <AbsoluteFill style={{opacity:fade}}>
      <ThreeCanvas width={width} height={height} camera={{fov:34,position:[3.4,3.1,-9.4]}} gl={{antialias:true,alpha:false}}><Scene t={t}/></ThreeCanvas>
      <AbsoluteFill style={{pointerEvents:'none',background:'linear-gradient(180deg,rgba(23,42,41,.88) 0%,rgba(23,42,41,.38) 19%,transparent 35%,transparent 66%,rgba(23,42,41,.7) 100%)'}}/>
      <div style={{position:'absolute',left:66,right:66,top:74,color:CREAM}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:21,letterSpacing:4,fontWeight:700}}><span>ET SI…</span><span style={{border:'1px solid #fff0d555',padding:'10px 16px',borderRadius:30,fontSize:17,letterSpacing:3}}>{part}</span></div>
        <div style={{fontFamily:'Georgia, serif',fontWeight:400,fontSize:77,lineHeight:1.02,letterSpacing:-3,marginTop:25}}>{t<at('normal')?<>−10 °C<br/>chaque minute.</>:<>La meilleure<br/>place au soleil.</>}</div>
        {!final&&<Temperature t={t}/>}
      </div>
      {!final&&beat&&<div style={{position:'absolute',left:74,right:74,bottom:226,textAlign:'center',color:CREAM,fontSize:57,fontWeight:700,lineHeight:1.12,textShadow:'0 3px 18px #193c3e88'}}>{beat.caption}</div>}
      <div style={{position:'absolute',left:66,right:66,bottom:77,display:'flex',justifyContent:'space-between',color:CREAM,opacity:0.70,fontSize:17,letterSpacing:2}}>
        <span>{t<at('chill')?'HYPOTHÈSE DE FICTION':'CAFÉ DU SOLEIL'}</span><span>{final?'': '−10 °C / MIN'}</span>
      </div>
      <div style={{position:'absolute',bottom:0,left:0,width:`${100*t/timing.duration}%`,height:5,background:color('#e5b867','#c1e0eb',cold).getStyle()}}/>
    </AbsoluteFill>
    {timing.beats.map(b=><Sequence key={b.id} from={Math.round(b.start*fps)} durationInFrames={Math.ceil(b.duration*fps)}><Audio src={staticFile(b.audio)} volume={0.95}/></Sequence>)}
    <Audio src={staticFile(timing.ambience ?? 'cafe-cold/ambience.wav')} volume={(f)=>timing.beats.some(b=>f/fps>=b.start&&f/fps<b.end)?0.55:0.9}/>
  </AbsoluteFill>;
};
return CafeCold;
};

export const CafeCold = createCafeCold(originalTiming);
