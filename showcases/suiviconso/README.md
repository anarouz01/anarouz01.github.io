# Suivi conso eau — démo statique (GitHub Pages)

Version autonome du POC ([../poc](../poc)), réécrite en HTML/CSS/JS **sans modules ES et sans backend** : aucune balise `<script type="module">`, aucun `import`/`export`, aucun serveur requis. Les données sont des fichiers JS statiques au format **GeoJSON**. Ce dossier ne dépend d'aucun fichier de `../poc` — il peut être copié seul et déployé tel quel.

## Ouvrir la démo

**En local** : double-cliquer sur `index.html` — ça fonctionne directement en `file://`, sans rien installer. (Un petit serveur `node serve.js` est fourni si vous préférez, mais il n'est pas nécessaire.)

**Sur GitHub Pages** :
1. Pousser ce dossier (`POC_html/`) — ou tout le dépôt — sur GitHub.
2. Dans les paramètres du dépôt → *Pages*, choisir la branche et le dossier où se trouve `index.html` (`/` si `POC_html` est à la racine du dépôt, ou `/POC_html` sinon selon la structure choisie).
3. GitHub Pages sert des fichiers statiques sur HTTPS — la démo tourne telle quelle, aucune configuration supplémentaire.

## Pourquoi pas de modules ES ?

Les modules ES (`type="module"`) sont bloqués par les navigateurs en ouverture directe d'un fichier (`file://`) — ils nécessitent un serveur, même pour un usage local basique. En les évitant complètement (scripts classiques + un petit espace de noms global `window.App`), la démo s'ouvre aussi simplement qu'une page web statique, en local comme sur GitHub Pages.

## Régénérer les données

Les fichiers `data/*.js` sont générés à partir des sources partagées du projet (`../jeux-de-donnees/`) :

```bash
node build/build-data.js
```

Ce script ne lit que `../jeux-de-donnees/` (lecture seule) — il n'écrit jamais dans `../poc` ni dans `../jeux-de-donnees`.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` / `style.css` | Page et mise en forme (identiques dans l'esprit à `../poc`) |
| `data/periodes.js` | `const PERIODES = [...]` — 13 mois disponibles |
| `data/dpi.js` | `const DPI_GEOJSON = {...}` — 174 DPI en GeoJSON (Point + historique dans `properties`) |
| `data/quartiers.js` | `const QUARTIERS_GEOJSON = {...}` — polygones réels des 10 quartiers |
| `data/villes.js` | `const VILLES_GEOJSON = {...}` — polygones réels des 4 villes |
| `js/icons.js`, `state.js`, `aggregate.js`, `chart.js`, `mapLayers.js`, `panel.js`, `controls.js` | Logique de l'app, portée depuis `../poc/js/*` — chaque fichier s'attache à `window.App.<nom>` au lieu d'utiliser `import`/`export` |
| `js/main.js` | Bootstrap : convertit `DPI_GEOJSON` en tableau plat pour la logique interne, puis assemble tout le reste |
| `build/build-data.js` | Génère `data/*.js` à partir de `../jeux-de-donnees/` |
| `serve.js` | Serveur statique optionnel, pour prévisualiser en local avant de déployer |

## Fonctionnalités

Identiques à [../poc](../poc/README.md) : cartographie des DPI avec clustering, filtre par nature de client, plage de dates au slider, recherche avec autocomplétion, agrégation par quartier et par ville, sélecteur de fond de carte, fiche détail avec historique de consommation.

## Limites (identiques au POC d'origine)

- Fonds de carte gratuits sans clé (Esri Canvas/Imagery, OpenStreetMap) — adaptés à une démo, pas à de la production à fort trafic.
- Données de géolocalisation, nature client et historique en grande partie synthétiques (voir [jeux-de-donnees/generees/README.md](../jeux-de-donnees/generees/README.md)).
