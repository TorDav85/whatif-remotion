# Reprendre une base ou un script

## Repartir d'une vidéo existante

```powershell
npm run video
npm run video -- copy nature-v2 ma-nouvelle-video
npm run video -- still ma-nouvelle-video
npm run video -- render ma-nouvelle-video
```

La copie conserve les scènes et textes de la base, ajoute une composition au Studio et
crée ses chemins audio (`ma-nouvelle-video.wav`, `voice-ma-nouvelle-video/`).
La narration est désactivée dans la copie jusqu'à la préparation de ses propres pistes.
Les objets et modules communs restent partagés ; les fichiers de la vidéo de départ
ne sont pas modifiés. Un nom déjà utilisé est refusé.

Modifier le JSON indiqué par la commande puis les scènes de `src/videos/ma-nouvelle-video/`.
Les fichiers d'export ont des noms distincts dans `out/`.

## Reprendre seulement un objet 3D

Dans une scène de `src/videos/mon-film/`, importer les objets puis les placer sous
un `ThreeCanvas` Remotion :

```tsx
import {Car, EiffelTower, Person} from '../../assets';
import {smooth} from '../../core/animation';

const Decor = ({t}: {t: number}) => (
  <group>
    <EiffelTower />
    <group position={[8, 0, 0]}><Car color="#cf3232" wheelSpin={t * 4} /></group>
    <group position={[4, 0, 0]}>
      <Person pose="marche" phase={t * 7} shirt="#4488aa" />
    </group>
  </group>
);
```

Les objets utilisent des mètres, une origine au sol et une face avant vers −z.
La [collection Ville & extérieur](../src/assets/city/README.md) ajoute 24 composants,
dont `Bench`, `Tree`, `Bicycle`, `TrafficLight` et `MarketStall`.
La palette et les matériaux communs sont dans `src/assets/kit.tsx`.
Voir [le catalogue des objets](../src/assets/README.md).

## Reprendre un effet ou une animation

| Élément | Module à importer |
| --- | --- |
| Graine aléatoire stable, interpolation, transition douce | `src/core/animation.ts` |
| Chute libre, gravité, rayon de Schwarzschild | `src/core/physics.ts` |
| Caméra, ciel, étoiles et halos | `src/shared/three/` |
| Globe procédural et coordonnées géographiques | `src/shared/three/EarthGlobe.tsx` |
| Personnages, véhicules, bâtiments et mobilier | `src/assets/` |

Le temps vient de `useCurrentFrame() / fps`. Dans une `Sequence`, ajouter son instant
de départ si l'effet utilise le temps global. Conserver une graine fixe avec `rng()`
et éviter les animations fondées sur l'horloge ou `Math.random()` pendant le rendu.

## Reprendre un script sans toute la vidéo

| Script | Entrée et résultat |
| --- | --- |
| `scripts/audio/ambience-nature.mjs` | JSON nature → ambiance, avec pluie et tonnerre si configurés |
| `scripts/audio/ambience-gravity.mjs` | JSON gravité → ambiance |
| `scripts/audio/ambience-heat.mjs` | JSON chaleur → ambiance |
| `scripts/audio/ambience-whatif.mjs` | JSON avec trou noir et flash → ambiance |
| `scripts/audio/ambience-paris.mjs` | JSON Paris V3/V4/V6/TikTok → ambiance |
| `scripts/audio/voice-piper.mjs` | JSON de beats + `PIPER_MODEL` → WAV par beat |
| `scripts/audio/voice-windows.ps1` | JSON TikTok + voix française Windows → WAV par phrase |
| `scripts/audio/xtts/` | référence vocale + JSON de beats → WAV clonés et rapport de durée |
| `scripts/assets/` | textures planétaires et contours géographiques |
| `scripts/export/tiktok.py` | scénario TikTok → SRT et texte de publication |

Les générateurs d'ambiance sont des scripts Node sans dépendance audio système.
Leurs schémas JSON diffèrent : reprendre le scénario correspondant avec le script.
Ils se lancent depuis la racine ; la commande `video` choisit le bon générateur :

```powershell
npm run video -- ambience nature-v2
node scripts/audio/ambience-nature.mjs src/videos/nature-v2/nature.json
```

Pour XTTS, voir [le guide voix](voice.md). `npm run video -- voice nature-v2 ma-voix`
génère et active une narration avec un profil importé. Les dix bases acceptent la voix ;
pour Chaleur, la commande récupère les créneaux calculés des sous-titres.
