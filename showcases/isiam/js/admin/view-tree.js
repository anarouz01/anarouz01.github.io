// ==========================================================================
// Admin : arborescence (années, semestres, matières) et fiche matière.
// ==========================================================================
import {
  sorted, addAnnee, renameAnnee, deleteAnnee, addMatiere, renameMatiere, deleteMatiere, moveMatiere,
  reorder, locateMatiere, locateCours, locateQuiz, deleteCours, moveCours, deleteQuiz, moveQuiz,
  addLien, deleteLien, PATHS, quizGroups,
} from '../store.js';
import { encryptBytes } from '../crypto.js';
import {
  h, icon, iconBtn, empty, crumbs, plural, fmtBytes, confirmDialog, promptDialog, selectDialog, modal, toast,
} from '../ui.js';
import { ctx, trySave, matiereOptions, semestreOptions } from './common.js';
import { pickPdf } from './view-cours.js';

const rerender = () => ctx.router.refresh();
const draft = (x) => (x.brouillon ? h('span', { class: 'badge draft' }, 'Brouillon') : null);

// ---------------------------------------------------------------------------
export function treeView() {
  const idx = ctx.index;
  const annees = sorted(idx.annees);
  const head = h('div', { class: 'row between page-head' },
    h('div', null, h('h1', null, 'Contenus'), h('p', { class: 'muted' }, 'Années, semestres et matières. Cliquez sur une matière pour gérer ses cours, quiz et liens.')),
    h('button', { type: 'button', class: 'btn primary', onClick: newAnnee }, icon('plus'), 'Nouvelle année'));

  if (!annees.length) {
    ctx.view.append(head, empty('Commencez par créer une année (les semestres 1 et 2 sont créés automatiquement).', 'folder'));
    return;
  }

  ctx.view.append(head, ...annees.map((a) => h('section', { class: 'tree-year card' },
    h('div', { class: 'row between' },
      h('h2', { style: { margin: 0 } }, a.nom),
      h('div', { class: 'list-actions' },
        iconBtn('up', 'Monter', () => trySave(`Réordonne les années`, (n) => { reorder(n.annees, a.id, -1); }).then(rerender)),
        iconBtn('down', 'Descendre', () => trySave(`Réordonne les années`, (n) => { reorder(n.annees, a.id, 1); }).then(rerender)),
        iconBtn('edit', 'Renommer l\'année', async () => {
          const nom = await promptDialog('Renommer l\'année', { value: a.nom, ok: 'Renommer' });
          if (nom && nom !== a.nom) { await trySave(`Renomme l'année « ${a.nom} » en « ${nom} »`, (n) => { renameAnnee(n, a.id, nom); }); rerender(); }
        }),
        iconBtn('trash', 'Supprimer l\'année', async () => {
          const nbM = a.semestres.reduce((s, x) => s + x.matieres.length, 0);
          const ok = await confirmDialog(`Supprimer « ${a.nom} » ?`,
            nbM ? `Cette année contient ${plural(nbM, 'matière', 'matières')} : tous leurs cours, quiz et liens seront supprimés.` : 'Cette année est vide.',
            { ok: 'Supprimer', danger: true });
          if (ok) { await trySave(`Supprime l'année « ${a.nom} »`, (n) => ({ deleted: deleteAnnee(n, a.id) })); rerender(); }
        }, 'danger'))),
    ...a.semestres.map((s) => h('div', { class: 'tree-sem' },
      h('div', { class: 'row between' }, h('h3', null, s.nom),
        h('button', { type: 'button', class: 'btn sm ghost', onClick: async () => {
          const nom = await promptDialog(`Nouvelle matière · ${a.nom}, ${s.nom}`, { label: 'Nom de la matière', ok: 'Créer' });
          if (nom) { await trySave(`Ajoute la matière « ${nom} » (${a.nom}, ${s.nom})`, (n) => { addMatiere(n, s.id, nom); }); rerender(); }
        } }, icon('plus'), 'Matière')),
      s.matieres.length
        ? h('div', { class: 'list' }, sorted(s.matieres).map((m, i) => matiereRow(m, i)))
        : h('div', { class: 'small muted', style: { padding: '4px 0 8px' } }, 'Aucune matière.'))))));
}

function matiereRow(m, i) {
  return h('div', { class: 'list-item' },
    h('span', { class: 'list-num' }, String(i + 1)),
    h('a', { class: 'grow', href: `#/m/${m.id}`, style: { color: 'inherit' } },
      h('span', { class: 'title' }, m.nom, ' ', draft(m)),
      h('span', { class: 'counters' }, h('span', null, plural(m.cours.length, 'cours', 'cours')), h('span', null, plural(m.quiz.length, 'quiz', 'quiz')), h('span', null, plural((m.liens || []).length, 'lien', 'liens')))),
    h('div', { class: 'list-actions' }, ...matiereActions(m, rerender)));
}

