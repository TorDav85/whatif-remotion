import React, {useState} from 'react';
import {ASSETS, ASSET_BY_TYPE, CATEGORIES, type LayoutItem, type Param} from '../assets/city/registry';
import {DEFAULT_GEN, type GenOptions} from '../assets/city/generator';

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
