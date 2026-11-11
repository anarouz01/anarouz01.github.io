// ==========================================================================
// Écrans de quiz (passage, auto-évaluation, résultat). Partagé entre l'espace
// élève et l'aperçu « Tester ce quiz » de l'admin.
// Aucune bonne réponse n'est affichée avant « Terminer ».
// ==========================================================================
import { h, clear, icon, confirmDialog } from './ui.js';
import { prepare, score, isAnswered, scoreClass, formatNote } from './quiz-engine.js';

/**
 * opts = { titre, questions, onFinish(result), onExit(), backLabel, onGuard(active) }
 */
export function runQuiz(root, opts) {
  const { titre, questions } = opts;
  let items = prepare(questions);
  let answers = {};
  let current = 0;
  let finished = false;

  const setGuard = (active) => { if (opts.onGuard) opts.onGuard(active); };

  function answeredCount() {
    return items.filter(({ q }) => isAnswered(q, answers[q.id])).length;
  }

  // ---------- Écran question ----------
  function renderQuestion() {
    setGuard(true);
    clear(root);
    const { q, perm } = items[current];
    const n = items.length;
    const ans = answers[q.id] || (answers[q.id] = q.type === 'qcm' ? { selected: [] } : { texte: '' });

    const progress = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(n), 'aria-valuenow': String(current + 1) },
      h('span', { style: { width: `${((current + 1) / n) * 100}%` } }));

    let body;
    if (q.type === 'qcm') {
      body = h('div', { class: 'choices', role: 'group', 'aria-label': 'Propositions' },
        perm.map((orig, k) => {
          const checked = ans.selected.includes(orig);
          const input = h('input', { type: 'checkbox', checked, 'aria-label': `Proposition ${k + 1}` });
          const label = h('label', { class: `choice ${checked ? 'selected' : ''}` }, input, h('span', null, q.choix[orig]));
          input.addEventListener('change', () => {
            if (input.checked) { if (!ans.selected.includes(orig)) ans.selected.push(orig); } else ans.selected = ans.selected.filter((x) => x !== orig);
            label.classList.toggle('selected', input.checked);
            updateDots();
          });
          return label;
        }));
    } else {
      const ta = h('textarea', { class: 'textarea', rows: 6, placeholder: 'Votre réponse…', 'aria-label': 'Votre réponse' });
      ta.value = ans.texte || '';
      ta.addEventListener('input', () => { ans.texte = ta.value; updateDots(); });
      body = ta;
    }

    const dots = h('div', { class: 'dots', 'aria-label': 'Aller à la question' },
      items.map((it, i) => h('button', {
        type: 'button', class: 'dot', 'aria-label': `Question ${i + 1}`,
        onClick: () => { current = i; renderQuestion(); },
      }, String(i + 1))));
    function updateDots() {
      [...dots.children].forEach((d, i) => {
        d.classList.toggle('answered', isAnswered(items[i].q, answers[items[i].q.id]));
        d.classList.toggle('current', i === current);
      });
    }

    const last = current === n - 1;
    root.append(
      h('div', { class: 'page-head' }, h('h1', null, titre), opts.headerExtra ? opts.headerExtra() : null),
      h('div', { class: 'quiz-head' }, progress, h('span', { class: 'quiz-counter' }, `Question ${current + 1} / ${n}`)),
      h('div', { class: 'card question-card' },
        h('div', { class: 'question-type' }, q.type === 'qcm'
          ? h('span', { class: 'badge accent' }, 'QCM · une ou plusieurs réponses')
          : h('span', { class: 'badge' }, 'Question ouverte')),
        h('div', { class: 'question-text' }, q.enonce),
        body),
      h('div', { class: 'quiz-nav' },
        h('button', { type: 'button', class: 'btn', disabled: current === 0, onClick: () => { current--; renderQuestion(); } }, icon('left'), 'Précédent'),
        last
          ? h('button', { type: 'button', class: 'btn primary', onClick: finish }, 'Terminer le quiz')
          : h('button', { type: 'button', class: 'btn primary', onClick: () => { current++; renderQuestion(); } }, 'Suivant', icon('right'))),
      dots,
      h('div', { class: 'row', style: { marginTop: '24px' } },
        h('button', { type: 'button', class: 'btn ghost sm', onClick: exit }, 'Quitter le quiz'),
        h('span', { class: 'grow' }),
        !last ? h('button', { type: 'button', class: 'btn ghost sm', onClick: finish }, 'Terminer maintenant') : null),
    );
    updateDots();
    const focusable = root.querySelector('.choice input, textarea');
    if (focusable && opts.autofocus !== false) focusable.focus({ preventScroll: true });
  }

  async function exit() {
    const ok = await confirmDialog('Quitter le quiz ?', 'Vos réponses ne seront pas enregistrées.', { ok: 'Quitter', danger: true });
    if (!ok) return;
    setGuard(false);
    if (opts.onExit) opts.onExit();
  }

  async function finish() {
    const missing = items.length - answeredCount();
    if (missing > 0) {
      const ok = await confirmDialog('Terminer le quiz ?',
        `${missing} question${missing > 1 ? 's sont restées' : ' est restée'} sans réponse ; ${missing > 1 ? 'elles seront comptées' : 'elle sera comptée'} comme fausse${missing > 1 ? 's' : ''}.`,
        { ok: 'Terminer' });
      if (!ok) return;
    }
    const open = items.filter(({ q }) => q.type === 'ouverte');
    // Une question ouverte sans réponse est automatiquement « faux ».
    for (const { q } of open) if (!isAnswered(q, answers[q.id])) answers[q.id] = { texte: '', auto: 'faux' };
    if (open.some(({ q }) => !answers[q.id].auto)) renderSelfEval();
    else renderResult();
  }

  // ---------- Auto-évaluation ----------
  function renderSelfEval() {
    clear(root);
    const open = items.filter(({ q }) => q.type === 'ouverte' && isAnswered(q, answers[q.id]));
    const submit = h('button', { type: 'button', class: 'btn primary' }, 'Voir mon résultat');
    const refresh = () => { submit.disabled = open.some(({ q }) => !answers[q.id].auto); };
    submit.addEventListener('click', renderResult);

    root.append(
      h('div', { class: 'page-head' }, h('h1', null, 'Auto-évaluation'),
        h('p', { class: 'muted' }, 'Comparez chacune de vos réponses à la réponse attendue, puis indiquez honnêtement si elle est juste, partielle ou fausse.')),
      ...open.map(({ q }, i) => {
        const a = answers[q.id];
        const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Mon évaluation' },
          ['juste', 'partiel', 'faux'].map((v) => h('button', {
            type: 'button', class: `v-${v}`, 'aria-pressed': String(a.auto === v),
            onClick: (e) => {
              a.auto = v;
              [...e.currentTarget.parentNode.children].forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
              refresh();
            },
          }, v === 'juste' ? 'Juste' : v === 'partiel' ? 'Partiel' : 'Faux')));
        return h('div', { class: 'card', style: { marginBottom: '16px' } },
          h('div', { class: 'tiny muted' }, `Question ouverte ${i + 1} / ${open.length}`),
          h('div', { class: 'review-q' }, q.enonce),
          h('div', { class: 'compare' },
            h('div', null, h('div', { class: 'label' }, 'Ma réponse'), h('div', { class: 'box' }, a.texte)),
            h('div', null, h('div', { class: 'label' }, 'Réponse attendue'), h('div', { class: 'box expected' }, q.reponse))),
          seg);
      }),
      h('div', { class: 'form-actions' }, submit),
    );
    refresh();
    window.scrollTo(0, 0);
  }

  // ---------- Résultat ----------
  function renderResult() {
    setGuard(false);
    clear(root);
    const result = score(items, answers);
    if (!finished && opts.onFinish) opts.onFinish(result);
    finished = true;
    const cls = scoreClass(result.sur20);

    const review = h('div', null, items.map(({ q }, i) => {
      const a = answers[q.id] || {};
      const d = result.details[i];
      const markCls = d.points === 1 ? 'ok' : d.points > 0 ? 'half' : 'ko';
      const markTxt = d.points === 1 ? '✓' : d.points > 0 ? '½' : '✗';
      let detail;
      if (q.type === 'qcm') {
        const sel = new Set(a.selected || []);
        const good = new Set(q.bonnes);
        detail = h('div', { class: 'choices', style: { marginTop: '8px' } }, q.choix.map((c, k) => {
          const isGood = good.has(k);
          const isSel = sel.has(k);
          const state = isGood ? 'is-correct' : isSel ? 'is-wrong' : '';
          const tag = isGood && isSel ? 'Bonne réponse, cochée' : isGood ? 'Bonne réponse, non cochée' : isSel ? 'Cochée à tort' : '';
          return h('div', { class: `choice ${state}`, style: { cursor: 'default' } },
            h('span', { class: 'mono', 'aria-hidden': 'true' }, isSel ? '☑' : '☐'),
            h('span', { class: 'grow' }, h('span', { style: { display: 'block' } }, c),
              tag ? h('span', { class: 'tiny muted', style: { display: 'block' } }, tag) : null));
        }));
      } else {
        detail = h('div', { class: 'compare' },
          h('div', null, h('div', { class: 'label' }, 'Ma réponse'), h('div', { class: 'box' }, a.texte || '(sans réponse)')),
          h('div', null, h('div', { class: 'label' }, 'Réponse attendue'), h('div', { class: 'box expected' }, q.reponse)));
      }
      return h('div', { class: 'review-item' },
        h('div', { class: 'row', style: { alignItems: 'flex-start', flexWrap: 'nowrap' } },
          h('span', { class: `mark ${markCls}`, 'aria-label': d.verdict }, markTxt),
          h('div', { class: 'grow' },
            h('div', { class: 'review-q' }, `${i + 1}. ${q.enonce}`),
            q.type === 'ouverte' ? h('div', { class: 'tiny muted' }, `Auto-évaluation : ${d.verdict}`) : null,
            detail)));
    }));

    root.append(
      h('div', { class: 'card result-hero', 'aria-live': 'polite' },
        h('div', { class: 'muted small' }, titre),
        h('div', { class: 'result-score' }, formatNote(result.sur20), h('small', null, ' / 20')),
        h('div', { class: 'result-pct' }, `${result.pct} % · ${formatNote(result.points)} point${result.points > 1 ? 's' : ''} sur ${result.total}`),
        h('div', { class: `progress ${cls}`, style: { maxWidth: '320px', margin: '16px auto 0' } }, h('span', { style: { width: `${result.pct}%` } })),
        h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' } },
          h('button', { type: 'button', class: 'btn primary', onClick: restart }, icon('refresh'), 'Recommencer'),
          opts.resultActions ? opts.resultActions(result) : null,
          opts.onExit ? h('button', { type: 'button', class: 'btn', onClick: () => opts.onExit() }, opts.backLabel || 'Retour') : null)),
      h('h2', { style: { marginTop: '32px' } }, 'Correction détaillée'),
      h('div', { class: 'card' }, review),
    );
    window.scrollTo(0, 0);
  }

  function restart() {
    items = prepare(opts.regenerate ? opts.regenerate() : questions);
    answers = {};
    current = 0;
    finished = false;
    renderQuestion();
    window.scrollTo(0, 0);
  }

  renderQuestion();
}