function matiereActions(m, after) {
  const label = `« ${m.nom} »`;
  return [
    iconBtn('up', 'Monter', () => trySave(`Réordonne les matières`, (n) => { const l = locateMatiere(n, m.id); reorder(l.semestre.matieres, m.id, -1); }).then(after)),
    iconBtn('down', 'Descendre', () => trySave(`Réordonne les matières`, (n) => { const l = locateMatiere(n, m.id); reorder(l.semestre.matieres, m.id, 1); }).then(after)),
    iconBtn('edit', 'Renommer', async () => {
      const nom = await promptDialog('Renommer la matière', { value: m.nom, ok: 'Renommer' });
      if (nom && nom !== m.nom) { await trySave(`Renomme la matière ${label} en « ${nom} »`, (n) => { renameMatiere(n, m.id, nom); }); after(); }
    }),
    iconBtn(m.brouillon ? 'eyeOff' : 'eye', m.brouillon ? 'Publier (actuellement brouillon)' : 'Passer en brouillon', async () => {
      await trySave(`${m.brouillon ? 'Publie' : 'Masque'} la matière ${label}`, (n) => { locateMatiere(n, m.id).matiere.brouillon = !m.brouillon; });
      after();
    }),
    iconBtn('move', 'Déplacer vers un autre semestre', async () => {
      const loc = locateMatiere(ctx.index, m.id);
      const target = await selectDialog(`Déplacer ${label}`, semestreOptions(ctx.index), { label: 'Vers', value: loc.semestre.id, ok: 'Déplacer' });
      if (target && target !== loc.semestre.id) { await trySave(`Déplace la matière ${label}`, (n) => { moveMatiere(n, m.id, target); }); after(); }
    }),
    iconBtn('trash', 'Supprimer', async () => {
      const ok = await confirmDialog(`Supprimer ${label} ?`,
        `${plural(m.cours.length, 'cours', 'cours')}, ${plural(m.quiz.length, 'quiz', 'quiz')} et ${plural((m.liens || []).length, 'lien', 'liens')} seront supprimés définitivement (récupérables seulement via l'historique GitHub).`,
        { ok: 'Supprimer', danger: true });
      if (ok) {
        const done = await trySave(`Supprime la matière ${label}`, (n) => ({ deleted: deleteMatiere(n, m.id), result: true }));
        if (done) { if (location.hash.startsWith('#/m/')) ctx.router.go('/'); else after(); }
      }
    }, 'danger'),
  ];
}

async function newAnnee() {
  const n = ctx.index.annees.length + 1;
  const nom = await promptDialog('Nouvelle année', { label: 'Nom', value: n === 1 ? '1re année' : `${n}e année`, ok: 'Créer' });
  if (!nom) return;
  await trySave(`Ajoute l'année « ${nom} »`, (next) => { addAnnee(next, nom); });
  rerender();
}

// ---------------------------------------------------------------------------
export function matiereView({ id }) {
  const loc = locateMatiere(ctx.index, id);
  if (!loc) { ctx.view.append(empty('Matière introuvable.')); return; }
  const { annee, semestre, matiere: m } = loc;

  ctx.view.append(
    crumbs([{ label: 'Contenus', href: '#/' }, { label: `${annee.nom} · ${semestre.nom}` }, { label: m.nom }]),
    h('div', { class: 'row between page-head' },
      h('div', null, h('h1', null, m.nom, ' ', draft(m)), h('p', { class: 'muted' }, `${annee.nom} · ${semestre.nom}`)),
      h('div', { class: 'list-actions' }, ...matiereActions(m, rerender))),

    // ----- Cours
    h('section', { style: { marginBottom: '32px' } },
      h('div', { class: 'row between' }, h('h2', null, 'Cours'),
        h('a', { class: 'btn sm primary', href: `#/cours/nouveau?m=${m.id}` }, icon('plus'), 'Ajouter un cours')),
      m.cours.length ? h('div', { class: 'list' }, sorted(m.cours).map((c, i) => coursRow(m, c, i))) : empty('Aucun cours.', 'book')),

    // ----- Quiz
    h('section', { style: { marginBottom: '32px' } },
      h('div', { class: 'row between' }, h('h2', null, 'Quiz'),
        h('a', { class: 'btn sm primary', href: `#/quiz/nouveau?m=${m.id}` }, icon('plus'), 'Ajouter un quiz')),
      m.quiz.length
        ? h('div', { class: 'list' }, quizGroups(m).flatMap((g) => g.quiz.map((q) => quizRow(m, q, g.cours))))
        : empty('Aucun quiz.', 'quiz')),

    // ----- Liens
    h('section', null,
      h('div', { class: 'row between' }, h('h2', null, 'Liens et vidéos'),
        h('button', { type: 'button', class: 'btn sm primary', onClick: () => lienDialog(m) }, icon('plus'), 'Ajouter un lien')),
      (m.liens || []).length ? h('div', { class: 'list' }, sorted(m.liens).map((l) => lienRow(m, l))) : empty('Aucun lien.', 'link')),
  );
}

