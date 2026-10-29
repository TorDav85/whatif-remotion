import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {Block, Ball, Cyl} from '../../assets/kit';
import {Bus} from '../../assets/Car';
import {BusShelter, StreetLamp} from '../../assets/city/Street';
import {CameraRig} from '../../shared/three/common';
import {smooth} from '../../core/animation';
import timeline from './timing.json';

type V3=[number,number,number];
const CREAM='#fff1d8',TEAL='#285e66',YELLOW='#e9b94d',SCARF='#cc814c';
const at=(id:string)=>timeline.beats.find(b=>b.id===id)!.start;
const end=(id:string)=>timeline.beats.find(b=>b.id===id)!.end;
const progress=(id:string,t:number,delay=0,duration=1)=>smooth(at(id)+delay,at(id)+delay+duration,t);
const lerp=(a:number,b:number,p:number)=>a+(b-a)*p;
const tint=(a:string,b:string,p:number)=>new THREE.Color(a).lerp(new THREE.Color(b),p).getStyle();
const pos=(a:V3,b:V3,p:number):V3=>[lerp(a[0],b[0],p),lerp(a[1],b[1],p),lerp(a[2],b[2],p)];
const local=(point:V3,origin:V3,yaw:number):V3=>{
  const v=new THREE.Vector3(...point).sub(new THREE.Vector3(...origin)).applyAxisAngle(new THREE.Vector3(0,1,0),-yaw);
  return [v.x,v.y,v.z];
};

const Bone:React.FC<{a:V3;b:V3;color:string;width?:number}>=({a,b,color,width=.13})=>{
  const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),d=bb.clone().sub(aa);
  return <mesh position={aa.add(bb).multiplyScalar(.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize())} scale={[width,d.length(),width]}><boxGeometry/><meshStandardMaterial color={color} roughness={.85}/></mesh>;
};

