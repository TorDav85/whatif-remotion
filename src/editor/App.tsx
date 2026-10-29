import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ASSET_BY_TYPE, type CityLayout, type LayoutItem} from '../assets/city/registry';
import {generateCity, type GenOptions} from '../assets/city/generator';
import {Preview, Viewport, type ViewportApi} from './Viewport';
import {CameraPanel, Catalog, GeneratorPanel, Inspector, Section} from './panels';
import {PRESETS, type PresetContext, type Shot} from '../assets/city/camera';
import {layoutBounds} from '../assets/city/LayoutScene';

/** Rough height and radius of an object, used to frame director presets. */
const focusOf = (it: LayoutItem): PresetContext['focus'] => {
  const p = {...ASSET_BY_TYPE[it.type]?.defaults, ...it.props} as Record<string, number>;
  const r = Math.max(Number(p.width ?? 2), Number(p.depth ?? 2)) / 2;
  const h = it.type === 'haussmann' ? 8.4 + (p.floors ?? 5) * 3.1
    : it.type === 'shop' ? 6.8 + (p.floors ?? 2) * 3.1
    : it.type === 'modern-block' ? 3.5 + (p.floors ?? 8) * 2.9
    : it.type === 'tower' || it.type === 'eiffel' || it.type === 'building-a' || it.type === 'building-b' ? Number(p.height ?? 40)
    : it.type === 'bridge' ? 4 : 3;
  return {x: it.x, z: it.z, h, r: Math.max(1, r)};
};

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
const newId = (type: string) => `${type}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const api = {
  list: async (): Promise<string[]> => (await fetch('/api/layouts')).json(),
  load: async (name: string): Promise<CityLayout> => {
    const r = await fetch(`/api/layouts/${name}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  save: async (layout: CityLayout) => {
    const r = await fetch(`/api/layouts/${layout.name}`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(layout)});
    if (!r.ok) throw new Error(await r.text());
  },
};