function coursRow(m, c, i) {
  const label = `« ${c.titre} »`;
  return h('div', { class: 'list-item' },
    h('span', { class: 'list-num' }, String(i + 1)),
    h('span', { class: 'grow' }, h('span', { class: 'title' }, c.titre, ' ', draft(c)),
      h('span', { class: 'sub' }, [c.pages ? plural(c.pages, 'page', 'pages') : null, fmtBytes(c.octets)].filter(Boolean).join(' · '))),
    h('div', { class: 'list-actions' },
      iconBtn('up', 'Monter', () => trySave('Réordonne les cours', (n) => { reorder(locateMatiere(n, m.id).matiere.cours, c.id, -1); }).then(rerender)),
      iconBtn('down', 'Descendre', () => trySave('Réordonne les cours', (n) => { reorder(locateMatiere(n, m.id).matiere.cours, c.id, 1); }).then(rerender)),
      iconBtn('edit', 'Renommer', async () => {
        const t = await promptDialog('Renommer le cours', { value: c.titre, ok: 'Renommer' });
        if (t && t !== c.titre) { await trySave(`Renomme le cours ${label} en « ${t} »`, (n) => { locateCours(n, c.id).cours.titre = t; }); rerender(); }
      }),
      iconBtn('file', 'Remplacer le PDF', async () => {
        const picked = await pickPdf();
        if (!picked) return;
        const enc = await encryptBytes(ctx.key, picked.bytes);
        await trySave(`Remplace le PDF du cours ${label}`, (n) => {
          const cc = locateCours(n, c.id).cours;
          Object.assign(cc, { pages: picked.pages, octets: picked.bytes.length, v: Date.now() });
          return { files: [{ path: PATHS.cours(c.id), bytes: enc }] };
        });
        rerender();
      }),
      iconBtn(c.brouillon ? 'eyeOff' : 'eye', c.brouillon ? 'Publier (actuellement brouillon)' : 'Passer en brouillon', async () => {
        await trySave(`${c.brouillon ? 'Publie' : 'Masque'} le cours ${label}`, (n) => { locateCours(n, c.id).cours.brouillon = !c.brouillon; });
        rerender();
      }),
      iconBtn('move', 'Déplacer vers une autre matière', async () => {
        const target = await selectDialog(`Déplacer ${label}`, matiereOptions(ctx.index), { label: 'Vers la matière (ses quiz suivent)', value: m.id, ok: 'Déplacer' });
        if (target && target !== m.id) { await trySave(`Déplace le cours ${label}`, (n) => { moveCours(n, c.id, target); }); rerender(); }
      }),
      iconBtn('trash', 'Supprimer', async () => {
        const linked = m.quiz.filter((q) => q.coursId === c.id).length;
        const ok = await confirmDialog(`Supprimer le cours ${label} ?`,
          linked ? `${plural(linked, 'quiz lié est conservé', 'quiz liés sont conservés')} et ${linked > 1 ? 'rattachés' : 'rattaché'} à la matière.` : null,
          { ok: 'Supprimer', danger: true });
        if (ok) { await trySave(`Supprime le cours ${label}`, (n) => ({ deleted: deleteCours(n, c.id) })); rerender(); }
      }, 'danger')));
}

