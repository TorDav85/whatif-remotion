# Et si une bombe nucléaire tombait sur cette ville ?

Partie 1, version 3 : 60 secondes, 1080 × 1920, 30 i/s. Composition Remotion : `BombeNucleaire`.
La direction commune et les repères sont définis dans [ART_DIRECTION.md](ART_DIRECTION.md).
Le décor détaillé est dans `CityEnvironment.tsx` ; les plans, les gestes et la lumière
restent dirigés ensemble dans `Scene3D.tsx`.

La ville et les événements sont fictifs. Les effets sont une illustration qualitative :
le temps est condensé et les distances, la puissance et les doses ne sont pas simulés.
Les références primaires et leur correspondance avec les répliques sont dans `sources.json`.

## Reconstruire

Depuis la racine du projet, avec l'environnement Python et le profil vocal existants :

```powershell
npm run voice:bombe-nucleaire
npm run captions -- bombe-nucleaire
npm test
node scripts/export/bombe-nucleaire.mjs --preview-stability
node scripts/check/stills.mjs BombeNucleaire --frames 60,180,795,894 --out out/bombe-nucleaire/v2-lookdev
node scripts/export/bombe-nucleaire.mjs --preview
node scripts/export/bombe-nucleaire.mjs --preview-ending
node scripts/export/bombe-nucleaire.mjs --replace-publication
npm run audio:levels -- bombe-nucleaire out/bombe-nucleaire/bombe-nucleaire-60s-v3.mp4
```

Le script vocal respecte les créneaux de `narration.json`, met les prises en cache,
limite l'accélération à ×1,3 et génère l'ambiance avec des bruitages ponctuels.
Les sous-titres utilisent les horodatages de la voix réellement produite.

Les trois agents suivent un brief commun : palette et architecture de la ville, repères
de caméra, dégâts localisés et fin dans l'abri. Les images de la ville puis le court
aperçu de fin sont examinés avant le rendu complet. Les tests techniques complètent
ce contrôle artistique. `storyboard.md` décrit le montage ; toute l'animation est
pilotée par le temps Remotion.

Le MP4 V3 est `out/bombe-nucleaire/bombe-nucleaire-60s-v3.mp4`.
Le premier MP4 reste disponible sous son nom initial.
Le dossier `out/publication/bombe-nucleaire/`
contient la copie nommée d'après le titre public, la couverture et le texte de publication.
L'export prépare des fichiers locaux ; il ne publie rien sur une plateforme.
`--replace-publication` remplace explicitement les fichiers de la version précédente.

La fin conserve les trois coups à la porte, la réaction de Marc, la voix étouffée de
Julien et le mouvement de poignée. Elle coupe avant l'ouverture et affiche
« À suivre — Partie 2 » ; la question au public de la première version est retirée.

La commande de rendu prépare aussi la couverture et le dossier de livraison. Elle
normalise le mix du MP4 en deux passes (cible −16 LUFS,
crête −1,5 dBTP), conserve la vidéo H.264, vérifie les dimensions et décode entièrement
le résultat avant de remplacer le nouveau rendu. Les mesures sont dans
`out/bombe-nucleaire/media-check.json`.

## Stabilité du rendu

`stability.ts` construit des chaussées sans recouvrement aux carrefours et attribue
un tirage indépendant à chaque fenêtre et fragment. Les détails existants ne
changent donc plus de place quand le souffle progresse. Les corniches mitoyennes
et les panneaux éventrés sont séparés des surfaces voisines. Le tampon de profondeur
logarithmique et les distances de caméra adaptées à l'extérieur et à l'abri
évitent les conflits entre façades, vitrages, marquages et sol.

`tests/bombe-stability.test.ts` contrôle la couverture des carrefours sans chevauchement,
la conservation du trou de l'abri, la progression des vitres cassées et la stabilité
des fragments. `--preview-stability` produit quatre extraits continus en pleine
résolution : introduction, vue aérienne, souffle et chaussée. Les images consécutives
avant/après sont conservées dans `out/bombe-nucleaire/stability-review/`.
