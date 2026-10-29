import React, {useLayoutEffect, useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {Block, Ball, Cyl} from '../../assets/kit';
import {EiffelTower} from '../../assets/EiffelTower';
import {Building} from '../../assets/Building';
import {Car} from '../../assets/Car';
import {Person} from '../../assets/Person';
import {Bicycle} from '../../assets/city/Mobility';
import {StreetLamp} from '../../assets/city/Street';
import {CameraRig} from '../../shared/three/common';
import {rng, smooth} from '../../core/animation';
import {ArticulatedPerson} from '../bus-cold/BusCold';
import {Marc} from '../../shared/characters/Marc';
import originalTimeline from './timing.json';
import {ParisDistrict, DistrictTraffic, DistrictCrowd} from '../paris-polar-v2/ParisDistrict';

type PolarTimeline={duration:number;ambience:string;beats:{id:string;start:number;end:number;duration:number;audio:string;caption:string}[]};
export const createParisPolar=(timeline:PolarTimeline,variant:'original'|'marc'='original',dense=false)=>{
const modeMarc=variant==='marc';
const aliases:Record<string,string>=modeMarc?{basket:'intro',bike:'slip',rescue:'escape',basketend:'buried'}:{};

type V3=[number,number,number];
const CREAM='#fff0d8',RED='#bd3936',TEAL='#2e5e67';
const at=(id:string)=>timeline.beats.find(b=>b.id===(aliases[id]??id))!.start;
const end=(id:string)=>timeline.beats.find(b=>b.id===(aliases[id]??id))!.end;
const p=(id:string,t:number,delay=0,dur=1)=>smooth(at(id)+delay,at(id)+delay+dur,t);
const lerp=(a:number,b:number,q:number)=>a+(b-a)*q;
const pos=(a:V3,b:V3,q:number):V3=>[lerp(a[0],b[0],q),lerp(a[1],b[1],q),lerp(a[2],b[2],q)];
const tint=(a:string,b:string,q:number)=>new THREE.Color(a).lerp(new THREE.Color(b),q).getStyle();
const local=(point:V3,origin:V3,yaw:number,scale=1):V3=>{
  const v=new THREE.Vector3(...point).sub(new THREE.Vector3(...origin)).applyAxisAngle(new THREE.Vector3(0,1,0),-yaw).divideScalar(scale);
  return [v.x,v.y,v.z];
};

const Label:React.FC<{text:string;p:V3;w:number;h:number;bg?:string;ink?:string}>=({text,p,w,h,bg=TEAL,ink=CREAM})=>{
  const texture=useMemo(()=>{
    const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d')!;
    g.fillStyle=bg;g.fillRect(0,0,1024,256);g.fillStyle=ink;g.font='600 91px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(text,512,132);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
  },[text,bg,ink]);
  return <mesh position={p}><planeGeometry args={[w,h]}/><meshBasicMaterial map={texture}/></mesh>;
};

const Mound:React.FC<{p:V3;s:V3;amount:number}>=({p,s,amount})=>amount<=.002?null:<mesh position={[p[0],p[1]+s[1]*amount*.08,p[2]]} scale={[s[0],Math.max(.001,s[1]*amount),s[2]]}><sphereGeometry args={[1,16,10]}/><meshStandardMaterial color="#e6f1f3" roughness={.93}/></mesh>;

/** A real aperture lets the family descend below ground into the metro. */
const Ground:React.FC<{snow:number;t:number}>=({snow,t})=>{
  const c=tint('#c8c0ad','#c5d8e2',snow),zLow=dense?-168:-100,zHigh=22,xLow=dense?-70:-36,xHigh=dense?70:36;
  const slabs=[{x0:xLow,x1:4.8,z0:zLow,z1:zHigh},{x0:7.2,x1:xHigh,z0:zLow,z1:zHigh},{x0:4.8,x1:7.2,z0:zLow,z1:1.2},{x0:4.8,x1:7.2,z0:5.3,z1:zHigh}];
  return <>
    {slabs.flatMap(s=>dense&&s.z0<-46?[{...s,z1:-46},{...s,z0:-34}]:[s]).map((s,i)=><group key={i}>
      <Block p={[(s.x0+s.x1)/2,-.12,(s.z0+s.z1)/2]} s={[s.x1-s.x0,.22,s.z1-s.z0]} c={c}/>
      {snow>.002&&<Block p={[(s.x0+s.x1)/2,snow*.58-.02,(s.z0+s.z1)/2]} s={[s.x1-s.x0,snow*1.16,s.z1-s.z0]} c="#dae8ef"/>}
    </group>)}
    {snow<.30&&Array.from({length:30},(_,i)=><Block key={i} p={[-22+i*1.5,-.003,3.4]} s={[.018,.008,22]} c="#a9aa9d"/>)}
    {snow<.30&&[-6,-4,-2,0,2,4,6,8,10].map(z=><Block key={z} p={[0,-.003,z]} s={[60,.008,.018]} c="#a9aa9d"/>)}
    <Block p={[0,.005,-24.0]} s={[65,.025,5.5]} c={tint('#62777c','#acc7d5',snow)}/>
    {snow<.3&&[-24.8,-23.1].map(z=>Array.from({length:12},(_,i)=><Block key={`${z}-${i}`} p={[-26+i*4.7,.025,z]} s={[2,.012,.07]} c="#ece5ca"/>))}
    {/* The late drift seals the empty stairwell only after the family has gone. */}
    <Mound p={[6,-.4,3.2]} s={[2.1,2.1,3.0]} amount={p('deep',t,.5,4)*snow}/>
  </>;
};

const Fountain:React.FC<{t:number;snow:number;ice:number}>=({t,snow,ice})=>{
  const flow=1-p('silence',t,0,1.2);
  return <group>
    {[-1,1].map(side=><group key={side} position={[side*5.2,0,-12.6]}>
      <Block p={[0,.17,0]} s={[5.2,.34,14]} c="#b4aa92"/>
      <Block p={[0,.35,0]} s={[4.8,.06,13.6]} c={tint('#5f9fa6','#c9e3ec',ice)}/>
      {[-2.5,2.5].map(x=><Block key={x} p={[x,.39,0]} s={[.17,.25,14.1]} c={tint('#d4c7a8','#e7eff0',snow)}/>)}
      {[-6.9,6.9].map(z=><Block key={z} p={[0,.39,z]} s={[5.1,.25,.17]} c={tint('#d4c7a8','#e7eff0',snow)}/>)}
      {[-5,-2.5,0,2.5,5].map((z,i)=><group key={z}>
        <Cyl p={[0,.58,z]} rad={.11} h={.34} c="#898f82"/>
        {flow>.01&&<group scale={[1,flow,1]}>
          <Cyl p={[0,1.38,z]} rad={.035} h={1.5+Math.sin(t*1.4+i)*.06} c={tint('#c8ede6','#d6eef6',ice)}/>
          {Array.from({length:6},(_,j)=>{const q=((t*.8+j/6+i*.12)%1);return <Ball key={j} p={[Math.sin(i+j)*q*.25,.7+Math.sin(q*Math.PI)*1.45,z+Math.cos(i+j)*q*.2]} rad={.035} c="#e8f9f3"/>;})}
        </group>}
      </group>)}
      {ice>.2&&Array.from({length:16},(_,i)=><Block key={i} p={[Math.sin(i*4)*2.1,.392,-6.5+i*.85]} s={[.8,.01,.02]} r={[0,i*.7,0]} c="#effbff" o={ice}/>)}
      {snow>.1&&<Mound p={[0,.25,0]} s={[2.45,.9,6.7]} amount={snow}/>}
    </group>)}
  </group>;
};

const Metro:React.FC<{snow:number}>=({snow})=><group>
  <Block p={[6,-1.3,1.35]} s={[2.3,2.6,.12]} c="#263d43"/>
  <Block p={[4.85,-.75,3.2]} s={[.1,2.0,4.1]} c="#8d9a97"/>
  <Block p={[7.15,-.75,3.2]} s={[.1,2.0,4.1]} c="#8d9a97"/>
  {Array.from({length:9},(_,i)=><Block key={i} p={[6,-.10-i*.22,5.1-i*.42]} s={[2.25,.20,.44]} c={i%2?'#b7b9a9':'#a5afa5'}/>)}
  {[-1,1].map(side=><group key={side}>
    {Array.from({length:7},(_,i)=><Cyl key={i} p={[6+side*1.24,.48,1.3+i*.64]} rad={.025} h={.97} c="#365f54"/>)}
    <Block p={[6+side*1.24,1.01,3.3]} s={[.065,.065,4.3]} c="#365f54"/>
    <Cyl p={[6+side*1.24,1.45,5.4]} rad={.055} h={2.9} c="#365f54"/>
    <Ball p={[6+side*1.24,2.94,5.4]} rad={.14} c="#d5a253" e="#e6b665" ei={.45}/>
  </group>)}
  <Label text="MÉTRO" p={[6,2.57,5.43]} w={2.4} h={.44} bg="#e2d9b5" ink="#335b50"/>
  <pointLight position={[6,-.9,2.6]} color="#ffd18a" intensity={8} distance={5}/>
  <Mound p={[4.70,-.02,3.2]} s={[.60,1.25,2.1]} amount={snow}/>
  <Mound p={[7.30,-.02,3.2]} s={[.6,1.25,2.1]} amount={snow}/>
</group>;

const RedBasket:React.FC=()=> <group position={[0,1.08,-.88]}>
  <Block p={[0,-.12,0]} s={[.43,.035,.36]} c={RED}/>
  {[-1,1].map(s=><group key={s}>
    <Block p={[s*.215,.02,0]} s={[.026,.31,.36]} c={RED}/>
    <Block p={[0,.02,s*.18]} s={[.43,.31,.026]} c={RED}/>
    {[-.11,0,.11].map(y=><Block key={y} p={[0,y,s*.196]} s={[.43,.018,.014]} c="#e85b4b"/>)}
  </group>)}
</group>;

const Bike:React.FC<{t:number;snow:number;ice:number}>=({t,snow,ice})=>{
  const slip=p('bike',t,.75,.65);
  return <group position={[-1.8-slip*.22,0,2.2]} rotation={[0,.65+slip*.20,-slip*.10]}>
    <Bicycle color="#803e36" basket={false} wheelSpin={p('bike',t,.1,.6)*.8}/><RedBasket/>
    <Mound p={[0,-.02,-.12]} s={[.65,1.20,.75]} amount={snow}/>
    <Mound p={[0,-.02,.60]} s={[.60,1.16,.60]} amount={snow}/>
    {ice>.1&&Array.from({length:18},(_,i)=><Block key={i} p={[-.7+(i*.17)%1.6,.012,-.9+(i*.29)%1.8]} s={[.22,.01,.01]} r={[0,i,0]} c="#d6f3ff" o={ice}/>)}
  </group>;
};

const Snowfall:React.FC<{t:number;storm:number}>=({t,storm})=>{
  const data=useMemo(()=>{
    const random=rng(3206),seeds=Array.from({length:4200},()=>({x:random(),y:random(),z:random(),k:random()}));
    const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(seeds.length*3),3));
    return {seeds,geometry};
  },[]);
  useLayoutEffect(()=>{
    const a=data.geometry.getAttribute('position') as THREE.BufferAttribute;
    const speed=2+storm*8;
    data.seeds.forEach((s,i)=>{
      const x=(((s.x*70+t*(1+storm*13))%70)+70)%70-35;
      const y=((s.y*30-t*speed*(.65+s.k*.4))%30+30)%30;
      a.setXYZ(i,x,y,dense?s.z*180-160:s.z*95-76);
    });a.needsUpdate=true;
  });
  return <points geometry={data.geometry}><pointsMaterial color="#f2f9ff" size={.07+storm*.045} transparent opacity={storm*.85} depthWrite={false}/></points>;
};

