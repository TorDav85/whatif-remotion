# Voix clonée locale : XTTS v2

Les scénarios publiés ont la voix désactivée pour fonctionner sans les enregistrements
personnels. `npm run voice:xtts` génère les pistes et active la voix après validation.
Pour la version TikTok, `npm run voice:tiktok` active de même la voix Windows après génération.


Python 3.12 est compatible avec le paquet maintenu `coqui-tts` (ne pas installer
l'ancien paquet `TTS` dans le même environnement). Sous Windows, depuis la racine :

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124
.\.venv\Scripts\python.exe -m pip install -r scripts/audio/xtts/requirements.txt
npm run voice:prepare -- "C:\chemin\enregistrement.mp3"
npm run render:with-voice
```

La variante CUDA 12.4 est adaptée à la GTX 1660 Ti ; sur une machine sans NVIDIA,
remplacer l'index PyTorch par `https://download.pytorch.org/whl/cpu`.
Les scripts npm utilisent directement `.venv`, sans activation PowerShell.
FFmpeg est fourni par `imageio-ffmpeg`, sans installation système.

## Ajouter plusieurs voix et en choisir une

```powershell
npm run voice:add -- narrateur "C:\chemin\ma-voix.mp3"
npm run voice:add -- autre-voix "C:\chemin\autre-enregistrement.wav"
npm run voice:list
npm run voice:use -- narrateur
npm run video -- voice nature-v2 narrateur
npm run video -- render nature-v2
```

`voice:add` prépare un extrait de 10 secondes et conserve chaque profil dans
`voice-samples/<nom>/`. Un nom déjà utilisé est refusé. Les noms contiennent des lettres
minuscules, chiffres et tirets. Le choix actif est sauvegardé localement dans
`.cache/voice-settings.json`. `voice:xtts` et `render:with-voice` utilisent cette voix active.
La commande `video voice <vidéo> <voix>` choisit une voix pour cette génération sans
modifier le choix actif global. Sans nom de voix, elle utilise le profil actif.

Les enregistrements, profils et WAV générés restent locaux et sont exclus de Git.
Le code et les dépendances nécessaires à leur utilisation sont versionnés dans `1.02`.
Sans profil nommé, l'ancien `public/reference.wav` reste utilisable ; un `--reference`
explicite est aussi accepté par le script Python.

Les dix bases du catalogue acceptent la narration. Pour **Chaleur**, la commande
convertit les seuils `atC` en créneaux vocaux avec le même module
`src/core/temperature.mjs` que les sous-titres. La conversion est conservée dans
`.cache/tts-timelines/` ; la courbe et le scénario de départ restent inchangés.

Pour inspecter les textes et créneaux sans charger le modèle :

```powershell
npm run video -- voice-plan heat
npm run video -- voice-plan nature-v2
```

Les pistes démarrent au beat ou sous-titre correspondant. Ajouter un champ `voice`
pour raccourcir une phrase prononcée sans changer le texte affiché ; `"voice": ""`
conserve un silence. Une phrase dépassant la limite de vitesse fait échouer la génération
avant l'activation de la voix dans le scénario.

Choix du passage et remplacement explicite d'un profil :

```powershell
node scripts/audio/python.mjs scripts/audio/xtts/profiles.py add narrateur "C:\chemin\ma-voix.mp3" --start 5 --seconds 10 --replace
```

`scripts/audio/xtts/prepare.py` extrait 10 secondes, enlève le silence initial et produit
`public/reference.wav` en mono 44,1 kHz, normalisé à −20 LUFS.
Pour choisir un autre passage :

```powershell
node scripts/audio/python.mjs scripts/audio/xtts/prepare.py "C:\chemin\enregistrement.mp3" --start 5 --seconds 10
```

Le modèle XTTS demande d'accepter sa licence au premier téléchargement
([CPML](https://tts-hub.github.io/cpml), usage non commercial, ou licence commerciale).
Le programme ne l'accepte pas automatiquement. Les poids sont conservés dans `.cache/`.
Après avoir lu et accepté la CPML, l'option `--accept-license` de `scripts/audio/xtts/generate.py`
permet de mémoriser cet accord dans `.cache/xtts-cpml-accepted.json`.
L'enregistrement et la synthèse sont traités localement ; le premier lancement télécharge
les dépendances et les poids du modèle.

`npm run voice:xtts` lit `src/videos/whatif/timeline.json` et génère `public/voice-xtts/beat-N.wav`.
Le champ `voice` est prioritaire ; une chaîne vide impose le silence.
Chaque piste est normalisée et, si nécessaire, accélérée sans changer sa hauteur
(limite 2×). Une phrase trop longue fait échouer la commande pour permettre sa correction.
Les durées et vitesses figurent dans `public/voice-xtts/timing.json`.
Le cache vérifie le texte, la référence, les timings et l'intégrité des WAV.
La voix n'est activée dans le scénario qu'après validation de toutes les pistes.

`npm run render:with-voice` génère l'ambiance, la voix puis
`out/whatif-xtts.mp4` (composition `WhatIf`, 46 secondes).
`npm run voice:check` contrôle les WAV, leurs durées et empreintes, les métadonnées
du MP4 et son décodage complet, puis écrit `out/xtts-validation.json`.
Pour d'autres scénarios, choisir un dossier distinct et lancer leur rendu habituel :

```powershell
node scripts/audio/python.mjs scripts/audio/xtts/generate.py src/videos/paris-tiktok/scenario.json --output-dir voice-tiktok-xtts --activate
npm run render:tiktok
```

`--dry-run` permet de vérifier les textes et créneaux sans charger XTTS.
`--force` régénère les pistes. Avec un seul enregistrement, cette procédure utilise
le clonage par référence ; elle n'effectue pas de fine-tuning.
