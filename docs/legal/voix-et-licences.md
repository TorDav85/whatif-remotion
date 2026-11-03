# Voix off : licence XTTS et consentement

Ce document n'est pas un avis juridique. Il résume ce que disent les textes, pour décider avant
toute publication monétisée.

## 1. La licence du modèle XTTS v2

Les **poids** du modèle `tts_models/multilingual/multi-dataset/xtts_v2` sont sous
**Coqui Public Model License 1.0.0 (CPML)** ([texte](https://huggingface.co/coqui/XTTS-v2/blob/main/LICENSE.txt)).
Le **code** de la bibliothèque (`coqui-tts`) est sous MPL 2.0 ; c'est le modèle qui pose la limite.

Ce que dit la CPML :

- Seul l'usage **non commercial** du modèle **et de ses sorties** (les WAV générés) est autorisé,
  « dans la mesure où vous ne recevez aucun paiement direct ou indirect » lié à cet usage.
- Utiliser le modèle pour entraîner d'autres modèles à usage commercial n'est pas non commercial.
- Quiconque reçoit le modèle ou ses sorties de votre part doit recevoir aussi les conditions ou leur URL.

Conséquence pour ce projet : une vidéo dont la voix vient de XTTS et qui rapporte de l'argent
(monétisation YouTube, fonds créateurs TikTok, sponsor, placement) est une **sortie utilisée avec
paiement indirect**, donc hors de la licence.

Coqui a cessé son activité fin 2023 / début 2024 : il n'existe plus de licence commerciale à acheter
([résumé](https://localaimaster.com/blog/xtts-coqui-commercial-license)). L'absence de société pour
faire respecter la licence ne vaut pas autorisation.

### Ce qu'on peut faire

| Usage | XTTS v2 |
| --- | --- |
| Tests, prototypes, vidéos non monétisées | Autorisé (CPML) |
| Publication sur une chaîne monétisée ou sponsorisée | Non couvert : changer de voix |
| Diffusion des WAV (ex. dossier `public/marc-*` sur GitHub) | Autorisé à titre non commercial, avec le lien vers la CPML |

Options pour une chaîne monétisée :

1. Enregistrer la narration soi-même (micro), puis garder la chaîne de calage du projet
   (`slot`, `captions.py`, `audio-levels`) : elle fonctionne sur n'importe quel WAV.
2. Utiliser un moteur dont la licence couvre l'usage commercial (vérifier ses conditions au moment
   du choix ; Piper, déjà présent via `npm run voice`, dépend de la licence de chaque voix).
3. Une voix de synthèse commerciale sous contrat explicite.

## 2. Le consentement des voix clonées

XTTS clone une voix à partir d'un extrait de 10 s (`voice-samples/<profil>/`). Pour chaque profil :

- La personne dont la voix est clonée donne un **accord écrit** : quelle voix, pour quels usages
  (projet, plateformes, durée), droit de retrait.
- Ne jamais cloner la voix d'une personne publique ou d'un tiers sans cet accord, ni imiter une
  personne réelle dans une vidéo.
- Indiquer dans la description des vidéos que la voix est générée par IA (exigé par YouTube et
  TikTok pour les contenus synthétiques réalistes).

Modèle à remplir et à garder hors du dépôt (données personnelles) :

```text
Je soussigné(e) ……, autorise …… à utiliser un modèle de synthèse vocale entraîné ou conditionné
sur ma voix (extrait enregistré le ……) pour la narration des vidéos « Et si… ? ».
Usages autorisés : …… (non commercial / commercial), plateformes : ……, durée : …….
Je peux retirer cet accord à tout moment par écrit ; les vidéos déjà publiées seront ……
Fait à ……, le ……  Signature :
```

Le dépôt ne versionne aucun enregistrement source (`voice-samples/`, `public/reference.wav`
sont exclus de Git).

## 3. Profil utilisé dans ce dépôt

| Profil | Origine | Accord écrit | Usage commercial |
| --- | --- | --- | --- |
| `morpheus` | À compléter | À compléter | Non (CPML) |
