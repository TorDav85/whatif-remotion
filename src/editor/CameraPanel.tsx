import React from 'react';
import {PRESETS, shotStarts, shotsDuration, type Shot, type View} from '../assets/city/camera';
import {Section} from './panels';
import type {ShotIssue} from './Viewport';

type Props = {
  shots: Shot[];
  current: number | null;
  playing: boolean;
  time: number;
  frame: boolean;
  paths: boolean;
  issues: ShotIssue[] | null;
  focusLabel: string;
  onFrame: (v: boolean) => void;
  onPaths: (v: boolean) => void;
  onShots: (shots: Shot[]) => void;
  onPreset: (key: string) => void;
  onCapture: () => View;
  onGo: (view: View) => void;
  onPlay: (index: number | null) => void;
  onStop: () => void;
  onScrub: (t: number) => void;
  onCheck: () => void;
  onReframe: (index: number) => void;
};

export const newShotId = () => `plan-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const CameraPanel: React.FC<Props> = (p) => {
  const total = shotsDuration(p.shots);
  const starts = shotStarts(p.shots);
  const set = (i: number, patch: Partial<Shot>) => p.onShots(p.shots.map((s, j) => (j === i ? {...s, ...patch} : s)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= p.shots.length) return;
    const next = [...p.shots];
    [next[i], next[j]] = [next[j], next[i]];
    p.onShots(next);
  };
  const duplicate = (i: number) => {
    const copy = {...p.shots[i], id: newShotId(), name: `${p.shots[i].name} (copie)`};
    p.onShots([...p.shots.slice(0, i + 1), copy, ...p.shots.slice(i + 1)]);
  };
  const issuesOf = (i: number) => p.issues?.filter((x) => x.shot === i) ?? [];

  return (
    <>
      <Section title="Caméra réalisateur" right={<span className="muted">{p.shots.length} plans · {total.toFixed(1)} s</span>}>
        <p className="hint">Les mouvements se calent sur {p.focusLabel}. Chaque clic ajoute un plan et le joue.</p>
        <div className="presets">
          {PRESETS.map((pr) => <button key={pr.key} title={pr.hint} onClick={() => p.onPreset(pr.key)}>{pr.label}</button>)}
        </div>
        <div className="row buttons">
          <button className="primary" title="Ajoute un plan fixe depuis la vue actuelle" onClick={() => {
            const view = p.onCapture();
            p.onShots([...p.shots, {id: newShotId(), name: `Plan ${p.shots.length + 1}`, duration: 3, from: view, to: view, path: 'ligne', ease: 'doux', transition: 'coupe', shake: 0}]);
          }}>Capturer cette vue</button>
          <label className="field check inline"><input type="checkbox" checked={p.frame} onChange={(e) => p.onFrame(e.target.checked)} /><span>Cadre 9:16</span></label>
          <label className="field check inline"><input type="checkbox" checked={p.paths} onChange={(e) => p.onPaths(e.target.checked)} /><span>Trajectoires</span></label>
        </div>
      </Section>

      <Section title="Montage" right={<span className="muted">{p.time.toFixed(1)} / {total.toFixed(1)} s</span>}>
        <div className="timeline">
          {p.shots.map((s, i) => (
            <div key={s.id} className={`clip${p.current === i ? ' current' : ''}${issuesOf(i).length ? ' warn' : ''}`}
              style={{left: `${(starts[i] / Math.max(total, 0.1)) * 100}%`, width: `${(Math.max(0.1, s.duration) / Math.max(total, 0.1)) * 100}%`}}
              title={s.name}>{i + 1}</div>
          ))}
          <input type="range" min={0} max={Math.max(total, 0.1)} step={0.05} value={Math.min(p.time, total)} disabled={!p.shots.length}
            onChange={(e) => p.onScrub(Number(e.target.value))} />
        </div>
        <div className="row buttons">
          {p.playing
            ? <button onClick={p.onStop}>■ Stop</button>
            : <button disabled={!p.shots.length} onClick={() => p.onPlay(null)}>▶ Lire la séquence</button>}
          <button disabled={!p.shots.length} onClick={p.onCheck} title="Cherche les obstacles devant l’objectif et les caméras mal placées">Vérifier le cadrage</button>
          <button className="ghost" disabled={!p.shots.length} onClick={() => p.onShots([])}>Tout effacer</button>
        </div>
        {p.issues && (p.issues.length
          ? <p className="warn">{p.issues.length} problème(s) de cadrage : voir les plans marqués.</p>
          : <p className="ok">Aucun obstacle devant l’objectif, aucune caméra mal placée.</p>)}
      </Section>

      {p.shots.map((s, i) => (
        <section key={s.id} className={`section shot${p.current === i ? ' current' : ''}`}>
          <div className="row">
            <span className="muted">{i + 1}</span>
            <input className="name grow" value={s.name} onChange={(e) => set(i, {name: e.target.value})} />
            <button className="ghost small" onClick={() => p.onPlay(i)} title="Jouer ce plan">▶</button>
            <button className="ghost small" onClick={() => move(i, -1)} title="Monter">↑</button>
            <button className="ghost small" onClick={() => move(i, 1)} title="Descendre">↓</button>
            <button className="ghost small" onClick={() => duplicate(i)} title="Dupliquer">⧉</button>
            <button className="ghost small danger" onClick={() => p.onShots(p.shots.filter((_, j) => j !== i))} title="Supprimer">✕</button>
          </div>
          <div className="grid3" style={{marginTop: 6}}>
            <label className="field"><span>Durée (s)</span>
              <input type="number" className="num wide" min={0.5} max={30} step={0.5} value={s.duration} onChange={(e) => set(i, {duration: Number(e.target.value)})} /></label>
            <label className="field"><span>Mouvement</span>
              <select value={s.path} onChange={(e) => set(i, {path: e.target.value as Shot['path']})}>
                <option value="ligne">Ligne</option><option value="orbite">Orbite</option>
              </select></label>
            <label className="field"><span>Vitesse</span>
              <select value={s.ease} onChange={(e) => set(i, {ease: e.target.value as Shot['ease']})}>
                <option value="doux">Douce</option><option value="lineaire">Constante</option>
                <option value="entree">Démarrage lent</option><option value="sortie">Arrêt progressif</option>
              </select></label>
          </div>
          <div className="grid3">
            <label className="field"><span>Entrée</span>
              <select value={s.transition ?? 'coupe'} disabled={i === 0} onChange={(e) => set(i, {transition: e.target.value as Shot['transition']})}>
                <option value="coupe">Coupe</option><option value="fondu">Fondu noir</option>
              </select></label>
            <label className="field" style={{gridColumn: 'span 2'}}><span>Caméra épaule : {Math.round((s.shake ?? 0) * 100)} %</span>
              <input type="range" min={0} max={1} step={0.05} value={s.shake ?? 0} onChange={(e) => set(i, {shake: Number(e.target.value)})} /></label>
          </div>
          <div className="row buttons" style={{marginTop: 4}}>
            <button className="small" onClick={() => p.onGo(s.from)}>Voir début</button>
            <button className="small" onClick={() => p.onGo(s.to)}>Voir fin</button>
            <button className="small" onClick={() => set(i, {from: p.onCapture()})} title="Remplace le début par la vue actuelle">Début = vue</button>
            <button className="small" onClick={() => set(i, {to: p.onCapture()})} title="Remplace la fin par la vue actuelle">Fin = vue</button>
            {i > 0 && <button className="small" onClick={() => set(i, {from: p.shots[i - 1].to})} title="Démarre là où le plan précédent s’arrête">Raccord</button>}
            <button className="small" onClick={() => p.onReframe(i)} title="Décale le plan sur le côté jusqu’à ce que rien ne bouche l’objectif">Recadrer</button>
          </div>
          {issuesOf(i).map((x, k) => <p key={k} className="warn small-text">⚠ {x.when} : {x.message}</p>)}
        </section>
      ))}

      <Section title="Rendu vidéo">
        <p className="hint">Enregistre la ville : la composition <b>CityLayoutPreview</b> filme exactement ces plans, en 1080×1920.
          Contrôle rapide : <code>npm run stills -- CityLayoutPreview --shots</code>.</p>
      </Section>
    </>
  );
};
