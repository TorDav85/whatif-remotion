# Personnages et continuité du décor

La composition **Bibliotheque → Personnages** montre les passants, Marc, Maya,
la personne âgée, le chauffeur, les expressions et les poses.

Les visages et formes communes sont dans
`src/shared/characters/CharacterParts.tsx`. `Person` conserve ses couleurs, ses
coiffures, ses quatre poses et son facteur de taille ; `PersonSimple` est un
adaptateur. Les acteurs des vidéos conservent leurs accessoires, expressions et
points de contact des mains. Les foules nombreuses utilisent des silhouettes
fusionnées avec couleurs de sommets, plutôt que des centaines de visages séparés.

`SkyDome` dessine le ciel à l'infini à partir de la rotation de la caméra. Il ne
laisse plus apparaître le bord d'une sphère quand la caméra sort du quartier.
`UrbanBackdrop` prolonge le décor par des quartiers instanciés. Le plan utilise
des cellules de Voronoï irrégulières, avec une zone d'exclusion autour du décor
éditable. `LayoutSurroundings` est partagé par l'éditeur et son rendu Remotion.

Dans `MarcGeant`, `ParisTerrain.ts` produit le terrain régional sans rectangles
colorés et fond la carte rapprochée par un masque progressif. Les toits 3D et les
empreintes peintes utilisent le même générateur de quartiers. Le fond n'utilise
aucune image téléchargée.

```powershell
node scripts/check/stills.mjs Personnages --frames 60,180,300,420,540 --out out/characters-reworked
node scripts/check/stills.mjs MarcGeant --frames 90,1197,1203,1290,1530,1740,1827 --out out/characters-world-after
npm run typecheck
npm run test:city
```

Les fichiers MP4 déjà présents sont des exports figés. Relancer leur commande de
rendu pour obtenir les nouveaux modèles et décors dans une vidéo complète.
