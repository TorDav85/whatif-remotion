# La meilleure place au soleil

Film vertical indépendant : un client s'obstine à garder sa place en terrasse pendant que la température extérieure baisse de 10 °C par minute. Fiction comique, structurée AVANT → PENDANT → APRÈS. Retour à la même chaise rouge, coiffée du bonnet et de l'écharpe, avec Marc à l'abri derrière la vitre.

- Composition Remotion : `CafeCold`.
- Narration approuvée : `narration.json`.
- Timing réel, durées et empreintes audio : `timing.json`.
- `npm run voice:cafe` génère les prises locales XTTS (Ana Florence), mesure les WAV puis calcule le montage. Le débit reste naturel ; les pauses ménagent les actions et la chute.
- `node scripts/audio/python.mjs scripts/check/cafe-cold-audio.py` compare une transcription locale indépendante au texte approuvé. Les nombres et variantes phonétiques de transcription sont normalisés ; l'orthographe source est conservée dans le SRT. Les timestamps ASR restent des estimations.
- `node scripts/export/cafe-cold.mjs --preview` rend six aperçus.
- `node scripts/export/cafe-cold.mjs` rend les aperçus puis le MP4 H.264 en 1080 × 1920, 30 fps.
- `npm run render:cafe` propose aussi le rendu CLI direct.
- Sorties : `out/cafe-cold/` ; voix et ambiance originales : `public/cafe-cold/`.

Réutilisation : mobilier `CafeTerrace`, clients `Person`, jardinières `Planter`, primitives de la bibliothèque, `CameraRig` et animations déterministes communes. Marc possède un squelette articulé propre à cette scène. Vitrine, vêtements, tasse, givre progressif et ombre sont spécifiques. Les anciennes histoires et pistes vocales ne sont pas reprises.

La température affichée est extérieure. Le film ne prétend pas simuler la vitesse réelle de refroidissement des objets. Le gel reste localisé ; aucun enneigement instantané n'est ajouté.
