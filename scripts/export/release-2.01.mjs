import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {getCompositions, renderStill, renderMedia} from '@remotion/renderer';
import {openSession} from '../project/render-session.mjs';
import {assertCamerasLocked} from './release-camera-lock.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.join(root, 'out/2.01');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const write = (p, value) => {fs.mkdirSync(path.dirname(p), {recursive: true}); fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');};
const release = read('src/releases/v2-01/catalog.json');
const lock = read('src/releases/v2-01/camera-lock.json');
const [action = 'check', ...args] = process.argv.slice(2);
const option = (key) => {const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1];};
const only = option('--only');
const selected = release.videos.filter((v) => !only || v.slug === only || v.id === only || v.sourceId === only);
if (!selected.length) throw new Error(`Vidéo inconnue : ${only}`);
if (!['check', 'stills', 'render', 'all'].includes(action)) throw new Error('Usage : node scripts/export/release-2.01.mjs check|stills|render|all [--only slug]');
fs.mkdirSync(output, {recursive: true});
const python = path.join(root, '.venv/Scripts/python.exe');
const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const cameras = assertCamerasLocked(root, lock);

function sourceFingerprint() {
  const files = [];
  const walk = (dir) => {for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (/\.(tsx?|mjs|json)$/.test(e.name)) files.push(p);
  }};
  walk(path.join(root, 'src'));
  files.push(path.join(root, 'package-lock.json'), path.join(root, 'remotion.config.ts'));
  const digest = crypto.createHash('sha256');
  for (const file of files.sort()) digest.update(path.relative(root, file)).update(fs.readFileSync(file));
  return digest.digest('hex');
}

