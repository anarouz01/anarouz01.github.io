// Câblage des contrôles UI (plage de dates F5, nature client F4, niveau F1/F6/F7, fond de carte).
// Ne fait rien d'autre que traduire les interactions DOM en appels au state.

window.App = window.App || {};

App.controls = (function () {
  const natureIcon = App.icons.natureIcon;
  const NATURE_LIST = App.icons.NATURE_LIST;

  function initRangeSlider(state, periodes) {
    const startInput = document.getElementById('range-start');
    const endInput = document.getElementById('range-end');
    const startLabel = document.getElementById('range-label-start');
    const endLabel = document.getElementById('range-label-end');
    const fill = document.getElementById('range-fill');

    const maxIndex = periodes.length - 1;
    startInput.max = endInput.max = String(maxIndex);
    startInput.value = String(state.get().rangeStart);
    endInput.value = String(state.get().rangeEnd);

    function refresh() {
      const s = Number(startInput.value);
      const e = Number(endInput.value);
      startLabel.textContent = periodes[s];
      endLabel.textContent = periodes[e];
      // Remplissage coloré entre les deux poignées, pour repérer la plage en un coup d'œil.
      fill.style.left = `${(s / maxIndex) * 100}%`;
      fill.style.width = `${((e - s) / maxIndex) * 100}%`;
    }
    refresh();

    startInput.addEventListener('input', () => {
      let s = Number(startInput.value);
      let e = Number(endInput.value);
      if (s > e) { e = s; endInput.value = String(e); }
      state.setRange(s, e);
      refresh();
    });

    endInput.addEventListener('input', () => {
      let s = Number(startInput.value);
      let e = Number(endInput.value);
      if (e < s) { s = e; startInput.value = String(s); }
      state.setRange(s, e);
      refresh();
    });
  }

  function initNatureFilters(state) {
    const container = document.getElementById('nature-control');
    container.insertAdjacentHTML('beforeend', NATURE_LIST.map(nature => `
      <label class="chip-v">
        <input type="checkbox" value="${nature}" checked>
        <span>${natureIcon(nature)}${nature}</span>
      </label>
    `).join(''));

    const inputs = container.querySelectorAll('input[type="checkbox"]');
    inputs.forEach(input => {
      input.addEventListener('change', () => state.toggleNature(input.value, input.checked));
    });
  }

  function initLevelControl(state) {
    const buttons = document.querySelectorAll('.level-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => state.setLevel(btn.dataset.level));
    });
    // Synchronisé sur le state (pas seulement sur le clic) : le niveau peut aussi changer
    // depuis la recherche DPI, qui doit forcer le niveau "DPI".
    state.subscribe(s => buttons.forEach(b => b.classList.toggle('is-active', b.dataset.level === s.level)));
  }

  // Recherche d'un DPI par référence (correspondance partielle, insensible à la casse), avec
  // autocomplétion : centre la carte dessus, dézoome assez pour le sortir de son cluster, et
  // ouvre sa fiche — que le choix vienne de la liste de suggestions ou de la validation du champ.
  const MAX_SUGGESTIONS = 8;

  function initSearch(state, DPI, map, flyToDpi) {
    const form = document.getElementById('search-control');
    const input = document.getElementById('search-input');
    const error = document.getElementById('search-error');
    const suggestions = document.getElementById('search-suggestions');
    let activeIndex = -1;

    function findMatches(query) {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return DPI.filter(d => d.id.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
    }

    function closeSuggestions() {
      suggestions.hidden = true;
      suggestions.innerHTML = '';
      activeIndex = -1;
    }

    function renderSuggestions(matches) {
      activeIndex = -1;
      if (!matches.length) { closeSuggestions(); return; }
      suggestions.innerHTML = matches.map(d => `
        <li role="option" data-id="${d.id}">
          <span class="suggestion-id">${d.id}</span>
          <span class="suggestion-meta">${d.quartier} · ${d.ville}</span>
        </li>
      `).join('');
      suggestions.hidden = false;
    }

    function highlightActive() {
      suggestions.querySelectorAll('li').forEach((li, i) => li.classList.toggle('is-active', i === activeIndex));
    }

    function selectDpi(dpi) {
      error.hidden = true;
      closeSuggestions();
      input.value = dpi.id;
      state.setLevel('dpi');
      flyToDpi(map, dpi);
      state.setSelection({ type: 'dpi', id: dpi.id });
    }

    input.addEventListener('input', () => {
      error.hidden = true;
      renderSuggestions(findMatches(input.value));
    });

    input.addEventListener('keydown', e => {
      const items = suggestions.querySelectorAll('li');
      if (suggestions.hidden || !items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(items.length - 1, activeIndex + 1);
        highlightActive();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(0, activeIndex - 1);
        highlightActive();
      } else if (e.key === 'Escape') {
        closeSuggestions();
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const dpi = DPI.find(d => d.id === items[activeIndex].dataset.id);
        if (dpi) selectDpi(dpi);
      }
    });

    // mousedown (pas click) : se déclenche avant le blur du champ, sinon la liste se referme
    // avant que le clic sur l'item ne soit pris en compte.
    suggestions.addEventListener('mousedown', e => {
      const li = e.target.closest('li');
      if (!li) return;
      const dpi = DPI.find(d => d.id === li.dataset.id);
      if (dpi) selectDpi(dpi);
    });

    document.addEventListener('click', e => {
      if (!form.contains(e.target)) closeSuggestions();
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const query = input.value.trim().toLowerCase();
      if (!query) return;
      const dpi = DPI.find(d => d.id.toLowerCase().includes(query));
      if (!dpi) {
        error.textContent = `Aucun DPI trouvé pour « ${input.value.trim()} ».`;
        error.hidden = false;
        closeSuggestions();
        return;
      }
      selectDpi(dpi);
    });
  }

  function initBasemapControl(state, BASEMAPS) {
    const container = document.getElementById('basemap-control');
    container.innerHTML = Object.entries(BASEMAPS).map(([key, cfg]) => `
      <button type="button" data-basemap="${key}" class="basemap-btn${key === state.get().basemap ? ' is-active' : ''}">${cfg.label}</button>
    `).join('');

    const buttons = container.querySelectorAll('.basemap-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.toggle('is-active', b === btn));
        state.setBasemap(btn.dataset.basemap);
      });
    });
  }

  function initControls(state, periodes, BASEMAPS, DPI, map, flyToDpi) {
    initRangeSlider(state, periodes);
    initNatureFilters(state);
    initLevelControl(state);
    initSearch(state, DPI, map, flyToDpi);
    initBasemapControl(state, BASEMAPS);
  }

  return { initControls };
})();
