# Marc face au froid — révision Paris

Vidéo verticale de 61,17 secondes, voix locale `morpheus`. Le CTA commence à 00:10 : « Laisse un like, abonne-toi et propose ta prochaine idée de vidéo en commentaire. »

AVANT : Marc prend une photo au Trocadéro. PENDANT : il remonte son col, glisse sur les pavés gelés, se rattrape à la balustrade puis rejoint le métro tandis que la circulation s'arrête. APRÈS : le même point de vue est enseveli, les fontaines s'arrêtent et la tour Eiffel disparaît dans le blizzard. Le dernier plan reste sans texte pendant trois secondes.

Marc conserve le visage, les cheveux bruns, la chemise crème et la veste bleu-vert de la première histoire. Aucun vélo, panier rouge ou personnage familial dans cette version. La tour Eiffel, les bassins et la balustrade relient le début à la fin. Le refroidissement et le blizzard sont une hypothèse de fiction, signalée à l'ouverture.

Ressources réutilisées : décor parisien, architecture, voitures, figurants, neige et ouverture du métro. Créés : Marc debout et articulé, selfie, réaction au froid, glissade, appui à la balustrade, fuite et descente. La première version reste disponible.

Commandes :

- `npm run voice:polar:v2`
- `node scripts/audio/python.mjs scripts/check/cafe-cold-audio.py --polar-v2`
- `node scripts/export/cafe-cold.mjs --polar-v2 --preview`
- `npm run render:polar:v2`
- `node scripts/audio/python.mjs scripts/check/cafe-cold-video.py --polar-v2`

Export : `out/paris-polar-v2/paris-catastrophe-polaire-v2-marc.mp4`.

## Décor enrichi — V3

La composition active utilise désormais `ParisDistrict.tsx` : 34 immeubles avec façades sur les quatre côtés, 60 arbres, 16 bancs, 26 lampadaires, un kiosque, un abribus, deux terrasses, des jardinières, des corbeilles, des potelets, des feux, 15 véhicules dont un bus et 46 passants. La Seine, une péniche et le pont d'Iéna relient les jardins du Trocadéro à la tour Eiffel. Le Champ-de-Mars possède ses pelouses, allées, haies et rangées d'arbres. Les distances sont comprimées dans cette représentation stylisée.

Le Champ-de-Mars est montré à 00:07, lors des premiers flocons à 00:24, puis enseveli à 00:43. Le retour au Trocadéro conserve le cadrage d'ouverture. L'accumulation est visible sur les houppiers, les pelouses, les bancs, les corniches, les toits et les véhicules. Les passants se dispersent et cinq visiteurs proches rejoignent le métro ; Marc reste le personnage principal. Le brouillard s'épaissit en fin de vidéo après avoir laissé voir le quartier couvert de neige.

La voix Morpheus et le CTA « like » à 00:10 proviennent des prises déjà vérifiées. Durée conservée : 61,17 secondes. Les éléments répétés sont regroupés en instances pour limiter les appels de dessin. Les versions MP4 précédentes sont conservées.

- Aperçus : `node scripts/export/cafe-cold.mjs --dense --preview`.
- Export : `npm run render:polar:dense`.
- Contrôle : `node scripts/audio/python.mjs scripts/check/cafe-cold-video.py --dense`.
- Fichier : `out/paris-polar-v3/paris-catastrophe-polaire-v3-paris-dense.mp4`.

Repères géographiques consultés : [jardins du Trocadéro, Ville de Paris](https://www.paris.fr/lieux/jardins-du-trocadero-1789), [les points de vue autour de la tour Eiffel, SETE](https://www.toureiffel.paris/fr/actualites/visite/que-voir-autour-de-la-tour-eiffel). La catastrophe et sa vitesse restent des choix de fiction.