const Sign:React.FC<{text:string;p:V3;w:number;h:number;bg?:string;ink?:string;size?:number}>=({text,p,w,h,bg=TEAL,ink=CREAM,size=80})=>{
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle=bg;ctx.fillRect(0,0,1024,256);
    ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${size}px Arial`;ctx.fillText(text,512,132);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
  },[text,bg,ink,size]);
  return <mesh position={p}><planeGeometry args={[w,h]}/><meshBasicMaterial map={texture}/></mesh>;
};

const Bag:React.FC<{p?:V3;scale?:number}>=({p=[0,0,0],scale=1})=><group position={p} scale={scale}>
  <Block p={[0,.15,0]} s={[.35,.30,.16]} c={YELLOW}/>
  <Block p={[0,.15,-.088]} s={[.23,.18,.016]} c="#d69d36"/>
  <Block p={[0,.25,-.10]} s={[.055,.045,.015]} c="#8d6b34"/>
  {[-.045,.045].map(z=><mesh key={z} position={[0,.34,z]}><torusGeometry args={[.10,.014,7,18,Math.PI]}/><meshStandardMaterial color="#8b6436"/></mesh>)}
</group>;

const Cane:React.FC<{p:V3;tilt?:number}>=({p,tilt=0})=><group position={p} rotation={[0,0,tilt]}>
  <Cyl p={[0,.40,0]} rad={.016} h={.79} c="#6a4936"/>
  <Cyl p={[0,.027,0]} rad={.028} h={.055} c="#293d40"/>
  <mesh position={[-.06,.79,0]}><torusGeometry args={[.06,.018,8,16,Math.PI]}/><meshStandardMaterial color="#6a4936"/></mesh>
</group>;

const NeckScarf:React.FC<{amount:number;t:number}>=({amount,t})=><group>
  <Block p={[0,.68,-.015]} s={[.46,.11,.31]} c={SCARF}/>
  <group position={[.13,.66,-.19]} rotation={[.06*Math.sin(t*2),0,-.10]}>
    <Block p={[0,-lerp(.16,.21,amount),0]} s={[.14,lerp(.32,.42,amount),.035]} c={SCARF}/>
    {[-.08,-.18,-.28].map(y=><Block key={y} p={[0,y,-.021]} s={[.145,.025,.006]} c="#f4cf8f"/>)}
  </group>
</group>;

/** Joint endpoints keep the two hands in physical contact during the assisted walk. */
const Actor:React.FC<{kind:'maya'|'elder'|'driver';t:number;sit?:boolean;walk?:number;stumble?:number;coat?:number;scarf?:number;bag?:boolean;leftHand?:V3;rightHand?:V3;happy?:boolean;coatColor?:string;hideBadge?:boolean}>=({kind,t,sit=false,walk=0,stumble=0,coat=1,scarf=0,bag=false,leftHand,rightHand,happy=false,coatColor,hideBadge=false})=>{
  const elder=kind==='elder',maya=kind==='maya';
  const skin=maya?'#b17b58':elder?'#e2b897':'#c79877';
  const cloth=coatColor??(maya?'#356f7d':elder?'#766a7e':'#304b63');
  const hip=sit?.55:lerp(.94,.60,stumble);
  const bob=!sit?Math.abs(Math.sin(t*6))*walk*.025:0;
  const arm=(s:number,target?:V3)=>{
    const shoulder:V3=[s*.27,hip+.55,0];
    const hand:V3=target??[s*.29,hip-.03,-Math.sin(t*7+s)*walk*.10];
    const elbow=pos(shoulder,hand,.51);elbow[0]+=s*.045;elbow[2]+=.035;
    return <group key={s}><Bone a={shoulder} b={elbow} color={cloth} width={.14}/><Bone a={elbow} b={hand} color={cloth} width={.12}/><Ball p={hand} rad={.075} c={skin}/></group>;
  };
  return <group position={[0,bob,0]}>
    {[-1,1].map(s=>{
      const step=Math.sin(t*6.5+s*Math.PI/2)*walk;
      const h:V3=[s*.13,hip,0],k:V3=sit?[s*.13,hip,-.36]:[s*.13,lerp(.49,.32,stumble),-step*.13],f:V3=sit?[s*.13,.10,-.38]:[s*.13,.07+Math.max(0,step)*.06,-step*.28];
      return <group key={s}><Bone a={h} b={k} color="#35454e" width={.17}/><Bone a={k} b={f} color="#35454e" width={.15}/><Block p={[f[0],f[1]-.015,f[2]-.045]} s={[.19,.11,.29]} c={elder?'#54413c':'#28383f'}/></group>;
    })}
    <Block p={[0,hip+.31,0]} s={[.47,.62,.29]} c={cloth}/>
    <Block p={[0,hip+.31,-.153]} s={[lerp(.20,.025,coat),.5,.012]} c={maya?'#e7d9ba':'#c9bdac'}/>
    {[-.12,.12].map(x=><Block key={x} p={[x,hip+.46,-.16]} s={[.09,.19,.025]} r={[0,0,x*2]} c={maya?'#294f5b':elder?'#625b6f':'#263d52'}/>)}
    {[-.15,.15].map(x=><Block key={x} p={[x,hip+.16,-.158]} s={[.12,.018,.016]} c="#b2b1a2"/>)}
    {[.15,.30,.45].map(y=><Ball key={y} p={[.025,hip+y,-.165]} rad={.012} c="#d4b67b"/>)}
    <Block p={[0,hip+.67,0]} s={[.15,.14,.15]} c={skin}/>
    <group position={[0,hip+.83,-stumble*.07]} rotation={[elder?.08:0,0,stumble*.08]}>
      <Block p={[0,.015,0]} s={[.29,.33,.28]} c={skin}/>
      <Block p={[0,-.01,-.17]} s={[.065,.075,.065]} c={maya?'#9e684a':'#cc9b7b'}/>
      {[-1,1].map(s=><group key={s}>
        <Block p={[s*.075,.065,-.146]} s={[.050,.041,.012]} c="#f5e8cf"/>
        <Block p={[s*.075,.065,-.155]} s={[.025,.032,.008]} c="#24373a"/>
        <Block p={[s*.075,.12,-.15]} s={[.065,.014,.012]} r={[0,0,s*(happy?-.12:stumble?.25:.02)]} c={elder?'#a9a39a':'#372e29'}/>
        <Ball p={[s*.15,0,0]} rad={.038} c={skin}/>
      </group>)}
      <Block p={[0,-.067,-.145]} s={[.07,.014,.01]} c="#855a4b"/>
      {happy&&[-1,1].map(s=><Block key={s} p={[s*.035,-.057,-.146]} s={[.012,.025,.01]} c="#855a4b"/>)}
      {maya?<><Block p={[0,.19,.02]} s={[.31,.085,.29]} c="#352c29"/><Block p={[0,.08,.12]} s={[.31,.22,.08]} c="#352c29"/><Ball p={[0,.23,.17]} rad={.115} c="#352c29"/></>:elder?<><Block p={[0,.19,.01]} s={[.32,.075,.29]} c="#8b7962"/><Block p={[0,.15,-.13]} s={[.34,.025,.15]} c="#6f604f"/>{[-1,1].map(s=><Block key={s} p={[s*.145,.06,.02]} s={[.025,.15,.19]} c="#b7b2a9"/>)}</>:<Block p={[0,.19,.01]} s={[.31,.09,.29]} c="#393b37"/>}
    </group>
    {arm(-1,leftHand)}{arm(1,rightHand)}
    {maya&&scarf>0&&<group position={[0,hip,0]}><NeckScarf amount={scarf} t={t}/></group>}
    {bag&&<Bag p={sit?[0,.51,-.38]:[.36,.47,-.015]}/>}
    {kind==='driver'&&!hideBadge&&<Ball p={[-.12,hip+.46,-.18]} rad={.034} c={YELLOW}/>}
  </group>;
};

const Ice:React.FC<{amount:number}>=({amount})=><group>
  <mesh position={[.2,.011,-.20]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[3.1,1.75]}/><meshStandardMaterial color={tint('#65838a','#b5dce3',amount)} roughness={lerp(.22,.1,amount)} metalness={.25} transparent opacity={.50+amount*.2}/></mesh>
  {Array.from({length:44},(_,i)=>{const q=Math.max(0,Math.min(1,amount*1.6-(i%9)/12));return q>0&&<group key={i} position={[((i*.618)%1)*2.9-1.3,.016,((i*.414)%1)*1.5-.9]} scale={q} rotation={[0,i*2,0]}><Block p={[0,0,0]} s={[.18,.006,.008]} c="#e7f8fa"/><Block p={[0,0,0]} s={[.008,.006,.13]} c="#d0ecf1"/></group>;})}
</group>;

const BusClose:React.FC<{t:number;open:number;frost:number}>=({t,open,frost})=>{
  const front=.20,rear=12.20;
  return <group>
    <Block p={[6.2,.39,-3]} s={[12,.18,2.5]} c="#384e53"/>
    <Block p={[6.2,2.90,-3]} s={[12,.17,2.55]} c="#e7e4d7"/>
    <Block p={[6.2,1.0,-4.25]} s={[12,1.1,.08]} c="#3e7e73"/>
    <Block p={[6.2,2.12,-4.24]} s={[11.5,1.1,.045]} c="#445f65"/>
    <Block p={[front,1.0,-3]} s={[.09,1.1,2.5]} c="#3e7e73"/>
    <Block p={[front,2.12,-3]} s={[.09,1.1,2.3]} c="#72949b" o={.4}/>
    <Block p={[rear,1.48,-3]} s={[.08,2.5,2.5]} c="#3e7e73"/>
    {/* Door aperture remains genuinely open; the body is built around it. */}
    {[[.66,.92],[7.25,9.9]].map(([x,w])=><group key={x}>
      <Block p={[x,.86,-1.75]} s={[w,.96,.07]} c="#3e7e73"/>
      <Block p={[x,2.68,-1.75]} s={[w,.27,.07]} c="#e7e4d7"/>
      <Block p={[x,1.99,-1.76]} s={[w,1.09,.025]} c="#8bb2b7" o={.15}/>
    </group>)}
    {[.2,1.1,2.3,3.4,4.8,6.3,8.0,9.7,11.3,12.2].map(x=><Block key={x} p={[x,2.0,-1.70]} s={[.065,1.2,.065]} c="#e7e4d7"/>)}
    <Block p={[6.2,1.37,-1.70]} s={[12,.06,.08]} c="#eadfc6"/>
    {[1.1,2.3].map((x,i)=><group key={x} position={[x,1.54,-1.70]} rotation={[0,(i?-1:1)*open*1.28,0]}>
      <Block p={[i?-.3:.3,0,0]} s={[.60,2.15,.04]} c="#b2d0cd" o={.23}/>
      {[-.30,.30].map(dx=><Block key={dx} p={[(i?-.3:.3)+dx,0,0]} s={[.04,2.2,.07]} c={TEAL}/>)}
      {[-1.08,1.08].map(y=><Block key={y} p={[i?-.3:.3,y,0]} s={[.61,.045,.07]} c={TEAL}/>)}
    </group>)}
    {[0,1,2].map(i=><Block key={i} p={[1.7,.10+i*.13,-1.1-i*.22]} s={[1.2,.12,.35]} c={i%2?'#bcae8f':'#536971'}/>)}
    <Sign text="24  CENTRE" p={[.71,2.71,-1.69]} w={.82} h={.22} bg="#263c43" ink="#f7cf71" size={94}/>
    {[3.05,9.9].flatMap(x=>[-4.2,-1.8].map(z=><group key={`${x}-${z}`} position={[x,.5,z]} rotation={[Math.PI/2,0,0]}><Cyl p={[0,0,0]} rad={.45} h={.22} c="#26363c"/><Cyl p={[0,.13,0]} rad={.23} h={.02} c="#b3b6ac"/></group>))}
    {[-3.8,-2.2].map(z=><Block key={z} p={[.135,.83,z]} s={[.04,.17,.33]} c="#ffe2a2" e="#ffe2a2" ei={.8}/>)}
    <group position={[.70,.45,-2.65]} rotation={[0,Math.PI,0]} scale={.85}><Actor kind="driver" sit t={t} happy rightHand={t>=at('driver')?[.4,1.2,-.16]:[.2,.98,-.25]} leftHand={[-.15,.96,-.24]}/></group>
    <mesh position={[.7,1.2,-2.24]} rotation={[.35,0,0]}><torusGeometry args={[.18,.022,8,20]}/><meshStandardMaterial color="#273d43"/></mesh>
    {frost>0&&Array.from({length:25},(_,i)=><Block key={i} p={[.25+i*.21,1.42+frost*(.03+(i%5)*.02),-1.69]} s={[.17,frost*(.04+(i%5)*.035),.015]} c="#d9eff1" o={.6}/>)}
    <pointLight position={[2.8,2.2,-2.5]} color="#ffdba3" intensity={5} distance={4}/>
  </group>;
};

const Environment:React.FC<{t:number;cold:number;ice:number}>=({t,cold,ice})=><>
  <color attach="background" args={[tint('#d6ddd2','#acbfcd',cold)]}/>
  <fog attach="fog" args={[tint('#d6ddd2','#acbfcd',cold),24,65]}/>
  <hemisphereLight args={[tint('#fff2cf','#dcefff',cold),'#687b7c',1.8]}/>
  <directionalLight position={[-4,9,6]} color={tint('#ffdfad','#e2f1ff',cold)} intensity={2.1}/>
  <Block p={[0,-.15,-.1]} s={[70,.25,20]} c={tint('#b6b7a8','#9bafb9',cold)}/>
  <Block p={[0,-.12,-4]} s={[80,.18,5.9]} c={tint('#526d73','#68838e',cold)}/>
  <Block p={[0,-.04,-1.17]} s={[70,.20,.16]} c="#d0cfbc"/>
  {Array.from({length:28},(_,i)=><Block key={i} p={[-12+i*.8,-.019,.4]} s={[.015,.006,2.9]} c="#82979a"/>)}
  {[.05,.85,1.65].map(z=><Block key={z} p={[0,-.019,z]} s={[60,.006,.015]} c="#82979a"/>)}
  {Array.from({length:9},(_,i)=><Block key={i} p={[-18+i*4,.005,-4.4]} s={[1.8,.01,.07]} c="#d8d6b8"/>)}
  {[-8,-2,4,10,16].map((x,i)=><group key={x}>
    <Block p={[x,3,-7.4]} s={[5.7,6,1.9]} c={i%2?'#b7bab1':'#c9bfa9'}/>
    <Block p={[x,6.1,-7.4]} s={[5.9,.28,2.1]} c="#667e83"/>
    {[1.1,2.9,4.7].flatMap(y=>[-1.6,0,1.6].map(dx=><group key={`${y}-${dx}`}><Block p={[x+dx,y,-6.42]} s={[.85,1.1,.04]} c="#577a85"/><Block p={[x+dx,y-.58,-6.33]} s={[1,.07,.16]} c="#e0d2b6"/></group>))}
  </group>)}
  <group position={[-1.25,0,.85]} rotation={[0,Math.PI,0]}><BusShelter color={TEAL}/></group>
  <Sign text="RUE DES TILLEULS" p={[-1.25,2.63,1.0]} w={3.2} h={.28}/>
  <Sign text="24  ·  CENTRE" p={[-2.78,1.8,1.19]} w={.47} h={.50} bg={CREAM} ink={TEAL} size={74}/>
  <Sign text="2 MIN" p={[-2.78,1.30,1.19]} w={.45} h={.23} bg="#304950" ink={YELLOW} size={100}/>
  <group position={[-3.5,0,-.30]}><StreetLamp height={3.8} lit={.3+cold*.3}/></group>
  <Ice amount={ice}/>
  {ice>0&&Array.from({length:15},(_,i)=><Block key={i} p={[-2.80+i*.22,2.46,.82]} s={[.21,.014,.04]} c="#e4f4ee" o={ice*.7}/>)}
</>;

const Outdoor:React.FC<{t:number}>=({t})=>{
  const cold=smooth(at('chill'),at('outside'),t),ice=progress('ice',t,.6,3.2);
  const walkToDoor=progress('door',t,0,Math.max(1,end('door')-at('door')));
  const slip=progress('cane',t,.25,.65);
  const back=progress('choice',t,1.2,Math.max(1,end('choice')-at('choice')-1.0));
  const assist=smooth(at('help')+.45,end('driver')-.1,t);
  const together=t>=at('help'),gone=t>=at('outside');
  const assistedPath:V3=assist<.6?pos([-1.55,.08,1.50],[.95,0,1.70],assist/.6):pos([.95,0,1.70],[1.35,.42,-1.75],(assist-.6)/.4);
  const toDoor:V3=walkToDoor<.5?pos([-1.70,.08,.85],[.95,.02,1.75],walkToDoor*2):pos([.95,.02,1.75],[1.70,0,-.90],(walkToDoor-.5)*2);
  const returning:V3=back<.5?pos([1.70,0,-.90],[.95,.02,1.75],back*2):pos([.95,.02,1.75],[-1.45,.08,2.20],(back-.5)*2);
  const corner=smooth(.58,.79,assist),offsetX=lerp(.10,.60,corner),offsetZ=lerp(.70,0,corner);
  const mayaPos:V3=together?[assistedPath[0]+offsetX,assistedPath[1],assistedPath[2]+offsetZ]:t>=at('choice')?returning:toDoor;
  const elderArrival=smooth(at('elder'),at('cane'),t);
  const elderPos:V3=together?assistedPath:[lerp(-4.5,-1.55,elderArrival),.08,1.50];
  const mayaYaw=together?lerp(-Math.PI/2,-.35,corner):t>=at('choice')?lerp(0,2.0,Math.min(1,back*2)):t>=at('door')?-.95:Math.PI;
  const elderYaw=together?lerp(-Math.PI/2,-.35,corner):t>=at('cane')?Math.PI:-Math.PI/2;
  const contact:V3=[(mayaPos[0]+elderPos[0])/2,1.10+elderPos[1],(mayaPos[2]+elderPos[2])/2];
  const busMove=smooth(at('arrival'),end('stop'),t),busX=lerp(14,6.2,busMove);
  const stopped=t>=at('door');
  const open=progress('door',t,-.25,.6)*(1-progress('outside',t,.2,1));
  let camera:V3=[5,3.4,9.5],target:V3=[-1.3,1.4,.5],fov=35;
  if(t>=at('elder')&&t<at('chill')){camera=[.7,2.9,8.7];target=[-2.2,1.35,.65];}
  if(t>=at('chill')&&t<at('arrival')){camera=[2.2,2.5,7];target=[-1.45,1.35,.85];fov=34;}
  if(t>=at('arrival')&&t<at('ice')){camera=[busX-9,3.3,10.5];target=[busX-3.5,1.5,-3];fov=37;}
  if(t>=at('ice')&&t<at('door')){camera=[6.3,3.8,12];target=[.2,1.4,-.25];fov=37;}
  if(t>=at('door')&&t<at('cane')){camera=[5,2.8,7.5];target=[.7,1.3,-.8];fov=36;}
  if(t>=at('cane')&&t<at('choice')){camera=[2.1,2.6,7.7];target=[-1.4,1.1,1.15];fov=35;}
  if(t>=at('choice')&&t<at('help')){camera=[4.0,3.3,12.5];target=[-.15,1.4,.35];fov=40;}
  if(t>=at('help')&&t<at('driver')){camera=[contact[0]+7.8,2.7,contact[2]+5];target=[contact[0],1.15,contact[2]];fov=34;}
  if(t>=at('help')&&t<at('help')+1.1){camera=[contact[0]+3.0,1.8,contact[2]+3.0];target=[contact[0],1.12,contact[2]];fov=38;}
  if(t>=at('driver')&&t<at('outside')){camera=[1.3,2.6,3];target=[.8,1.65,-2.4];fov=38;}
  if(gone){camera=[5,3.4,9.5];target=[-.2,1.4,-.1];fov=38;}
  const seated=t<at('door');
  const walkM=together?.5:t>=at('choice')&&back<1?1:t>=at('door')&&walkToDoor<1?1:0;
  const grasp=t>=at('grip')?slip:slip*.6;
  return <>
    <Environment t={t} cold={cold} ice={ice}/><CameraRig position={camera} target={target} fov={fov}/>
    {t>=at('arrival')&&(stopped?<BusClose t={t} open={open} frost={ice}/>:<group position={[busX,0,-3]} rotation={[0,Math.PI/2,0]}><Bus color="#3e7e73" lights={1} wheelSpin={-busX*2}/></group>)}
    {!gone&&<>
      <group position={mayaPos} rotation={[0,mayaYaw,0]}><Actor kind="maya" t={t} sit={seated} walk={walkM} coat={progress('chill',t,.5,1)} scarf={progress('scarf',t,.3,.7)} bag
        leftHand={together?local(contact,mayaPos,mayaYaw):seated?[-.10,.88,-.4]:undefined}
        rightHand={seated?[.10,.88,-.4]:[.36,.86,-.015]}/></group>
      <group position={elderPos} rotation={[0,elderYaw,0]}><Actor kind="elder" t={t} walk={together?.45:t<at('cane')?.5:0} stumble={together?0:grasp}
        rightHand={together?local(contact,elderPos,elderYaw):t>=at('cane')?local([-1.22,.51,1.0],elderPos,elderYaw):undefined}
        leftHand={local([elderPos[0]-.29,.80+elderPos[1],elderPos[2]],elderPos,elderYaw)}/></group>
      <Cane p={[elderPos[0]-.29-(together?0:slip*.3),elderPos[1],elderPos[2]]} tilt={together?-.05:slip*.45}/>
    </>}
    {gone&&<group position={[3.65,.43,-2.65]} rotation={[0,Math.PI,0]} scale={.8}><Actor kind="maya" t={t} sit scarf={1} happy/></group>}
  </>;
};

const Interior:React.FC<{t:number}>=({t})=>{
  const q=progress('shared',t,.3,Math.max(1,end('shared')-at('shared')));
  const shared=t>=at('shared');
  const cam:V3=[lerp(1.8,.85,q),lerp(2.1,1.65,q),lerp(6.6,4.8,q)];
  return <>
    <color attach="background" args={['#99b5c3']}/><CameraRig position={cam} target={[0,1.0,.1]} fov={34}/>
    <hemisphereLight args={['#fff0d0','#687c7d',1.6]}/><directionalLight position={[-3,5,5]} color="#ffe0a4" intensity={1.9}/>
    <Block p={[0,-.06,0]} s={[6,.12,3]} c="#576c70"/>
    <Block p={[0,1.3,-.55]} s={[5,2.6,.1]} c="#bca681"/>
    <Block p={[0,2.55,-.15]} s={[5,.14,1.5]} c="#e7d9b9"/>
    <Block p={[0,.40,.08]} s={[1.8,.18,.65]} c="#a2674f"/>
    <Block p={[0,.93,-.24]} s={[1.8,.93,.12]} c="#a2674f"/>
    {[-.42,.42].map((x,i)=><group key={x} position={[x,0,0]} rotation={[0,Math.PI,0]}>
      <Actor kind={i?'elder':'maya'} t={t} sit happy scarf={i||shared?0:1}
        leftHand={shared?[.10,.98,-.43]:[-.16,.87,-.28]}
        rightHand={shared?[-.10,.98,-.43]:[.16,.87,-.28]}/>
    </group>)}
    <Bag p={[0,.04,.58]} scale={1.05}/><Cane p={[.88,0,.23]} tilt={-.17}/>
    {shared&&<group>
      <Block p={[0,.94,.43]} s={[1.30,.13,.13]} c={SCARF}/>
      {[-.56,-.35,-.14,.07,.28,.49].map(x=><Block key={x} p={[x,.94,.505]} s={[.045,.135,.01]} c="#f4cf8f"/>)}
      {[-1,1].map(s=><group key={s}><Block p={[s*.6,.76,.43]} s={[.14,.38,.14]} c={SCARF}/><Ball p={[s*.35,1.01,.44]} rad={.068} c={s<0?'#b17b58':'#e2b897'}/></group>)}
    </group>}
    {/* The window frames the full scene; clear centre keeps the hands and bag visible. */}
    {[-1.24,1.24].map(x=><Block key={x} p={[x,1.18,.93]} s={[.09,2.36,.10]} c={TEAL}/>)}
    {[.02,2.35].map(y=><Block key={y} p={[0,y,.93]} s={[2.57,.09,.1]} c={TEAL}/>)}
    <Block p={[0,1.18,.95]} s={[2.4,2.22,.012]} c="#c6e0dd" o={.055}/>
    {Array.from({length:17},(_,i)=>{const h=.08+(i%5)*.045;return <Block key={i} p={[-1.15+i*.14,h/2+.07,.97]} s={[.14,h,.012]} c="#dceff0" o={.55}/>;})}
    {[-1.15,1.15].map(x=><Block key={x} p={[x,1.2,.97]} s={[.08,2.15,.012]} c="#dceff0" o={.4}/>)}
    <pointLight position={[-.7,2.1,.6]} color="#ffcf88" intensity={3.5} distance={4}/>
  </>;
};

export const BusCold:React.FC=()=>{
  const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig(),t=frame/fps;
  const inside=t>=at('inside'),final=t>=at('shared');
  const beat=timeline.beats.find(b=>t>=b.start&&t<b.end);
  const milestones=[{id:'normal',min:0,c:20},{id:'chill',min:1,c:10},{id:'scarf',min:2,c:0},{id:'ice',min:3,c:-10},{id:'help',min:4,c:-20}];
  const temp=[...milestones].reverse().find(m=>t>=at(m.id))??milestones[0];
  const fade=smooth(0,.35,t)*(1-smooth(timeline.duration-.6,timeline.duration,t));
  return <AbsoluteFill style={{background:'#213d49',fontFamily:'Arial, sans-serif'}}>
    <AbsoluteFill style={{opacity:fade}}>
      <ThreeCanvas width={width} height={height} camera={{fov:35,position:[5,3.4,9.5]}} gl={{antialias:true,alpha:false}}>{inside?<Interior t={t}/>:<Outdoor t={t}/>}</ThreeCanvas>
      <AbsoluteFill style={{pointerEvents:'none',background:'linear-gradient(180deg,rgba(24,48,58,.88) 0%,rgba(24,48,58,.32) 22%,transparent 37%,transparent 70%,rgba(24,48,58,.76) 100%)'}}/>
      <div style={{position:'absolute',left:66,right:66,top:74,color:CREAM}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:21,letterSpacing:4,fontWeight:700}}><span>ET SI…</span><span style={{border:'1px solid #fff1d855',borderRadius:30,padding:'10px 16px',fontSize:17,letterSpacing:3}}>{t<at('chill')?'AVANT':inside?'APRÈS':'PENDANT'}</span></div>
        <div style={{fontFamily:'Georgia, serif',fontSize:78,lineHeight:1.03,letterSpacing:-3,marginTop:25}}>{t<at('normal')?<>−10 °C<br/>chaque minute.</>:<>Le prochain<br/>bus.</>}</div>
        {!inside&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:24,paddingTop:22,borderTop:'1px solid #fff1d866'}}>
          <div><div style={{fontSize:19,letterSpacing:4,opacity:.7}}>TEMPÉRATURE EXTÉRIEURE</div><div style={{fontSize:28,marginTop:6}}>{temp.min?`${temp.min} MIN PLUS TARD`:'DÉPART'}</div></div>
          <div style={{fontSize:76,fontWeight:700,letterSpacing:-4,color:temp.c>0?'#ffe1a0':'#d7f1ff',fontVariantNumeric:'tabular-nums'}}>{temp.c>0?'+':temp.c<0?'−':''}{Math.abs(temp.c)}<span style={{fontSize:38}}> °C</span></div>
        </div>}
      </div>
      {!final&&beat?.caption&&<div style={{position:'absolute',left:72,right:72,bottom:226,fontSize:56,lineHeight:1.12,fontWeight:700,textAlign:'center',color:CREAM,textShadow:'0 3px 18px #17394399'}}>{beat.caption}</div>}
      <div style={{position:'absolute',left:66,right:66,bottom:77,display:'flex',justifyContent:'space-between',color:CREAM,opacity:.7,fontSize:17,letterSpacing:2}}><span>{t<at('chill')?'HYPOTHÈSE DE FICTION':'RUE DES TILLEULS'}</span><span>{inside?'':'−10 °C / MIN'}</span></div>
      <div style={{position:'absolute',left:0,bottom:0,height:5,width:`${t/timeline.duration*100}%`,background:YELLOW}}/>
    </AbsoluteFill>
    {timeline.beats.map(b=><Sequence key={b.id} from={Math.round(b.start*fps)} durationInFrames={Math.ceil(b.duration*fps)}><Audio src={staticFile(b.audio)} volume={.95}/></Sequence>)}
    <Audio src={staticFile(timeline.ambience)} volume={f=>timeline.beats.some(b=>f/fps>=b.start&&f/fps<b.end)?.58:.95}/>
  </AbsoluteFill>;
};
export {Actor as ArticulatedPerson};
