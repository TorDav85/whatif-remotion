# Bibliothèque 3D réutilisable

Importée de la branche `1.01`, commit `063acae3fa699534c9909ed5f28981eff827cecc`.

Dans Remotion Studio : ouvrir **Bibliotheque → Assets** ou **AssetsInterieur**.

La nouvelle collection **[Ville & extérieur — 1.02](city/README.md)** ajoute 24 objets
et une troisième planche : **Bibliotheque → AssetsVille**.

```powershell
npm run still:assets
npm run still:interior
npm run still:city
```

## Extérieur — `src/assets/index.ts`

| Module | Objets |
| --- | --- |
| `Person.tsx` | `Person`, presets, poses et phase de marche |
| `Car.tsx` | `Car`, `Bus`, couleurs, variantes, phares et roues |
| `Boat.tsx` | `Barge`, `TourBoat` |
| `House.tsx` | `House` |
| `Building.tsx` | `Building`, `buildingHeight` |
| `EiffelTower.tsx` | `EiffelTower` |
| `kit.tsx` | palette `PAL`, matériaux, géométries et éléments de construction |

## Intérieur — `src/assets/interior/index.ts`

42 objets regroupés par pièce :

- `Living.tsx` : canapé, fauteuil, table basse, bibliothèque, télévision, cheminée…
- `Kitchen.tsx` : meubles, évier, four, réfrigérateur, table et chaises…
- `Bedroom.tsx` : lits, armoire, commode, tables de nuit et lampes…
- `Bathroom.tsx` : baignoire, douche, lavabo, toilettes, machine à laver…
- `Office.tsx` : bureau, chaise, ordinateur, étagère…
- `Decor.tsx` : portes, fenêtres, cadres, radiateur, horloge et suspension.

Les exports exacts sont dans les deux `index.ts`. Les props sont documentées dans les
types `…Props` des composants. Unités : mètres ; origine au sol, face avant vers −z
(ou point d'accroche pour les objets muraux).

Les objets se placent dans un `ThreeCanvas`, généralement sous un
`<group position={[x, y, z]}>`. Voir [le guide de réutilisation](../../docs/reuse.md).
