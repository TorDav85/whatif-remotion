import React from 'react';
import * as THREE from 'three';
import {Block, Ball, Cyl} from '../../assets/kit';
import {CharacterBlock, CharacterHead, CHARACTER_BOX} from './CharacterParts';

/** Personnage articulé (manteau, écharpe, canne, sac) extrait de BusCold en 1.12 ; utilisé par BusCold et ParisPolar. */
type V3=[number,number,number];
const YELLOW='#e9b94d',SCARF='#cc814c';
const lerp=(a:number,b:number,p:number)=>a+(b-a)*p;
const pos=(a:V3,b:V3,p:number):V3=>[lerp(a[0],b[0],p),lerp(a[1],b[1],p),lerp(a[2],b[2],p)];

const Bone:React.FC<{a:V3;b:V3;color:string;width?:number}>=({a,b,color,width=.13})=>{
  const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),d=bb.clone().sub(aa);
  return <mesh position={aa.add(bb).multiplyScalar(.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize())} scale={[width,d.length(),width]} geometry={CHARACTER_BOX}><meshStandardMaterial color={color} roughness={.85}/></mesh>;
};


export const Bag:React.FC<{p?:V3;scale?:number}>=({p=[0,0,0],scale=1})=><group position={p} scale={scale}>
  <Block p={[0,.15,0]} s={[.35,.30,.16]} c={YELLOW}/>
  <Block p={[0,.15,-.088]} s={[.23,.18,.016]} c="#d69d36"/>
  <Block p={[0,.25,-.10]} s={[.055,.045,.015]} c="#8d6b34"/>
  {[-.045,.045].map(z=><mesh key={z} position={[0,.34,z]}><torusGeometry args={[.10,.014,7,18,Math.PI]}/><meshStandardMaterial color="#8b6436"/></mesh>)}
</group>;

export const Cane:React.FC<{p:V3;tilt?:number}>=({p,tilt=0})=><group position={p} rotation={[0,0,tilt]}>
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
      return <group key={s}><Bone a={h} b={k} color="#35454e" width={.17}/><Bone a={k} b={f} color="#35454e" width={.15}/><CharacterBlock p={[f[0],f[1]-.015,f[2]-.045]} s={[.19,.11,.29]} c={elder?'#54413c':'#28383f'}/></group>;
    })}
    <CharacterBlock p={[0,hip+.31,0]} s={[.47,.62,.29]} c={cloth}/>
    <CharacterBlock p={[0,hip+.31,-.153]} s={[lerp(.20,.025,coat),.5,.012]} c={maya?'#e7d9ba':'#c9bdac'}/>
    {[-.12,.12].map(x=><CharacterBlock key={x} p={[x,hip+.46,-.16]} s={[.09,.19,.025]} r={[0,0,x*2]} c={maya?'#294f5b':elder?'#625b6f':'#263d52'}/>)}
    {[-.15,.15].map(x=><CharacterBlock key={x} p={[x,hip+.16,-.158]} s={[.12,.018,.016]} c="#b2b1a2"/>)}
    {[.15,.30,.45].map(y=><Ball key={y} p={[.025,hip+y,-.165]} rad={.012} c="#d4b67b"/>)}
    <CharacterBlock p={[0,hip+.67,0]} s={[.15,.14,.15]} c={skin}/>
    <group position={[0,hip+.83,-stumble*.07]} rotation={[elder?.08:0,0,stumble*.08]}>
      <group position={[0,.015,0]}><CharacterHead skin={skin} hair={maya?'#352c29':elder?'#b7b2a9':'#393b37'} hairStyle={maya?'chignon':elder?'chauve':'court'} smile={happy?0.8:0} worried={stumble} elderly={elder}/></group>
      {elder&&<><CharacterBlock p={[0,.19,.01]} s={[.32,.075,.29]} c="#8b7962"/><CharacterBlock p={[0,.15,-.13]} s={[.34,.025,.15]} c="#6f604f"/></>}
    </group>
    {arm(-1,leftHand)}{arm(1,rightHand)}
    {maya&&scarf>0&&<group position={[0,hip,0]}><NeckScarf amount={scarf} t={t}/></group>}
    {bag&&<Bag p={sit?[0,.51,-.38]:[.36,.47,-.015]}/>}
    {kind==='driver'&&!hideBadge&&<Ball p={[-.12,hip+.46,-.18]} rad={.034} c={YELLOW}/>}
  </group>;
};


export {Actor as ArticulatedPerson};
