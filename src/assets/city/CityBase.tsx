import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Block, Mat, PAL, seeded, Ball, Cyl} from '../kit';
import {Building, buildingHeight} from '../Building';
import {House} from '../House';
import {Car, Bus} from '../Car';
import {Person, PEOPLE_PRESETS} from '../Person';
import {Barge, TourBoat} from '../Boat';
import {EiffelTower} from '../EiffelTower';
import {
  Bench, StreetLamp, Bollard, TrashBin, BusShelter, BicycleRack,
  Tree, PineTree, Hedge, Planter, Fountain,
  Bicycle, Scooter, TrafficLight, TrafficSign, Crosswalk, RoadBarrier,
  CafeTerrace, MarketStall, Kiosk, FireHydrant,
} from './index';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type CityBaseProps = {
  /** Phase d'animation (secondes). Passe useCurrentFrame()/fps pour animer. */
  time?: number;
  /** Part des fenêtres allumées (0 = jour, 1 = nuit) */
  lit?: number;
  /** Affiche la tour Eiffel en arrière-plan */
  eiffel?: boolean;
  /** Affiche la Seine avec péniches et bateaux-mouches */
  seine?: boolean;
  /** Graine : change le placement des immeubles, voitures, passants */
  seed?: number;
  /** Couleur du sol */
  ground?: string;
  /** Couleur du ciel (dôme) */
  skyTop?: string;
  skyBottom?: string;
  /** Intensité de la brume */
  fogFar?: number;
  /** Surcharge les enfants (ajouts au-dessus de la scène) */
  children?: React.ReactNode;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STREET_W = 8;
const BLOCK = 28;
const SIDEWALK = 3;

type Placed<T> = T & {x: number; z: number; ry: number};

const place = <T extends Record<string, unknown>>(
  rng: () => number,
  count: number,
  area: (r: () => number) => {x: number; z: number; ry: number},
  make: (r: () => number, i: number) => T,
): Placed<T>[] =>
  Array.from({length: count}, (_, i) => ({...area(rng), ...make(rng, i)}));

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SkyDome: React.FC<{top: string; bottom: string}> = ({top, bottom}) => {
  const mat = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gr = ctx.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bottom);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 2, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({map: tex, side: THREE.BackSide, depthWrite: false, fog: false});
  }, [top, bottom]);
  return (
    <mesh material={mat}>
      <sphereGeometry args={[500, 16, 16]} />
    </mesh>
  );
};

const Ground: React.FC<{color: string}> = ({color}) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
    <planeGeometry args={[600, 600]} />
    <meshStandardMaterial color={color} roughness={0.9} />
  </mesh>
);

