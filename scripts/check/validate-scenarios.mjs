// Validation des scénarios du catalogue avant rendu (audit 1.03-test2).
// Usage : node scripts/check/validate-scenarios.mjs [slug]
// Échoue (code 1) si un scénario est invalide ; les points à vérifier humainement sont des avertissements.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/videos/catalog.json'), 'utf8'));
const only = process.argv[2];

let errors = 0;
let warnings = 0;
const err = (slug, msg) => { errors++; console.error(`  x ${slug} · ${msg}`); };
const warn = (slug, msg) => { warnings++; console.warn(`  ! ${slug} · ${msg}`); };
const num = (v) => Number.isFinite(v);

for (const item of catalog) {
  if (only && item.slug !== only) continue;
  const slug = item.slug;
  for (const key of ['entry', 'config', 'ambience']) {
    if (!item[key]) { err(slug, `catalogue : champ ${key} manquant`); continue; }
    if (!fs.existsSync(path.join(root, item[key]))) err(slug, `fichier manquant : ${item[key]}`);
  }
  let config;
  try {
    config = JSON.parse(fs.readFileSync(path.join(root, item.config), 'utf8'));
  } catch (e) {
    err(slug, `JSON illisible : ${e.message}`);
    continue;
  }
  // Format vidéo
  for (const key of ['fps', 'width', 'height', 'duration']) {
    if (!num(config[key]) || config[key] <= 0) err(slug, `${key} invalide (${config[key]})`);
  }
  if (num(config.width) && num(config.height) && (config.width % 2 || config.height % 2)) {
    warn(slug, 'dimensions impaires : le H.264 préfère des dimensions paires');
  }
  const duration = num(config.duration) ? config.duration : Infinity;
  // Audio
  const audio = config.audio ?? {};
  if (audio.music !== undefined && (typeof audio.music !== 'string' || !/^[\w.-]+\.wav$/.test(audio.music))) {
    err(slug, `audio.music invalide : ${audio.music}`);
  }
  if (audio.voice && (typeof audio.voiceDir !== 'string' || !/^[\w-]+$/.test(audio.voiceDir))) {
    err(slug, 'audio.voice actif sans voiceDir valide');
  }
  // Scènes : bornes dans la vidéo et ordre chronologique (to facultatif selon les scénarios)
  if (config.scenes !== undefined) {
    if (!Array.isArray(config.scenes) || config.scenes.length === 0) {
      err(slug, 'scenes doit être un tableau non vide');
    } else {
      let prev = -Infinity;
      config.scenes.forEach((s, i) => {
        if (typeof s.id !== 'string' || !s.id) err(slug, `scène ${i} : id manquant`);
        if (!num(s.from) || s.from < 0 || s.from > duration) err(slug, `scène ${s.id ?? i} : from invalide (${s.from})`);
        if (num(s.from) && s.from < prev) err(slug, `scène ${s.id ?? i} : ordre chronologique cassé`);
        if (num(s.from)) prev = s.from;
        if (s.to !== undefined && (!num(s.to) || !num(s.from) || s.to <= s.from || s.to > duration)) {
          err(slug, `scène ${s.id ?? i} : to invalide (${s.to})`);
        }
      });
    }
  }
  // Beats de narration : créneaux et longueur de texte (les beats sans t sont calculés ailleurs, ex. Chaleur)
  if (Array.isArray(config.beats)) {
    let prev = -Infinity;
    config.beats.forEach((b, i) => {
      if (!num(b.t)) return;
      if (b.t < 0 || b.t > duration) err(slug, `beat ${i} : t hors de la vidéo (${b.t})`);
      if (b.t < prev) err(slug, `beat ${i} : ordre chronologique cassé`);
      prev = b.t;
      if (b.end !== undefined && (!num(b.end) || b.end <= b.t)) err(slug, `beat ${i} : end invalide (${b.end})`);
      const text = b.voice !== undefined ? b.voice : b.caption;
      if (typeof text === 'string' && text.trim()) {
        const next = config.beats[i + 1];
        const slotEnd = num(b.end) ? b.end : (next && num(next.t) ? next.t : duration);
        const slot = slotEnd - b.t;
        if (slot > 0 && text.length / slot > 25) {
          warn(slug, `beat ${i} : ${text.length} caractères en ${slot.toFixed(1)} s — phrase probablement trop longue`);
        }
      }
    });
  }
  // Courbe de température (Chaleur) : temps strictement croissants
  if (Array.isArray(config.curve)) {
    config.curve.forEach((k, i) => {
      if (!num(k.t) || !num(k.c)) err(slug, `curve[${i}] : t/c invalides`);
      if (i > 0 && num(k.t) && k.t <= config.curve[i - 1].t) err(slug, `curve[${i}] : temps non strictement croissant`);
    });
  }
  // Affirmations marquées à vérifier avant publication
  const verify = JSON.stringify(config).match(/"verify"\s*:\s*true/g);
  if (verify) warn(slug, `${verify.length} affirmation(s) "verify": true à contrôler avant publication`);
}

if (errors === 0) console.log(`Validation OK${only ? ` (${only})` : ''} — ${warnings} avertissement(s).`);
else console.error(`Validation échouée : ${errors} erreur(s), ${warnings} avertissement(s).`);
process.exitCode = errors > 0 ? 1 : 0;