const Family:React.FC<{t:number;snow:number}>=({t,snow})=>{
  const walking=smooth(at('bike')+2.3,end('traffic'),t),rescue=p('rescue',t,.15,Math.max(1,end('rescue')-at('rescue')-.25));
  const lift=smooth(.16,.45,rescue),down=smooth(.48,1,rescue);
  const escaped=t>=at('deep');
  const floor=snow*.75+.02;
  const fatherPos:V3=t>=at('rescue')?[lerp(5.5,6,Math.min(1,rescue*2)),lerp(floor,-1.7,down),lerp(5.85,2.5,down)]:t>=at('bike')?pos([-1.35,floor,2.9],[5.5,floor,5.85],walking):[2.05,floor,5.0];
  const picking=t>=at('bike')&&t<at('bike')+2.3;
  const fatherYaw=t>=at('rescue')?lerp(-1.98,0,lift):t>=at('bike')?lerp(.45,-1.98,p('bike',t,1.7,.6)):.52;
  const joining=p('bike',t,1.6,.9);
  const childBase:V3=t>=at('bike')?pos([.60,floor,2.8],[fatherPos[0]-.48,Math.max(floor,fatherPos[1]),fatherPos[2]+.1],joining):[.60,floor,2.8];
  const carried:V3=[fatherPos[0]+.28,fatherPos[1]+.85,fatherPos[2]-.32];
  const childPos=pos(childBase,carried,lift),childYaw=t>=at('rescue')?Math.PI:picking?Math.PI/2:t>=at('bike')?-1.98:Math.PI;
  const contact:V3=[fatherPos[0]-.24,floor+.99,fatherPos[2]+.06];
  const photo=t<at('wind');
  const phoneLower=p('wind',t,.4,1.2);
  const dadLeft:V3=lift>.1?[-.12,1.13,-.40]:picking?local([-1.65,1.08,2.35],fatherPos,fatherYaw):photo?[-.1,1.35,-.42]:[.29,lerp(1.3,.90,phoneLower),-.22];
  const dadRight:V3=lift>.1?[.37,1.29,-.30]:t>=at('bike')&&!picking?local(contact,fatherPos,fatherYaw):photo?[.1,1.35,-.42]:[.35,.92,-.2];
  if(escaped)return null;
  return <>
    <group position={fatherPos} rotation={[0,fatherYaw,-p('wind',t,.6,2)*.045]}>
      <ArticulatedPerson kind="driver" t={t} coatColor="#607783" hideBadge happy={t<at('wind')} stumble={p('wind',t,.4,1)*.05} walk={t>=at('rescue')&&down<1?.5:walking>0&&walking<1?.8:0} coat={p('chill',t,.6,1)} leftHand={dadLeft} rightHand={dadRight}/>
      {(photo||(t<end('wind')&&t>=at('wind')))&&<group position={[0,lerp(1.37,.90,phoneLower),lerp(-.48,-.21,phoneLower)]}>
        <Block p={[0,0,0]} s={[.17,.27,.025]} c="#293943"/><Ball p={[.045,.08,.015]} rad={.024} c="#9bb2ba"/>
        {t>at('normal')+1.2&&t<at('normal')+1.32&&<pointLight position={[0,0,-.04]} color="#ffffff" intensity={10} distance={5}/>}
      </group>}
    </group>
    <group position={childPos} rotation={[0,childYaw,(1-lift)*p('rescue',t,.05,.4)*.24]} scale={.67}>
      <ArticulatedPerson kind="maya" t={t} coatColor="#cd9c45" happy={t<at('wind')} stumble={p('wind',t,.4,1)*.05} coat={p('chill',t,.4,1)} scarf={p('wind',t,.3,.8)} sit={lift>.6} walk={walking>0&&walking<1?1:0}
        leftHand={lift>.5?[-.15,.9,-.2]:t>=at('bike')&&!picking?local(contact,childPos,childYaw,.67):t>=at('chill')?[-.13,1.55,-.20]:[-.32,1.05,-.08]}
        rightHand={t>=at('chill')&&t<at('bike')?[.13,1.50,-.21]:[.25,.9,-.16]}/>
    </group>
  </>;
};

