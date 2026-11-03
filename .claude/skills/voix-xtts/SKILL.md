---
name: voix-xtts
description: Générer, caler et vérifier la voix off XTTS et l'ambiance sonore d'une vidéo. Utiliser pour écrire une narration calée sur des créneaux, produire les répliques avec un profil vocal, les vérifier par transcription, homogénéiser les niveaux, ou corriger un son (nappe de bruit, mot mal prononcé, voix couverte).
---

# Voix off XTTS et ambiance

## Avant tout : la licence
Le modèle XTTS v2 est sous CPML : usage **non commercial** du modèle **et des WAV produits**.
Une vidéo monétisée ou sponsorisée n'est pas couverte. Voir `docs/legal/voix-et-licences.md`
(et le consentement écrit de la personne dont la voix est clonée). Le signaler si la demande
parle de monétisation.

## Environnement
- Python : `.venv`, appelé par `node scripts/audio/python.mjs <script>` ; modèle dans `.cache/`.
- Après un déplacement du dossier : `npm run venv:check` (corrige les lanceurs `pip` avec
  `.venv\Scripts\python.exe -m pip install --force-reinstall --no-deps pip`).
- Profils : `npm run voice:list`, `voice:add`, `voice:use`. Références dans `voice-samples/` (jamais versionnées).
- GTX 1660 Ti (6 Go) : XTTS sur GPU échoue parfois au chargement (« CUDA out of memory » alors que
  la carte est libre) quand Windows manque de mémoire virtuelle ou que le disque C: est plein.
  Vérifier l'espace disque, puis `CUDA_VISIBLE_DEVICES=-1` force le CPU (plus lent, même voix ;
  le cache de prises ne dépend pas du périphérique).

## Narration calée sur l'image (modèle : `marc-deux-lunes`, `marc-geant-court`)
- `src/videos/<slug>/narration.json` : `{duration, beats: [{id, slot: [début, fin], text, seed?, source?}]}`.
- `scripts/audio/<slug>.py` (copier celui d'une vidéo Marc) : une prise par réplique, cache par
  texte + voix + seed + réglages, silences retirés, accélération ≤ ×1,3 sinon **échec** (raccourcir
  le texte), normalisation, écriture de `voice.json`.
- Réglages stables : `temperature 0.5, repetition_penalty 2.0, top_k 40, top_p 0.85, gpt_cond_len 6`.
- Repère de longueur : ~2,5 mots/s ; une accroche de 4 s tient en 10–11 mots.
- `npm run validate` vérifie ensuite que chaque WAV existe, tient dans son `slot` et ne chevauche pas
  la réplique suivante.

## Vérifier chaque réplique
- Transcription : `npm run captions -- <slug>` (affiche ce que Whisper entend, réplique par réplique)
  ou un script avec `scripts/audio/whisper_device.py` (GPU via les DLL de PyTorch, repli CPU).
  Ne pas charger XTTS et Whisper GPU dans le même processus.
- Mot faux : générer 4–5 prises avec d'autres `seed`, transcrire, garder la meilleure et l'écrire
  dans `narration.json`. Si le mot rate sur toutes les prises (« lampe », « plier »…), **reformuler**
  plutôt qu'insister.
- Homophones (« ses os » / « ses eaux »), chiffres en toutes lettres transcrits en chiffres : acceptables ;
  le dire, ne pas prétendre avoir écouté.

## Niveaux et mix
- `npm run audio:levels -- <slug> [mp4]` : LUFS de chaque réplique, écart entre répliques, atténuation
  de l'ambiance sous la voix, LUFS et crête du MP4.
- Cibles : écart ≤ 3 LU (le loudnorm en une passe est imprécis sur les répliques courtes : ajouter une
  correction de gain mesurée, cf. `even_out` dans `scripts/audio/marc-geant-court.py`) ; ambiance
  baissée d'au moins 4 dB sous la voix ; mix ≈ −16 à −17 LUFS, crête ≤ −1 dB.

## Ambiance procédurale
- Sons ponctuels et musique (guitare Karplus-Strong, carillons, impacts) plutôt qu'un bruit filtré
  continu : une nappe sur 45 s est perçue comme un souffle.
- Événements sonores calés sur les constantes de temps de `Scene3D.tsx` (les recopier en tête du script).
- Une version courte d'un film existant peut **remonter** l'ambiance de l'original selon la même liste
  de coupes (cf. `source_ambience` dans `marc-geant-court.py`) au lieu d'en créer une nouvelle.
- Couper l'ambiance avant l'écran final.

## Versionnage
Les pistes des vidéos Marc (`public/marc-*`) sont versionnées depuis 1.10 ; celles des anciennes bases
restent exclues (`.gitignore`) et se reconstruisent avec `npm run voice:*`.
