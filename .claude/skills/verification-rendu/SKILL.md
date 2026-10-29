---
name: verification-rendu
description: Vérifier une vidéo Remotion avant et après rendu - images clés en planche, tests automatiques, contrôle du son et du MP4 final. Utiliser avant tout rendu complet, après une modification de scène, de caméra, d'asset ou d'audio, et avant de commiter ou pousser.
---

# Vérifier avant de rendre

Un rendu complet prend plusieurs minutes : on vérifie d'abord sur quelques images.

## 1. Tests et typage (rapide, toujours)
```bash
npm test
```
= `typecheck` + `test:city` (caméra, générateur, catalogue, serveur de l'éditeur) + `test:project` + `validate`.
Un seul fichier de tests : `npm run test:city -- camera`. Les tests sont dans `tests/*.test.ts`
(compilés par esbuild, lancés par `node --test`, aucune dépendance de test à installer).

## 2. Images clés en planche
```bash
npm run stills -- CityLayoutPreview --shots           # une image au milieu de chaque plan enregistré
npm run stills -- InternetOffV1 --frames 75,840,1890  # images choisies
npm run stills -- InternetOffV1 --count 10            # 10 images réparties
```
Un seul bundle pour toutes les images (bien plus rapide que `remotion still` en boucle).
Sortie : `out/stills/<Composition>/f-<image>.png` et `planche.png` (5 par ligne, temps en jaune).
Lire la planche avec l'outil Read, puis zoomer une image en taille réelle si un détail compte.

À relire sur chaque image :
- le sujet est visible, rien ne bouche l'objectif (dos, arbre, potelet, store, voiture) ;
- aucune tête coupée, sujet entre 25 % et 70 % de la hauteur ;
- textes lisibles, sans chevauchement, hors du sujet ;
- pas d'image brûlée par une lumière, pas de brume qui délave un plan large ;
- pas de rayures sur des faces superposées (z-fighting : deux boîtes de même largeur alignées).

## 3. Son (si la vidéo en a)
- Voix : transcrire chaque réplique (skill `voix-xtts`) et comparer au texte.
- Ambiance : mesurer le niveau moyen **et le fond** de chaque phase. Un fond élevé sur une longue durée
  = nappe de bruit continue, à supprimer (sons ponctuels et musique à la place).

## 4. Rendu complet puis contrôle du MP4
Lancer le rendu en arrière-plan, puis vérifier durée, flux vidéo 1080×1920 et audio, niveaux aux moments
de voix et silence final, et faire une planche du MP4 (extraction d'images avec l'ffmpeg d'imageio).

## Pièges connus
- PowerShell retire le `--` de `npm run x -- --opt` : les scripts lisent aussi `npm_config_<opt>`.
- Un volet de navigateur masqué met l'animation en pause : un éditeur « bloqué au chargement »
  ou une lecture à 0 s n'est pas forcément un bug.
- Comparer un still PNG et la même image du MP4 : l'écart attendu est ~1/255 (compression seule).
