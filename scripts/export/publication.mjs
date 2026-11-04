/**
 * Publication folder of a video, named after its public title:
 *
 *   out/publication/<slug>/Et si Marc devenait géant.mp4
 *   out/publication/<slug>/Et si Marc devenait géant.jpg
 *   out/publication/<slug>/publication.txt
 *
 *   npm run export:publication -- marc-geant            one video
 *   npm run export:publication -- --all                 every video with a title
 *   npm run export:publication -- marc-geant --force    overwrite files with the same names
 *
 * Reads src/videos/<slug>/publication.json (title, composition, source, coverTime, description, hashtags).
 * Names come from src/core/publication-names.mjs. The MP4 is copied from `source` (render it first with
 * npm run render:<slug>); the cover is rendered from the Couverture composition. Existing files are
 * never renamed, deleted or overwritten without --force.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {publicationFiles} from '../../src/core/publication-names.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const force = args.includes('--force') || process.env.npm_config_force === 'true';
const all = args.includes('--all') || process.env.npm_config_all === 'true';
const videos = path.join(root, 'src/videos');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const slugs = all
  ? fs.readdirSync(videos).filter((s) => fs.existsSync(path.join(videos, s, 'publication.json')) && readJson(path.join(videos, s, 'publication.json')).title)
  : args.filter((a) => !a.startsWith('--'));
if (!slugs.length) {
  console.error('Usage : npm run export:publication -- <slug> [--force]  |  -- --all');
  process.exit(2);
}

const describe = (pub, names) => [
  names.title,
  '',
  pub.description ?? '',
  '',
  pub.hashtags ?? '',
  '',
].join('\n');

let serveUrl = null;
const gl = process.env.REMOTION_GL ?? 'angle';
let failed = 0;

for (const slug of slugs) {
  try {
    const pubFile = path.join(videos, slug, 'publication.json');
    if (!fs.existsSync(pubFile)) throw new Error(`publication.json absent pour ${slug}`);
    const pub = readJson(pubFile);
    if (!pub.title) throw new Error(`titre public manquant : ajouter "title": "Et si … ?" dans src/videos/${slug}/publication.json`);
    const names = publicationFiles(pub.title);
    const folder = path.join(root, 'out/publication', slug);
    fs.mkdirSync(folder, {recursive: true});
    const target = (name) => path.join(folder, name);
    const keep = (name) => fs.existsSync(target(name)) && !force;
    console.log(`\n${slug} → « ${names.title} »`);

    // Files from an earlier export under other names stay where they are.
    const others = fs.readdirSync(folder).filter((f) => /\.(mp4|jpg)$/i.test(f) && f !== names.video && f !== names.cover);
    if (others.length) console.log(`  · laissés tels quels (anciens exports) : ${others.join(', ')}`);

    // Video.
    if (keep(names.video)) console.log(`  = ${names.video} existe déjà (--force pour remplacer)`);
    else {
      const source = path.join(root, pub.source ?? '');
      if (!pub.source || !fs.existsSync(source)) throw new Error(`MP4 source introuvable (${pub.source}) : lancer npm run render:${slug}`);
      fs.copyFileSync(source, target(names.video));
      console.log(`  + ${names.video}  (${(fs.statSync(source).size / 2 ** 20).toFixed(1)} Mo, copie de ${pub.source})`);
    }

    // Cover.
    if (keep(names.cover)) console.log(`  = ${names.cover} existe déjà (--force pour remplacer)`);
    else {
      serveUrl ??= await bundle({entryPoint: path.join(root, 'src/index.ts'), onProgress: () => undefined});
      const inputProps = {slug, t: pub.coverTime ?? 0, title: names.title, ...(pub.coverHighlight ? {highlight: pub.coverHighlight} : {})};
      const composition = await selectComposition({serveUrl, id: 'Couverture', inputProps, chromiumOptions: {gl}, logLevel: 'error'});
      await renderStill({serveUrl, composition, inputProps, frame: 0, imageFormat: 'jpeg', jpegQuality: 92,
        output: target(names.cover), chromiumOptions: {gl}, logLevel: 'error'});
      console.log(`  + ${names.cover}  (scène à ${pub.coverTime ?? 0} s)`);
    }

    // Text.
    if (keep(names.text)) console.log(`  = ${names.text} existe déjà (--force pour remplacer)`);
    else {
      fs.writeFileSync(target(names.text), describe(pub, names), 'utf8');
      console.log(`  + ${names.text}`);
    }
  } catch (error) {
    failed++;
    console.error(`  x ${slug} : ${error.message}`);
  }
}
console.log(failed ? `\n${failed} export(s) en échec.` : '\nDossiers prêts dans out/publication/.');
process.exitCode = failed ? 1 : 0;
