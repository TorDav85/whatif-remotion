// Téléchargement de données uniquement : aucun code du dépôt externe n'est exécuté.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root = path.resolve('public/planet-simulation');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'SOURCE.json'), 'utf8'));
for (const entry of manifest.files) {
  if (!/^[a-z]+map\.png$/.test(entry.name)) throw new Error('Nom de texture invalide');
  const file = path.join(root, entry.name);
  let data = await fs.readFile(file).catch(() => null);
  if (!data || data.length !== entry.size) {
    const response = await fetch(entry.url);
    if (!response.ok) throw new Error(`${entry.name}: HTTP ${response.status}`);
    data = Buffer.from(await response.arrayBuffer());
  }
  const blobSha = createHash('sha1').update(Buffer.from(`blob ${data.length}\0`)).update(data).digest('hex');
  if (blobSha !== entry.sha || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`${entry.name}: contenu incorrect`);
  await fs.writeFile(file, data);
  console.log(`${entry.name} · ${data.readUInt32BE(16)} × ${data.readUInt32BE(20)} · vérifié`);
}
