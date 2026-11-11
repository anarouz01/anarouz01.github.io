# Révisions ISIAM

Site de révision statique : cours en PDF et quiz, classés par année, semestre et matière.
Tout est hébergé gratuitement sur **GitHub Pages**. Les contenus sont **chiffrés** (AES-256) avant
d'être publiés : le dépôt est public, mais rien n'y est lisible sans le mot de passe de l'élève.

| Qui | Adresse | Accès |
| --- | --- | --- |
| Élève | `https://anarouz01.github.io/showcases/isiam/` | Mot de passe élève (saisi une fois par appareil) |
| Administrateur | `https://anarouz01.github.io/showcases/isiam/gestion-zeyiqe/` | Jeton GitHub + mot de passe élève (saisis une fois par PC) |

Le site vit dans le dossier `showcases/isiam/` du dépôt `anarouz01/anarouz01.github.io`, à côté du
portfolio. Il ne touche à aucun autre fichier du dépôt : toutes ses écritures se font dans
`showcases/isiam/data/`.

> L'adresse d'administration n'est liée nulle part, mais ce n'est pas elle qui protège le site :
> sans jeton GitHub, personne ne peut rien modifier.

---

## 1. Mise en ligne (une seule fois, environ 10 minutes)

### 1.1 Publier le dossier

Depuis la racine du dépôt `anarouz01.github.io`, en n'ajoutant **que** ce dossier (vos autres
modifications en cours ne sont pas concernées) :

```bash
git pull
git add showcases/isiam
git commit -m "Ajout du site de révisions"
git push
```

GitHub Pages est déjà actif sur ce dépôt : après 1 à 2 minutes, `https://anarouz01.github.io/showcases/isiam/`
affiche « Le site n'a pas encore été initialisé » : c'est normal.

### 1.2 Créer le jeton d'administration

1. GitHub → photo de profil → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Token name** : `isiam-admin` · **Expiration** : 1 an (notez la date dans votre agenda).
3. **Repository access** : *Only select repositories* → `anarouz01.github.io`.
4. **Permissions → Repository permissions → Contents** : **Read and write**.
5. **Generate token** et copiez-le (il commence par `github_pat_`). Il ne sera plus affiché.

> GitHub ne permet pas de limiter un jeton à un dossier : ce jeton peut écrire dans tout le dépôt
> du portfolio. L'application, elle, n'écrit que dans `showcases/isiam/data/` (elle vérifie le
> dossier avant toute écriture). Gardez le jeton uniquement sur votre PC.

### 1.3 Initialiser le site

1. Ouvrez l'adresse d'administration.
2. Propriétaire `anarouz01`, dépôt `anarouz01.github.io` et dossier `showcases/isiam` sont
   pré-remplis d'après l'adresse : vérifiez-les, puis saisissez le jeton et **le mot de passe de
   l'élève** (12 caractères minimum conseillés).
3. Confirmez **Initialiser** : le site crée `showcases/isiam/data/crypto.json` et un index vide, chiffré.

> ⚠️ **Le mot de passe élève est la clé de chiffrement.** S'il est perdu, les contenus publiés sont
> illisibles. Rangez-le dans un gestionnaire de mots de passe et gardez vos PDF d'origine.

### 1.4 Travailler sur le portfolio en parallèle

L'administration publie directement sur la branche `main` de GitHub. Sur votre PC :

- faites toujours `git pull` avant de modifier le portfolio et avant chaque `git push` ;
- n'utilisez jamais `git push --force` : cela effacerait les cours et quiz publiés depuis l'administration.

---

## 2. Ajouter du contenu (administrateur)

Chaque action crée **un commit** sur GitHub (historique complet, tout est réversible) et devient
visible pour l'élève **sous 1 à 10 minutes** (délai de publication de GitHub Pages).

| Je veux… | Où |
| --- | --- |
| Créer une année (S1 et S2 sont créés automatiquement) | **Contenus → Nouvelle année** |
| Créer, renommer, ordonner, masquer, déplacer ou supprimer une matière | **Contenus**, boutons à droite de la matière |
| Ajouter un cours | **Ajouter un cours** : année → semestre → matière (ou « + Nouvelle matière »), puis le PDF |
| Remplacer le PDF d'un cours | Fiche de la matière → icône « document » du cours |
| Créer un quiz | **Ajouter un quiz** : rattachement à un cours ou à toute la matière, puis les questions |
| Tester un quiz avant de le publier | Bouton **Tester ce quiz** dans l'éditeur |
| Ajouter un lien ou une vidéo YouTube | Fiche de la matière → **Ajouter un lien** |
| Préparer sans montrer | Case **Brouillon** (ou icône œil) : invisible pour l'élève |
| Voir le site comme l'élève, brouillons compris | Bouton **Aperçu élève** |

**Quiz.** Deux types de questions : **QCM** (une ou plusieurs bonnes réponses, toutes à trouver) et
**question ouverte** (l'élève compare sa réponse à la réponse attendue et s'auto-évalue :
juste = 1 point, partiel = 0,5, faux = 0). Les réponses ne sont affichées qu'à la fin.
Si vous fermez l'éditeur par erreur, la saisie est proposée à la restauration.

