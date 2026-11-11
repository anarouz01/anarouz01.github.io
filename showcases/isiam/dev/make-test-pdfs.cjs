// Génère deux PDF de test (tableaux, schéma, 3 pages) dans le dossier temporaire : node dev/make-test-pdfs.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const html = `<html><head><style>
  body{font-family:Calibri,Arial,sans-serif;margin:40px;color:#222} h1{color:#1f4e79} h2{color:#2e75b6;margin-top:28px}
  table{border-collapse:collapse;width:100%;margin:12px 0} th,td{border:1px solid #999;padding:6px 10px;text-align:left} th{background:#dde8f5}
  .pb{page-break-before:always}
  </style></head><body>
  <h1>Chapitre 1 — Le mix marketing</h1>
  <p>Le <b>mix marketing</b> (ou marketing-mix) désigne l'ensemble des décisions opérationnelles prises par l'entreprise pour mettre en œuvre sa stratégie : les <i>4P</i>.</p>
  <h2>1. Les 4P</h2>
  <table><tr><th>Variable</th><th>Question clé</th><th>Exemples de décisions</th></tr>
  <tr><td>Produit</td><td>Que vendre ?</td><td>Gamme, packaging, marque</td></tr>
  <tr><td>Prix</td><td>À quel prix ?</td><td>Écrémage, pénétration</td></tr>
  <tr><td>Place (distribution)</td><td>Où vendre ?</td><td>Circuits, canaux</td></tr>
  <tr><td>Promotion (communication)</td><td>Comment faire connaître ?</td><td>Publicité, réseaux sociaux</td></tr></table>
  <h2>2. Schéma : de la stratégie à l'action</h2>
  <svg width="640" height="200" xmlns="http://www.w3.org/2000/svg" font-family="Arial" font-size="14">
   <rect x="10" y="70" width="150" height="60" rx="8" fill="#dde8f5" stroke="#1f4e79"/><text x="85" y="105" text-anchor="middle">Segmentation</text>
   <rect x="240" y="70" width="150" height="60" rx="8" fill="#dde8f5" stroke="#1f4e79"/><text x="315" y="105" text-anchor="middle">Ciblage</text>
   <rect x="470" y="70" width="150" height="60" rx="8" fill="#fde9d9" stroke="#c55a11"/><text x="545" y="105" text-anchor="middle">Positionnement</text>
   <path d="M160 100H236M390 100H466" stroke="#333" stroke-width="2" marker-end="url(#a)"/>
   <defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z"/></marker></defs>
  </svg>
  <p>${'Le positionnement est la place qu’occupe un produit dans l’esprit des consommateurs par rapport aux concurrents. '.repeat(6)}</p>
  <div class="pb"></div><h2>3. Calcul de marge</h2>
  <table><tr><th>Élément</th><th style="text-align:right">Montant (€)</th></tr>
  <tr><td>Prix de vente HT</td><td style="text-align:right">120,00</td></tr><tr><td>Coût de revient</td><td style="text-align:right">84,00</td></tr>
  <tr><td><b>Marge unitaire</b></td><td style="text-align:right"><b>36,00</b></td></tr><tr><td>Taux de marge</td><td style="text-align:right">42,9 %</td></tr></table>
  <p>${'Texte de démonstration pour remplir la page et vérifier le rendu des paragraphes longs. '.repeat(20)}</p>
  <div class="pb"></div><h2>4. Synthèse</h2><ul><li>Cohérence des 4P</li><li>Adaptation à la cible</li><li>Suivi des indicateurs</li></ul>
  </body></html>`;
  await p.setContent(html); await p.pdf({ path: require('path').join(require('os').tmpdir(),'cours1.pdf'), format: 'A4' });
  await p.setContent('<h1 style="font-family:Arial">Chapitre 2 — La segmentation</h1><p style="font-family:Arial">Découper un marché en groupes homogènes.</p>');
  await p.pdf({ path: require('path').join(require('os').tmpdir(),'cours2.pdf'), format: 'A4' });
  await b.close();
})();
console.log('PDF de test générés dans', require('os').tmpdir());
