/**
 * Editorial report: flags what may hurt retention, video by video. It never fails the build:
 * a long shot or a silence is not wrong by itself — the script points, the director decides.
 *
 *   npm run editorial                 all videos with a narration.json
 *   npm run editorial -- marc-geant   one video
 *
 * Writes out/editorial-report.md and prints a summary.
 */
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const videos = path.join(root, 'src/videos');
const only = process.argv[2] ?? process.env.npm_config_video;

const LIMITS = {captionChars: 32, captionWords: 6, blockChars: 60, shot: 8, ctaShare: 0.15};

const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);
const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '');
const fmt = (n) => n.toFixed(1).replace('.', ',');
const overlap = ([a0, a1], [b0, b1]) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
const total = (ranges) => ranges.reduce((s, [a, b]) => s + Math.max(0, b - a), 0);

/** CTA windows: editorial.json, else a `CTAS` array of {from, to} in TextOverlay.tsx. */
const ctaWindows = (dir, editorial) => {
  if (editorial?.cta) return editorial.cta;
  const src = read(path.join(dir, 'TextOverlay.tsx'));
  const block = src.match(/const CTAS[^=]*=\s*\[([\s\S]*?)\];/);
  if (!block) return [];
  return [...block[1].matchAll(/from:\s*([\d.]+),\s*to:\s*([\d.]+)/g)].map((m) => [+m[1], +m[2]]);
};

