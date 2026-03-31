// ── Mobile navigation toggle ──────────────────────────────────────────────
const navToggle = document.querySelector('.nav__toggle');
const navMenu   = document.querySelector('.nav__menu');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close when a link is clicked (mobile)
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Ouvrir le menu');
      document.body.style.overflow = '';
    });
  });
}

// ── Sticky header shadow on scroll ───────────────────────────────────────
const header = document.querySelector('.header');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// ── Scroll-triggered fade-in (Intersection Observer) ─────────────────────
const animEls = document.querySelectorAll('.animate-in');

if (animEls.length) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

    animEls.forEach(el => observer.observe(el));
  } else {
    // Fallback for older browsers
    animEls.forEach(el => el.classList.add('visible'));
  }
}

// ── Google Analytics + Cookie Consent (RGPD) ─────────────────────────────
const GA_ID       = 'G-49N1TGYH5W';
const CONSENT_KEY = 'anarouz_cookie_consent';

/** Charge GA4 dynamiquement — appelé uniquement après acceptation */
function loadGA() {
  if (document.getElementById('ga-script')) return; // déjà chargé
  const s = document.createElement('script');
  s.id    = 'ga-script';
  s.async = true;
  s.src   = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID, { anonymize_ip: true });
}

/** Crée et affiche le bandeau de consentement */
function showCookieBanner() {
  if (document.getElementById('cookie-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-modal', 'false');
  banner.setAttribute('aria-label', 'Gestion des cookies');
  banner.innerHTML = `
    <div class="cookie-banner__inner">
      <div class="cookie-banner__icon" aria-hidden="true">🍪</div>
      <div class="cookie-banner__text">
        <strong>Ce site utilise des cookies d'analyse</strong>
        <p>Nous utilisons Google Analytics pour mesurer l'audience et améliorer notre site. Les données sont anonymisées et ne sont jamais revendues à des tiers.</p>
      </div>
      <div class="cookie-banner__actions">
        <button id="cookie-accept" class="cookie-btn cookie-btn--accept">Accepter</button>
        <button id="cookie-refuse" class="cookie-btn cookie-btn--refuse">Refuser</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  // Déclenche l'animation d'entrée
  requestAnimationFrame(() => {
    requestAnimationFrame(() => banner.classList.add('cookie-banner--visible'));
  });

  function hideBanner() {
    banner.classList.remove('cookie-banner--visible');
    banner.classList.add('cookie-banner--hidden');
    setTimeout(() => banner.remove(), 400);
  }

  document.getElementById('cookie-accept').addEventListener('click', () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    hideBanner();
    loadGA();
  });

  document.getElementById('cookie-refuse').addEventListener('click', () => {
    localStorage.setItem(CONSENT_KEY, 'refused');
    hideBanner();
  });
}

// ── Initialisation du consentement ────────────────────────────────────────
(function initConsent() {
  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'accepted') {
    // Consentement déjà donné → charger GA immédiatement
    loadGA();
  } else if (!consent) {
    // Pas encore de choix → afficher le bandeau après 1 s
    window.addEventListener('load', () => setTimeout(showCookieBanner, 1000));
  }
  // Si 'refused' : ne rien faire, pas de GA
})();
