// Assemble les sources de jeux-de-donnees/ en fichiers JS statiques (GeoJSON), consommés
// directement par POC_html/index.html via de simples <script> — aucun serveur, aucun fetch.
//
// Usage: node build/build-data.js
//
// Ne modifie et ne dépend RIEN de ../poc — ce dossier lit uniquement les données sources
// partagées (jeux-de-donnees/) pour rester un POC autonome, déployable seul (ex: GitHub Pages).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const SOURCES = path.join(ROOT, 'jeux-de-donnees', 'sources');
const GENEREES = path.join(ROOT, 'jeux-de-donnees', 'generees');
const ADMIN = path.join(SOURCES, 'decoupage-administratif');
const OUT_DIR = path.join(__dirname, '..', 'data');

function readCsv(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
  const header = lines[0].split(';');
  return lines.slice(1).map(line => {
    const cols = line.split(';');
    const row = {};
    header.forEach((h, i) => { row[h] = cols[i]; });
    return row;
  });
}

function readGeojson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// ---------- 1. historique de consommation (réel + synthétique), regroupé par PDI ----------
const billingRows = [
  ...readCsv(path.join(SOURCES, 'export_facturation_100.csv')),
  ...readCsv(path.join(GENEREES, 'facturation-mensuelle-completee.csv')),
];

const historyByPdi = new Map();
for (const row of billingRows) {
  const pdi = row.PDI_REFERENCE;
  if (!historyByPdi.has(pdi)) historyByPdi.set(pdi, []);
  historyByPdi.get(pdi).push({ periode: row.PERIODE_FACTURATION, volume: Number(row.VOLUME) });
}
function periodeKey(p) {
  const [mm, yyyy] = p.split('/');
  return `${yyyy}-${mm}`;
}
for (const hist of historyByPdi.values()) {
  hist.sort((a, b) => periodeKey(a.periode).localeCompare(periodeKey(b.periode)));
}

const PERIODES = Array.from(new Set(billingRows.map(r => r.PERIODE_FACTURATION)))
  .sort((a, b) => periodeKey(a).localeCompare(periodeKey(b)));

// ---------- 2. DPI, au format GeoJSON directement (Point + toutes les propriétés dans "properties") ----------
const geolocRows = readCsv(path.join(GENEREES, 'dpi-geolocalisation.csv'));

const DPI_GEOJSON = {
  type: 'FeatureCollection',
  features: geolocRows.map(row => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [Number(row.LONGITUDE), Number(row.LATITUDE)] },
    properties: {
      id: row.PDI_REFERENCE,
      nature: row.NATURE_CLIENT,
      quartier: row.QUARTIER,
      ville: row.VILLE,
      source: row.SOURCE,
      history: historyByPdi.get(row.PDI_REFERENCE) || [],
    },
  })),
};

// ---------- 3. polygones quartier (10 communes réelles utilisées par le jeu de données) ----------
const QUARTIER_SOURCES = [
  { file: 'dakar-communes-arrondissement.geojson', feature: 'Commune de Hann Bel-Air', quartier: 'Hann Bel-Air', ville: 'Dakar' },
  { file: 'dakar-communes-arrondissement.geojson', feature: 'Commune de Grand Yoff', quartier: 'Grand Yoff', ville: 'Dakar' },
  { file: 'dakar-communes-arrondissement.geojson', feature: 'Commune de Parcelles Assainies', quartier: 'Parcelles Assainies', ville: 'Dakar' },
  { file: 'dakar-communes-arrondissement.geojson', feature: 'Commune de Dakar-Plateau', quartier: 'Dakar-Plateau', ville: 'Dakar' },
  { file: 'guediawaye-communes.geojson', feature: 'Commune du Golf Sud', quartier: 'Golf Sud', ville: 'Guédiawaye' },
  { file: 'guediawaye-communes.geojson', feature: 'Commune de Sam Notaire', quartier: 'Sam Notaire', ville: 'Guédiawaye' },
  { file: 'pikine-communes.geojson', feature: 'Commune de Pikine Nord', quartier: 'Pikine Nord', ville: 'Pikine' },
  { file: 'pikine-communes.geojson', feature: 'Commune de Guinaw Rail Sud', quartier: 'Guinaw Rail Sud', ville: 'Pikine' },
  { file: 'rufisque-communes.geojson', feature: 'Commune de Rufisque Est', quartier: 'Rufisque Est', ville: 'Rufisque' },
  { file: 'rufisque-communes.geojson', feature: 'Commune de Rufisque Nord', quartier: 'Rufisque Nord', ville: 'Rufisque' },
];

const geojsonCache = new Map();
function getGeojson(file) {
  if (!geojsonCache.has(file)) geojsonCache.set(file, readGeojson(path.join(ADMIN, file)));
  return geojsonCache.get(file);
}

const QUARTIERS_GEOJSON = {
  type: 'FeatureCollection',
  features: QUARTIER_SOURCES.map(def => {
    const gj = getGeojson(def.file);
    const f = gj.features.find(ft => ft.properties.name === def.feature);
    if (!f) throw new Error(`Feature "${def.feature}" introuvable dans ${def.file}`);
    return { type: 'Feature', geometry: f.geometry, properties: { quartier: def.quartier, ville: def.ville } };
  }),
};

// ---------- 4. polygones ville (= département, niveaux coextensifs pour ce pilote) ----------
const departements = readGeojson(path.join(ADMIN, 'departements-senegal.geojson'));
const VILLE_SHAPE_NAMES = { Dakar: 'Dakar', 'Guédiawaye': 'Guediawaye', Pikine: 'Pikine', Rufisque: 'Rufisque' };

const VILLES_GEOJSON = {
  type: 'FeatureCollection',
  features: Object.entries(VILLE_SHAPE_NAMES).map(([ville, shapeName]) => {
    const f = departements.features.find(ft => ft.properties.shapeName === shapeName);
    if (!f) throw new Error(`Département "${shapeName}" introuvable`);
    return { type: 'Feature', geometry: f.geometry, properties: { ville } };
  }),
};

// ---------- 5. écriture des fichiers JS (variables globales, chargées via <script> classiques) ----------
fs.mkdirSync(OUT_DIR, { recursive: true });
const banner = '// Fichier généré par build/build-data.js — NE PAS ÉDITER À LA MAIN.\n// Régénérer avec : node build/build-data.js\n';

fs.writeFileSync(path.join(OUT_DIR, 'periodes.js'), `${banner}const PERIODES = ${JSON.stringify(PERIODES)};\n`);
fs.writeFileSync(path.join(OUT_DIR, 'dpi.js'), `${banner}const DPI_GEOJSON = ${JSON.stringify(DPI_GEOJSON)};\n`);
fs.writeFileSync(path.join(OUT_DIR, 'quartiers.js'), `${banner}const QUARTIERS_GEOJSON = ${JSON.stringify(QUARTIERS_GEOJSON)};\n`);
fs.writeFileSync(path.join(OUT_DIR, 'villes.js'), `${banner}const VILLES_GEOJSON = ${JSON.stringify(VILLES_GEOJSON)};\n`);

console.log('Périodes:', PERIODES.length, `(${PERIODES[0]} → ${PERIODES.at(-1)})`);
console.log('DPI:', DPI_GEOJSON.features.length);
console.log('Quartiers:', QUARTIERS_GEOJSON.features.length);
console.log('Villes:', VILLES_GEOJSON.features.length);
console.log('Écrit dans', OUT_DIR);
