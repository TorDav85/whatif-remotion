import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Scene3D as AsteroideParis} from '../videos/asteroide-paris/Scene3D';
import {Scene3D as InternetOff} from '../videos/internet-off/Scene3D';
import {Scene3D as MarcCongel} from '../videos/marc-congel/Scene3D';
import {Scene3D as MarcDeuxLunes} from '../videos/marc-deux-lunes/Scene3D';
import {Scene3D as MarcFour} from '../videos/marc-four/Scene3D';
import {Scene3D as MarcGeant} from '../videos/marc-geant/Scene3D';
import {Scene3D as MarcMini} from '../videos/marc-mini/Scene3D';
import {Scene3D as MarcSalaire} from '../videos/marc-salaire/Scene3D';
import {Scene3D as MarcSalaire2} from '../videos/marc-salaire-2/Scene3D';
import {Scene3D as MarcSalaire3} from '../videos/marc-salaire-3/Scene3D';
import {Scene3D as MarcSoif} from '../videos/marc-soif/Scene3D';
import {checkTitle} from '../core/publication-names.mjs';
import {SAFE} from '../shared/ui/PlatformSafeArea';

/** 3D scene of each video (time in seconds of the original film), without captions or HUD. */
const SCENES: Record<string, {Scene: React.FC<{t: number}>; logDepth?: boolean}> = {
  'asteroide-paris': {Scene: AsteroideParis},
  'internet-off': {Scene: InternetOff},
  'marc-congel': {Scene: MarcCongel},
  'marc-deux-lunes': {Scene: MarcDeuxLunes},
  'marc-four': {Scene: MarcFour},
  'marc-geant': {Scene: (p) => <MarcGeant {...p} clearStreet />, logDepth: true},
  'marc-geant-court': {Scene: (p) => <MarcGeant {...p} clearStreet />, logDepth: true},
  'marc-mini': {Scene: MarcMini, logDepth: true},
  'marc-salaire': {Scene: MarcSalaire},
  'marc-salaire-2': {Scene: MarcSalaire2},
  'marc-salaire-3': {Scene: MarcSalaire3},
  'marc-soif': {Scene: MarcSoif},
};
export const COVER_SLUGS = Object.keys(SCENES);

export type CoverProps = {slug: string; t: number; title: string; highlight?: string[]};

const SANS = '"Arial Black", "Segoe UI Black", "Segoe UI", Arial, sans-serif';
const GOLD = '#F6E05E';
const SHADOW = '0 6px 24px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.9)';

/**
 * Publication cover (1080×1920 still): a frame of the film's 3D scene and the public title,
 * « Et si [sujet] ? », with the « ? » kept. Keywords (default: Marc) are gold.
 */
export const Cover: React.FC<CoverProps> = ({slug, t, title, highlight = ['Marc']}) => {
  const {width, height} = useVideoConfig();
  const entry = SCENES[slug];
  if (!entry) throw new Error(`Pas de scène de couverture pour « ${slug} » : l'ajouter à SCENES (src/publication/Cover.tsx).`);
  const words = checkTitle(title).toUpperCase().split(' ');
  const keys = new Set(highlight.map((h) => h.toUpperCase()));
  const {Scene} = entry;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <ThreeCanvas width={width} height={height} linear={false} gl={{antialias: true, logarithmicDepthBuffer: !!entry.logDepth}}>
        <Scene t={t} />
      </ThreeCanvas>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.45) 62%, rgba(0,0,0,0) 85%)'}} />
      <div style={{
        position: 'absolute', top: 1000, left: SAFE.left, right: SAFE.right - 40, textAlign: 'center',
        fontFamily: SANS, fontSize: 92, lineHeight: 1.08, color: '#fff',
        textShadow: SHADOW, WebkitTextStroke: '4px rgba(0,0,0,0.65)',
      }}>
        {words.map((w, i) => (
          <span key={i} style={{color: keys.has(w.replace(/[^\p{L}\p{N}'-]/gu, '')) ? GOLD : '#fff'}}>
            {w}{i < words.length - 2 ? ' ' : i === words.length - 2 ? ' ' : ''}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
