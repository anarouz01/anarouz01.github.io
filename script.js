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
