# What if… — vidéos Remotion et bibliothèque 3D

Un dossier par vidéo, des objets 3D communs, et des scripts classés par usage.

## Démarrer

```powershell
npm install
npm run dev
```

Dans Remotion Studio, **Videos** regroupe les 10 vidéos et **Bibliotheque** les
planches **Assets**, **AssetsInterieur** et **AssetsVille** pour choisir les objets à réutiliser.

La [collection Ville & extérieur 1.02](src/assets/city/README.md) ajoute 24 objets
paramétrables : mobilier urbain, végétation, mobilité, commerces et chantier.
`npm run render:city` génère sa présentation animée de 20 secondes.

![Collection Ville & extérieur 1.02](docs/previews/assets-ville-1.02.png)

## Ajouter une voix TTS

Après [l'installation Python/XTTS](docs/voice.md) :

```powershell
npm run voice:add -- ma-voix "C:\chemin\enregistrement.mp3"
npm run voice:list
npm run video -- voice nature-v2 ma-voix
npm run video -- render nature-v2
```

Le TTS fonctionne localement sur CPU ou GPU, avec plusieurs profils vocaux et des
timings synchronisés. [Le guide voix](docs/voice.md) décrit l'installation, la sélection
du profil actif, les options de génération et la licence du modèle.

## Retrouver une base et la reprendre

```powershell
npm run video                                   # catalogue des bases
npm run video -- still nature-v2                 # aperçu de la V2
npm run video -- render nature-v2                # vidéo V2 → out/nature2.mp4
npm run video -- copy nature-v2 mon-film         # nouvelle copie indépendante du scénario
npm run video -- still mon-film                  # vérifier sa nouvelle base
```

La copie crée `src/videos/mon-film/`, l'ajoute au catalogue et réserve ses propres
fichiers audio. Modifier ensuite son JSON et ses scènes. Les modules communs restent
partagés. Les commandes historiques (`render:v2`, `render:tiktok`, `voice:xtts`…) restent disponibles.

## Où chercher

| Besoin | Dossier ou guide |
| --- | --- |
| Comprendre l'arborescence | [Structure](docs/structure.md) |
| Copier une base, reprendre un objet ou un script | [Réutilisation](docs/reuse.md) |
| Trouver le scénario d'une vidéo | [Catalogue](src/videos/catalog.json) |
| Personnages, voitures, bâtiments, mobilier | [Bibliothèque 3D](src/assets/README.md) |
| Animations et calculs communs | `src/core/` |
| Caméra, ciel, globe et styles communs | `src/shared/` |
| Scripts audio, ressources et exports | `scripts/audio/`, `scripts/assets/`, `scripts/export/` |
| Installer ou utiliser XTTS | [Voix locale](docs/voice.md) |
| Retrouver les détails des anciennes versions | [Historique](docs/versions/project-history.md) |

## V2 récupérée depuis la branche 1.01

La branche [1.01](https://github.com/TorDav85/whatif-remotion/tree/1.01), au commit
[`063acae`](https://github.com/TorDav85/whatif-remotion/commit/063acae3fa699534c9909ed5f28981eff827cecc), apporte :

- **NatureReprendV2** : `src/videos/nature-v2/`, 50 secondes ;
- **Gravite** : `src/videos/gravity/`, 55 secondes ;
- la bibliothèque d'objets extérieurs et les **42 objets d'intérieur** de `src/assets/`.

La V2 de « Nature reprend » et `paris-v2` sont deux vidéos différentes.
Les chemins d'origine et les fichiers importés sont consignés dans
[le manifeste d'import](docs/imports/1.01.json) et [la table de déplacement](docs/path-migration.json).

## Vérifier

```powershell
npm run typecheck
npm run test:project        # copie d'une base, compilation et protection des sources
npm run test:voice          # import et sélection des profils vocaux (Python requis)
npm run video:sync          # après une modification manuelle du catalogue
npm run voice:check         # vérifier le MP4 XTTS déjà généré
```

Exports dans `out/`. Audio et textures accessibles aux vidéos dans `public/`.
Environnement Python et modèles locaux dans `.venv/` et `.cache/`.