**Quiz de la matière.** Généré automatiquement : 20 questions tirées au hasard dans tous les quiz
publiés de la matière, réparties équitablement entre les cours (toutes s'il y en a moins de 20).

**PDF.** 20 Mo maximum (alerte au-delà de 10 Mo). Les PDF exportés depuis Word ou PowerPoint
s'affichent à l'identique, tableaux et schémas compris.

---

## 3. Côté élève

1. Ouvrir l'adresse élève, saisir le mot de passe : il n'est plus demandé sur cet appareil.
2. **Installer sur le téléphone** :
   - Android (Chrome) : menu ⋮ → **Ajouter à l'écran d'accueil** / **Installer l'application**.
   - iPhone (Safari) : bouton Partager → **Sur l'écran d'accueil**.
3. Les notes sont conservées **sur l'appareil** (pas de synchronisation entre téléphone et ordinateur).
4. Un cours déjà ouvert reste lisible sans connexion.

---

## 4. Opérations ponctuelles

| Opération | Comment |
| --- | --- |
| Changer le mot de passe élève | **Outils → Mot de passe élève** : tout est rechiffré en un commit. L'élève saisit le nouveau mot de passe sur chaque appareil. |
| Renouveler le jeton (avant expiration) | Créez un nouveau jeton (§ 1.2), puis **Outils → Oublier ce PC** et reconnectez-vous avec le nouveau jeton. |
| Administrer depuis un autre PC | Ouvrez l'adresse d'administration et saisissez jeton + mot de passe élève. |
| Vérifier la cohérence des fichiers | **Outils → Contrôle d'intégrité** (fichiers manquants ou orphelins). |
| Annuler une erreur | GitHub → **Commits** → ouvrez le commit → **Revert** (ou restaurez un fichier depuis l'historique). |
| Changer l'adresse d'administration | Renommez le dossier `gestion-zeyiqe/` (ex. `gestion-xyz123/`) et poussez. |
| Déplacer le site dans un autre dossier | Déplacez le dossier, poussez, puis **Outils → Oublier ce PC** et reconnectez-vous (le dossier est redéduit de l'adresse). |

---

## 5. Sécurité : ce qui est protégé, ce qui ne l'est pas

- **Protégé** : le contenu des cours, des quiz et l'arborescence (noms des matières compris) sont
  chiffrés en AES-GCM 256 bits ; la clé est dérivée du mot de passe élève (PBKDF2-SHA-256,
  600 000 itérations). Le mot de passe n'est jamais envoyé ni stocké en clair.
- **Écriture** : seul le détenteur du jeton GitHub (limité à ce dépôt) peut modifier le site.
- **Non protégé, par choix** : un élève connecté qui fouille le code de la page (F12) peut lire les
  bonnes réponses d'un quiz. C'est un outil de révision, pas d'examen.
- **Visible publiquement** : le nombre et la taille des fichiers chiffrés, et les messages de commit,
  volontairement neutres (« Ajoute le cours », « Modifie le quiz »… sans aucun titre).

---

## 6. Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| « Jeton GitHub invalide ou expiré » | Jeton expiré ou révoqué | Renouveler le jeton (§ 4) |
| « Accès refusé : le jeton n'a pas la permission… » | Permission *Contents* manquante | Modifier le jeton : Contents → Read and write |
| « Le site est introuvable dans le dossier… » | Dossier mal renseigné ou code pas encore poussé | Vérifier le champ « Dossier du site », § 1.1 |
| `git push` refusé (« fetch first ») | L'administration a publié entre-temps | `git pull`, puis `git push` (jamais `--force`) |
| L'élève ne voit pas un ajout | Délai GitHub Pages | Attendre 10 min, puis rafraîchir |
| « Fichier du cours introuvable » côté élève | Publication en cours | Réessayer quelques minutes plus tard |
| L'élève doit ressaisir son mot de passe | Le mot de passe a été changé | Normal : lui communiquer le nouveau |
| Une page de PDF s'affiche mal | Limite de PDF.js | Bouton **Télécharger le PDF** (original intact) |

---

## 7. Développement

Aucune dépendance, aucune compilation : HTML, CSS et JavaScript (modules ES).

```bash
npm run dev        # site + API GitHub simulée : http://localhost:8765/ (jeton « test-token »,
                   # dans l'admin : dossier vide, Options avancées → API = http://localhost:8765/api)
npm test           # tests unitaires (chiffrement, barème, répartition, modèle de données)
npm run test:e2e   # parcours complet admin → élève (nécessite Playwright)
```

| Dossier / fichier | Rôle |
| --- | --- |
| `index.html`, `js/eleve/` | Espace élève |
| `gestion-zeyiqe/`, `js/admin/` | Espace administration |
| `js/crypto.js` | Chiffrement AES-GCM, dérivation PBKDF2, clé conservée dans IndexedDB |
| `js/github.js` | API GitHub : lecture, commits atomiques (API Git Data) |
| `js/store.js` | Modèle de données (index) et opérations |
| `js/quiz-engine.js`, `js/quiz-ui.js` | Barème, mélange, quiz de matière ; écrans de quiz |
| `js/pdf-viewer.js`, `vendor/pdfjs/` | Lecteur PDF (PDF.js 4.10.38, Apache-2.0) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Application installable (PWA) |
| `data/` | Contenus chiffrés (créés par l'admin, ne pas modifier à la main) |
| `dev/` | Serveur simulé et tests |
