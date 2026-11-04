import React from 'react';
import {Block, PAL} from '../../kit';
import {
  Bookshelf, CoffeeTable, DiningChair, DiningTable, Door, FloorLamp, Fridge, KitchenCounter, PendantLamp, PictureFrame,
  PottedPlant, Radiator, Rug, Sink, Sofa, Stove, Television, TvStand, UpperCabinet, WallClock,
} from '../../interior';
import type {Place} from './places';
import {worldItem} from './world';

const WALL = '#ece3d2';
const FLOOR = '#9c7550';
const GLASS_W = 1.0;
const SILL = 0.6;
const LINTEL = 2.5;
const T = 0.25;

/**
 * Marc's flat, drawn inside its host building at the right floor and orientation. The facade wall has
 * real openings in front of the building's own windows, so what you see outside is the reference city
 * itself (the scene hides the building's shell while the camera is inside). Building-local frame:
 * x along the facade, facade on the -z side, y from the flat's floor.
 */
export const ApartmentInterior: React.FC<{place: Place; lit?: number}> = ({place, lit = 0}) => {
  const it = place.interior;
  if (!it) return null;
  const b = worldItem(it.building);
  const {x0, x1, z0, z1, height: h} = it.room;
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  // Window centres along the facade, back in the building frame.
  const c = Math.cos(b.ry);
  const s = Math.sin(b.ry);
  const winX = it.windows.map(([wx, , wz]) => (wx - b.x) * c - (wz - b.z) * s);
  const fz = z0 - T / 2;
  // Facade wall: full strips under the sills and over the lintels, piers between the openings.
  const edges = [x0, ...winX.flatMap((x) => [x - GLASS_W / 2, x + GLASS_W / 2]), x1];
  const piers: [number, number][] = [];
  for (let i = 0; i < edges.length; i += 2) piers.push([edges[i], edges[i + 1]]);
  return (
    <group position={[b.x, it.floorY, b.z]} rotation={[0, b.ry, 0]}>
      <Block p={[cx, -0.05, cz]} s={[w, 0.1, d]} c={FLOOR} />
      <Block p={[cx, h + 0.05, cz]} s={[w, 0.1, d]} c="#f4efe6" />
      <Block p={[cx, h / 2, z1 + T / 2]} s={[w + 2 * T, h, T]} c={WALL} />
      <Block p={[x0 - T / 2, h / 2, cz]} s={[T, h, d]} c={WALL} />
      <Block p={[x1 + T / 2, h / 2, cz]} s={[T, h, d]} c={WALL} />
      <Block p={[cx, SILL / 2, fz]} s={[w + 2 * T, SILL, T]} c={WALL} />
      <Block p={[cx, (LINTEL + h) / 2, fz]} s={[w + 2 * T, h - LINTEL, T]} c={WALL} />
      {piers.map(([a, e]) => <Block key={a} p={[(a + e) / 2, (SILL + LINTEL) / 2, fz]} s={[e - a, LINTEL - SILL, T]} c={WALL} />)}
      {winX.map((x) => (
        <group key={x} position={[x, 0, z0]}>
          {/* casement frame, a barely visible pane, curtains and the radiator */}
          {[-1, 1].map((k) => <Block key={k} p={[k * GLASS_W / 2, (SILL + LINTEL) / 2, -0.05]} s={[0.06, LINTEL - SILL, 0.08]} c={PAL.white} />)}
          <Block p={[0, LINTEL, -0.05]} s={[GLASS_W + 0.06, 0.06, 0.08]} c={PAL.white} />
          <Block p={[0, SILL, 0.02]} s={[GLASS_W + 0.2, 0.05, 0.22]} c={PAL.white} />
          <Block p={[0, (SILL + LINTEL) / 2, -0.09]} s={[GLASS_W, LINTEL - SILL, 0.01]} c="#cfe3f0" o={0.08} />
          {[-1, 1].map((k) => <Block key={k} p={[k * (GLASS_W / 2 + 0.22), 1.45, 0.14]} s={[0.3, 2.3, 0.06]} c="#b8322a" />)}
          <group position={[0, 0.12, 0.12]} rotation={[0, Math.PI, 0]}><Radiator /></group>
        </group>
      ))}
      {/* living room on the left: sofa facing the windows (and the square), TV on the side wall */}
      <group position={[winX[0] - 0.2, 0, z1 - 1.3]}><Sofa width={2.2} /></group>
      <group position={[winX[0] - 0.2, 0, z1 - 2.7]}><Rug w={2.6} d={1.8} /></group>
      <group position={[winX[0] - 0.2, 0, z1 - 2.7]}><CoffeeTable /></group>
      <group position={[x0 + 0.3, 0, cz]} rotation={[0, -Math.PI / 2, 0]}>
        <TvStand />
        <group position={[0, 0.55, 0]}><Television on={lit > 0.5 ? 1 : 0} /></group>
      </group>
      <group position={[x0 + 0.5, 0, z1 - 0.5]}><FloorLamp lit={lit} /></group>
      <group position={[cx - 1.2, 0, z1 - 0.2]}><Bookshelf width={1.4} /></group>
      <group position={[x0 + 0.5, 0, z0 + 0.5]}><PottedPlant size={1.1} /></group>
      {/* kitchen on the right, along the side wall */}
      {[[Fridge, -0.2], [KitchenCounter, 0.75], [Sink, 1.65], [Stove, 2.55]].map(([Comp, t], i) => {
        const C = Comp as React.FC;
        return <group key={i} position={[x1 - 0.32, 0, z1 - 0.6 - (t as number)]} rotation={[0, Math.PI / 2, 0]}><C /></group>;
      })}
      <group position={[x1 - 0.2, 1.55, z1 - 1.8]} rotation={[0, Math.PI / 2, 0]}><UpperCabinet width={2.2} /></group>
      {/* small table by the right-hand window */}
      <group position={[winX[2] + 0.2, 0, z0 + 1.4]}><DiningTable w={1.2} d={0.8} /></group>
      <group position={[winX[2] + 1.1, 0, z0 + 1.4]} rotation={[0, Math.PI / 2, 0]}><DiningChair /></group>
      <group position={[winX[2] - 0.7, 0, z0 + 1.4]} rotation={[0, -Math.PI / 2, 0]}><DiningChair /></group>
      {/* back wall: front door, picture, clock; a pendant lamp over the room */}
      <group position={[winX[2], 0, z1 - 0.02]}><Door /></group>
      <group position={[cx - 0.6, 1.6, z1 - 0.03]}><PictureFrame w={1.1} h={0.75} /></group>
      <group position={[cx + 1.4, 2.1, z1 - 0.03]}><WallClock /></group>
      <group position={[cx, h, cz]}><PendantLamp lit={lit} /></group>
      <pointLight position={[cx, h - 0.4, cz]} intensity={14 + lit * 10} distance={12} decay={1.2} color="#ffe2b8" />
    </group>
  );
};
