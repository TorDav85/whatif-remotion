import React, {forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Canvas, useFrame, useThree, type ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {ASSET_BY_TYPE, type CityLayout, type LayoutItem} from '../assets/city/registry';
import {CityEnvironment} from '../assets/city/LayoutScene';
import {sampleShots, shotsDuration, type Shot, type View} from '../assets/city/camera';

export const GROUND_TYPES = new Set(['road', 'intersection', 'sidewalk', 'grass', 'plaza', 'water', 'crosswalk', 'road-segment']);
const SLAB_TOP: Record<string, number> = {sidewalk: 0.15, grass: 0.2, plaza: 0.18};

/** Height of the walkable surface at (x, z): on a sidewalk slab, lawn or plaza, objects sit on top. */
export const surfaceY = (items: LayoutItem[], x: number, z: number, ignore?: string) => {
  let y = 0;
  for (const it of items) {
    const top = SLAB_TOP[it.type];
    if (top === undefined || it.id === ignore) continue;
    const w = Number(it.props.width ?? 20);
    const d = Number(it.props.depth ?? 20);
    const dx = x - it.x;
    const dz = z - it.z;
    const c = Math.cos(-it.ry);
    const s = Math.sin(-it.ry);
    const lx = dx * c + dz * s;
    const lz = -dx * s + dz * c;
    if (Math.abs(lx) <= w / 2 && Math.abs(lz) <= d / 2) y = Math.max(y, top);
  }
  return y;
};

type Box = {size: [number, number, number]; center: [number, number, number]};

const localBox = (group: THREE.Object3D, visual: THREE.Object3D): Box => {
  group.updateWorldMatrix(true, true);
  const inv = group.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  const m = new THREE.Matrix4();
  visual.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    let local: THREE.Box3 | null;
    if (mesh instanceof THREE.InstancedMesh) {
      mesh.computeBoundingBox();
      local = mesh.boundingBox;
    } else {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      local = mesh.geometry.boundingBox;
    }
    if (!local) return;
    tmp.copy(local).applyMatrix4(m.multiplyMatrices(inv, mesh.matrixWorld));
    box.union(tmp);
  });
  if (box.isEmpty()) box.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1, 0.5));
  const size = box.getSize(new THREE.Vector3()).max(new THREE.Vector3(0.3, 0.08, 0.3));
  const center = box.getCenter(new THREE.Vector3());
  return {size: size.toArray() as Box['size'], center: center.toArray() as Box['center']};
};

type ItemProps = {
  item: LayoutItem;
  lit: number;
  selected: boolean;
  interactive: boolean;
  onDown: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onMove: (id: string, e: ThreeEvent<PointerEvent>) => void;
  onUp: (id: string, e: ThreeEvent<PointerEvent>) => void;
};

const EditableItem: React.FC<ItemProps> = React.memo(({item, lit, selected, interactive, onDown, onMove, onUp}) => {
  const group = useRef<THREE.Group>(null);
  const visual = useRef<THREE.Group>(null);
  const [box, setBox] = useState<Box | null>(null);
  const def = ASSET_BY_TYPE[item.type];
  const props = {...def?.defaults, ...item.props, ...(def?.lit ? {lit} : {})};
  useLayoutEffect(() => {
    if (group.current && visual.current) setBox(localBox(group.current, visual.current));
  }, [item.type, item.props]);
  const edges = useMemo(() => (box ? new THREE.EdgesGeometry(new THREE.BoxGeometry(...box.size)) : null), [box]);
  if (!def) return null;
  return (
    <group ref={group} position={[item.x, item.y, item.z]} rotation={[0, item.ry, 0]}>
      <group ref={visual}>{def.render(props)}</group>
      {box && interactive && (
        <mesh
          position={box.center}
          onPointerDown={(e) => onDown(item.id, e)}
          onPointerMove={(e) => onMove(item.id, e)}
          onPointerUp={(e) => onUp(item.id, e)}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = selected ? 'move' : 'pointer';
          }}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <boxGeometry args={box.size} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      {selected && edges && box && (
        <lineSegments geometry={edges} position={box.center}>
          <lineBasicMaterial color="#F6E05E" />
        </lineSegments>
      )}
    </group>
  );
});

