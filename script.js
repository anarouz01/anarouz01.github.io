// ─────────────────────────────────────────────────────────────────────────────
// MOBILE NAVIGATION — burger, overlay, ESC, iOS scroll-lock
// ─────────────────────────────────────────────────────────────────────────────
const navToggle = document.querySelector('.nav__toggle');
const navMenu   = document.querySelector('.nav__menu');

// Créer l'overlay backdrop une seule fois
let navOverlay = document.querySelector('.nav-overlay');
if (!navOverlay && navMenu) {
  navOverlay = document.createElement('div');
  navOverlay.className = 'nav-overlay';
  navOverlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(navOverlay);
}

function openMenu() {
  navMenu.classList.add('open');
  navOverlay && navOverlay.classList.add('open');
  navToggle.setAttribute('aria-expanded', 'true');
  navToggle.setAttribute('aria-label', 'Fermer le menu');
  // Scroll-lock (iOS-safe)
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  navMenu.classList.remove('open');
  navOverlay && navOverlay.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Ouvrir le menu');
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
}

if (navToggle && navMenu) {
  // Toggle au clic du burger
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.contains('open');
    isOpen ? closeMenu() : openMenu();
  });

  // Fermer au clic sur un lien du menu
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Fermer au clic sur l'overlay
  navOverlay && navOverlay.addEventListener('click', closeMenu);

  // Fermer avec la touche ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navMenu.classList.contains('open')) closeMenu();
  });

  // Fermer si la fenêtre est redimensionnée au-delà du breakpoint mobile
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && navMenu.classList.contains('open')) closeMenu();
  }, { passive: true });
}


// ─────────────────────────────────────────────────────────────────────────────
// STICKY HEADER — ombre au scroll
// ─────────────────────────────────────────────────────────────────────────────
const header = document.querySelector('.header');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}


// ─────────────────────────────────────────────────────────────────────────────
// SCROLL ANIMATIONS — IntersectionObserver (.animate-in → .visible)
// ─────────────────────────────────────────────────────────────────────────────
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
    // Fallback navigateurs anciens
    animEls.forEach(el => el.classList.add('visible'));
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE ANALYTICS + COOKIE CONSENT (RGPD)
// GA chargé uniquement après acceptation explicite de l'utilisateur
// ─────────────────────────────────────────────────────────────────────────────
const GA_ID       = 'G-49N1TGYH5W';
const CONSENT_KEY = 'anarouz_cookie_consent';

/** Charge GA4 dynamiquement */
function loadGA() {
  if (document.getElementById('ga-script')) return;
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

/** Crée et affiche le bandeau cookie */
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

// Initialisation consentement
(function initConsent() {
  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'accepted') {
    loadGA();
  } else if (!consent) {
    window.addEventListener('load', () => setTimeout(showCookieBanner, 1000));
  }
})();
