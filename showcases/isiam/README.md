# Révisions ISIAM

Site de révision : cours en PDF et quiz, classés par année, semestre et matière.
Adresse élève : **https://anarouz01.github.io/showcases/isiam/** (mot de passe demandé une fois par appareil).

Le fonctionnement tient en une phrase : **vous rangez vos PDF et vos quiz dans un dossier sur votre PC,
`publier.mjs` les chiffre dans `data/`, et vous poussez avec git.** Le dépôt est public, mais rien n'y
est lisible sans le mot de passe de l'élève (AES-256).

```
C:\BHA\03-Perso\Claude\ISIAM\
├── contenus\                         ← vos fichiers en clair, HORS du dépôt (jamais poussés)
└── anarouz01.github.io\              ← le dépôt git
    └── showcases\isiam\
        ├── publier.mjs               ← le script de publication
        ├── data\                     ← fichiers chiffrés produits par le script (à pousser)
        └── index.html, js\, css\…    ← le site élève
```

Prérequis : [Node.js](https://nodejs.org) 18 ou plus (aucune autre installation).

---

## 1. Ranger les contenus

```
contenus\
└── 1re année\
    ├── Semestre 1\
    │   └── Marketing\
    │       ├── 01 - Le mix marketing.pdf
    │       ├── 01 - Le mix marketing.quiz.json   ← même nom que le PDF : quiz de ce cours
    │       ├── 02 - La segmentation.pdf
    │       ├── Annale 2025.quiz.json             ← sans PDF du même nom : quiz sur toute la matière
    │       ├── liens.json                        ← facultatif : liens et vidéos YouTube
    │       └── _03 - En préparation.pdf          ← « _ » devant : brouillon, non publié
    └── Semestre 2\
        └── …
```

| Règle | Détail |
| --- | --- |
| Niveaux | `année \ semestre \ matière \ fichiers`. Les noms des dossiers sont ceux affichés. |
| Ordre | Alphabétique ; un numéro en tête (`01 - `, `02 - `…) fixe l'ordre et n'est pas affiché. |
| Cours | Un fichier `.pdf` (20 Mo maximum). Titre affiché = nom du fichier sans le numéro. |
| Quiz | Un fichier `.quiz.json` (format ci-dessous). |
| Brouillon | Préfixe `_` sur un fichier ou un dossier : ignoré. |
| Supprimer, renommer, déplacer | Directement dans l'explorateur, puis republier. |

> Renommer un cours ou un quiz le fait apparaître comme nouveau : l'historique des notes de l'élève
> pour ce quiz repart de zéro. Changer seulement le numéro d'ordre ne change rien.

### Format d'un quiz

Modèle complet : [`exemple.quiz.json`](exemple.quiz.json).

```json
{
  "titre": "Quiz · Le mix marketing",
  "questions": [
    { "q": "Quels éléments font partie des 4P ?",
      "choix": ["Prix", "Personnel", "Produit", "Profit"],
      "reponses": [1, 3] },

    { "q": "Définissez le positionnement.",
      "reponse": "La place qu'occupe le produit dans l'esprit du consommateur." }
  ]
}
```

- **QCM** : `choix` (2 à 10 propositions) + `reponses` = numéros des bonnes propositions, **en comptant
  à partir de 1**. Plusieurs bonnes réponses possibles : l'élève doit toutes les trouver.
- **Question ouverte** : `reponse` = réponse attendue. L'élève compare et s'auto-évalue
  (juste = 1 point, partiel = 0,5, faux = 0).
- `titre` est facultatif (sinon : nom du fichier).

### Liens et vidéos (facultatif)

`liens.json` dans le dossier de la matière :

```json
[
  { "titre": "Vidéo : les 4P en 5 minutes", "url": "https://www.youtube.com/watch?v=…" },
  { "titre": "Fiche Wikipédia", "url": "https://fr.wikipedia.org/wiki/Marketing_mix" }
]
```

---

## 2. Publier

Dans un terminal, depuis `showcases\isiam` :

```bash
node publier.mjs --verifier    # contrôle seul : signale toute erreur, n'écrit rien
node publier.mjs               # chiffre ce qui a changé dans data\
git add data && git commit -m "Mise à jour des révisions" && git push
```

ou en une fois : `node publier.mjs --push` (ne valide que `data\`, vos autres modifications ne sont
pas touchées).

- Le mot de passe élève est demandé à chaque publication (jamais enregistré). Un mauvais mot de passe
  est refusé : impossible de mélanger deux clés.
- **Première publication** : le script demande de choisir le mot de passe de l'élève (12 caractères
  conseillés). Notez-le : l'élève en a besoin pour se connecter.
- Seuls les fichiers modifiés sont rechiffrés ; les cours retirés du dossier sont supprimés de `data\`.
- En cas d'erreur (quiz mal formé, PDF trop lourd…), **rien n'est publié** et chaque erreur est indiquée
  avec le fichier et le numéro de question.
- L'élève voit les changements **1 à 10 minutes** après le `git push` (délai de GitHub Pages).

Le dossier de contenus est cherché par défaut à `..\..\..\contenus` (réglable dans
`publier.config.json`, ou ponctuellement avec `--source "C:\chemin\contenus"`). Par sécurité, le script
refuse un dossier de contenus situé à l'intérieur du dépôt git.

---

## 3. Côté élève

1. Ouvrir https://anarouz01.github.io/showcases/isiam/ et saisir le mot de passe : il n'est plus demandé
   sur cet appareil.
2. **Installer sur le téléphone** : Android (Chrome) → menu ⋮ → *Installer l'application* ;
   iPhone (Safari) → Partager → *Sur l'écran d'accueil*.
3. Les notes sont conservées sur l'appareil. Un cours déjà ouvert reste lisible sans connexion.

---

## 4. Opérations ponctuelles

| Opération | Commande |
| --- | --- |
| Changer le mot de passe élève | `node publier.mjs --changer-mot-de-passe` puis git push. Tout est rechiffré ; l'élève saisit le nouveau mot de passe sur chaque appareil. |
| Mot de passe oublié | Supprimez `data\`, relancez `node publier.mjs` (il demande un nouveau mot de passe) et poussez. Vos contenus en clair étant sur votre PC, rien n'est perdu. |
| Tout rechiffrer | `node publier.mjs --tout` |
| Annuler une publication | GitHub → *Commits* → *Revert*, ou `git revert`. |

---

## 5. Sécurité

- **Chiffré** : contenu des cours et des quiz, et l'arborescence (noms des années, matières, titres).
  AES-GCM 256 bits, clé dérivée du mot de passe (PBKDF2-SHA-256, 600 000 itérations).
- **Visible publiquement** : le nombre et la taille des fichiers chiffrés, les dates de publication.
- **Par choix** : un élève connecté qui fouille le code de la page (F12) peut lire les bonnes réponses
  d'un quiz. C'est un outil de révision, pas d'examen.
- Les contenus en clair ne quittent jamais votre PC.

---

## 6. Développement

```bash
npm run dev        # sert le site en local : http://localhost:8765/
npm test           # tests unitaires (chiffrement, barème, lecture des quiz, publication)
npm run test:e2e   # parcours complet publication → élève (nécessite Playwright)
```

| Fichier | Rôle |
| --- | --- |
| `publier.mjs` | Lecture des contenus, contrôle des quiz, chiffrement, index, git |
| `index.html`, `js/eleve/` | Site élève |
| `js/crypto.js` | Chiffrement (partagé entre le script et le site) |
| `js/store.js`, `js/data.js` | Lecture de l'index et des fichiers chiffrés |
| `js/quiz-engine.js`, `js/quiz-ui.js` | Barème, mélange, quiz de matière ; écrans de quiz |
| `js/pdf-viewer.js`, `vendor/pdfjs/` | Lecteur PDF (PDF.js 4.10.38, Apache-2.0) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Application installable (PWA) |
