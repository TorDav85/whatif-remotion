import React from 'react';
import {SERIF} from '../../../shared/ui/tokens';
import type {LayoutItem} from '../registry';
import {PLACE_IDS, PLACES} from './places';
import {REFERENCE_SHOTS} from './shots';
import {REFERENCE_WORLD} from './world';

/**
 * Top view of the reference city (north = -z at the top, the Seine along it), with each place's zone,
 * id and character spots, and the camera of each reference framing. Pure SVG: no WebGL needed.
 */
const FILL: Record<string, string> = {
  water: '#4f7f99', sidewalk: '#d9d2c3', road: '#7d7b78', intersection: '#7d7b78', grass: '#88b06a', plaza: '#e3d7bc',
  bridge: '#b9ad93', haussmann: '#c9b48e', shop: '#b98e6a', 'modern-block': '#a9a39a', tree: '#5f8a4c',
};
const SIZE: Record<string, (it: LayoutItem) => [number, number]> = {
  road: (it) => [Number(it.props.width ?? 10), Number(it.props.length ?? 30)],
  bridge: (it) => [Number(it.props.width ?? 16), Number(it.props.length ?? 56)],
  tree: () => [3, 3],
};
const PLACE_COLOR: Record<string, string> = {'appartement-marc': '#e63946', 'rue-marc': '#f4a261', 'place-centrale': '#2a9d8f'};

export const MAP_VIEW = {x0: -150, x1: 150, z0: -175, z1: 85};

export const PlaceMap: React.FC<{width: number; height: number; reveal?: number}> = ({width, height, reveal = 1}) => {
  const {x0, x1, z0, z1} = MAP_VIEW;
  const scale = Math.min((width - 80) / (x1 - x0), (height - 600) / (z1 - z0));
  const ox = (width - (x1 - x0) * scale) / 2;
  const oy = 360;
  const X = (x: number) => ox + (x - x0) * scale;
  const Y = (z: number) => oy + (z - z0) * scale;
  const drawn = REFERENCE_WORLD.items.filter((it) => FILL[it.type] && it.z > z0 - 20 && it.z < z1 + 20);
  // Ground first, then buildings and trees on top.
  const order = (t: string) => (['water', 'sidewalk', 'road', 'intersection', 'bridge', 'grass', 'plaza'].indexOf(t) + 1 || 10);
  drawn.sort((a, b) => order(a.type) - order(b.type));
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      <rect width={width} height={height} fill="#f3eee4" />
      <text x={width / 2} y={150} textAnchor="middle" fontFamily={SERIF} fontSize={64} fill="#1d1d1f">Ville de référence</text>
      <text x={width / 2} y={215} textAnchor="middle" fontFamily={SERIF} fontSize={32} fill="#555">
        ville-reference.json · {REFERENCE_WORLD.items.length} objets · graine figée
      </text>
      <clipPath id="map"><rect x={X(x0)} y={Y(z0)} width={(x1 - x0) * scale} height={(z1 - z0) * scale} /></clipPath>
      <g clipPath="url(#map)">
        {drawn.map((it) => {
          const [w, d] = SIZE[it.type]?.(it) ?? [Number(it.props.width ?? 10), Number(it.props.depth ?? 10)];
          return <rect key={it.id} x={-w / 2 * scale} y={-d / 2 * scale} width={w * scale} height={d * scale} rx={it.type === 'tree' ? 1.5 * scale : 0}
            fill={FILL[it.type]} transform={`translate(${X(it.x)} ${Y(it.z)}) rotate(${(-it.ry * 180) / Math.PI})`} />;
        })}
      </g>
      <rect x={X(x0)} y={Y(z0)} width={(x1 - x0) * scale} height={(z1 - z0) * scale} fill="none" stroke="#1d1d1f" strokeWidth={2} />
      <text x={X(x0) + 16} y={Y(-110) + 10} fontFamily={SERIF} fontSize={28} fontStyle="italic" fill="#fff">la Seine</text>
      <text x={X(x0) + 10} y={Y(z0) - 14} fontFamily={SERIF} fontSize={26} fill="#333">↖ tour Eiffel</text>
      <text x={X(0)} y={Y(z0) - 14} textAnchor="middle" fontFamily={SERIF} fontSize={26} fill="#333">↑ tours de bureaux</text>
      <text x={X(x1) - 10} y={Y(z0) - 14} textAnchor="end" fontFamily={SERIF} fontSize={26} fill="#333">N ↑</text>
      <g opacity={reveal}>
        {PLACE_IDS.map((id) => {
          const p = PLACES[id];
          const c = PLACE_COLOR[id];
          const z = p.zone;
          return (
            <g key={id}>
              <rect x={X(z.x0)} y={Y(z.z0)} width={(z.x1 - z.x0) * scale} height={(z.z1 - z.z0) * scale} fill={c} fillOpacity={0.18} stroke={c} strokeWidth={4} strokeDasharray={id === 'appartement-marc' ? '0' : '10 6'} />
              {p.spots.map((s) => <circle key={s.id} cx={X(s.pos[0])} cy={Y(s.pos[2])} r={5} fill={c} stroke="#fff" strokeWidth={1.5} />)}
              {REFERENCE_SHOTS[id].map((s, i) => {
                const [px, , pz] = s.from.pos;
                const [tx, , tz] = s.from.target;
                const k = 14 / Math.max(1, Math.hypot(tx - px, tz - pz));
                return <g key={s.id}>
                  <line x1={X(px)} y1={Y(pz)} x2={X(px + (tx - px) * k)} y2={Y(pz + (tz - pz) * k)} stroke="#1d1d1f" strokeWidth={3} />
                  <circle cx={X(px)} cy={Y(pz)} r={11} fill="#1d1d1f" />
                  <text x={X(px)} y={Y(pz) + 6} textAnchor="middle" fontSize={15} fontWeight={700} fill={c}>{i + 1}</text>
                </g>;
              })}
            </g>
          );
        })}
      </g>
      <g opacity={reveal} fontFamily={SERIF}>
        {PLACE_IDS.map((id, i) => (
          <g key={id} transform={`translate(80 ${Y(z1) + 70 + i * 92})`}>
            <rect width={36} height={36} y={-28} fill={PLACE_COLOR[id]} />
            <text x={56} fontSize={40} fill="#1d1d1f" fontFamily="monospace">{id}</text>
            <text x={56} y={36} fontSize={26} fill="#555">{PLACES[id].label} · {PLACES[id].spots.length} points · {REFERENCE_SHOTS[id].length} cadrages</text>
          </g>
        ))}
      </g>
    </svg>
  );
};