function quizRow(m, q, cours) {
  const label = `« ${q.titre} »`;
  return h('div', { class: 'list-item' },
    h('a', { class: 'grow', href: `#/quiz/${q.id}`, style: { color: 'inherit' } },
      h('span', { class: 'title' }, q.titre, ' ', draft(q)),
      h('span', { class: 'sub' }, `${plural(q.nbQuestions || 0, 'question', 'questions')} · ${cours ? `Cours : ${cours.titre}` : 'Toute la matière'}`)),
    h('div', { class: 'list-actions' },
      h('a', { class: 'btn icon sm ghost', href: `#/quiz/${q.id}`, title: 'Modifier', 'aria-label': 'Modifier' }, icon('edit')),
      iconBtn(q.brouillon ? 'eyeOff' : 'eye', q.brouillon ? 'Publier (actuellement brouillon)' : 'Passer en brouillon', async () => {
        await trySave(`${q.brouillon ? 'Publie' : 'Masque'} le quiz ${label}`, (n) => { locateQuiz(n, q.id).quiz.brouillon = !q.brouillon; });
        rerender();
      }),
      iconBtn('move', 'Déplacer vers une autre matière', async () => {
        const target = await selectDialog(`Déplacer ${label}`, matiereOptions(ctx.index), { label: 'Vers la matière (rattaché à toute la matière)', value: m.id, ok: 'Déplacer' });
        if (target && target !== m.id) { await trySave(`Déplace le quiz ${label}`, (n) => { moveQuiz(n, q.id, target, null); }); rerender(); }
      }),
      iconBtn('trash', 'Supprimer', async () => {
        const ok = await confirmDialog(`Supprimer le quiz ${label} ?`, null, { ok: 'Supprimer', danger: true });
        if (ok) { await trySave(`Supprime le quiz ${label}`, (n) => ({ deleted: deleteQuiz(n, q.id) })); rerender(); }
      }, 'danger')));
}

function lienRow(m, l) {
  return h('div', { class: 'list-item' },
    icon(l.type === 'video' ? 'play' : 'link'),
    h('span', { class: 'grow' }, h('span', { class: 'title' }, l.titre), h('a', { class: 'sub', href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.url)),
    h('div', { class: 'list-actions' },
      iconBtn('up', 'Monter', () => trySave('Réordonne les liens', (n) => { reorder(locateMatiere(n, m.id).matiere.liens, l.id, -1); }).then(rerender)),
      iconBtn('down', 'Descendre', () => trySave('Réordonne les liens', (n) => { reorder(locateMatiere(n, m.id).matiere.liens, l.id, 1); }).then(rerender)),
      iconBtn('edit', 'Modifier', () => lienDialog(m, l)),
      iconBtn('trash', 'Supprimer', async () => {
        if (await confirmDialog(`Supprimer le lien « ${l.titre} » ?`, null, { ok: 'Supprimer', danger: true })) {
          await trySave(`Supprime le lien « ${l.titre} »`, (n) => { deleteLien(n, m.id, l.id); });
          rerender();
        }
      }, 'danger')));
}

function lienDialog(m, existing = null) {
  const titre = h('input', { class: 'input', id: 'l-titre', value: existing ? existing.titre : '', placeholder: 'ex. Vidéo : les 4P du marketing' });
  const url = h('input', { class: 'input', id: 'l-url', type: 'url', required: true, value: existing ? existing.url : '', placeholder: 'https://…' });
  const form = h('form', { onSubmit: async (e) => {
    e.preventDefault();
    let u = url.value.trim();
    try { u = new URL(u).href; } catch { toast('Adresse invalide.', 'bad'); return; }
    dlg.close();
    if (existing) {
      await trySave(`Modifie le lien « ${existing.titre} »`, (n) => {
        const mm = locateMatiere(n, m.id).matiere;
        const ll = mm.liens.find((x) => x.id === existing.id);
        deleteLien(n, m.id, existing.id);
        const nl = addLien(n, m.id, { titre: titre.value || u, url: u });
        nl.id = ll.id;
        nl.ordre = ll.ordre;
        mm.liens.sort((a, b) => a.ordre - b.ordre);
      });
    } else {
      await trySave(`Ajoute le lien « ${titre.value || u} » (${m.nom})`, (n) => { addLien(n, m.id, { titre: titre.value || u, url: u }); });
    }
    rerender();
  } },
  h('h2', null, existing ? 'Modifier le lien' : 'Ajouter un lien ou une vidéo'),
  h('div', { class: 'field' }, h('label', { for: 'l-url' }, 'Adresse'), url, h('div', { class: 'hint' }, 'Les vidéos YouTube s\'afficheront directement dans le site.')),
  h('div', { class: 'field' }, h('label', { for: 'l-titre' }, 'Titre'), titre),
  h('div', { class: 'form-actions' },
    h('button', { type: 'button', class: 'btn', onClick: () => dlg.close() }, 'Annuler'),
    h('button', { type: 'submit', class: 'btn primary' }, 'Enregistrer')));
  const dlg = modal(form);
  setTimeout(() => url.focus(), 40);
}

