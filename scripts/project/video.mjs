import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {temperatureTimeline} from '../../src/core/temperature.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(root);
const catalogPath = path.join(root, 'src/videos/catalog.json');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const catalog = read(catalogPath);
const [command = 'list', slug, newSlug, ...title] = process.argv.slice(2);

function inside(relative, directory = root) {
  const resolved = path.resolve(root, relative);
  const rel = path.relative(directory, resolved);
  if (!rel || rel.startsWith(`..${path.sep}`) || rel === '..' || path.isAbsolute(rel)) throw new Error(`Chemin hors du dossier attendu : ${relative}`);
  return resolved;
}

function registry(entries) {
  const slugs = new Set();
  const ids = new Set();
  for (const item of entries) {
    if (!/^[a-z][a-z0-9-]*$/.test(item.slug) || !/^[A-Za-z][A-Za-z0-9]*$/.test(item.id) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(item.export)) throw new Error(`Identifiants invalides : ${item.slug}`);
    if (slugs.has(item.slug) || ids.has(item.id)) throw new Error(`Doublon dans le catalogue : ${item.slug}`);
    slugs.add(item.slug); ids.add(item.id);
    for (const file of [item.entry, item.config]) {
      inside(file, path.join(root, 'src/videos'));
      if (!fs.existsSync(file)) throw new Error(`Fichier manquant : ${file}`);
    }
    const config = read(item.config);
    for (const key of ['fps', 'width', 'height', 'duration']) {
      if (!Number.isFinite(config[key]) || config[key] <= 0) throw new Error(`${item.slug} : ${key} invalide`);
    }
  }
  const relative = (file) => './' + path.relative(path.join(root, 'src/videos'), path.join(root, file)).replaceAll('\\', '/').replace(/\.tsx?$/, '');
  const imports = entries.map((item, index) => `import {${item.export} as Video${index}} from '${relative(item.entry)}';\nimport Config${index} from '${relative(item.config)}';`).join('\n');
  const items = entries.map((item, index) => `  {id: '${item.id}', component: Video${index}, ...dimensions(Config${index})},`).join('\n');
  return `// Généré depuis catalog.json par npm run video:sync.\n${imports}\n\nconst dimensions = (config: {fps: number; width: number; height: number; duration: number}) => ({\n  fps: config.fps, width: config.width, height: config.height, durationInFrames: Math.round(config.duration * config.fps),\n});\n\nexport const videos = [\n${items}\n];\n`;
}

function sync(entries = catalog) {
  fs.writeFileSync(path.join(root, 'src/videos/registry.tsx'), registry(entries));
  console.log(`${entries.length} vidéos enregistrées dans Remotion.`);
}

