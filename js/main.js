(function () {
  'use strict';

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

  // Hero carousel
  var hero = document.querySelector('.hero');
  if (hero) {
    var slides = Array.prototype.slice.call(hero.querySelectorAll('.hero-slide'));
    var dots = Array.prototype.slice.call(hero.querySelectorAll('.hero-dot'));
    var prevBtn = document.getElementById('hero-prev');
    var nextBtn = document.getElementById('hero-next');
    var current = 0;
    var timer = null;
    var AUTOPLAY_MS = 6000;

    function goTo(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        slide.classList.toggle('is-active', i === current);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === current);
        dot.setAttribute('aria-selected', String(i === current));
      });
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function startAutoplay() {
      if (prefersReducedMotion || slides.length < 2) return;
      stopAutoplay();
      timer = window.setInterval(next, AUTOPLAY_MS);
    }
    function stopAutoplay() {
      if (timer) { window.clearInterval(timer); timer = null; }
    }

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        goTo(parseInt(dot.getAttribute('data-goto'), 10));
        startAutoplay();
      });
    });
    if (prevBtn) prevBtn.addEventListener('click', function () { prev(); startAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { next(); startAutoplay(); });

    hero.addEventListener('mouseenter', stopAutoplay);
    hero.addEventListener('mouseleave', startAutoplay);
    hero.addEventListener('focusin', stopAutoplay);
    hero.addEventListener('focusout', startAutoplay);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { stopAutoplay(); } else { startAutoplay(); }
    });

    goTo(0);
    startAutoplay();
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