const Controls = forwardRef<OrbitControls>((_, ref) => {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useMemo(() => new OrbitControls(camera, gl.domElement), [camera, gl]);
  useEffect(() => {
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 2;
    controls.maxDistance = 900;
    controls.screenSpacePanning = false;
    controls.mouseButtons = {LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN};
    return () => controls.dispose();
  }, [controls]);
  useImperativeHandle(ref, () => controls, [controls]);
  useFrame(() => controls.update());
  return null;
});

export type ViewportApi = {
  focus: (x: number, z: number, dist?: number) => void;
  getView: () => View;
  setView: (view: View) => void;
  play: (shots: Shot[], onTick: (t: number, index: number) => void, onEnd: () => void) => void;
  stop: () => void;
};

const r3 = (v: THREE.Vector3): [number, number, number] => [Math.round(v.x * 100) / 100, Math.round(v.y * 100) / 100, Math.round(v.z * 100) / 100];

type ViewportProps = {
  layout: CityLayout;
  night: boolean;
  selectedId: string | null;
  groundLocked: boolean;
  placing: string | null;
  snap: number;
  onSelect: (id: string | null) => void;
  onDragStart: () => void;
  onDrag: (id: string, x: number, z: number, y: number) => void;
  onPlace: (type: string, x: number, z: number, y: number) => void;
  onReady?: () => void;
};

