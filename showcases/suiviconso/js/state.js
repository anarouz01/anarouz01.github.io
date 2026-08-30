// État central de l'application + pub/sub minimal.
// Toute mutation passe par les setters ci-dessous et notifie les abonnés.

window.App = window.App || {};

App.state = (function () {
  function createState({ periodes, natures, basemaps }) {
    const state = {
      periodes,                                 // liste ordonnée complète (référence pour les index de plage)
      rangeStart: 0,                            // index de début de la plage affichée (slider, F5)
      rangeEnd: periodes.length - 1,            // index de fin de la plage affichée — plage complète par défaut
      natures: new Set(natures),                // natures client actives (F4)
      level: 'dpi',                              // 'dpi' | 'quartier' | 'ville' (F1/F6/F7)
      selection: null,                           // { type: 'dpi'|'quartier'|'ville', id: string } | null
      basemap: basemaps[0],                      // clé du fond de carte actif
    };

    const listeners = [];
    function notify() { listeners.forEach(fn => fn(state)); }

    return {
      get: () => state,
      subscribe(fn) { listeners.push(fn); },

      setRange(start, end) {
        state.rangeStart = Math.max(0, Math.min(start, end));
        state.rangeEnd = Math.min(periodes.length - 1, Math.max(start, end));
        notify();
      },
      toggleNature(nature, active) {
        if (active) state.natures.add(nature);
        else state.natures.delete(nature);
        notify();
      },
      setLevel(level) {
        state.level = level;
        state.selection = null; // une sélection DPI n'a pas de sens en vue Quartier/Ville, et inversement
        notify();
      },
      setSelection(selection) {
        state.selection = selection;
        notify();
      },
      setBasemap(basemap) {
        state.basemap = basemap;
        notify();
      },
    };
  }

  return { createState };
})();
