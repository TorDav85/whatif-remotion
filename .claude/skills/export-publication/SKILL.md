---
name: export-publication
description: Exporter le dossier de publication d'une vidéo - titre public « Et si [sujet] ? », MP4 et couverture JPG nommés d'après ce titre, publication.txt - avec la fonction de nommage commune. Utiliser quand l'utilisateur veut exporter, préparer, nommer ou livrer une vidéo pour la publier, ou définir le titre public d'une vidéo.
---

# Export de publication

## Résultat
```
out/publication/<slug>/
  Et si Marc devenait géant.mp4
  Et si Marc devenait géant.jpg
  publication.txt
```
```bash
npm run export:publication -- marc-geant          # une vidéo
npm run export:publication -- --all               # toutes celles qui ont un titre
npm run export:publication -- marc-geant --force  # remplacer des fichiers de même nom
```

## Règles de nommage (ne pas les recoder ailleurs)
Fonction commune : `src/core/publication-names.mjs` (types dans `.d.mts`, tests dans
`tests/publication-names.test.ts`).
- `publicTitle('Marc devenait géant')` → `Et si Marc devenait géant ?`
- `checkTitle(titre)` : normalise les espaces, refuse ce qui n'est pas « Et si … ? ».
- `fileBaseName(titre)` : titre **sans le « ? »**, accents et espaces conservés, caractères interdits
  (`< > : " / \ | ? *`) retirés (« : » devient « - »), points et espaces finaux retirés, 120 caractères max.
- `publicationFiles(titre)` → `{title, base, video, cover, text: 'publication.txt'}`.

Le « ? » reste sur la couverture et dans le titre public (`publication.txt`, première ligne),
jamais dans un nom de fichier. Les identifiants techniques (`MarcGeant`, `marc-geant`, chemins de
`out/<slug>/`) ne changent pas : le titre ne sert qu'aux fichiers de publication.

## Données : `src/videos/<slug>/publication.json`
```json
{"slug": "marc-geant", "title": "Et si Marc devenait géant ?", "composition": "MarcGeant",
 "source": "out/marc-geant/marc-geant-83s.mp4", "coverTime": 46,
 "description": "Chaque minute, Marc double de taille…", "hashtags": "#etsi #whatif #science",
 "coverHighlight": ["Marc"], "hookVariant": null, "editVariant": "original", "publications": […]}
```
- Titre : court, au conditionnel/imparfait, le sujet de l'accroche sans les « … chaque minute ».
  Une variante (version courte) garde le titre de l'original ; son dossier est celui de son slug.
- `coverTime` : instant (s, temps du film d'origine) où la scène est la plus parlante ; vérifier
  l'image produite (sujet visible, rien de coupé derrière le titre).
- `coverHighlight` : mots en or (par défaut « Marc »).

## Ce que fait l'export (`scripts/export/publication.mjs`)
1. Lit `publication.json` ; échoue avec un message clair si `title` ou le MP4 `source` manque
   (le rendre d'abord : `npm run render:<slug>`).
2. Copie le MP4 sous le nom du titre (le fichier de `out/<slug>/` reste en place).
3. Rend la couverture 1080×1920 JPG depuis la composition `Couverture` (`src/publication/Cover.tsx`) :
   la scène 3D du film à `coverTime`, sans sous-titres ni HUD, et le titre en capitales façon accroche.
   Une vidéo absente de `SCENES` dans `Cover.tsx` doit y être ajoutée (sa `Scene3D` prend `{t}`).
4. Écrit `publication.txt` : titre, description, hashtags, mention « voix de synthèse IA, scénario fictif ».

## Ne pas faire
- Renommer, déplacer ou supprimer des fichiers déjà exportés (y compris d'anciens noms dans le dossier) :
  l'export les laisse et les signale. Ne remplacer qu'avec `--force`, et seulement à la demande.
- Changer un identifiant de composition ou un slug pour « coller » au titre.
- Publier à la place de l'utilisateur. Avant publication : licence de la voix et métriques
  (skill `publication-et-stats`).

## Vérifier
`npx tsc --noEmit`, `npm run test:city -- publication-names`, ouvrir la couverture produite, relire
`publication.txt`, contrôler que le MP4 copié a la même taille que la source.
