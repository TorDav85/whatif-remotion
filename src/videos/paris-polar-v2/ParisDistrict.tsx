import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Block, Ball, Cyl, seeded} from '../../assets/kit';
import {Building} from '../../assets/Building';
import {Car, Bus} from '../../assets/Car';
import {Person} from '../../assets/Person';
import {Barge} from '../../assets/Boat';
import {Bench, Bollard, TrashBin, BusShelter} from '../../assets/city/Street';
import {Tree, Hedge, Planter} from '../../assets/city/Park';
import {Kiosk, CafeTerrace} from '../../assets/city/CityLife';
import {TrafficLight, TrafficSign, Crosswalk} from '../../assets/city/Mobility';
import {BatchedScenery} from '../../shared/three/BatchedScenery';
import {smooth} from '../../core/animation';

type V3=[number,number,number];
const tint=(a:string,b:string,q:number)=>new THREE.Color(a).lerp(new THREE.Color(b),q).getStyle();
const lerp=(a:number,b:number,q:number)=>a+(b-a)*q;
const SNOW='#ecf4f6';
export const DISTRICT_COUNTS={buildings:34,trees:60,benches:16,lamps:26,vehicles:15,pedestrians:46};

const Cap:React.FC<{p:V3;s:V3;snow:number}>=({p,s,snow})=>snow<.015?null:<Block p={[p[0],p[1]+snow*s[1]/2,p[2]]} s={[s[0],Math.max(.008,s[1]*snow),s[2]]} c={SNOW}/>;
const Drift:React.FC<{p:V3;s:V3;snow:number}>=({p,s,snow})=>snow<.02?null:<mesh position={p} scale={[s[0],Math.max(.001,s[1]*snow),s[2]]}><sphereGeometry args={[1,12,6]}/><meshStandardMaterial color={SNOW} flatShading/></mesh>;

const SnowTree:React.FC<{height:number;seed:number;snow:number}>=({height,seed,snow})=>{
  const crowns=useMemo(()=>{const r=seeded(seed);return Array.from({length:7},(_,i)=>{const a=i*2.4,d=(.3+r()*.3)*height*.25;return {x:Math.cos(a)*d,z:Math.sin(a)*d,y:height*(.64+r()*.16),radius:height*(.2+r()*.05)};});},[height,seed]);
  return <><Tree height={height} seed={seed} foliage={tint('#62854d','#9db6ad',snow*.65)}/>
    {snow>.02&&crowns.map((c,i)=><Ball key={i} p={[c.x,c.y+c.radius*.87,c.z]} rad={c.radius*.97} s={[1,.06+snow*.31,1]} c={SNOW}/>)}
    <Drift p={[0,.07,0]} s={[height*.28,.65,height*.29]} snow={snow}/>
  </>;
};

const SnowBuilding:React.FC<{x:number;z:number;scale:number;seed:number;floors?:number;yaw?:number;snow:number;cold:number}>=({x,z,scale,seed,floors=4,yaw=Math.PI,snow,cold})=>{
  const height=4.2+floors*3.1;
  return <group position={[x,0,z]} rotation={[0,yaw,0]} scale={scale}>
    <Building width={12} depth={10} floors={floors} stone={['#e1ceb0','#d5c4a5','#d8d2bf','#c9bfae'][seed%4]} roof={tint('#6f7c8c','#dceaf0',snow)} awning={seed%3===0?'#4c7665':seed%3===1?'#a85b45':null} lit={.06+cold*.27} seed={seed}/>
    {/* The library facade faces one way; these windows finish the three other sides. */}
    {Array.from({length:floors},(_,f)=>Array.from({length:4},(_,j)=>{
      const y=4.2+f*3.1+1.55,x=-4.3+j*2.85,z=-3.5+j*2.3;
      return <group key={`${f}-${j}`}>
        <Block p={[x,y,5.05]} s={[1.25,2.15,.09]} c="#eae2cb"/><Block p={[x,y,5.11]} s={[1,1.9,.045]} c="#344653"/>
        {[-1,1].map(side=><group key={side}><Block p={[side*6.05,y,z]} s={[.09,2.15,1.25]} c="#eae2cb"/><Block p={[side*6.11,y,z]} s={[.045,1.9,1]} c="#344653"/></group>)}
      </group>;
    }))}
    <Cap p={[0,height+2.03,0]} s={[8.1,.65,6.7]} snow={snow}/>
    <Cap p={[0,height-.01,-5.2]} s={[12.3,.26,.55]} snow={snow}/>
    {[1,floors-1].map((f,i)=><Cap key={i} p={[0,4.2+f*3.1+.56,-5.43]} s={[11.8,.21,.96]} snow={snow}/>)}
    {snow>.16&&[-4,0,4].map(x=><mesh key={x} position={[x,height-.35,-5.39]}><coneGeometry args={[.06,.65*snow,5]}/><meshStandardMaterial color="#c4e5ef"/></mesh>)}
  </group>;
};