const Scene = forwardRef<ViewportApi, ViewportProps>((p, ref) => {
  const controls = useRef<OrbitControls>(null);
  const drag = useRef<{id: string; dx: number; dz: number; started: boolean; sx: number; sy: number} | null>(null);
  const [ghost, setGhost] = useState<[number, number, number] | null>(null);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const snap = (v: number) => (p.snap > 0 ? Math.round(v / p.snap) * p.snap : v);
  const lit = p.night ? 1 : 0;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const playing = useRef<{shots: Shot[]; t0: number; onTick: (t: number, i: number) => void; onEnd: () => void} | null>(null);

  const apply = (view: View) => {
    camera.position.set(...view.pos);
    camera.fov = view.fov;
    camera.updateProjectionMatrix();
    controls.current?.target.set(...view.target);
    camera.lookAt(...view.target);
  };

  const announced = useRef(false);
  useFrame(() => {
    if (!announced.current) {
      announced.current = true;
      p.onReady?.();
    }
    const pl = playing.current;
    if (!pl) return;
    const t = (performance.now() - pl.t0) / 1000;
    const total = shotsDuration(pl.shots);
    const view = sampleShots(pl.shots, Math.min(t, total - 0.001));
    apply(view);
    pl.onTick(Math.min(t, total), view.index);
    if (t >= total) {
      playing.current = null;
      if (controls.current) controls.current.enabled = true;
      pl.onEnd();
    }
  });

  useImperativeHandle(ref, () => ({
    focus: (x, z, dist = 30) => {
      const c = controls.current;
      if (!c) return;
      const offset = c.object.position.clone().sub(c.target).setLength(dist);
      c.target.set(x, 0, z);
      c.object.position.copy(c.target).add(offset);
    },
    getView: () => ({pos: r3(camera.position), target: r3(controls.current?.target ?? new THREE.Vector3()), fov: Math.round(camera.fov)}),
    setView: apply,
    play: (shots, onTick, onEnd) => {
      if (!shots.length) return;
      if (controls.current) controls.current.enabled = false;
      playing.current = {shots, t0: performance.now(), onTick, onEnd};
    },
    stop: () => {
      playing.current = null;
      if (controls.current) controls.current.enabled = true;
    },
  }));

  const onDown = (id: string, e: ThreeEvent<PointerEvent>) => {
    if (p.placing || e.button !== 0) return;
    e.stopPropagation();
    const item = p.layout.items.find((i) => i.id === id)!;
    if (p.selectedId !== id) {
      p.onSelect(id);
      return;
    }
    if (controls.current) controls.current.enabled = false;
    plane.constant = -item.y;
    e.ray.intersectPlane(plane, hit);
    drag.current = {id, dx: item.x - hit.x, dz: item.z - hit.z, started: false, sx: e.clientX, sy: e.clientY};
    (e.target as unknown as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (id: string, e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d || d.id !== id) return;
    if (!d.started) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return;
      d.started = true;
      p.onDragStart();
    }
    if (!e.ray.intersectPlane(plane, hit)) return;
    const x = snap(hit.x + d.dx);
    const z = snap(hit.z + d.dz);
    const item = p.layout.items.find((i) => i.id === id)!;
    const y = GROUND_TYPES.has(item.type) ? item.y : surfaceY(p.layout.items, x, z, id);
    p.onDrag(id, x, z, y);
  };
  const onUp = (id: string, e: ThreeEvent<PointerEvent>) => {
    if (!drag.current || drag.current.id !== id) return;
    (e.target as unknown as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
    if (controls.current) controls.current.enabled = true;
  };

  return (
    <>
      <Controls ref={controls} />
      <CityEnvironment night={p.night} fogFar={900} />
      {!p.night && <gridHelper args={[800, 160, '#7d766a', '#837c6f']} position={[0, -0.01, 0]} />}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onPointerMove={(e) => {
          if (!p.placing) return;
          const x = snap(e.point.x);
          const z = snap(e.point.z);
          setGhost([x, GROUND_TYPES.has(p.placing) ? 0 : surfaceY(p.layout.items, x, z), z]);
        }}
        onClick={(e) => {
          if (e.delta > 5) return;
          if (e.intersections[0] && e.intersections[0].object !== e.object) return;
          if (p.placing && ghost) p.onPlace(p.placing, ghost[0], ghost[2], ghost[1]);
          else if (!p.placing) p.onSelect(null);
        }}
      >
        <planeGeometry args={[2000, 2000]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {p.layout.items.map((it) => (
        <EditableItem key={it.id} item={it} lit={lit} selected={it.id === p.selectedId}
          interactive={!p.placing && !(p.groundLocked && GROUND_TYPES.has(it.type))}
          onDown={onDown} onMove={onMove} onUp={onUp} />
      ))}
      {p.placing && ghost && ASSET_BY_TYPE[p.placing] && (
        <group position={ghost}>
          {ASSET_BY_TYPE[p.placing].render({...ASSET_BY_TYPE[p.placing].defaults, lit})}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <ringGeometry args={[0.8, 1.0, 32]} />
            <meshBasicMaterial color="#F6E05E" />
          </mesh>
        </group>
      )}
    </>
  );
});

export const Viewport = forwardRef<ViewportApi, ViewportProps>((props, ref) => (
  <Canvas camera={{position: [95, 85, 120], fov: 50, near: 0.3, far: 4000}} dpr={[1, 1.5]} gl={{antialias: true}}
    onContextMenu={(e) => e.preventDefault()}>
    <Scene ref={ref} {...props} />
  </Canvas>
));

/** Small turntable preview of one asset, framed automatically. */
const Turntable: React.FC<{type: string}> = ({type}) => {
  const group = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const def = ASSET_BY_TYPE[type];
  useLayoutEffect(() => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = 0;
    const box = new THREE.Box3().setFromObject(g);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z, 0.5);
    camera.position.set(center.x + r * 1.1, center.y + r * 0.7, center.z + r * 1.5);
    camera.near = r / 100;
    camera.far = r * 50;
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }, [type, camera]);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.6;
  });
  if (!def) return null;
  return <group ref={group}>{def.render({...def.defaults})}</group>;
};

export const Preview: React.FC<{type: string | null}> = ({type}) => (
  <Canvas camera={{fov: 35}} dpr={[1, 1.5]} style={{background: 'linear-gradient(#cfdcea, #efe6d6)'}}>
    <hemisphereLight color="#dfe9f5" groundColor="#8a7e6a" intensity={1.2} />
    <directionalLight position={[5, 8, 6]} intensity={1.4} />
    <ambientLight intensity={0.3} />
    {type && <Turntable key={type} type={type} />}
  </Canvas>
);