const MarcScene:React.FC<{t:number;snow:number}>=({t,snow})=>{
  const floor=snow*.75+.02,slip=p('slip',t,.25,.7),recover=p('slip',t,1.3,1.1);
  const walk=smooth(at('slip')+2.4,end('traffic'),t);
  const down=p('escape',t,.45,Math.max(1,end('escape')-at('escape')-.6));
  const origin:V3=t>=at('escape')?[6.65,lerp(floor,-1.7,down),lerp(5.9,2.5,down)]:pos([.6,floor,.6-slip*.75],[6.65,floor,5.9],walk);
  const yaw=t>=at('escape')?0:lerp(Math.PI,-2.42,smooth(at('slip')+2.2,at('slip')+3.2,t));
  const roll=(slip-recover)*.20-p('wind',t,.5,2)*.035;
  const handLocal=(world:V3):V3=>{
    const v=new THREE.Vector3(...world).sub(new THREE.Vector3(...origin)).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,roll)).invert());
    return [v.x,v.y,v.z];
  };
  const photo=t<at('wind'),lower=p('wind',t,.25,.9),collar=t>=at('chill')&&t<at('wind');
  const left:V3=slip>.1&&recover<.98?handLocal([1.25,1.13,-.43]):collar?[-.13,1.55,-.20]:[-.30,1.0,-Math.sin(t*7)*walk*.12];
  const right:V3=photo?[.24,lerp(1.48,1.6,collar?1:0),-.48]:t>=at('escape')&&down<.45?handLocal([7.24,1.01,origin[2]]):[.30,lerp(1.48,.96,lower),-.22];
  if(t>=at('deep'))return null;
  return <group position={origin} rotation={[0,yaw,roll]}>
    <Marc t={t} walk={t>=at('escape')?.6:walk>0&&walk<1?.9:0} coat={p('chill',t,.5,1.2)} cold={p('wind',t,.2,2)} leftHand={left} rightHand={right}/>
    {t<end('wind')&&<group position={right}>
      <Block p={[0,.09,-.02]} s={[.15,.26,.025]} c="#293943"/><Ball p={[.04,.17,-.036]} rad={.02} c="#91a5b0"/>
      {t>at('normal')+1.2&&t<at('normal')+1.32&&<pointLight position={[0,0,-.06]} color="#fff" intensity={10} distance={5}/>}
    </group>}
  </group>;
};