const architecture=Array.from({length:34},(_,i)=>{
  const side=i%2?1:-1,k=Math.floor(i/2);
  if(k<3)return {x:side*(20+k*1.0),z:-4-k*13,scale:.54,seed:i,floors:4+(k%2)};
  if(k<6)return {x:side*(31+(k%2)*5),z:-43-(k-3)*21,scale:.57,seed:i,floors:5,yaw:Math.PI-side*.2};
  if(k<10)return {x:side*(15.4+((k-6)%2)*8),z:-57-Math.floor((k-6)/2)*15,scale:.40,seed:i,floors:5};
  if(k<14)return {x:side*(19.5+(k%2)*1),z:-100-(k-10)*12,scale:.43,seed:i,floors:5,yaw:side*Math.PI/2};
  return {x:side*(6+(k-14)*9),z:-157,scale:.42,seed:i,floors:4};
});
const trees=Array.from({length:60},(_,i)=>{
  const side=i%2?1:-1,k=Math.floor(i/2);
  if(k<12)return {x:side*(k%2?15:10.7),z:-4-Math.floor(k/2)*4.3,height:3.2+(k%3)*.30,seed:310+i};
  if(k<16)return {x:side*(16+(k%2)*7),z:-51-Math.floor((k-12)/2)*13,height:3.9,seed:310+i};
  return {x:side*(k%2?13.5:10.7),z:-94-Math.floor((k-16)/2)*7.2,height:4.1+(k%3)*.25,seed:310+i};
});