const Road: React.FC<{x: number; z: number; length: number; dir: 'x' | 'z'}> = ({x, z, length, dir}) => {
  const ry = dir === 'x' ? Math.PI / 2 : 0;
  return (
    <group position={[x, 0.01, z]} rotation={[0, ry, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[STREET_W, length]} />
        <meshStandardMaterial color="#3a3b40" roughness={0.5} />
      </mesh>
      {/* Tirets centraux */}
      {Array.from({length: Math.floor(length / 4)}, (_, i) => (
        <mesh key={i} position={[0, 0.005, -length / 2 + i * 4 + 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 2]} />
          <meshBasicMaterial color="#F7FAFC" />
        </mesh>
      ))}
      {/* Bordures blanches */}
      {[-STREET_W / 2 + 0.1, STREET_W / 2 - 0.1].map((lx) => (
        <mesh key={lx} position={[lx, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.08, length]} />
          <meshBasicMaterial color="#E2E8F0" />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// CityBase
// ---------------------------------------------------------------------------

export const CityBase: React.FC<CityBaseProps> = ({
  time = 0,
  lit = 0,
  eiffel = true,
  seine = false,
  seed = 42,
  ground = '#8a8478',
  skyTop = '#1A202C',
  skyBottom = '#E2E8F0',
  fogFar = 200,
  children,
}) => {
  const r = useMemo(() => seeded(seed), [seed]);

  // ---- Immeubles haussmanniens le long des rues ----
  const buildings = useMemo(() => {
    const rng = seeded(seed);
    const out: {x: number; z: number; ry: number; floors: number; width: number; stone: string; awning: string | null; seed: number}[] = [];
    const stones = [PAL.cream, '#e0d4ba', '#d8ccb0', '#ccc0a8'];
    const awnings = ['#a8322b', '#2b5a8a', '#3a6a4a', '#8a6a2a', null];

    // Boulevard principal (axe z)
    for (const side of [-1, 1]) {
      let z = -80;
      while (z < 80) {
        const w = 10 + rng() * 8;
        const f = 4 + Math.floor(rng() * 3);
        out.push({
          x: side * (STREET_W / 2 + SIDEWALK + w / 2),
          z: z + w / 2,
          ry: side > 0 ? Math.PI / 2 : -Math.PI / 2,
          floors: f,
          width: w,
          stone: stones[Math.floor(rng() * stones.length)],
          awning: awnings[Math.floor(rng() * awnings.length)],
          seed: Math.floor(rng() * 1000),
        });
        z += w + 0.3;
      }
    }

    // Rue transversale (axe x)
    for (const side of [-1, 1]) {
      let x = STREET_W / 2 + SIDEWALK + BLOCK + STREET_W / 2 + SIDEWALK;
      while (x < 100) {
        const w = 10 + rng() * 6;
        for (const zSide of [-1, 1]) {
          const f = 3 + Math.floor(rng() * 4);
          out.push({
            x: side * (x + w / 2),
            z: zSide * (STREET_W / 2 + SIDEWALK + 6),
            ry: zSide > 0 ? Math.PI : 0,
            floors: f,
            width: w,
            stone: stones[Math.floor(rng() * stones.length)],
            awning: awnings[Math.floor(rng() * awnings.length)],
            seed: Math.floor(rng() * 1000),
          });
        }
        x += w + 0.3;
      }
    }

    return out;
  }, [seed]);

  // ---- Arbres d'alignement ----
  const trees = useMemo(() => {
    const rng = seeded(seed + 7);
    const out: {x: number; z: number; h: number; foliage: string; seed: number}[] = [];
    const foliages = ['#608451', '#4f7a34', '#5e8f3c', '#3f6a2c'];
    for (const side of [-1, 1]) {
      for (let z = -75; z < 75; z += 8 + rng() * 4) {
        out.push({
          x: side * (STREET_W / 2 + 1.5),
          z,
          h: 4 + rng() * 2,
          foliage: foliages[Math.floor(rng() * foliages.length)],
          seed: Math.floor(rng() * 1000),
        });
      }
    }
    return out;
  }, [seed]);

  // ---- Lampadaires ----
  const lamps = useMemo(() => {
    const out: {x: number; z: number; ry: number}[] = [];
    for (const side of [-1, 1]) {
      for (let z = -70; z < 70; z += 16) {
        out.push({x: side * (STREET_W / 2 + 0.8), z, ry: side > 0 ? 0 : Math.PI});
      }
    }
    return out;
  }, []);

  // ---- Voitures garées et en mouvement ----
  const cars = useMemo(() => {
    const rng = seeded(seed + 3);
    const colors = ['#b8322a', '#2b5a8a', '#1d1d1f', '#e8e2d2', '#3f6b4a', '#8a6a2a'];
    const out: {x: number; z: number; ry: number; color: string; variant: 'berline' | 'citadine' | 'taxi'; moving: boolean; speed: number}[] = [];

    // Garées le long du boulevard
    for (const side of [-1, 1]) {
      for (let z = -60; z < 60; z += 6 + rng() * 3) {
        if (rng() > 0.7) continue;
        out.push({
          x: side * (STREET_W / 2 - 1.5),
          z,
          ry: side > 0 ? 0 : Math.PI,
          color: colors[Math.floor(rng() * colors.length)],
          variant: rng() > 0.85 ? 'taxi' : rng() > 0.5 ? 'citadine' : 'berline',
          moving: false,
          speed: 0,
        });
      }
    }

    // En circulation
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      out.push({
        x: side * (STREET_W / 2 - 3.5),
        z: -50 + rng() * 100,
        ry: side > 0 ? 0 : Math.PI,
        color: colors[Math.floor(rng() * colors.length)],
        variant: rng() > 0.8 ? 'taxi' : 'berline',
        moving: true,
        speed: 4 + rng() * 3,
      });
    }

    return out;
  }, [seed]);

  // ---- Passants ----
  const walkers = useMemo(() => {
    const rng = seeded(seed + 5);
    const presets = PEOPLE_PRESETS;
    return Array.from({length: 30}, (_, i) => {
      const side = rng() > 0.5 ? 1 : -1;
      const preset = presets[Math.floor(rng() * presets.length)];
      return {
        x: side * (STREET_W / 2 + 0.5 + rng() * 2),
        z: -60 + rng() * 120,
        ry: side > 0 ? rng() * 0.4 : Math.PI + rng() * 0.4,
        speed: 0.8 + rng() * 0.5,
        phase0: rng() * 10,
        preset,
      };
    });
  }, [seed]);

  // ---- Mobilier urbain ----
  const furniture = useMemo(() => {
    const rng = seeded(seed + 9);
    const benches: {x: number; z: number; ry: number}[] = [];
    const bins: {x: number; z: number}[] = [];
    const bollards: {x: number; z: number}[] = [];

    for (let z = -60; z < 60; z += 20 + rng() * 10) {
      const side = rng() > 0.5 ? 1 : -1;
      benches.push({x: side * (STREET_W / 2 + 2.2), z, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2});
      bins.push({x: -side * (STREET_W / 2 + 1.8), z: z + 3});
    }

    for (const side of [-1, 1]) {
      for (let z = -70; z < 70; z += 3) {
        if (rng() > 0.3) continue;
        bollards.push({x: side * (STREET_W / 2 + 0.3), z});
      }
    }

    return {benches, bins, bollards};
  }, [seed]);

  // ---- Passages piétons ----
  const crosswalks = useMemo(() => [
    {x: 0, z: -30, ry: 0},
    {x: 0, z: 30, ry: 0},
    {x: 0, z: 0, ry: 0},
  ], []);

  // ---- Feux tricolores ----
  const trafficLights = useMemo(() => {
    const out: {x: number; z: number; ry: number}[] = [];
    for (const z of [-30, 0, 30]) {
      out.push({x: STREET_W / 2 + 0.5, z: z - 2, ry: Math.PI});
      out.push({x: -(STREET_W / 2 + 0.5), z: z + 2, ry: 0});
    }
    return out;
  }, []);

  // ---- Terrasses de café ----
  const cafes = useMemo(() => {
    const rng = seeded(seed + 11);
    const cafeColors = ['#bb704f', '#8a322b', '#3f6b4a', '#2b5a8a'];
    const out: {x: number; z: number; ry: number; color: string}[] = [];
    for (let z = -40; z < 40; z += 25 + rng() * 10) {
      const side = rng() > 0.5 ? 1 : -1;
      out.push({
        x: side * (STREET_W / 2 + 2),
        z,
        ry: side > 0 ? -Math.PI / 2 : Math.PI / 2,
        color: cafeColors[Math.floor(rng() * cafeColors.length)],
      });
    }
    return out;
  }, [seed]);

  // ---- Animation des voitures ----
  const carPos = (car: typeof cars[number]) => {
    if (!car.moving) return {x: car.x, z: car.z};
    const dir = car.ry < Math.PI / 2 ? 1 : -1;
    const z = ((car.z + dir * car.speed * time) % 140 + 210) % 140 - 70;
    return {x: car.x, z};
  };

  const cycleState = (offset: number): 'red' | 'amber' | 'green' => {
    const t = ((time + offset) % 12);
    if (t < 5) return 'green';
    if (t < 6.5) return 'amber';
    return 'red';
  };

  return (
    <>
      <SkyDome top={skyTop} bottom={skyBottom} />
      <fog attach="fog" args={[skyBottom, fogFar * 0.15, fogFar]} />
      <hemisphereLight color={skyTop} groundColor="#8a7e6a" intensity={1.4} />
      <directionalLight
        color="#fff5e0"
        intensity={1.5}
        position={[40, 60, -30]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
      <ambientLight intensity={0.3 + lit * 0.2} />

      <Ground color={ground} />

      {/* ---- Routes ---- */}
      <Road x={0} z={0} length={200} dir="z" />
      <Road x={0} z={-30} length={200} dir="x" />
      <Road x={0} z={30} length={200} dir="x" />

      {/* ---- Trottoirs ---- */}
      {[-1, 1].map((side) => (
        <mesh key={`sw${side}`} position={[side * (STREET_W / 2 + SIDEWALK / 2), 0.08, 0]} receiveShadow>
          <boxGeometry args={[SIDEWALK, 0.16, 200]} />
          <meshStandardMaterial color={PAL.stone} flatShading roughness={0.8} />
        </mesh>
      ))}

      {/* ---- Immeubles ---- */}
      {buildings.map((b, i) => (
        <group key={`bld${i}`} position={[b.x, 0, b.z]} rotation={[0, b.ry, 0]}>
          <Building floors={b.floors} width={b.width} stone={b.stone} awning={b.awning} lit={lit} seed={b.seed} />
        </group>
      ))}

      {/* ---- Arbres ---- */}
      {trees.map((t, i) => (
        <group key={`tree${i}`} position={[t.x, 0, t.z]}>
          <Tree height={t.h} foliage={t.foliage} seed={t.seed} />
        </group>
      ))}

      {/* ---- Lampadaires ---- */}
      {lamps.map((l, i) => (
        <group key={`lamp${i}`} position={[l.x, 0, l.z]} rotation={[0, l.ry, 0]}>
          <StreetLamp lit={lit} />
        </group>
      ))}

      {/* ---- Voitures ---- */}
      {cars.map((car, i) => {
        const p = carPos(car);
        const spin = car.moving ? time * car.speed * 2.5 : 0;
        return (
          <group key={`car${i}`} position={[p.x, 0, p.z]} rotation={[0, car.ry, 0]}>
            <Car color={car.color} variant={car.variant} lights={lit} wheelSpin={spin} />
          </group>
        );
      })}

      {/* ---- Bus (un par sens) ---- */}
      {[-1, 1].map((dir) => {
        const z = ((dir * 3 * time + 20) % 160 + 240) % 160 - 80;
        return (
          <group key={`bus${dir}`} position={[dir * (STREET_W / 2 - 3.5), 0, z]} rotation={[0, dir > 0 ? 0 : Math.PI, 0]}>
            <Bus lights={lit} wheelSpin={time * 5} />
          </group>
        );
      })}

      {/* ---- Passants ---- */}
      {walkers.map((w, i) => {
        const dir = w.ry < Math.PI / 2 ? 1 : -1;
        const z = ((w.z + dir * w.speed * time) % 130 + 195) % 130 - 65;
        return (
          <group key={`ped${i}`} position={[w.x, 0, z]} rotation={[0, w.ry, 0]}>
            <Person {...w.preset} pose="marche" phase={time * 7 * w.speed + w.phase0} />
          </group>
        );
      })}

      {/* ---- Mobilier urbain ---- */}
      {furniture.benches.map((b, i) => (
        <group key={`bench${i}`} position={[b.x, 0, b.z]} rotation={[0, b.ry, 0]}>
          <Bench />
        </group>
      ))}
      {furniture.bins.map((b, i) => (
        <group key={`bin${i}`} position={[b.x, 0, b.z]}>
          <TrashBin />
        </group>
      ))}

      {/* ---- Passages piétons ---- */}
      {crosswalks.map((c, i) => (
        <group key={`cw${i}`} position={[c.x, 0, c.z]} rotation={[0, c.ry, 0]}>
          <Crosswalk width={STREET_W - 1} />
        </group>
      ))}

      {/* ---- Feux tricolores ---- */}
      {trafficLights.map((tl, i) => (
        <group key={`tl${i}`} position={[tl.x, 0, tl.z]} rotation={[0, tl.ry, 0]}>
          <TrafficLight state={cycleState(i * 3)} />
        </group>
      ))}

      {/* ---- Terrasses de café ---- */}
      {cafes.map((c, i) => (
        <group key={`cafe${i}`} position={[c.x, 0, c.z]} rotation={[0, c.ry, 0]}>
          <CafeTerrace color={c.color} />
        </group>
      ))}

      {/* ---- Tour Eiffel en arrière-plan ---- */}
      {eiffel && (
        <group position={[80, 0, -120]}>
          <EiffelTower height={110} lit={lit * 0.8} beacon={lit} />
        </group>
      )}

      {/* ---- Seine ---- */}
      {seine && (
        <group position={[0, -1, 90]}>
          {/* plan d'eau */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[300, 40]} />
            <meshStandardMaterial color="#3a5a6a" roughness={0.3} metalness={0.2} transparent opacity={0.85} />
          </mesh>
          {/* quais */}
          {[-1, 1].map((side) => (
            <Block key={side} p={[0, 1, side * 20]} s={[300, 2.5, 1.5]} c={PAL.stoneDark} />
          ))}
          {/* bateaux */}
          <group position={[-30, 1, 0]}>
            <Barge />
          </group>
          <group position={[40, 1, -5]} rotation={[0, 0.1, 0]}>
            <TourBoat lights={lit} />
          </group>
        </group>
      )}

      {children}
    </>
  );
};