const Scene:React.FC<{t:number}>=({t})=>{
  const cold=smooth(at('chill'),at('deep'),t),storm=dense?.22*smooth(at('snow')-.25,at('snow')+2,t)+.78*smooth(at('snow')+1,at('deep')+2,t):smooth(at('snow')-.7,at('deep')+2,t),ice=p('snow',t,.4,3.3);
  const snow=dense?.16*smooth(at('snow'),at('snow')+3,t)+.84*smooth(at('snow')+2,end('silence'),t):smooth(at('snow'),end('silence'),t),vanish=p('tower',t,0,Math.max(1,end('tower')-at('tower')));
  const fogNear=lerp(dense?110:65,dense?38:12,storm),fogFar=lerp(dense?300:240,lerp(dense?170:112,dense?78:58,vanish),storm);
  let camera:V3=[0,4.5,17],target:V3=[0,3.7,-4],fov=42;
  if(t>=at('normal')&&t<at('basket')){camera=[0,2.8,12.5];target=[.2,2.05,-2];fov=42;}
  if(t>=at('basket')&&t<at('chill')){camera=[1.5,2.4,7.7];target=[-1.5,1.05,2.3];fov=38;}
  if(t>=at('chill')&&t<at('wind')){camera=[2.7,2.2,7.5];target=[.6,1.0,2.8];fov=36;}
  if(t>=at('wind')&&t<at('snow')){camera=[4.8,2.7,9.5];target=[1.25,1.4,3.6];fov=38;}
  if(t>=at('snow')&&t<at('bike')){camera=[7.5,4.6,13];target=[0,2,-5];fov=44;}
  if(t>=at('bike')&&t<at('traffic')){const q=smooth(at('bike')+2.3,end('bike'),t);camera=pos([2.5,2.7,8],[4.5,2.8,10],q);target=pos([-1.3,1.0,2.4],[0,1.1,3.7],q);fov=40;}
  if(t>=at('traffic')&&t<at('rescue')){camera=[9,3.8,-19.7];target=[1.5,1.1,-24];fov=45;}
  if(t>=at('rescue')&&t<at('deep')){camera=[10,3.4,11];target=[5.8,.9,4.3];fov=39;}
  if(t>=at('basketend')&&t<at('tower')){camera=[1.4,2.1,8];target=[-1.9,1.1,2];fov=40;}
  if(modeMarc){
    if(t>=at('normal')&&t<at('chill')){camera=[.6,2.35,7.5];target=[.6,1.55,.1];fov=38;}
    if(t>=at('chill')&&t<at('snow')){camera=[2.5,2.15,6];target=[.6,1.18,.4];fov=36;}
    if(t>=at('slip')&&t<at('traffic')){const follow=smooth(at('slip')+2.4,end('traffic'),t);camera=pos([2.4,2.4,6.5],[8.45,2.7,11.8],follow);target=pos([.6,1.15,.1],[6.65,1.4,5.9],follow);fov=39;}
    if(t>=at('buried')&&t<at('tower')){camera=[0,4.5,17];target=[0,3.7,-4];fov=42;}
  }
  if(dense){
    if(t<at('normal')||t>=at('return')){camera=[0,7,20];target=[0,8.5,-32];fov=46;}
    if(t>=at('normal')&&t<at('chill')){camera=[.6,2.7,11];target=[.6,3.4,-4];fov=44;}
    if((t>=at('intro')&&t<at('cta'))||(t>=at('snow')&&t<at('slip'))||(t>=at('deep')&&t<at('return'))){camera=[7,8,-145];target=[0,10,-82];fov=48;}
    if(t>=at('traffic')&&t<at('escape')){camera=[15,11,1];target=[0,0,-24];fov=50;}
  }
  const quake=storm*.015*Math.sin(t*19);
  camera=[camera[0]+quake,camera[1]+quake*.5,camera[2]];
  const traffic=p('traffic',t,.1,1.2);
  return <>
    <color attach="background" args={[tint('#e1ddc7','#c6d9e5',cold)]}/>
    <fog attach="fog" args={[tint('#e1ddc7','#c6d9e5',cold),fogNear,fogFar]}/>
    <CameraRig position={camera} target={target} fov={fov}/>
    <hemisphereLight args={[tint('#fff0c9','#e2f3ff',cold),'#667b80',1.8]}/>
    <directionalLight position={[-4,12,9]} color={tint('#ffdfa7','#e5f4ff',cold)} intensity={lerp(2.3,1.2,cold)}/>
    <Ground snow={snow} t={t}/>
    <group position={[0,0,dense?-82:-65]}><EiffelTower height={dense?25:15} color={tint('#7b674f','#849aa8',cold)} lit={.2} beacon={.4}/></group>
    {dense?<ParisDistrict snow={snow} cold={cold}/>:<>{[-1,1].map(side=><group key={side}>
      {[-50,-37,-28].map((z,i)=><group key={z} position={[side*(17+i*.6),0,z]} rotation={[0,Math.PI,0]} scale={.32}><Building floors={4} stone={side<0?'#c7bda7':'#c4c4b3'} awning={null} lit={.1+cold*.25} seed={10+i}/></group>)}
      <Block p={[side*20,2.5,8]} s={[13,5,8]} c={tint('#c5bba1','#aebfcc',cold)}/>
      <Block p={[side*20,5.1,8]} s={[13.3,.22,8.3]} c="#e1d4b9"/>
      {[0,1,2,3,4,5].map(i=><Block key={i} p={[side*20-5+i*2,3.1,12.1]} s={[.5,2.8,.1]} c="#9faba6"/>)}
    </group>)}</>}
    <Fountain t={t} snow={snow} ice={ice}/>
    <Metro snow={snow}/>
    {/* Foreground balustrade and red basket are shared by the before and after shots. */}
    {Array.from({length:13},(_,i)=><Cyl key={i} p={[-8+i,.5,-.5]} rad={.10} h={1.0} c={tint('#b9af94','#d1e0e6',snow)}/>)}
    <Block p={[-2,1.04,-.5]} s={[12.3,.14,.28]} c={tint('#d1c4a5','#e2edf2',snow)}/>
    {!modeMarc&&<Bike t={t} snow={snow} ice={ice}/>}
    {!dense&&[-1,1].map(side=><group key={side} position={[side*11,0,-4]}><StreetLamp height={4.3} lit={.3+storm*.5}/></group>)}
    {Array.from({length:24},(_,i)=>{
      const r=((i*.618)%1),x=-12+r*24,z=-3-((i*.414)%1)*28;
      return <Mound key={i} p={[x,-.05,z]} s={[.9+(i%4)*.35,.6+(i%5)*.18,1.2+(i%3)*.5]} amount={snow}/>;
    })}
    {dense?<DistrictTraffic t={t} snow={snow} stop={at('traffic')}/>:<>{[-1,0,1].map((k,i)=>{
      const sx=i===0?.5:i===1?5.1:-6.2,z=i===2?-26:-23.4;
      const x=sx+Math.max(0,at('traffic')+(i===1?.8:0)-t)*.62;
      return <group key={i} position={[x,snow*.10,z]} rotation={[0,Math.PI/2+(i===0?traffic*.23:0),0]}>
        <Car color={i===0?'#b35243':i===1?'#c8a452':'#477d86'} variant={i===1?'taxi':'citadine'} lights={.6+storm*.4} wheelSpin={-x*2*(1-traffic)}/>
        <Mound p={[0,.12,0]} s={[1.1,1.55,2.1]} amount={snow}/>
      </group>;
    })}</>}
    {dense?<DistrictCrowd t={t} snow={snow} flee={at('traffic')} empty={at('deep')}/>:<>{Array.from({length:9},(_,i)=>{
      const q=smooth(at('traffic')+i*.12,end('rescue')-1+i*.08,t);
      if(q>.96||t>=at('deep')||(t>=at('rescue')&&i>=3))return null;
      const start:V3=[-9+((i*.618)%1)*17+(i%3===0?Math.sin(t*.4+i)*.5:0),0,-1-((i*.414)%1)*5];
      const pp=pos(start,[6,-1.6,3],q);
      pp[1]=q<.82?snow*.7:lerp(0,-1.6,(q-.82)/.18);
      return <group key={i} position={pp} rotation={[0,q>0?-2.1:i*1.7+.35,0]} scale={.82+(i%3)*.08}><Person pose={q>0||i%3===0?'marche':'debout'} phase={t*(q>0?12:3)+i} shirt={['#73837c','#a56c56','#676a86'][i%3]} pants="#3a4c58" hairStyle={i%3===0?'long':'court'}/></group>;
    })}</>}
    {modeMarc?<MarcScene t={t} snow={snow}/>:<Family t={t} snow={snow}/>}<Snowfall t={t} storm={storm}/>
  </>;
};