const StaticDistrict:React.FC<{snow:number;cold:number}>=React.memo(({snow,cold})=>{
  const contents=useMemo(()=><>
    {/* The Seine cuts across the historic Trocadéro / Eiffel / Champ-de-Mars axis. */}
    <Block p={[0,.026,-40]} s={[138,.025,12]} c={tint('#648f91','#c2dde6',snow)}/>
    {[-34,-46].map(z=><group key={z}><Block p={[0,.2,z]} s={[138,.42,.7]} c="#c4b89c"/><Cap p={[0,.42,z]} s={[138,.25,.85]} snow={snow}/></group>)}
    {Array.from({length:22},(_,i)=><Block key={i} p={[-58+i*5.4,.047,-37.5+(i%3)*2.1]} s={[2.6,.008,.04]} c={tint('#91b7b1',SNOW,snow)}/>)}
    <group position={[0,0,-40]}>
      <Block p={[0,.57,0]} s={[8,.35,14]} c="#bdaf93"/>
      <Block p={[0,.77,0]} s={[6.8,.035,14]} c={tint('#a99d82',SNOW,snow)}/>
      {[-1,1].map(side=><group key={side}><Block p={[side*3.9,1.12,0]} s={[.23,.84,14.2]} c="#c9bea6"/><Cap p={[side*3.9,1.55,0]} s={[.34,.26,14.3]} snow={snow}/>{[-5,-2.5,0,2.5,5].map(z=><Block key={z} p={[side*3.9,1.26,z]} s={[.43,.75,.55]} c="#d5c8aa"/>)}</group>)}
      <Cap p={[0,.80,0]} s={[7.6,.45,14]} snow={snow}/>
    </group>
    <group position={[-19,.12,-40]} rotation={[0,Math.PI/2,0]} scale={.30}><Barge length={20} plants={false} trim="#46695f"/><Cap p={[0,3.3,2]} s={[4.2,.55,11.3]} snow={snow}/></group>
    {/* Trocadéro garden beds, paved approaches and the Champ-de-Mars lawns. */}
    {[-1,1].map(side=><group key={side}>
      <Block p={[side*12.4,.03,-14]} s={[7.8,.06,24]} c={tint('#7e985d',SNOW,snow)}/>
      <Block p={[side*6.4,.03,-119]} s={[8.7,.06,48]} c={tint('#829d65',SNOW,snow)}/>
      <Block p={[side*12.5,.04,-119]} s={[2.1,.08,49]} c={tint('#cdbb97',SNOW,snow)}/>
      <Block p={[side*10.9,.12,-119]} s={[.15,.23,48]} c={tint('#d6c6a5',SNOW,snow)}/>
      {[-100,-116,-132].map(z=><group key={z}><Block p={[side*6.4,.07,z]} s={[8.7,.07,1.8]} c={tint('#cdbc9a',SNOW,snow)}/><group position={[side*7.4,0,z-1.3]}><Hedge width={3.2} height={.55} color={tint('#59794c',SNOW,snow)}/></group></group>)}
      {[-6,-18,-98,-112,-126,-140].map((z,i)=><group key={z} position={[side*(z<-90?12.2:9.2),0,z]} rotation={[0,side*Math.PI/2,0]}><Bench color="#526a4b"/><Cap p={[0,.49,0]} s={[2,.24,.65]} snow={snow}/><Cap p={[0,.94,.25]} s={[2,.15,.14]} snow={snow}/><Drift p={[0,.04,.1]} s={[1.1,.75,.55]} snow={snow}/></group>)}
      {[-7,-19,-52,-68,-101,-116,-131,-145].map((z,i)=><group key={z} position={[side*(z<-90?11.6:z<-45?12.2:8.7),0,z]}><Cyl p={[0,1.7,0]} rad={.05} h={3.4} c="#35594d"/><Block p={[0,3.4,0]} s={[.34,.5,.34]} c="#ffe1a2" e="#ffd298" ei={.2+cold*.7}/><mesh position={[0,3.73,0]}><coneGeometry args={[.3,.2,4]}/><meshStandardMaterial color="#35594d"/></mesh><Cap p={[0,3.81,0]} s={[.42,.13,.42]} snow={snow}/></group>)}
      {[-3,-12,-22,-51,-65].map(z=><group key={z} position={[side*11.3,0,z]}><TrashBin/><Cap p={[0,.96,0]} s={[.55,.23,.45]} snow={snow}/></group>)}
      {[-20,-14,-8,-2,4,10].map(x=><group key={x} position={[x,.02,-21.0]}><Bollard height={.85}/><Cap p={[0,.95,0]} s={[.17,.11,.17]} snow={snow}/></group>)}
    </group>)}
    <Block p={[0,.025,-119]} s={[3.7,.05,50]} c={tint('#cfbf9e',SNOW,snow)}/>
    <Block p={[0,.08,-148]} s={[31,.11,3]} c={tint('#ccbd9b',SNOW,snow)}/>
    {[[-3.8,4.8],[-10.7,-1],[9.8,-2],[14.8,-7]].map(([x,z],i)=><group key={i} position={[x,0,z]} rotation={[0,i%2?Math.PI/2:Math.PI,0]}><Bench color="#54735a"/><Cap p={[0,.49,0]} s={[2,.25,.62]} snow={snow}/><Cap p={[0,.94,.25]} s={[2,.15,.15]} snow={snow}/></group>)}
    {[-28,-14,14,28].flatMap(x=>[-33,-47].map(z=><group key={`${x}-${z}`} position={[x,0,z]}><Cyl p={[0,1.6,0]} rad={.05} h={3.2} c="#385b51"/><Block p={[0,3.15,0]} s={[.35,.5,.35]} c="#ffdca0" e="#ffd093" ei={.3+cold*.7}/><Cap p={[0,3.45,0]} s={[.5,.2,.5]} snow={snow}/></group>))}
    {architecture.map(a=><SnowBuilding key={a.seed} {...a} snow={snow} cold={cold}/>)}
    {trees.map(a=><group key={a.seed} position={[a.x,0,a.z]}><SnowTree {...a} snow={snow}/></group>)}
    {/* Street life stays near the gardens so it remains visible behind Marc. */}
    <group position={[-7.5,0,1.6]} rotation={[0,Math.PI,0]}><Kiosk lit={cold*.45}/><Drift p={[0,2.84,0]} s={[1.4,.35,1.2]} snow={snow}/></group>
    <group position={[11.5,0,-27.8]} rotation={[0,Math.PI,0]}><BusShelter/><Cap p={[0,2.55,0]} s={[3.75,.4,1.9]} snow={snow}/></group>
    {[-5.2,-8].map((x,i)=><group key={x} position={[x,0,4.2]}><CafeTerrace color={i?'#4d7968':'#bb704f'} umbrella={false}/><Cap p={[0,.80,0]} s={[1.04,.20,1.04]} snow={snow}/><Drift p={[0,.03,0]} s={[1.1,.7,.7]} snow={snow}/></group>)}
    {[-4.2,-6.3,8.5,10.6].map(x=><group key={x} position={[x,0,-2.4]}><Planter color="#b98c63" flowers="#d5a65b"/><Drift p={[0,1.08,0]} s={[.5,.38,.5]} snow={snow}/></group>)}
    {[-1,1].map(side=><group key={side} position={[side*4.6,0,-3]}><Cyl p={[0,1.85,0]} rad={.06} h={3.7} c="#33574e"/><Block p={[0,3.6,0]} s={[.36,.48,.36]} c="#f9d492" e="#ffc780" ei={.25+cold*.8}/><mesh position={[0,3.94,0]}><coneGeometry args={[.32,.23,4]}/><meshStandardMaterial color="#33574e"/></mesh><Cap p={[0,4.04,0]} s={[.46,.16,.46]} snow={snow}/></group>)}
    {[-1,1].map(side=><group key={side} position={[side*13,.02,-23.9]} rotation={[0,side*Math.PI/2,0]}><TrafficLight state={cold>.5?'red':'green'}/><TrafficSign kind="parking"/></group>)}
    <group position={[-8,.042,-24]} rotation={[0,Math.PI/2,0]}><Crosswalk width={5.4} stripes={6}/></group>
  </>,[snow,cold]);
  return <BatchedScenery>{contents}</BatchedScenery>;
});

