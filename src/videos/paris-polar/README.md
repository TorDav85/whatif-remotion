# Paris, six minutes — catastrophe polaire

Scénario 3 révisé et autorisé : une photo au Trocadéro, un refroidissement fictif de 10 °C par minute accompagné d'un blizzard exceptionnel, une fuite vers le métro et un retour à la même vue ensevelie. Le vélo au panier rouge relie l'avant à l'après.

La narration utilise le profil local `morpheus`. Le CTA final est réellement prononcé : « Si cette vidéo t'a plu, mets un pouce bleu, abonne-toi et propose ta prochaine idée de vidéo en commentaire. ». La scène de blizzard continue pendant cet appel, puis reste seule au moins deux secondes, sans habillage éditorial. Le CTA est également transcrit et vérifié dans le son du MP4 exporté.

- Texte : `narration.json`. Sélection des prises : `takes.json`. Montage audio mesuré : `timing.json`.
- `npm run voice:polar` : génération XTTS et ambiance originale.
- `node scripts/audio/python.mjs scripts/check/cafe-cold-audio.py --polar` : transcription indépendante, comparaison et SRT.
- `node scripts/export/cafe-cold.mjs --polar --preview` : dix aperçus.
- `npm run render:polar` : MP4 vertical dans `out/paris-polar/paris-catastrophe-polaire-morpheus.mp4`.
- `node scripts/audio/python.mjs scripts/check/cafe-cold-video.py --polar` : voix, médias, CTA vocal, durée, dimensions, son AAC et décodage complet.

Réutilisés : tour Eiffel, vélo, voitures, immeubles, lampadaires, foule et squelette articulé. Créés : bassins et aménagement stylisé du Trocadéro, panier rouge, bouche de métro avec ouverture réelle au sol, accumulation de neige, rafales et chorégraphie de portage. Les anciennes histoires sont conservées.

La tempête et son accumulation rapide sont des choix de fiction, signalés dès l'ouverture. Les images ne sont pas une simulation climatique.
