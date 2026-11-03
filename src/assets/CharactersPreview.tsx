import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Person, PEOPLE_PRESETS} from './Person';
import {Building} from './Building';
import {Bench, StreetLamp} from './city/Street';
import {Tree} from './city/Park';
import {CityEnvironment} from './city/LayoutScene';
import {CameraRig} from '../shared/three/common';
import {Marc} from '../shared/characters/Marc';
import {ArticulatedPerson} from '../videos/bus-cold/BusCold';
import {Actor} from '../videos/internet-off/Actor';

const LABELS = ['LES PASSANTS', 'MARC', 'LES PERSONNAGES DU BUS', 'EXPRESSIONS & ACCESSOIRES', 'MARCHE & POSES'];
export const CHARACTERS_FRAMES = LABELS.length * 120;

export const CharactersPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps, section = Math.min(4, Math.floor(frame / 120));
  return <AbsoluteFill>
    <ThreeCanvas width={width} height={height} camera={{position: [0, 2, -10]}}>
      <CameraRig position={section === 1 ? [-0.9, 2, -4.5] : [0, 2.5, -10]} target={[0, section === 1 ? 1.38 : 1, 0]} fov={42} />
      <CityEnvironment />
      <directionalLight color="#fff0dc" intensity={2.2} position={[-4, 7, -8]} />
      <group position={[0, 0, 25]}><Building width={26} depth={8} floors={3} details={false} /></group>
      {[-5, 5].map((x) => <group key={x} position={[x, 0, 3]}><Tree height={5} seed={x + 12} /></group>)}
      <group position={[3.6, 0, 1]}><StreetLamp /></group>
      {section === 0 && PEOPLE_PRESETS.map((look, i) => <group key={i} position={i < 3 ? [(i - 1) * 1.25, 0, 0] : [(i - 4.5) * 1.05, 0, 1.5]}>
        <Person {...look} pose={i === 1 ? 'marche' : 'debout'} phase={t * 5} />
      </group>)}
      {section === 1 && <Marc t={t} walk={0.1} />}
      {section === 2 && (['maya', 'elder', 'driver'] as const).map((kind, i) => <group key={kind} position={[(i - 1) * 1.3, 0, 0]}>
        <ArticulatedPerson kind={kind} t={t} happy={kind !== 'elder'} />
      </group>)}
      {section === 3 && [0, 1, 2].map((i) => <group key={i} position={[(i - 1) * 1.3, 0, 0]}>
        <Actor look={{...PEOPLE_PRESETS[i], shirt: PEOPLE_PRESETS[i].shirt!, pants: PEOPLE_PRESETS[i].pants!, skin: PEOPLE_PRESETS[i].skin!, hair: PEOPLE_PRESETS[i].hair!, hairStyle: i === 1 ? 'long' : 'court'}}
          smile={i} phone={i === 0 ? 'on' : 'none'} armR={i === 0 ? [1.1, 0] : [0, 0]} headYaw={Math.sin(t) * 0.16} />
      </group>)}
      {section === 4 && <>
        <group position={[-1.3, 0, 0]}><Person {...PEOPLE_PRESETS[0]} pose="marche" phase={t * 6} /></group>
        <Bench width={1.2} /><Person {...PEOPLE_PRESETS[1]} pose="assis" />
        <group position={[1.3, 0, 0]}><Person {...PEOPLE_PRESETS[2]} pose="bras-leves" /></group>
      </>}
    </ThreeCanvas>
    <div style={{position: 'absolute', top: 115, left: 65, right: 65, color: '#fff8e9', textShadow: '0 2px 14px #273844', fontFamily: 'Georgia, serif'}}>
      <div style={{fontSize: 24, letterSpacing: 4}}>PERSONNAGES · {section + 1} / 5</div>
      <div style={{fontSize: 58, marginTop: 14, lineHeight: 1.12}}>{LABELS[section]}</div>
    </div>
  </AbsoluteFill>;
};