function preflight(video) {
  const config = read(video.config), references = new Map();
  if (config.provisional) throw new Error(`${video.slug} : prises vocales encore provisoires`);
  const visit = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (typeof obj.audio === 'string') references.set(obj.audio, obj.sha256);
    if (typeof obj.audioFile === 'string') references.set(obj.audioFile, obj.audioSha256);
    for (const [key, value] of Object.entries(obj)) {
      if (['music', 'ambience', 'ambienceFile', 'impactFile'].includes(key) && typeof value === 'string' && value) references.set(value, undefined);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(config);
  const voicePath = path.join(path.dirname(video.config), 'voice.json');
  if (fs.existsSync(path.join(root, voicePath))) visit(read(voicePath));
  if (config.audio?.voice && config.audio.voiceDir) for (const [i, beat] of config.beats.entries()) {
    const text = beat.voice !== undefined ? beat.voice : beat.caption || beat.title;
    if (typeof text === 'string' && text.trim()) references.set(`${config.audio.voiceDir}/beat-${i}.wav`, undefined);
  }
  for (const [relative, expectedHash] of references) {
    if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error(`Ressource invalide : ${relative}`);
    const file = path.join(root, 'public', relative);
    if (!fs.existsSync(file)) throw new Error(`${video.slug} : ressource absente ${relative}`);
    if (expectedHash && hash(file) !== expectedHash) throw new Error(`${video.slug} : empreinte audio incorrecte ${relative}`);
  }
  let voiceReview = 'existing-audio-preserved';
  if (['CafeColdV2', 'BusCold', 'ParisPolar', 'ParisPolarV2'].includes(video.sourceId)) {
    const reviewed = read(`out/${video.slug}/audio-review.json`);
    for (const beat of config.beats) {
      const result = reviewed.find((b) => b.id === beat.id);
      const checksum = hash(path.join(root, 'public', beat.audio));
      if (!result?.match || result.audioSha256 !== checksum || beat.sha256 !== checksum) throw new Error(`${video.slug} : prise à recontrôler ${beat.id}`);
    }
    voiceReview = 'matching-transcription-cache';
  }
  const digest = crypto.createHash('sha256');
  for (const [relative] of references) digest.update(relative).update(hash(path.join(root, 'public', relative)));
  return {id: video.id, files: references.size, audioFingerprint: digest.digest('hex'), voiceReview};
}

const checks = [], errors = [];
for (const video of selected) {
  try {checks.push(preflight(video));} catch (error) {errors.push(String(error.message));}
}
write(path.join(output, 'preflight.json'), {version: '2.01', cameras, checked: checks, errors});
if (errors.length) throw new Error(errors.join('\n'));
console.log(`2.01 : ${selected.length} films, ${cameras.files} fichiers de caméra inchangés, ressources audio vérifiées.`);
if (action === 'check') process.exit(0);

const fingerprint = sourceFingerprint();
const statusFile = path.join(output, 'status.json');
const status = fs.existsSync(statusFile) ? JSON.parse(fs.readFileSync(statusFile, 'utf8')) : {version: '2.01', videos: {}};
status.sourceFingerprint = fingerprint; status.cameras = cameras;
// Shared session: one compilation for the 20 versions (reused when the sources did not change), one browser.
const {serveUrl, browser, chromiumOptions} = await openSession({gl: 'angle'});
const runPython = (script, argv) => {
  const result = spawnSync(python, ['-X', 'utf8', path.join(root, script), ...argv], {cwd: root, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Échec de ${script}`);
};
const htmlEscape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
function gallery() {
  const cards = release.videos.map((v) => {
    const previous = status.videos[v.slug];
    const item = previous?.signature?.startsWith(fingerprint + ':') ? previous : undefined;
    const video = item?.rendered ? `<video controls preload="none" poster="${v.slug}/poster.png" src="${v.slug}/${v.slug}-2.01.mp4"></video>` : `<img src="${v.slug}/poster.png" alt="${htmlEscape(v.title)}">`;
    return `<article>${video}<h2>${htmlEscape(v.title)}</h2><p>${item?.rendered ? 'MP4 vérifié' : item?.stills ? 'Images de contrôle' : 'À rendre'} · ${v.duration.toFixed(1)} s</p><a href="${v.slug}/planche.png">Plans</a>${item?.rendered ? ` · <a href="${v.slug}/${v.slug}-2.01.mp4" download>MP4 2.01</a>` : ''}</article>`;
  }).join('');
  fs.writeFileSync(path.join(output, 'index.html'), `<!doctype html><html lang="fr"><meta charset="utf-8"><title>What if — 2.01</title><style>body{background:#171c22;color:#eee9dc;font:16px system-ui;margin:40px}h1{font-size:42px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:24px}article{background:#232b34;padding:16px;border-radius:12px}img,video{width:100%;aspect-ratio:9/16;object-fit:contain;background:#101317}h2{font-size:20px}a{color:#f2d16d}p{color:#b8c1c9}</style><h1>What if — version 2.01</h1><p>20 films · cadrages et mouvements de caméra conservés · 1080 × 1920</p><main>${cards}</main></html>`);
}

try {
  const compositions = await getCompositions(serveUrl, {puppeteerInstance: browser, chromiumOptions, logLevel: 'error'});
  for (const [index, video] of selected.entries()) {
    if (sourceFingerprint() !== fingerprint) throw new Error('Sources modifiées pendant le rendu : relancer pour produire une version homogène.');
    assertCamerasLocked(root, lock);
    const composition = compositions.find((c) => c.id === video.id), original = compositions.find((c) => c.id === video.sourceId);
    if (!composition || !original) throw new Error(`Composition absente : ${video.id}`);
    for (const key of ['width', 'height', 'fps', 'durationInFrames']) if (composition[key] !== original[key]) throw new Error(`Métadonnée changée : ${video.id}.${key}`);
    const audioCheck = checks.find((c) => c.id === video.id);
    const signature = `${fingerprint}:${audioCheck.audioFingerprint}`;
    const previous = status.videos[video.slug] ?? {};
    const record = previous.signature === signature ? previous : {signature};
    const folder = path.join(output, video.slug);
    fs.mkdirSync(folder, {recursive: true});
    write(path.join(folder, 'spec.json'), video);
    console.log(`[${index + 1}/${selected.length}] ${video.title} (${video.id})`);
    if (!record.stills || !fs.existsSync(path.join(folder, 'poster.png'))) {
      for (const filename of fs.readdirSync(folder)) if (/^f-\d+\.png$/.test(filename)) fs.unlinkSync(path.join(folder, filename));
      const frames = [...new Set([video.frame, ...[0.07, 0.27, 0.48, 0.70, 0.89].map((f) => Math.round(f * (composition.durationInFrames - 1)))])].sort((a, b) => a - b);
      for (const frame of frames) {
        await renderStill({serveUrl, composition, puppeteerInstance: browser, chromiumOptions, frame, scale: 0.5, imageFormat: 'png', output: path.join(folder, `f-${frame}.png`), logLevel: 'error'});
      }
      fs.copyFileSync(path.join(folder, `f-${video.frame}.png`), path.join(folder, 'poster.png'));
      runPython('scripts/check/contact_sheet.py', [folder, path.join(folder, 'planche.png'), String(video.fps)]);
      record.stills = true; record.frames = frames;
      status.videos[video.slug] = record; write(statusFile, status); gallery();
    }
    if (action === 'stills') continue;
    const movie = path.join(folder, `${video.slug}-2.01.mp4`);
    if (record.rendered && fs.existsSync(movie) && record.mp4Hash === hash(movie)) {console.log('  MP4 déjà vérifié, reprise sans nouveau rendu.'); continue;}
    let last = -1;
    await renderMedia({serveUrl, composition, puppeteerInstance: browser, chromiumOptions, codec: 'h264', crf: 18,
      pixelFormat: 'yuv420p', imageFormat: 'jpeg', jpegQuality: 95, concurrency: 2, enforceAudioTrack: true,
      overwrite: true, outputLocation: movie, logLevel: 'error',
      onProgress: ({progress, renderedFrames}) => {
        const step = Math.floor(progress * 10);
        if (step !== last) {last = step; console.log(`  ${step * 10}% · ${renderedFrames}/${composition.durationInFrames} images`);}
      },
    });
    runPython('scripts/check/release-201-media.py', [movie, path.join(folder, 'spec.json'), path.join(folder, 'poster.png')]);
    record.rendered = true; record.mp4Hash = hash(movie); record.bytes = fs.statSync(movie).size;
    record.validation = JSON.parse(fs.readFileSync(movie.replace(/\.mp4$/, '.validation.json'), 'utf8'));
    status.videos[video.slug] = record; write(statusFile, status); gallery();
    console.log(`  OK : ${movie}`);
  }
} finally {await browser.close({silent: true});}
const completed = release.videos.filter((v) => status.videos[v.slug]?.rendered && status.videos[v.slug].signature.startsWith(fingerprint + ':')).length;
write(statusFile, {...status, completed, total: release.videos.length}); gallery();
if (completed === release.videos.length && action !== 'stills') runPython('scripts/check/release-201-package.py', []);
console.log(`Version 2.01 : ${completed}/${release.videos.length} MP4 vérifiés. Galerie : ${path.join(output, 'index.html')}`);
