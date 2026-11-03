---
name: montage-retention
description: Améliorer la rétention d'une vidéo verticale existante sans refaire ses décors - version courte montée à partir des plans d'origine, accroche orientée problème, sous-titres synchronisés en petits groupes, habillage par mode (story/science/climax/end), une seule question finale, transitions motivées. Utiliser pour « rendre la vidéo plus efficace », « faire une version courte », « réduire les textes / CTA » ou tester une autre accroche.
---

# Montage orienté rétention

Modèle : `src/videos/marc-geant-court/` (pilote 1.11, 45 s tirées des 83 s de `marc-geant`),
mesures avant/après dans `docs/versions/1.11.md`. Ne jamais modifier l'original : créer une variante.

## 1. Diagnostiquer
`npm run editorial -- <slug>` : sous-titres en bloc, part de CTA à l'écran (> 15 % = trop), CTA pendant
la voix, fondus systématiques, plans longs. `npm run audio:levels -- <slug> <mp4>` pour le mix.
Si des statistiques de publication existent, lire d'abord où les spectateurs décrochent
(skill `publication-et-stats`).

## 2. Monter à partir des plans existants
`src/videos/<slug>-court/editorial.json` est la source unique, lue par la composition, le script audio
et le rapport :
```json
{"source": "marc-geant", "duration": 45,
 "edit": [{"at": 0, "src": 5.6, "dur": 4.4, "cut": "cut", "label": "Accroche"}, …],
 "modes": [[0, "story"], [10, "science"], [17.6, "story"], [33.8, "climax"], [41.8, "end"]],
 "cta": [[41.8, 45]], "ctaSpoken": ["end"], "diagrams": [[10, 17.6]], "hookVariant": "consequence"}
```
La composition rend la scène d'origine au temps `srcTime(t)` (même `Scene3D`, même `Hud`).
`cut: "dip"` seulement aux vrais changements d'échelle ou d'époque. Si un plan d'origine a un défaut
(objet au premier plan), ajouter une **option** à la scène d'origine plutôt que de la modifier
(ex. `clearStreet` de `marc-geant/Scene3D.tsx`), puis vérifier que l'original reste identique.

## 3. Réécrire la voix
Nouvelle `narration.json` calée sur les segments (skill `whatif-ghostwriter`) ; le script audio peut
remonter l'ambiance de l'original selon `edit` (cf. `scripts/audio/marc-geant-court.py`) et homogénéiser
les répliques (`even_out`, écart visé ≤ 3 LU).

## 4. Habiller
| Outil | Rôle |
| --- | --- |
| `src/shared/captions/CaptionTrack.tsx` + `npm run captions -- <slug>` | groupes ≤ 6 mots / 32 caractères, calés sur la voix, mot prononcé en blanc |
| `wordTime(captions, /^huit/)` | faire apparaître un élément de schéma quand le mot est dit |
| `src/shared/ui/OverlayPolicy.ts` | `layerAlpha(plan, t, 'hud' / 'diagram' / 'captions' / 'cta')` : un type d'habillage à la fois |
| `src/shared/ui/transitions.ts` | `dipAt(cuts, t)` |
| `src/shared/ui/PlatformSafeArea.ts` | zones sûres (haut 300 px, droite 170, bas 380) |

Accroche à l'écran : règle + problème en deux lignes, pas de sous-titre en même temps.
Fin : une question, lue par la voix et affichée (insécable avant « ? »).

## 5. Vérifier
Planche, `npm run editorial -- <slug>-court` (attendu : sous-titres segmentés, CTA ≤ 15 %, 0 CTA pendant la
voix hors question lue), `npm run validate`, rendu, `npm run audio:levels`. Rapporter les chiffres
avant/après, pas une impression. Une version plus courte n'est pas « meilleure » tant qu'elle n'a pas
été publiée et mesurée.
