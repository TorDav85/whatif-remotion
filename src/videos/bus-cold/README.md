# Le prochain bus

Scénario 2 validé : Maya rejoint un bus pendant un refroidissement fictif de 10 °C par minute, puis revient aider un homme âgé. L'abribus, le sac jaune et l'écharpe relient l'avant à l'après.

Narration approuvée dans `narration.json`, voix locale `morpheus`, chronologie mesurée dans `timing.json`. Les prises sélectionnées et ajustements de ponctuation orale sont dans `takes.json`.

- `npm run voice:bus` reconstruit d'abord la phrase d'entraide à partir des deux prises correctement articulées sélectionnées, puis génère la voix et l'ambiance originale. Le choix des prises, leurs bornes et empreintes sont consignés dans `takes.json`.
- `node scripts/audio/python.mjs scripts/check/cafe-cold-audio.py --bus` vérifie la transcription et génère le SRT avec l'orthographe du texte source. Les mots horodatés ASR restent des estimations.
- `node scripts/export/cafe-cold.mjs --bus --preview` produit six aperçus.
- `npm run render:bus` produit le MP4 dans `out/bus-cold/le-prochain-bus-morpheus.mp4`.
- `node scripts/audio/python.mjs scripts/check/cafe-cold-video.py --bus` contrôle les empreintes audio, la voix, les dimensions, la durée et le décodage complet.

Réutilisés : bus pour l'approche, abribus, lampadaire, primitives, caméra et interpolation communes. Créés : personnages articulés avec mains ciblées pendant l'appui, canne, sac, écharpe, entrée du bus ouverte et intérieur, surfaces mouillées puis gelées. Toutes les animations sont déterministes, pilotées par les temps de la narration réelle. Les scènes du café sont conservées.
