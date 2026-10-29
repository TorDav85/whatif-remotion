---
name: voix-xtts
description: Générer, caler et vérifier la voix off XTTS et l'ambiance sonore d'une vidéo. Utiliser pour écrire une narration, produire les répliques avec un profil vocal, les vérifier par transcription, ou corriger un son (nappe de bruit, niveaux, mot mal prononcé).
---

# Voix off XTTS et ambiance

## Environnement
- Python : `.venv` (appelé par `scripts/audio/python.mjs`), modèle XTTS v2 dans `.cache/huggingface`.
- Après déplacement du dossier : `python.exe` marche, `pip.exe` non → `.\.venv\Scripts\python.exe -m pip …`.
- Profils : `npm run voice:list`, `voice:add`, `voice:use`. Références dans `voice-samples/` (jamais versionnées).
- L'audio généré (`public/<slug>/*.wav`) n'est pas versionné : il se reconstruit.

## Narration calée sur l'image (modèle : InternetOffV1)
- `src/videos/<slug>/narration.json` : `{duration, beats: [{id, slot: [début, fin], text, seed?}]}`.
- `scripts/audio/<slug>.py` : génère chaque réplique (cache par texte + voix + seed + réglages),
  retire les silences, accélère au plus ×1,3 pour tenir dans le créneau et **échoue** au-delà
  (raccourcir le texte plutôt qu'accélérer), normalise, écrit `voice.json` pour la composition.
- Réglages XTTS stables : `temperature 0.5, repetition_penalty 2.0, top_k 40, top_p 0.85, gpt_cond_len 6`.

## Vérifier chaque réplique
Transcrire avec faster-whisper (modèle `small`, `download_root=.cache/audio-first/whisper`) et comparer.
Sur cette machine le GPU de CTranslate2 échoue (`cublas64_12.dll`) : `device='cpu', compute_type='int8'`.
Un mot remplacé (« Regarde » au lieu de « Garde ») : changer la `seed` de la réplique, relancer
(seule cette réplique est régénérée). Les homophones (« Gardes ») sont acceptables.

## Ambiance procédurale
- Sons ponctuels et musique (guitare Karplus-Strong, rires, crépitements, bips) plutôt que du bruit filtré
  continu : une nappe de bruit sur 45 s est perçue comme un souffle gênant.
- Mesurer par phase le niveau moyen ET le fond (20e centile de fenêtres de 0,1 s). Viser un fond < −35 dBFS
  hors musique ; la voix doit dominer (baisser l'ambiance de ~6 dB sous chaque réplique).
- Silence de fin : couper l'ambiance avant l'écran final.

## Contrôle du MP4
Durée, flux audio présent, niveau aux instants de voix vs silences, silence final à −∞ (skill `verification-rendu`).
