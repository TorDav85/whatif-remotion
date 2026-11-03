import React from 'react';
import * as THREE from 'three';
import {Ball} from '../../assets/kit';
import {CharacterBlock as Block, CharacterHead, CHARACTER_BOX} from './CharacterParts';

type V3=[number,number,number];
const Bone:React.FC<{a:V3;b:V3;c:string;w:number}>=({a,b,c,w})=>{
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
  const middle=from.clone().add(to).multiplyScalar(.5);
  const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
  return <mesh position={middle} quaternion={rotation} scale={[w,delta.length(),w]} geometry={CHARACTER_BOX}><meshStandardMaterial color={c} roughness={.9}/></mesh>;
};

/** Marc's established café face and clothes, with standing limbs for exterior scenes. */
export const Marc:React.FC<{t:number;walk?:number;coat?:number;cold?:number;leftHand?:V3;rightHand?:V3;skin?:string;burn?:number;smile?:number;frost?:number}>=({t,walk=0,coat=0,cold=0,leftHand,rightHand,skin:skinTone,burn=0,smile=0,frost=0})=>{
  // burn 0..1 chars every colour toward soot, frost 0..1 whitens it with ice (eyes stay as they are).
  const b=(c:string)=>burn>0||frost>0?new THREE.Color(c).lerp(new THREE.Color('#1c1715'),burn).lerp(new THREE.Color('#e6f2fb'),frost).getStyle():c;
  const cloth=b(new THREE.Color('#faf0d7').lerp(new THREE.Color('#385f68'),coat).getStyle());
  const skin=b(skinTone??'#efbd96'),neck=b(skinTone?new THREE.Color(skinTone).multiplyScalar(.94).getStyle():'#e6ae84'),hip=.96;
  const arm=(side:number,target?:V3)=>{
    const shoulder:V3=[side*.29,hip+.56,0];
    const hand:V3=target??[side*.30,hip-.02,-Math.sin(t*7+side)*walk*.11];
    const elbow:V3=[(shoulder[0]+hand[0])/2+side*.045,(shoulder[1]+hand[1])/2,(shoulder[2]+hand[2])/2+.04];
    return <group key={side}><Bone a={shoulder} b={elbow} c={cloth} w={.15}/><Bone a={elbow} b={hand} c={coat>.5?cloth:skin} w={.13}/><Ball p={hand} rad={.078} c={skin}/></group>;
  };
  return <group position={[cold*Math.sin(t*28)*.007,Math.abs(Math.sin(t*6.5))*walk*.02,0]}>
    {[-1,1].map(side=>{
      const step=Math.sin(t*6.5+side*Math.PI/2)*walk;
      const h:V3=[side*.13,hip,0],k:V3=[side*.13,.49,-step*.13],f:V3=[side*.13,.07+Math.max(0,step)*.06,-step*.28];
      return <group key={side}><Bone a={h} b={k} c={b("#40515b")} w={.18}/><Bone a={k} b={f} c={b("#40515b")} w={.16}/><Block p={[f[0],f[1]-.015,f[2]-.055]} s={[.18,.11,.31]} c={b("#644536")}/></group>;
    })}
    <Block p={[0,hip+.32,0]} s={[.49,.64,.29]} c={cloth}/>
    {coat>.4&&[-.11,.11].map(x=><Block key={x} p={[x,hip+.47,-.155]} s={[.1,.24,.025]} r={[0,0,x*2]} c="#294a52"/>)}
    <Block p={[0,hip+.68,0]} s={[.16,.18,.15]} c={neck}/>
    <group position={[0,hip+.82,0]} rotation={[cold*.09,0,0]}>
      <group position={[0,.04,0]}><CharacterHead skin={skin} hair={b("#583e30")} worried={cold} smile={smile} blink={Math.pow((Math.sin(t*1.7)+1)/2,100)} /></group>
    </group>
    <Block p={[0,hip+.04,0]} s={[.46,.07,.3]} c={b("#35454e")}/>
    {[-.15,.15].map(x=><Block key={x} p={[x,hip+.18,-.155]} s={[.12,.13,.025]} c={cloth}/>)}
    {arm(-1,leftHand)}{arm(1,rightHand)}
  </group>;
};