export const ParisDistrict:React.FC<{snow:number;cold:number}>=({snow,cold})=><StaticDistrict snow={Math.round(snow*24)/24} cold={Math.round(cold*12)/12}/>;

export const DistrictTraffic:React.FC<{t:number;snow:number;stop:number}>=({t,snow,stop})=>{
  const children=useMemo(()=><>{Array.from({length:15},(_,i)=>{
    const lane=i%3,slot=Math.floor(i/3),direction=lane===1?-1:1;
    const remaining=Math.max(0,stop+(i%4)*.13-t);
    const x=direction*(-16+slot*8.4+remaining*.9),z=lane===0?-23.1:lane===1?-25.0:-49.5;
    const bus=i===10,parked=remaining===0;
    return <group key={i} position={[x,snow*.12,z]} rotation={[0,-direction*Math.PI/2+(i===4?smooth(stop,stop+1,t)*.12:0),0]} scale={bus?.76:.84}>
      {bus?<Bus wheelSpin={remaining*1.8} lights={.7}/>:<Car color={['#a95f4d','#c4b58a','#4e7e7f','#d5d6bd','#68778a'][i%5]} variant={i%6===0?'taxi':i%7===0?'utilitaire':'citadine'} wheelSpin={remaining*2.3} lights={.7}/>}
      <Cap p={[0,bus?3.1:1.64,bus?1:.05]} s={[bus?2.5:1.7,.55,bus?9.5:2]} snow={snow}/>
      <Drift p={[0,.03,0]} s={[bus?1.4:1.05,1.45,bus?6.4:2.3]} snow={snow}/>
      {parked&&snow>.25&&<Ball p={[0,.7,-1.8]} rad={.05} s={[1,1,1]} c="#edf7ff" e="#e7f6ff" ei={.7}/>}
    </group>;
  })}</>,[t,snow,stop]);
  return <BatchedScenery>{children}</BatchedScenery>;
};

export const DistrictCrowd:React.FC<{t:number;snow:number;flee:number;empty:number}>=({t,snow,flee,empty})=>{
  const children=useMemo(()=><>{Array.from({length:46},(_,i)=>{
    const side=i%2?1:-1,k=Math.floor(i/2),front=i<14,garden=i>=14&&i<26,champ=i>=26&&i<38;
    const q=smooth(flee+(i%6)*.18,empty-.35-(i%5)*.45,t);
    if(q>=.99)return null;
    let x:number,z:number;
    if(front){x=side*(1.8+(k%4)*1.5);z=-1.8-(k%3)*1.02;}
    else if(garden){x=side*(k%2?9.8:14.6);z=-6-(k%6)*3.4;}
    else if(champ){x=side*(k%2?2.8:11.9);z=-98-(k%6)*6.4;}
    else{x=side*2.7;z=-35-(k%4)*2.8;}
    const moving=i%3===0,normalWalk=Math.sin(t*.45+i)*.5;
    if(moving)z+=normalWalk;
    // Nearby visitors reach the metro; distant visitors use the garden exits.
    const toMetro=front&&i%3===0;
    x=lerp(x,toMetro?6:side*20,q);z=lerp(z,toMetro?3:front?5.8:champ?-139:-49,q);
    const y=toMetro&&q>.91?lerp(snow*.75,-1.5,(q-.91)/.09):snow*.75+(i>=38?.78:0);
    const yaw=q>0?(toMetro?-2.2:side*Math.PI/2):i*.91;
    return <group key={i} position={[x,y,z]} rotation={[0,yaw,0]} scale={.75+(i%4)*.065}><Person pose={q>0||moving?'marche':'debout'} phase={t*(q>0?11:4)+i} shirt={['#708374','#ae7758','#5e7890','#b6a16c','#8d7187','#526c6a'][i%6]} pants="#384b55" hairStyle={i%4===0?'long':'court'}/></group>;
  })}</>,[t,snow,flee,empty]);
  return <BatchedScenery>{children}</BatchedScenery>;
};
