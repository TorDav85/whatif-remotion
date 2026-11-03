import React from 'react';
import {Board, SEC, SHOWCASE_FPS, type Section} from './Showcase';
import {Building} from './Building';
import {Car, Bus} from './Car';
import {House} from './House';
import {Bench, StreetLamp} from './city/Street';

const sections = (details: boolean): Section[] => [
  {
    name: 'CARROSSERIE', sub: 'jantes · poignées · calandre · phares',
    cam: [6.5, 4.2, -11], target: [0, 0.75, 0], spin: 0.08,
    content: (t) => <Car details={details} lights={0.7} wheelSpin={t * 1.4} />,
  },
  {
    name: 'LE BUS', sub: 'portes vitrées · montants · marchepieds',
    cam: [20, 9, -25], target: [0, 1.4, 0], spin: 0.08,
    content: (t) => <Bus details={details} lights={0.5} wheelSpin={t} />,
  },
  {
    name: 'LA FAÇADE', sub: 'balcons ajourés · croisillons · pierre en relief',
    cam: [15, 13, -34], target: [0, 9, 0], spin: 0.06,
    content: () => <Building details={details} width={10} depth={8} floors={3} lit={0.25} seed={7} />,
  },
  {
    name: 'LE PAVILLON', sub: 'volets à lames · gouttières · menuiseries',
    cam: [14, 10, -27], target: [0, 3.4, 0], spin: 0.08,
    content: () => <House details={details} width={8} depth={6} garden={false} />,
  },
  {
    name: 'LE MOBILIER', sub: 'lattes · fixations · piétements',
    cam: [3, 2.5, -7], target: [0, 0.55, 0], spin: 0.08,
    content: () => <><Bench details={details} width={2.1} /><group position={[-2, 0, 1]}><StreetLamp height={3} lit={0.3} /></group></>,
  },
];

export const ASSET_DETAILS_FRAMES = sections(true).length * SEC * SHOWCASE_FPS;
export const AssetDetailsShowcase: React.FC<{details?: boolean}> = ({details = true}) => <Board sections={sections(details)} kind="ÉTUDE DE DÉTAILS" />;
