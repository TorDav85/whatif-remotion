// Source : Natural Earth, domaine public. Télécharger countries.geojson avant de régénérer.
import fs from 'node:fs';
const source = JSON.parse(fs.readFileSync('public/geo/countries.geojson', 'utf8'));
const countries = source.features.map((f) => ({
  name: f.properties.ADMIN,
  code: f.properties.ADM0_A3,
  polygons: (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)
    .map((polygon) => polygon.map((ring) => ring.map(([x, y]) => [Number(x.toFixed(3)), Number(y.toFixed(3))]))),
}));
fs.mkdirSync('src/videos/paris-v3', {recursive: true});
fs.writeFileSync('src/videos/paris-v3/land.json', JSON.stringify(countries));
console.log(`${countries.length} pays préparés pour la V3`);
