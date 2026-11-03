/**
 * Freeze the reference city: generate it once from the fixed seed and options of
 * src/assets/city/reference/world.ts and write public/city-layouts/ville-reference.json.
 *
 *   npm run city:freeze              (re)write the file — only when the world must really change
 *   npm run city:freeze -- --check   fail if the file no longer matches the generator
 *
 * Episodes never call the generator: they read the frozen file.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = path.join(root, 'public/city-layouts/ville-reference.json');
const check = process.argv.includes('--check') || process.env.npm_config_check === 'true';
const out = path.join(root, '.cache', 'freeze-city.mjs');

// world.ts imports the frozen file itself: start from an empty one the very first time.
if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({version: 1, name: 'ville-reference', items: []}));
await esbuild.build({
  stdin: {contents: "export {generateReferenceWorld} from './src/assets/city/reference/world';", resolveDir: root, loader: 'ts'},
  outfile: out, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', packages: 'external', logLevel: 'warning',
});
const {generateReferenceWorld} = await import(pathToFileURL(out).href);
const text = `${JSON.stringify(generateReferenceWorld(), null, 1)}\n`;

if (check) {
  // Git may check the file out with CRLF line endings (core.autocrlf): compare the content only.
  if (fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== text) {
    console.error('ville-reference.json ne correspond plus au générateur : le monde de la série a bougé.');
    process.exit(1);
  }
  console.log('ville-reference.json : identique à la régénération.');
} else {
  fs.writeFileSync(file, text);
  console.log(`Écrit ${path.relative(root, file)} (${JSON.parse(text).items.length} objets).`);
}
