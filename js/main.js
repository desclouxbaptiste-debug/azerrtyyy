(function () {
  'use strict';

  var header = document.getElementById('site-header');
  var navToggle = document.getElementById('nav-toggle');
  var mobileNav = document.getElementById('mobile-nav');
  var yearEl = document.getElementById('year');
  var form = document.getElementById('newsletter-form');
  var emailInput = document.getElementById('newsletter-email');
  var formError = document.getElementById('newsletter-error');
  var formSuccess = document.getElementById('newsletter-success');

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Sticky header shadow on scroll
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile nav toggle
  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Ouvrir le menu' : 'Fermer le menu');
      mobileNav.hidden = isOpen;
    });

    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Ouvrir le menu');
        mobileNav.hidden = true;
      });
    });
  }

  // Scroll reveal animations
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // Newsletter form (client-side only, no backend configured)
  if (form && emailInput) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var isValid = emailInput.checkValidity();
      emailInput.setAttribute('aria-invalid', String(!isValid));
      formError.hidden = isValid;
      formSuccess.hidden = true;

      if (!isValid) {
        emailInput.focus();
        return;
      }

      formSuccess.hidden = false;
      form.reset();
      emailInput.removeAttribute('aria-invalid');
    });

    emailInput.addEventListener('input', function () {
      if (!formError.hidden) {
        formError.hidden = true;
        emailInput.removeAttribute('aria-invalid');
      }
    });
  }
})();