function run(script, args = []) {
  const result = spawnSync(process.execPath, [inside(script), ...args], {cwd: root, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Échec de ${script} (${result.status})`);
}

const validate = (target) => run('scripts/check/validate-scenarios.mjs', target ? [target] : []);

// Cache des ambiances par empreinte : régénère si le scénario ou le générateur a changé,
// au lieu de conserver le WAV dès qu'il existe (--if-missing).
const hashPath = path.join(root, '.cache/ambience-hashes.json');
const readHashes = () => { try { return read(hashPath); } catch { return {}; } };

function ambience(item, {force = false} = {}) {
  const config = read(item.config);
  inside(`public/${config.audio.music}`, path.join(root, 'public'));
  const fingerprint = crypto.createHash('sha1')
    .update(fs.readFileSync(inside(item.config)))
    .update(fs.readFileSync(inside(item.ambience)))
    .digest('hex');
  const hashes = readHashes();
  const output = path.join('public', config.audio.music);
  if (!force && hashes[item.slug] === fingerprint && fs.existsSync(output)) return;
  run(item.ambience, [item.config]);
  hashes[item.slug] = fingerprint;
  fs.mkdirSync(path.dirname(hashPath), {recursive: true});
  fs.writeFileSync(hashPath, JSON.stringify(hashes, null, 2) + '\n');
  console.log(`Ambiance régénérée pour ${item.slug} (scénario ou générateur modifié).`);
}

function copyVideo(item) {
  if (!newSlug || !/^[a-z][a-z0-9-]*$/.test(newSlug)) throw new Error('Usage : npm run video -- copy nature-v2 mon-film [Titre]');
  const destination = inside(`src/videos/${newSlug}`, path.join(root, 'src/videos'));
  if (fs.existsSync(destination) || catalog.some((entry) => entry.slug === newSlug)) throw new Error(`La vidéo ${newSlug} existe déjà.`);
  const source = path.dirname(inside(item.config, path.join(root, 'src/videos')));
  const id = 'Video' + newSlug.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join('');
  if (catalog.some((entry) => entry.id === id)) throw new Error(`Composition déjà existante : ${id}`);
  const next = {...item, slug: newSlug, id, title: title.join(' ') || newSlug,
    config: `src/videos/${newSlug}/${path.basename(item.config)}`,
    entry: `src/videos/${newSlug}/${path.basename(item.entry)}`, output: `out/${newSlug}.mp4`};
  // Same folder depth preserves imports to core/shared/assets and sibling videos.
  fs.cpSync(source, destination, {recursive: true, errorOnExist: true, force: false,
    filter: (file) => {if (fs.lstatSync(file).isSymbolicLink()) throw new Error('Lien symbolique dans la base.'); return true;}});
  const config = read(next.config);
  config.audio = {...config.audio, music: `${newSlug}.wav`, voice: false, voiceDir: `voice-${newSlug}`};
  fs.writeFileSync(next.config, JSON.stringify(config, null, 2) + '\n');
  const entries = [...catalog, next];
  const generated = registry(entries);
  fs.writeFileSync(catalogPath, JSON.stringify(entries, null, 2) + '\n');
  fs.writeFileSync('src/videos/registry.tsx', generated);
  console.log(`Vidéo créée : src/videos/${newSlug}\nScénario : ${next.config}\nComposition : ${id}\nAperçu : npm run video -- still ${newSlug}`);
}

try {
  if (command === 'list') {
    for (const item of catalog) console.log(`${item.slug.padEnd(15)} ${item.title}\n                ${item.config}`);
  } else if (command === 'sync') sync();
  else if (command === 'validate') validate(slug);
  else if (command === 'prepare') {
    validate();
    sync();
    for (const item of catalog) ambience(item);
  }
  else {
    const item = catalog.find((entry) => entry.slug === slug);
    if (!item) throw new Error(`Vidéo inconnue : ${slug ?? '(manquante)'}. Lancez npm run video.`);
    if (command === 'copy') copyVideo(item);
    else if (command === 'voice' || command === 'voice-plan') {
      const config = read(item.config);
      const directory = config.audio.voiceDir ?? `voice-${item.slug}`;
      let source = item.config;
      if (config.beats.some((beat) => !Number.isFinite(beat.t))) {
        const {captions} = temperatureTimeline(config);
        const slots = new Map(captions.map((caption) => [caption.i, caption]));
        const timed = {...config, beats: config.beats.map((beat, i) => {
          const slot = slots.get(i);
          return {...beat, t: slot?.start ?? 0, end: slot?.end ?? 0, voice: slot ? (beat.voice ?? beat.caption) : ''};
        })};
        source = `.cache/tts-timelines/${item.slug}.json`;
        fs.mkdirSync(path.dirname(source), {recursive: true});
        fs.writeFileSync(source, JSON.stringify(timed, null, 2));
      }
      run('scripts/audio/python.mjs', ['scripts/audio/xtts/generate.py', source,
        '--output-dir', directory, command === 'voice-plan' ? '--dry-run' : '--activate', ...(newSlug ? ['--voice', newSlug] : [])]);
      if (source !== item.config && command === 'voice') {
        config.audio = read(source).audio;
        fs.writeFileSync(item.config, JSON.stringify(config, null, 2) + '\n');
      }
    }
    else if (['ambience', 'still', 'render'].includes(command)) {
      if (command !== 'ambience') validate(item.slug); // échouer avant le rendu si le scénario est invalide
      sync(); ambience(item);
      if (command !== 'ambience') {
        const output = command === 'still' ? `out/${item.slug}-frame.png` : item.output;
        inside(output, path.join(root, 'out'));
        run('node_modules/@remotion/cli/remotion-cli.js', command === 'still'
          ? ['still', item.id, output, `--frame=${item.frame}`]
          : ['render', item.id, output, '--codec=h264']);
      }
    } else throw new Error('Commandes disponibles : list, sync, validate, prepare, copy, voice, voice-plan, ambience, still, render.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
