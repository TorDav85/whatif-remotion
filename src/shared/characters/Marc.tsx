import React from 'react';
import * as THREE from 'three';
import {Ball, Block} from '../../assets/kit';

type V3=[number,number,number];
const Bone:React.FC<{a:V3;b:V3;c:string;w:number}>=({a,b,c,w})=>{
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
  const middle=from.clone().add(to).multiplyScalar(.5);
  const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
  return <mesh position={middle} quaternion={rotation}><boxGeometry args={[w,delta.length(),w]}/><meshStandardMaterial color={c} roughness={.9}/></mesh>;
};

/** Marc's established café face and clothes, with standing limbs for exterior scenes. */
export const Marc:React.FC<{t:number;walk?:number;coat?:number;cold?:number;leftHand?:V3;rightHand?:V3}>=({t,walk=0,coat=0,cold=0,leftHand,rightHand})=>{
  const cloth=new THREE.Color('#faf0d7').lerp(new THREE.Color('#385f68'),coat).getStyle();
  const skin='#efbd96',hip=.96;
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
      return <group key={side}><Bone a={h} b={k} c="#40515b" w={.18}/><Bone a={k} b={f} c="#40515b" w={.16}/><Block p={[f[0],f[1]-.015,f[2]-.055]} s={[.18,.11,.31]} c="#644536"/></group>;
    })}
    <Block p={[0,hip+.32,0]} s={[.49,.64,.29]} c={cloth}/>
    {coat>.4&&[-.11,.11].map(x=><Block key={x} p={[x,hip+.47,-.155]} s={[.1,.24,.025]} r={[0,0,x*2]} c="#294a52"/>)}
    <Block p={[0,hip+.68,0]} s={[.16,.18,.15]} c="#e6ae84"/>
    <group position={[0,hip+.82,0]} rotation={[cold*.09,0,0]}>
      <Block p={[0,.04,0]} s={[.30,.34,.29]} c={skin}/>
      <Block p={[0,.235,.015]} s={[.32,.10,.30]} c="#583e30"/>
      <Block p={[-.12,.16,0]} s={[.065,.14,.28]} c="#583e30"/>
      <Block p={[0,-.005,-.168]} s={[.07,.07,.065]} c="#d99570"/>
      {[-1,1].map(side=><group key={side}>
        <Block p={[side*.081,.078,-.151]} s={[.041,.046,.016]} c="#2a3431"/>
        <Block p={[side*.081,.091,-.161]} s={[.011,.012,.005]} c="#fff5e4"/>
        <Block p={[side*.081,.14,-.152]} s={[.065,.015,.015]} r={[0,0,side*(cold>.3?.2:-.12)]} c="#583e30"/>
        <Ball p={[side*.16,.015,0]} rad={.044} c="#e6ae84"/>
      </group>)}
      <Block p={[0,-.067,-.153]} s={[.07,.014,.012]} c="#985b48"/>
    </group>
    {arm(-1,leftHand)}{arm(1,rightHand)}
  </group>;
};