const ScreenSnow:React.FC<{t:number;storm:number}>=({t,storm})=>{
  const flakes=useMemo(()=>{const r=rng(603);return Array.from({length:150},()=>({x:r(),y:r(),s:r()}));},[]);
  if(storm<=.005)return null;
  return <svg viewBox="0 0 1080 1920" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',opacity:storm*.60}}>
    {flakes.map((f,i)=>{
      const x=((f.x*1300+t*(50+storm*240)*(1+f.s))%1300)-110,y=((f.y*2200+t*(90+f.s*90))%2200)-150;
      return <line key={i} x1={x} y1={y} x2={x+(6+storm*26)*(1+f.s)} y2={y+8+storm*22} stroke="#f4fbff" strokeWidth={.7+f.s*1.3}/>;
    })}
  </svg>;
};

const ParisPolar:React.FC=()=>{
  const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig(),t=frame/fps;
  const storm=dense?.22*smooth(at('snow')-.25,at('snow')+2,t)+.78*smooth(at('snow')+1,at('deep')+2,t):smooth(at('snow'),at('deep')+2,t),after=t>=at('deep');
  const fade=smooth(0,.35,t)*(1-smooth(timeline.duration-.6,timeline.duration,t));
  const beat=timeline.beats.find(b=>t>=b.start&&t<b.end);
  const cta=t>=at('cta')&&t<end('cta')+.2;
  const quiet=t>=(modeMarc?end('tower'):end('cta'))+.2;
  const champ=dense&&((t>=at('intro')&&t<at('cta'))||(t>=at('snow')&&t<at('slip'))||(t>=at('deep')&&t<at('return')));
  const label=[{id:'normal',min:0,c:20},{id:'chill',min:1,c:10},{id:'wind',min:2,c:0},{id:'snow',min:3,c:-10},{id:'traffic',min:4,c:-20},{id:'deep',min:6,c:-40}].reverse().find(m=>t>=at(m.id))??{min:0,c:20};
  return <AbsoluteFill style={{background:'#b6cbd9',fontFamily:'Arial, sans-serif'}}>
    <AbsoluteFill style={{opacity:fade}}>
      <ThreeCanvas width={width} height={height} camera={{fov:42,position:[0,4.5,17]}} gl={{antialias:true,alpha:false}}><Scene t={t}/></ThreeCanvas>
      <AbsoluteFill style={{pointerEvents:'none',background:`rgba(210,228,241,${storm*.10})`}}/>
      <ScreenSnow t={t} storm={storm}/>
      <AbsoluteFill style={{pointerEvents:'none',background:'linear-gradient(180deg,rgba(25,43,56,.83) 0%,rgba(25,43,56,.22) 20%,transparent 34%,transparent 70%,rgba(25,43,56,.48) 100%)'}}/>
      {!quiet&&<div style={{position:'absolute',left:66,right:66,top:74,color:CREAM}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:21,letterSpacing:4,fontWeight:700}}><span>ET SI…</span><span style={{border:'1px solid #fff0d866',borderRadius:30,padding:'10px 16px',fontSize:17,letterSpacing:3}}>{t<at('chill')?'AVANT':after?'APRÈS':'PENDANT'}</span></div>
        <div style={{fontFamily:'Georgia, serif',fontSize:76,lineHeight:1.02,letterSpacing:-3,marginTop:22}}>{t<at('normal')?<>Paris perd<br/>10 °C par minute.</>:after?<>Paris,<br/>six minutes après.</>:modeMarc?<>Marc face<br/>au froid.</>:<>Une photo<br/>à Paris.</>}</div>
        {!cta&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:20,paddingTop:17,borderTop:'1px solid #fff0d866'}}>
          <div><div style={{fontSize:17,letterSpacing:3,opacity:.75}}>TEMPÉRATURE EXTÉRIEURE</div><div style={{fontSize:27,marginTop:6}}>{label.min?`${label.min} MINUTES`:'DÉPART'}</div></div>
          <div style={{fontSize:72,fontWeight:700,letterSpacing:-4,color:label.c>0?'#ffe1a0':'#d9f3ff'}}>{label.c>0?'+':label.c<0?'−':''}{Math.abs(label.c)}<span style={{fontSize:36}}> °C</span></div>
        </div>}
      </div>}
      {!after&&beat?.caption&&<div style={{position:'absolute',left:72,right:72,bottom:228,textAlign:'center',fontSize:54,lineHeight:1.12,fontWeight:700,color:CREAM,textShadow:'0 3px 16px #193d4a88'}}>{beat.caption}</div>}
      {cta&&<div style={{position:'absolute',left:66,right:66,bottom:224,padding:'26px 30px',background:'#254b60db',borderRadius:18,color:CREAM,textAlign:'center',border:'1px solid #e2eff366'}}>
        <div style={{fontSize:43,fontWeight:700}}>{modeMarc?'LIKE · ABONNE-TOI':'J’AIME · ABONNE-TOI'}</div><div style={{fontSize:35,lineHeight:1.2,marginTop:14}}>Propose ta prochaine idée de vidéo<br/>en commentaire.</div>
      </div>}
      {!quiet&&<div style={{position:'absolute',left:66,right:66,bottom:77,display:'flex',justifyContent:'space-between',fontSize:16,letterSpacing:2,color:CREAM,opacity:.75}}><span>{champ?'PARIS · CHAMP-DE-MARS':t<at('chill')?'FICTION · SCÉNARIO CATASTROPHE':'PARIS · TROCADÉRO'}</span><span>{after?'':'−10 °C / MIN'}</span></div>}
      {!quiet&&<div style={{position:'absolute',bottom:0,left:0,height:5,width:`${t/timeline.duration*100}%`,background:'#b8443c'}}/>}
    </AbsoluteFill>
    {timeline.beats.map(b=><Sequence key={b.id} from={Math.round(b.start*fps)} durationInFrames={Math.ceil(b.duration*fps)}><Audio src={staticFile(b.audio)} volume={.98}/></Sequence>)}
    <Audio src={staticFile(timeline.ambience)} volume={f=>f/fps>=at('cta')&&f/fps<end('cta')?.20:timeline.beats.some(b=>f/fps>=b.start&&f/fps<b.end)?.45:.9}/>
  </AbsoluteFill>;
};
return ParisPolar;
};
export const ParisPolar=createParisPolar(originalTimeline);