const download = (layout: CityLayout) => {
  const blob = new Blob([JSON.stringify(layout, null, 1)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${layout.name}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const App: React.FC = () => {
  const [layout, setLayout] = useState<CityLayout>(() => generateCity({}, 'ma-ville'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>('haussmann');
  const [groundLocked, setGroundLocked] = useState(true);
  const [snap, setSnap] = useState(0.5);
  const [saved, setSaved] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [help, setHelp] = useState(false);
  const [tab, setTab] = useState<'objet' | 'generateur' | 'camera'>('generateur');
  const [frame, setFrame] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [currentShot, setCurrentShot] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [, setTick] = useState(0);
  const history = useRef<{past: CityLayout[]; future: CityLayout[]}>({past: [], future: []});
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const viewport = useRef<ViewportApi>(null);
  const night = layout.sky === 'nuit';

  const flash = (msg: string) => {
    setStatus(msg);
    window.setTimeout(() => setStatus((s) => (s === msg ? '' : s)), 3500);
  };
  const commit = useCallback((next: CityLayout | ((l: CityLayout) => CityLayout)) => {
    const prev = layoutRef.current;
    const value = typeof next === 'function' ? next(prev) : next;
    history.current.past.push(prev);
    if (history.current.past.length > 100) history.current.past.shift();
    history.current.future = [];
    setLayout(value);
    setTick((t) => t + 1);
  }, []);
  const undo = () => {
    const prev = history.current.past.pop();
    if (!prev) return;
    history.current.future.push(layoutRef.current);
    setLayout(prev);
    setTick((t) => t + 1);
  };
  const redo = () => {
    const next = history.current.future.pop();
    if (!next) return;
    history.current.past.push(layoutRef.current);
    setLayout(next);
    setTick((t) => t + 1);
  };

  const updateItem = useCallback((id: string, patch: Partial<LayoutItem>, record = true) => {
    const apply = (l: CityLayout) => ({...l, items: l.items.map((it) => (it.id === id ? {...it, ...patch} : it))});
    if (record) commit(apply);
    else setLayout(apply);
  }, [commit]);

  const selected = useMemo(() => layout.items.find((i) => i.id === selectedId) ?? null, [layout, selectedId]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of layout.items) c[it.type] = (c[it.type] ?? 0) + 1;
    return c;
  }, [layout]);

  const shots = layout.camera?.shots ?? [];
  const setShots = (next: Shot[]) => commit((l) => ({...l, camera: {shots: next}}));
  const presetContext = (): PresetContext => {
    const b = layoutBounds(layout);
    const focus = selected ? focusOf(selected) : {x: b.cx, z: b.cz, h: 20, r: 10};
    const roads = layout.items.filter((i) => i.type === 'road' && Math.abs(Math.sin(i.ry)) < 0.1);
    const road = roads.sort((a, c) => Math.hypot(a.x - focus.x, a.z - focus.z) - Math.hypot(c.x - focus.x, c.z - focus.z))[0];
    return {cx: b.cx, cz: b.cz, size: b.size, focus, street: road ? {x: road.x, z: focus.z} : {x: focus.x, z: focus.z}};
  };
  const play = (list: Shot[], offset = 0) => {
    if (!list.length) return;
    setPlaying(true);
    viewport.current?.play(list, (t, i) => { setPlayTime(t); setCurrentShot(i + offset); }, () => { setPlaying(false); setCurrentShot(null); });
  };
  const addPreset = (key: string) => {
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset) return;
    const shot: Shot = {id: newId('plan'), ...preset.make(presetContext())};
    setShots([...shots, shot]);
    play([shot], shots.length);
  };

  useEffect(() => {
    if (selectedId && tab !== 'camera') setTab('objet');
    if (!selectedId && tab === 'objet') setTab('generateur');
  }, [selectedId]);

  const remove = () => {
    if (!selectedId) return;
    commit((l) => ({...l, items: l.items.filter((i) => i.id !== selectedId)}));
    setSelectedId(null);
  };
  const duplicate = () => {
    if (!selected) return;
    const copy = {...selected, id: newId(selected.type), x: selected.x + 2, z: selected.z + 2, props: {...selected.props}};
    commit((l) => ({...l, items: [...l.items, copy]}));
    setSelectedId(copy.id);
  };
  const place = (type: string, x: number, z: number, y: number) => {
    const item: LayoutItem = {id: newId(type), type, x, y, z, ry: 0, props: {}};
    commit((l) => ({...l, items: [...l.items, item]}));
    setSelectedId(item.id);
    if (!window.event || !(window.event as MouseEvent).shiftKey) setPlacing(null);
  };

  const refreshSaved = () => api.list().then(setSaved).catch(() => setSaved([]));
  useEffect(() => {
    // Reopen the last city the user saved under the default name, rather than a fresh one.
    api.list().then((names) => {
      setSaved(names);
      if (names.includes(layoutRef.current.name)) {
        api.load(layoutRef.current.name).then((l) => { setLayout(l); flash(`Rouvert : ${l.name}`); }).catch(() => undefined);
      }
    }).catch(() => setSaved([]));
  }, []);

  const save = async () => {
    if (!NAME_RE.test(layout.name)) return flash('Nom invalide : minuscules, chiffres et tirets.');
    try {
      await api.save(layout);
      flash(`Enregistré : public/city-layouts/${layout.name}.json`);
      refreshSaved();
    } catch (e) {
      flash(`Serveur indisponible, export du fichier à la place (${(e as Error).message})`);
      download(layout);
    }
  };
  const load = async (name: string) => {
    try {
      const l = await api.load(name);
      commit(l);
      setSelectedId(null);
      flash(`Chargé : ${name}`);
    } catch (e) {
      flash(`Impossible de charger ${name}`);
    }
  };
  const importFile = (file: File) => file.text().then((t) => {
    const l = JSON.parse(t) as CityLayout;
    if (!Array.isArray(l.items)) throw new Error('format');
    commit({...l, version: 1});
    flash(`Importé : ${file.name}`);
  }).catch(() => flash('Fichier JSON invalide'));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const s = layoutRef.current.items.find((i) => i.id === selectedId);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
      if (e.key === 'Escape') { setPlacing(null); setSelectedId(null); return; }
      if (!s) return;
      const step = e.shiftKey ? 5 : snap || 0.5;
      const k = e.key.toLowerCase();
      if (k === 'delete' || k === 'backspace') remove();
      else if (k === 'r') updateItem(s.id, {ry: s.ry + (e.shiftKey ? -1 : 1) * (Math.PI / 2)});
      else if (k === 'q') updateItem(s.id, {ry: s.ry - Math.PI / 12});
      else if (k === 'e') updateItem(s.id, {ry: s.ry + Math.PI / 12});
      else if (k === 'f') viewport.current?.focus(s.x, s.z);
      else if (e.key === 'ArrowLeft') updateItem(s.id, {x: s.x - step});
      else if (e.key === 'ArrowRight') updateItem(s.id, {x: s.x + step});
      else if (e.key === 'ArrowUp') updateItem(s.id, {z: s.z - step});
      else if (e.key === 'ArrowDown') updateItem(s.id, {z: s.z + step});
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="app">
      <header className="topbar">
        <strong className="brand">Éditeur de ville</strong>
        <input className="name" value={layout.name} onChange={(e) => setLayout({...layout, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})} title="Nom du fichier" />
        <button className="primary" onClick={save} title="Ctrl+S">Enregistrer</button>
        <select value="" onChange={(e) => e.target.value && load(e.target.value)}>
          <option value="">Ouvrir…{saved.length ? ` (${saved.length})` : ''}</option>
          {saved.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => download(layout)}>Exporter</button>
        <label className="button">Importer<input type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} /></label>
        <button onClick={() => { commit({...layout, items: []}); setSelectedId(null); }}>Vider</button>
        <span className="sep" />
        <button onClick={undo} disabled={!history.current.past.length} title="Ctrl+Z">↶</button>
        <button onClick={redo} disabled={!history.current.future.length} title="Ctrl+Y">↷</button>
        <button className={night ? 'on' : ''} onClick={() => commit({...layout, sky: night ? 'jour' : 'nuit'})}>{night ? 'Nuit' : 'Jour'}</button>
        <button className={groundLocked ? 'on' : ''} onClick={() => setGroundLocked(!groundLocked)} title="Empêche de sélectionner rues et trottoirs par erreur">
          Sol {groundLocked ? 'verrouillé' : 'modifiable'}
        </button>
        <select value={snap} onChange={(e) => setSnap(Number(e.target.value))} title="Aimantation">
          {[0, 0.25, 0.5, 1, 2, 5].map((v) => <option key={v} value={v}>{v ? `Aimant ${v} m` : 'Aimant off'}</option>)}
        </select>
        <span className="muted">{layout.items.length} objets</span>
        <button className="ghost" onClick={() => setHelp(!help)}>?</button>
      </header>

      <aside className="left">
        <div className="preview">
          <Preview type={preview} />
          <div className="preview-label">{ASSET_BY_TYPE[preview]?.label}</div>
        </div>
        <Catalog placing={placing} counts={counts} onHover={setPreview}
          onPick={(t) => { setPlacing(placing === t ? null : t); setPreview(t); setSelectedId(null); }} />
      </aside>

      <main className="view">
        <Viewport ref={viewport} layout={layout} night={night} selectedId={selectedId} groundLocked={groundLocked} placing={placing} snap={snap}
          onSelect={setSelectedId}
          onDragStart={() => { history.current.past.push(layoutRef.current); history.current.future = []; setTick((t) => t + 1); }}
          onDrag={(id, x, z, y) => updateItem(id, {x, z, y}, false)}
          onPlace={place} onReady={() => setReady(true)} />
        {!ready && <div className="loading">Construction de la ville…</div>}
        {placing && (
          <div className="banner">Clique dans la scène pour poser « {ASSET_BY_TYPE[placing]?.label} » · Maj+clic pour en poser plusieurs · Échap pour annuler</div>
        )}
        {frame && (tab === 'camera' || playing) && (
          <div className="frame916"><span>Cadre vidéo 9:16{playing && currentShot !== null ? ` · ${shots[currentShot]?.name ?? ''} · ${playTime.toFixed(1)} s` : ''}</span></div>
        )}
        {status && <div className="toast">{status}</div>}
        {help && (
          <div className="help" onClick={() => setHelp(false)}>
            <h3>Commandes</h3>
            <p><b>Clic gauche glissé</b> : tourner · <b>clic droit</b> : déplacer la vue · <b>molette</b> : zoom</p>
            <p><b>Clic</b> sur un objet : le sélectionner · <b>glisser</b> l’objet sélectionné : le déplacer</p>
            <p><b>R</b> / <b>Maj+R</b> : ±90° · <b>Q</b> / <b>E</b> : ±15° · <b>flèches</b> : décaler (Maj = 5 m)</p>
            <p><b>Suppr</b> : supprimer · <b>Ctrl+D</b> : dupliquer · <b>F</b> : centrer · <b>Ctrl+Z / Ctrl+Y</b> : annuler / rétablir · <b>Ctrl+S</b> : enregistrer</p>
            <p>Les rues et trottoirs sont verrouillés par défaut : bouton <b>Sol</b> pour les déplacer.</p>
          </div>
        )}
      </main>

      <aside className="right">
        <nav className="tabs">
          <button className={tab === 'objet' ? 'on' : ''} disabled={!selected} onClick={() => setTab('objet')}>Objet</button>
          <button className={tab === 'generateur' ? 'on' : ''} onClick={() => setTab('generateur')}>Générateur</button>
          <button className={tab === 'camera' ? 'on' : ''} onClick={() => setTab('camera')}>Caméra {shots.length ? `(${shots.length})` : ''}</button>
        </nav>
        {tab === 'objet' && selected && (
          <Inspector item={selected}
            onItem={(patch) => updateItem(selected.id, patch)}
            onProps={(patch) => updateItem(selected.id, {props: {...selected.props, ...patch}})}
            onDelete={remove} onDuplicate={duplicate} onFocus={() => viewport.current?.focus(selected.x, selected.z)} />
        )}
        {tab === 'generateur' && (
          <>
            <GeneratorPanel onGenerate={(o: GenOptions) => { commit({...generateCity(o, layout.name), camera: layout.camera}); setSelectedId(null); flash(`Ville générée (graine ${o.seed})`); }} />
            <Section title="Utiliser dans une vidéo">
              <p className="hint">Enregistre, puis dans Remotion : composition <b>CityLayoutPreview</b> avec <code>layout: "{layout.name}"</code>, ou
                <code>&lt;LayoutScene layout=…/&gt;</code> dans ta scène.</p>
            </Section>
          </>
        )}
        {tab === 'camera' && (
          <CameraPanel shots={shots} current={currentShot} playing={playing} time={playTime} frame={frame}
            focusLabel={selected ? `« ${ASSET_BY_TYPE[selected.type]?.label ?? selected.type} »` : 'le centre de la ville (sélectionne un objet pour cadrer dessus)'}
            onFrame={setFrame} onShots={setShots} onPreset={addPreset}
            onCapture={() => viewport.current!.getView()} onGo={(v) => viewport.current?.setView(v)}
            onPlay={(i) => (i === null ? play(shots) : play([shots[i]], i))}
            onStop={() => { viewport.current?.stop(); setPlaying(false); setCurrentShot(null); }} />
        )}
      </aside>
    </div>
  );
};