/** Shot starts: editorial.json edit list, else `from:` values of SHOTS in Scene3D.tsx. */
const shotStarts = (dir, editorial, duration) => {
  if (editorial?.edit) return editorial.edit.map((s) => s.at);
  const src = read(path.join(dir, 'Scene3D.tsx'));
  const consts = Object.fromEntries([...src.matchAll(/export const (\w+)\s*=\s*([\d.]+);/g)].map((m) => [m[1], +m[2]]));
  const shots = src.match(/export const SHOTS[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!shots) return [];
  return [...shots[1].matchAll(/\{from:\s*([\w.[\]]+)/g)]
    .map((m) => {
      const v = m[1];
      if (/^[\d.]+$/.test(v)) return +v;
      const arr = v.match(/^(\w+)\[(\d+)\]$/);
      if (arr) {
        const list = src.match(new RegExp(`export const ${arr[1]}[^=]*=\\s*\\[([^\\]]+)\\]`));
        return list ? +list[1].split(',')[+arr[2]] : NaN;
      }
      return consts[v] ?? NaN;
    })
    .filter((x) => Number.isFinite(x) && x < duration);
};

const report = (slug) => {
  const dir = path.join(videos, slug);
  const narration = readJson(path.join(dir, 'narration.json'));
  if (!narration?.beats) return null;
  const voice = readJson(path.join(dir, 'voice.json'));
  const captions = readJson(path.join(dir, 'captions.json'));
  const editorial = readJson(path.join(dir, 'editorial.json'));
  const duration = narration.duration ?? readJson(path.join(dir, 'timing.json'))?.duration ?? 0;
  const items = [];
  const flag = (level, text) => items.push({level, text});

  // Captions.
  if (captions?.segments) {
    const long = captions.segments.filter((s) => s.text.length > LIMITS.captionChars || s.text.split(' ').length > LIMITS.captionWords);
    if (long.length) flag('!', `${long.length} segment(s) de sous-titres trop longs : « ${long[0].text} »`);
    else flag('ok', `Sous-titres segmentés : ${captions.segments.length} groupes, ${LIMITS.captionWords} mots / ${LIMITS.captionChars} caractères max.`);
  } else {
    const blocks = narration.beats.filter((b) => b.text.length > LIMITS.blockChars);
    flag('!', `Sous-titres affichés en bloc (pas de captions.json) ; ${blocks.length} réplique(s) > ${LIMITS.blockChars} caractères.`);
  }

  // Calls to action.
  const cta = ctaWindows(dir, editorial);
  const ctaTime = total(cta);
  if (ctaTime > 0) {
    const share = duration ? ctaTime / duration : 0;
    flag(share > LIMITS.ctaShare ? '!' : 'ok', `Appels à l'action : ${cta.length} fenêtre(s), ${fmt(ctaTime)} s affichés (${Math.round(share * 100)} % de la vidéo).`);
  } else flag('i', "Aucun appel à l'action déclaré.");

  // Overlaps: CTA or diagram over spoken captions.
  // A question read aloud by the voice is meant to be on screen at the same time.
  const spokenCta = new Set(editorial?.ctaSpoken ?? []);
  const spoken = (voice?.beats ?? []).filter((b) => !spokenCta.has(b.id)).map((b) => [b.start, b.end]);
  const diagrams = editorial?.diagrams ?? [];
  const ctaOverVoice = cta.reduce((s, c) => s + spoken.reduce((x, v) => x + overlap(c, v), 0), 0);
  if (ctaOverVoice > 0.5) flag('!', `CTA affiché pendant la voix : ${fmt(ctaOverVoice)} s (concurrence avec les sous-titres).`);
  const ctaOverDiagram = cta.reduce((s, c) => s + diagrams.reduce((x, d) => x + overlap(c, d), 0), 0);
  if (ctaOverDiagram > 0) flag('!', `CTA pendant un schéma explicatif : ${fmt(ctaOverDiagram)} s.`);

  // Shots.
  const starts = shotStarts(dir, editorial, duration).sort((a, b) => a - b);
  if (starts.length) {
    const lengths = starts.map((s, i) => [s, (starts[i + 1] ?? duration) - s]);
    const long = lengths.filter(([, d]) => d > LIMITS.shot);
    flag(long.length ? 'i' : 'ok', `${starts.length} plans, plus long ${fmt(Math.max(...lengths.map(([, d]) => d)))} s` +
      (long.length ? ` ; à examiner : ${long.map(([s, d]) => `${fmt(s)} s (${fmt(d)} s)`).join(', ')}` : '.'));
    const dips = editorial?.edit ? editorial.edit.filter((s) => s.cut === 'dip').length : null;
    if (dips === null && /CUTS\.map/.test(read(path.join(dir, path.basename(dir).split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('') + '.tsx'))))
      flag('i', 'Fondu au noir sur chaque coupe : à comparer avec des coupes franches.');
  }

  // Science claims and sources.
  const numeric = narration.beats.filter((b) => /\d|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|cent|mille/i.test(b.text) && /fois|multipli|mètres|kilom|degrés|kg|tonnes|%/i.test(b.text));
  const unsourced = numeric.filter((b) => !b.source && !b.verify);
  const verify = narration.beats.filter((b) => b.verify).length;
  if (unsourced.length) flag('i', `${unsourced.length} réplique(s) chiffrée(s) sans champ « source » : ${unsourced.map((b) => b.id).join(', ')}.`);
  if (verify) flag('!', `${verify} affirmation(s) « verify » à contrôler.`);

  // Audio files.
  if (!voice) flag('!', 'voice.json absent : voix non générée.');
  else {
    const missing = [voice.ambience, ...voice.beats.map((b) => b.audio)].filter((f) => f && !existsSync(path.join(root, 'public', f)));
    flag(missing.length ? '!' : 'ok', missing.length ? `${missing.length} fichier(s) audio absents (ex. ${missing[0]}) : relancer npm run voice:*` : `Audio présent : ${voice.beats.length} répliques + ambiance.`);
    const tooFast = voice.beats.filter((b) => b.speed > 1.15);
    if (tooFast.length) flag('i', `Voix accélérée > ×1,15 : ${tooFast.map((b) => `${b.id} ×${b.speed}`).join(', ')}.`);
  }

  // Publication log (metrics are per platform, never merged).
  const pub = readJson(path.join(dir, 'publication.json'));
  if (!pub) flag('i', 'Pas de publication.json.');
  else {
    const live = pub.publications.filter((p) => p.publishedAt);
    flag('i', live.length
      ? `Publiée : ${live.map((p) => `${p.platform} (${p.metrics.views ?? '?'} vues${p.metrics.stayedToWatchPct != null ? `, ${p.metrics.stayedToWatchPct} % restés` : ''})`).join(' ; ')}.`
      : `Non publiée (variante ${pub.editVariant}${pub.hookVariant ? `, accroche ${pub.hookVariant}` : ''}).`);
  }

  // Hook.
  const hook = narration.beats[0];
  if (hook?.slot && hook.slot[0] > 0.5) flag('!', `La voix commence tard (${fmt(hook.slot[0])} s).`);
  return {slug, duration, items};
};

const slugs = (only ? [only] : readdirSync(videos)).filter((s) => existsSync(path.join(videos, s, 'narration.json')));
const results = slugs.map(report).filter(Boolean);
const icon = {ok: '✓', i: '·', '!': '!'};
const lines = ['# Rapport éditorial', '', `Généré par \`npm run editorial\` — ${results.length} vidéo(s). « ! » à regarder en priorité, « · » à examiner, « ✓ » conforme.`, ''];
for (const r of results) {
  lines.push(`## ${r.slug} (${fmt(r.duration)} s)`, '');
  for (const it of r.items) lines.push(`- ${icon[it.level]} ${it.text}`);
  lines.push('');
  const warn = r.items.filter((i) => i.level === '!').length;
  console.log(`${r.slug.padEnd(20)} ${warn ? `${warn} point(s) à regarder` : 'rien à signaler'}`);
}
mkdirSync(path.join(root, 'out'), {recursive: true});
writeFileSync(path.join(root, 'out/editorial-report.md'), lines.join('\n'), 'utf8');
console.log('Rapport : out/editorial-report.md');
