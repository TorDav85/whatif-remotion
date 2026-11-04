# Et si une bombe nucléaire tombait sur cette ville ? — dans la ville de référence

Composition `BombeNucleaireVille` (60 s, 1080 × 1920, 30 i/s). Même montage, même voix, mêmes sous-titres et
mêmes effets que l'épisode `bombe-nucleaire`, mais les plans extérieurs se passent dans la ville de référence de
la série (`docs/ville-reference.md`) :

| Temps | Lieu de la ville | Plan |
| --- | --- | --- |
| 0–4 s | au-dessus de l'immeuble de Marc | la place, le fleuve, les tours ; la bombe tombe au nord du fleuve |
| 4–8 s | `rue-marc`, spot `porte-immeuble` | Marc sort de chez lui et part vers l'est |
| 8–13 s | au-dessus des toits | flash et boule de feu derrière les tours |
| 13–18 s | `place-centrale` | fenêtres en feu sur les façades nord |
| 18–24 s | `rue-marc` | le souffle : les vitres de `haussmann-894` éclatent |
| 24–29 s | vue large | le champignon au-dessus de la ville |
| 29–34 s | le fleuve, puis `rue-marc` | l'autre rive en ruines, la place encore debout |
| 34–40 s | `rue-marc` | Marc retourne à sa porte et descend au sous-sol |
| 40–46 s | vue aérienne | schéma qualitatif des retombées, sous le vent |
| 46–60 s | abri (pièce sans fenêtre) | radio, coups à la porte, Julien |

Le monde figé n'est jamais modifié : les dégâts, la poussière et le ciel sont des variantes de l'épisode
(`damage`, `sky`) appliquées au rendu. Point d'impact et distances sont illustratifs.

Les fichiers `Effects3D.tsx`, `TextOverlay.tsx`, `captions.json`, `voice.json`, `narration.json`, `sources.json`
et l'audio `public/bombe-nucleaire/*.wav` sont repris tels quels de l'épisode `bombe-nucleaire` (sources et
précautions éditoriales : voir `narration.json` et `sources.json`).

```powershell
npm run stills -- BombeNucleaireVille --frames 60,180,300,450,570,795,900,990,1050,1290,1455,1740
npm run render:bombe-nucleaire-ville   # out/bombe-nucleaire-ville/bombe-nucleaire-ville-60s.mp4
```
