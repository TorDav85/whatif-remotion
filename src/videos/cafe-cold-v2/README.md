# La meilleure place au soleil — V2 Morpheus

Même scénario et même mise en scène que la première version. La narration utilise explicitement le profil local `morpheus`, avec des médias et un montage indépendants.

- Texte approuvé : `../cafe-cold/narration.json`.
- Voix : `npm run voice:cafe:v2`.
- Vérification de la transcription : `node scripts/audio/python.mjs scripts/check/cafe-cold-audio.py --v2`.
- Aperçus : `node scripts/export/cafe-cold.mjs --v2 --preview`.
- Rendu : `npm run render:cafe:v2`.
- Contrôle du MP4 : `node scripts/audio/python.mjs scripts/check/cafe-cold-video.py --v2`.
- Sortie : `out/cafe-cold-v2/la-place-au-soleil-v2-morpheus.mp4`.

Les pauses inutiles sont réduites avant de mesurer la voix. Le montage est construit à partir des durées mesurées. Les fichiers `timing.json` et `public/cafe-cold-v2/` permettent de conserver la V1 et la V2 dans le Studio.
