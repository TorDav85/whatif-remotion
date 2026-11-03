---
name: publication-et-stats
description: Préparer la publication d'une vidéo (export, contrôles légaux, description) et suivre ses statistiques par plateforme dans publication.json, puis diagnostiquer les décrochages pour choisir la prochaine amélioration. Utiliser quand l'utilisateur publie, colle des statistiques YouTube Shorts ou TikTok, ou demande pourquoi une vidéo marche ou non.
---

# Publication et statistiques

## Avant de publier
- MP4 contrôlé (skill `verification-rendu`) : 1080×1920, 30 i/s, AAC, crête ≤ −1 dB.
- **Voix** : XTTS est sous licence non commerciale (`docs/legal/voix-et-licences.md`). Vidéo monétisée,
  sponsorisée ou sur une chaîne du Programme Partenaire : changer de voix. Accord écrit de la personne
  dont la voix est clonée.
- Indiquer dans la description que la voix (et l'image) sont générées : YouTube et TikTok demandent de
  signaler les contenus synthétiques réalistes.
- Affirmations sourcées (skill `verification-faits`), mention « scénario fictif » à l'écran.
- Publier n'est pas une action à faire à la place de l'utilisateur : préparer le fichier, le titre et
  la description, il publie.

## Consigner : `src/videos/<slug>/publication.json`
```json
{"slug": "marc-geant-court", "hookVariant": "consequence", "editVariant": "short", "durationSeconds": 45,
 "publications": [
   {"platform": "youtube-shorts", "url": null, "publishedAt": null,
    "metrics": {"views": null, "engagedViews": null, "stayedToWatchPct": null, "averageViewDurationSeconds": null,
                "averagePercentageViewed": null, "likes": null, "comments": null, "shares": null, "subscribersGained": null}},
   {"platform": "tiktok", "url": null, "publishedAt": null,
    "metrics": {"views": null, "averageWatchTimeSeconds": null, "watchedFullVideoPct": null,
                "likes": null, "comments": null, "shares": null, "saves": null, "newFollowers": null}}],
 "dropOffs": [{"platform": "youtube-shorts", "atSeconds": 11, "note": "chute pendant l'explication"}]}
```
Chaque plateforme garde ses propres définitions (vues engagées, « restés pour regarder » sur YouTube ;
temps moyen et vidéo regardée en entier sur TikTok) : ne jamais additionner ni fusionner les métriques.
Noter la date de relevé. `npm run editorial` affiche l'état de publication de chaque vidéo.

## Diagnostiquer (hypothèses, pas des règles de l'algorithme)
| Observation | Hypothèse à tester |
| --- | --- |
| Beaucoup passent tout de suite (faible « restés pour regarder ») | L'accroche ne donne pas assez vite une raison de rester : tester une autre `hookVariant` |
| Chute pendant une explication | Passage trop long ou trop chargé : raccourcir, mode `science` plus lisible |
| Chute avant la révélation | La promesse tarde : avancer la révélation |
| Chute à l'écran final | La vidéo semble finie avant la fin : raccourcir la fin |

Comparer des vidéos de durées proches et changer **une** variable à la fois (accroche, durée, habillage).
Deux publications ne sont pas un test contrôlé : sujet, audience et moment varient aussi. Pas de seuil
« magique » de rétention garantissant la diffusion : ne pas en annoncer.
Ensuite : skill `montage-retention` pour produire la variante suivante.
