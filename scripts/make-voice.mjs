// Voix off optionnelle avec Piper (synthèse vocale locale, gratuite).
//   1) installe piper et télécharge un modèle français (.onnx + .onnx.json)
//   2) PIPER_MODEL=/chemin/fr_FR-siwis-medium.onnx npm run voice
//   3) mets "voice": true dans src/timeline.json
// Autre vidéo : passe son timeline en argument (ex. npm run voice:heat → src/heat/timeline.json).
// Un fichier par "beat" : public/voice/beat-<index>.wav, lancé à l'instant exact du beat → sous-titres synchronisés.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const model = process.env.PIPER_MODEL;
if (!model) {
  console.error('Définis PIPER_MODEL=/chemin/vers/modele.onnx');
  process.exit(1);
}
const tl = JSON.parse(fs.readFileSync(process.argv[2] ?? 'src/timeline.json', 'utf8'));
const dir = `public/${tl.audio?.voiceDir ?? 'voice'}`;
fs.mkdirSync(dir, {recursive: true});
tl.beats.forEach((b, i) => {
  // les accolades {mot-clé} ne servent qu'à l'affichage
  const text = (b.voice ?? b.caption ?? b.title)?.replace(/[{}]/g, '');
  if (!text) return;
  const out = `${dir}/beat-${i}.wav`;
  const r = spawnSync('piper', ['--model', model, '--output_file', out], {input: text, encoding: 'utf8'});
  if (r.status !== 0) {
    console.error(`Échec beat ${i}:`, r.stderr || r.error);
    process.exit(1);
  }
  console.log(`✓ ${out}  « ${text} »`);
});
