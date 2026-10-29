import React, {useState} from 'react';
import {ASSETS, ASSET_BY_TYPE, CATEGORIES, type LayoutItem, type Param} from '../assets/city/registry';
import {DEFAULT_GEN, type GenOptions} from '../assets/city/generator';
import {PRESETS, shotsDuration, type Shot, type View} from '../assets/city/camera';

export const Section: React.FC<{title: string; children: React.ReactNode; right?: React.ReactNode}> = ({title, children, right}) => (
  <section className="section">
    <header><h3>{title}</h3>{right}</header>
    {children}
  </section>
);

// ---------- Catalogue ----------
export const Catalog: React.FC<{placing: string | null; onHover: (t: string) => void; onPick: (t: string) => void; counts: Record<string, number>}> = ({placing, onHover, onPick, counts}) => {
  const [search, setSearch] = useState('');
  const [closed, setClosed] = useState<Set<string>>(new Set(['Intérieur']));
  const q = search.trim().toLowerCase();
  const toggle = (c: string) => setClosed((s) => {
    const next = new Set(s);
    if (next.has(c)) next.delete(c); else next.add(c);
    return next;
  });
  return (
    <div className="catalog">
      <input className="search" placeholder={`Rechercher parmi ${ASSETS.length} assets…`} value={search} onChange={(e) => setSearch(e.target.value)} />
      {CATEGORIES.map((cat) => {
        const list = ASSETS.filter((a) => a.category === cat && (!q || a.label.toLowerCase().includes(q) || a.type.includes(q)));
        if (!list.length) return null;
        const open = q !== '' || !closed.has(cat);
        return (
          <div key={cat} className="cat">
            <button className="cat-title" onClick={() => toggle(cat)}>
              <span>{open ? '▾' : '▸'} {cat}</span><span className="muted">{list.length}</span>
            </button>
            {open && list.map((a) => (
              <button key={a.type} className={`asset${placing === a.type ? ' active' : ''}`} onMouseEnter={() => onHover(a.type)} onClick={() => onPick(a.type)}
                title="Cliquer puis cliquer dans la scène pour poser">
                <span>{a.label}</span>
                {counts[a.type] ? <span className="badge">{counts[a.type]}</span> : <span className="plus">+</span>}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ---------- Inspector ----------
const Field: React.FC<{param: Param; value: unknown; onChange: (v: unknown) => void}> = ({param, value, onChange}) => {
  switch (param.type) {
    case 'number':
      return (
        <label className="field">
          <span>{param.label}</span>
          <div className="row">
            <input type="range" min={param.min} max={param.max} step={param.step} value={Number(value ?? param.min)} onChange={(e) => onChange(Number(e.target.value))} />
            <input type="number" className="num" min={param.min} max={param.max} step={param.step} value={Number(value ?? param.min)} onChange={(e) => onChange(Number(e.target.value))} />
          </div>
        </label>
      );
    case 'color':
      return (
        <label className="field">
          <span>{param.label}</span>
          <div className="row">
            <input type="color" value={typeof value === 'string' && value.startsWith('#') ? value : '#888888'} onChange={(e) => onChange(e.target.value)} />
            {param.key === 'awning' && <button className="ghost small" onClick={() => onChange(null)}>aucun</button>}
          </div>
        </label>
      );
    case 'select':
      return (
        <label className="field">
          <span>{param.label}</span>
          <select value={String(value ?? param.options[0])} onChange={(e) => onChange(typeof param.options[0] === 'number' ? Number(e.target.value) : e.target.value)}>
            {param.options.map((o) => <option key={String(o)} value={String(o)}>{String(o)}</option>)}
          </select>
        </label>
      );
    case 'bool':
      return (
        <label className="field check">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span>{param.label}</span>
        </label>
      );
  }
};

type InspectorProps = {
  item: LayoutItem;
  onItem: (patch: Partial<LayoutItem>) => void;
  onProps: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onFocus: () => void;
};

export const Inspector: React.FC<InspectorProps> = ({item, onItem, onProps, onDelete, onDuplicate, onFocus}) => {
  const def = ASSET_BY_TYPE[item.type];
  const props = {...def?.defaults, ...item.props};
  const deg = Math.round(((item.ry * 180) / Math.PI) % 360);
  return (
    <Section title={def?.label ?? item.type} right={<span className="muted">{item.id}</span>}>
      <div className="grid3">
        {(['x', 'z', 'y'] as const).map((k) => (
          <label key={k} className="field">
            <span>{k.toUpperCase()} (m)</span>
            <input type="number" className="num wide" step={k === 'y' ? 0.05 : 0.5} value={item[k]} onChange={(e) => onItem({[k]: Number(e.target.value)})} />
          </label>
        ))}
      </div>
      <label className="field">
        <span>Rotation : {deg}°</span>
        <div className="row">
          <input type="range" min={-180} max={180} step={5} value={deg > 180 ? deg - 360 : deg < -180 ? deg + 360 : deg}
            onChange={(e) => onItem({ry: (Number(e.target.value) * Math.PI) / 180})} />
          <button className="ghost small" onClick={() => onItem({ry: item.ry - Math.PI / 2})}>−90°</button>
          <button className="ghost small" onClick={() => onItem({ry: item.ry + Math.PI / 2})}>+90°</button>
        </div>
      </label>
      {def?.params?.map((param) => (
        <Field key={param.key} param={param} value={props[param.key]} onChange={(v) => onProps({[param.key]: v})} />
      ))}
      <div className="row buttons">
        <button onClick={onFocus}>Centrer</button>
        <button onClick={onDuplicate}>Dupliquer</button>
        <button className="danger" onClick={onDelete}>Supprimer</button>
      </div>
    </Section>
  );
};

// ---------- Director camera ----------
type CameraPanelProps = {
  shots: Shot[];
  current: number | null;
  playing: boolean;
  time: number;
  frame: boolean;
  focusLabel: string;
  onFrame: (v: boolean) => void;
  onShots: (shots: Shot[]) => void;
  onPreset: (key: string) => void;
  onCapture: () => View;
  onGo: (view: View) => void;
  onPlay: (index: number | null) => void;
  onStop: () => void;
};

const newShotId = () => `plan-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const CameraPanel: React.FC<CameraPanelProps> = (p) => {
  const total = shotsDuration(p.shots);
  const set = (i: number, patch: Partial<Shot>) => p.onShots(p.shots.map((s, j) => (j === i ? {...s, ...patch} : s)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= p.shots.length) return;
    const next = [...p.shots];
    [next[i], next[j]] = [next[j], next[i]];
    p.onShots(next);
  };
  return (
    <>
      <Section title="Caméra réalisateur" right={<span className="muted">{p.shots.length} plans · {total.toFixed(1)} s</span>}>
        <p className="hint">Les mouvements se calent sur {p.focusLabel}. Chaque clic ajoute un plan et le joue.</p>
        <div className="presets">
          {PRESETS.map((pr) => (
            <button key={pr.key} title={pr.hint} onClick={() => p.onPreset(pr.key)}>{pr.label}</button>
          ))}
        </div>
        <div className="row buttons">
          <button className="primary" onClick={() => {
            const view = p.onCapture();
            p.onShots([...p.shots, {id: newShotId(), name: `Plan ${p.shots.length + 1}`, duration: 3, from: view, to: view, path: 'ligne', ease: 'doux'}]);
          }} title="Ajoute un plan fixe depuis la vue actuelle">Capturer cette vue</button>
          <label className="field check" style={{margin: 0}}>
            <input type="checkbox" checked={p.frame} onChange={(e) => p.onFrame(e.target.checked)} />
            <span>Cadre 9:16</span>
          </label>
        </div>
        <div className="row buttons">
          {p.playing
            ? <button onClick={p.onStop}>■ Stop · {p.time.toFixed(1)} s</button>
            : <button disabled={!p.shots.length} onClick={() => p.onPlay(null)}>▶ Lire la séquence</button>}
          <button className="ghost" disabled={!p.shots.length} onClick={() => p.onShots([])}>Tout effacer</button>
        </div>
      </Section>
      {p.shots.map((s, i) => (
        <section key={s.id} className={`section shot${p.current === i ? ' current' : ''}`}>
          <div className="row">
            <span className="muted">{i + 1}</span>
            <input className="name grow" value={s.name} onChange={(e) => set(i, {name: e.target.value})} />
            <button className="ghost small" onClick={() => p.onPlay(i)} title="Jouer ce plan">▶</button>
            <button className="ghost small" onClick={() => move(i, -1)} title="Monter">↑</button>
            <button className="ghost small" onClick={() => move(i, 1)} title="Descendre">↓</button>
            <button className="ghost small danger" onClick={() => p.onShots(p.shots.filter((_, j) => j !== i))} title="Supprimer">✕</button>
          </div>
          <div className="row" style={{marginTop: 6}}>
            <label className="field" style={{margin: 0, flex: 1}}>
              <span>Durée (s)</span>
              <input type="number" className="num wide" min={0.5} max={30} step={0.5} value={s.duration} onChange={(e) => set(i, {duration: Number(e.target.value)})} />
            </label>
            <label className="field" style={{margin: 0, flex: 1}}>
              <span>Mouvement</span>
              <select value={s.path} onChange={(e) => set(i, {path: e.target.value as Shot['path']})}>
                <option value="ligne">Ligne</option>
                <option value="orbite">Orbite</option>
              </select>
            </label>
            <label className="field" style={{margin: 0, flex: 1}}>
              <span>Vitesse</span>
              <select value={s.ease} onChange={(e) => set(i, {ease: e.target.value as Shot['ease']})}>
                <option value="doux">Douce</option>
                <option value="lineaire">Constante</option>
              </select>
            </label>
          </div>
          <div className="row buttons" style={{marginTop: 6}}>
            <button className="small" onClick={() => p.onGo(s.from)}>Voir début</button>
            <button className="small" onClick={() => p.onGo(s.to)}>Voir fin</button>
            <button className="small" onClick={() => set(i, {from: p.onCapture()})} title="Remplace le début par la vue actuelle">Début = vue</button>
            <button className="small" onClick={() => set(i, {to: p.onCapture()})} title="Remplace la fin par la vue actuelle">Fin = vue</button>
          </div>
        </section>
      ))}
      <Section title="Rendu vidéo">
        <p className="hint">Enregistre la ville : la composition <b>CityLayoutPreview</b> filme exactement ces plans, en 1080×1920.</p>
      </Section>
    </>
  );
};

// ---------- Generator ----------
const GEN_FIELDS: {key: keyof GenOptions; label: string; min?: number; max?: number; step?: number; bool?: boolean}[] = [
  {key: 'seed', label: 'Graine', min: 1, max: 9999, step: 1},
  {key: 'cols', label: 'Îlots en largeur', min: 1, max: 6, step: 1},
  {key: 'rows', label: 'Îlots en profondeur', min: 1, max: 6, step: 1},
  {key: 'blockW', label: 'Largeur d’îlot (m)', min: 24, max: 80, step: 1},
  {key: 'blockD', label: 'Profondeur d’îlot (m)', min: 24, max: 80, step: 1},
  {key: 'street', label: 'Largeur des rues (m)', min: 6, max: 20, step: 0.5},
  {key: 'walk', label: 'Trottoirs (m)', min: 2, max: 8, step: 0.5},
  {key: 'parks', label: 'Part de squares', min: 0, max: 1, step: 0.05},
  {key: 'floorsMin', label: 'Étages min', min: 1, max: 9, step: 1},
  {key: 'floorsMax', label: 'Étages max', min: 1, max: 9, step: 1},
  {key: 'cars', label: 'Voitures garées', min: 0, max: 1, step: 0.05},
  {key: 'people', label: 'Passants par îlot', min: 0, max: 40, step: 1},
  {key: 'shops', label: 'Part de magasins', min: 0, max: 1, step: 0.05},
  {key: 'modern', label: 'Îlots modernes', min: 0, max: 1, step: 0.05},
  {key: 'towers', label: 'Tours de bureaux', min: 0, max: 10, step: 1},
  {key: 'bridges', label: 'Ponts sur la Seine', min: 0, max: 7, step: 1},
  {key: 'seine', label: 'La Seine', bool: true},
  {key: 'boats', label: 'Péniches et bateaux-mouches', bool: true},
  {key: 'trees', label: 'Arbres d’alignement', bool: true},
  {key: 'furniture', label: 'Mobilier urbain', bool: true},
  {key: 'eiffel', label: 'Tour Eiffel au loin', bool: true},
];

export const GeneratorPanel: React.FC<{onGenerate: (o: GenOptions) => void}> = ({onGenerate}) => {
  const [o, setO] = useState<GenOptions>(DEFAULT_GEN);
  const blocks = o.cols * o.rows;
  return (
    <Section title="Générateur de ville">
      <p className="hint">Crée un quartier complet, puis déplace, modifie ou supprime chaque objet.</p>
      {GEN_FIELDS.map((f) => f.bool ? (
        <label key={f.key} className="field check">
          <input type="checkbox" checked={Boolean(o[f.key])} onChange={(e) => setO({...o, [f.key]: e.target.checked})} />
          <span>{f.label}</span>
        </label>
      ) : (
        <label key={f.key} className="field">
          <span>{f.label}</span>
          <div className="row">
            <input type="range" min={f.min} max={f.max} step={f.step} value={Number(o[f.key])} onChange={(e) => setO({...o, [f.key]: Number(e.target.value)})} />
            <input type="number" className="num" min={f.min} max={f.max} step={f.step} value={Number(o[f.key])} onChange={(e) => setO({...o, [f.key]: Number(e.target.value)})} />
          </div>
        </label>
      ))}
      {blocks > 9 && <p className="warn">{blocks} îlots : l’éditeur peut devenir lent.</p>}
      <div className="row buttons">
        <button onClick={() => setO({...o, seed: 1 + Math.floor(Math.random() * 9998)})}>Graine au hasard</button>
        <button className="primary" onClick={() => onGenerate({...o, floorsMax: Math.max(o.floorsMin, o.floorsMax)})}>Générer</button>
      </div>
    </Section>
  );
};
