/* ==========================================================================
   Attack on Titan — Manga Website
   Interactions: Parallax, Flip Cards, Carousel, Timeline, Audio, CTA
   ========================================================================== */

(function () {
  'use strict';

  /* ─── UTILITIES ─────────────────────────────────────────────────── */
  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => Array.from((p || document).querySelectorAll(s));
  const throttle = (fn, ms) => {
    let wait = false;
    return (...a) => { if (!wait) { fn(...a); wait = true; setTimeout(() => { wait = false; }, ms); } };
  };

  /* ─── THEME TOGGLE ──────────────────────────────────────────────────── */
  function initThemeToggle() {
    var btn = $('#themeToggle');
    if (!btn) return;

    var isDark = true;

    function toggleTheme() {
      isDark = !isDark;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      btn.classList.toggle('theme-toggle--light', !isDark);
      btn.classList.toggle('theme-toggle--dark', isDark);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // Check for saved preference
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      isDark = false;
    }

    btn.classList.toggle('theme-toggle--light', !isDark);
    btn.classList.toggle('theme-toggle--dark', isDark);
    btn.addEventListener('click', toggleTheme);
  }

  /* ─── AMBIENT AUDIO ──────────────────────────────────────────── */
  function initAmbientAudio() {
    var btn = $('#soundToggle');
    if (!btn) return;

    var ctx = null;
    var master = null;
    var scrollFilter = null;
    var noiseFilter = null;
    var isActive = false;
    var audioReady = false;

    // Create audio graph, start oscillators — called on first user click
    function buildGraph() {
      if (audioReady) return;

      ctx = new (window.AudioContext || window.webkitAudioContext)();

      master = ctx.createGain();
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.connect(ctx.destination);

      // Osc 1 — low drone
      var o1 = ctx.createOscillator();
      o1.type = 'sawtooth';
      o1.frequency.setValueAtTime(55, ctx.currentTime);

      scrollFilter = ctx.createBiquadFilter();
      scrollFilter.type = 'lowpass';
      scrollFilter.frequency.setValueAtTime(400, ctx.currentTime);
      scrollFilter.Q.setValueAtTime(2, ctx.currentTime);

      var g1 = ctx.createGain();
      g1.gain.setValueAtTime(0.12, ctx.currentTime);
      o1.connect(scrollFilter);
      scrollFilter.connect(g1);
      g1.connect(master);

      // Osc 2 — eerie overtone
      var o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(92, ctx.currentTime);

      var f2 = ctx.createBiquadFilter();
      f2.type = 'notch';
      f2.frequency.setValueAtTime(180, ctx.currentTime);
      f2.Q.setValueAtTime(5, ctx.currentTime);

      o2.connect(f2);
      f2.connect(master);

      // Brown noise
      var bufSize = ctx.sampleRate * 2;
      var buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      var d = buf.getChannelData(0);
      var lo = 0;
      for (var i = 0; i < bufSize; i++) {
        var w = Math.random() * 2 - 1;
        d[i] = (lo + 0.02 * w) / 1.02;
        lo = d[i];
        d[i] *= 3.5;
      }

      var noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = buf;
      noiseSrc.loop = true;

      noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(100, ctx.currentTime);

      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.25, ctx.currentTime);

      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(ng);
      ng.connect(master);

      // Scroll modulation
      function onScroll() {
        if (!ctx || ctx.state === 'closed') return;
        if (ctx.state === 'suspended') { ctx.resume(); return; }
        var sy = window.scrollY;
        var dh = document.documentElement.scrollHeight - window.innerHeight;
        var p = Math.min(sy / dh, 1);
        var now = ctx.currentTime;
        scrollFilter.frequency.setTargetAtTime(Math.max(400 - p * 320, 80), now, 0.1);
        noiseFilter.frequency.setTargetAtTime(Math.max(100 - p * 60, 40), now, 0.1);
        if (isActive) {
          master.gain.setTargetAtTime(0.04 + p * 0.06, now, 0.1);
        }
      }

      window.addEventListener('scroll', throttle(onScroll, 100));

      // Start sources
      o1.start(ctx.currentTime);
      o2.start(ctx.currentTime);
      noiseSrc.start(ctx.currentTime);

      audioReady = true;
    }

    function startAudio() {
      buildGraph();
      isActive = true;
      btn.classList.remove('sound-toggle--off');
      btn.classList.add('sound-toggle--on');
      if (ctx.state === 'suspended') ctx.resume();
      master.gain.setTargetAtTime(0.06, ctx.currentTime, 0.3);
    }

    function stopAudio() {
      if (!ctx) return;
      isActive = false;
      btn.classList.remove('sound-toggle--on');
      btn.classList.add('sound-toggle--off');
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    }

    function toggle() {
      if (isActive) stopAudio();
      else startAudio();
    }

    // Set initial state to "off" (muted icon visible)
    btn.classList.add('sound-toggle--off');
    btn.addEventListener('click', toggle);
  }

  /* ─── PARALLAX ────────────────────────────────────────────────── */
  function initParallax() {
    const layers = $$('[data-speed]', $('#parallaxContainer'));
    if (!layers.length) return;

    function update() {
      const scroll = window.scrollY;
      const hero = $('#hero');
      if (!hero) return;
      const hh = hero.offsetHeight;
      const progress = Math.min(scroll / hh, 1);

      layers.forEach(layer => {
        const speed = parseFloat(layer.dataset.speed) || 0.1;
        layer.style.transform = 'translateY(' + (scroll * speed) + 'px)';
        layer.style.opacity = Math.max(1 - progress * (1 - speed * 2), 0.2);
      });
    }

    window.addEventListener('scroll', throttle(update, 16), { passive: true });
    update();
  }

  /* ─── NAVIGATION ─────────────────────────────────────────────── */
  function initNavigation() {
    const links = $$('.nav__link');
    const sections = $$('section[id]');
    const nav = $('#navbar');
    let lastId = '';
    let navVisible = false;

    function update() {
      const scroll = window.scrollY + 120;
      const heroBottom = $('#hero')?.offsetHeight || 0;

      if (window.scrollY > heroBottom * 0.7 && !navVisible) {
        nav.classList.remove('nav--hidden');
        navVisible = true;
      } else if (window.scrollY <= heroBottom * 0.7 && navVisible) {
        nav.classList.add('nav--hidden');
        navVisible = false;
      }

      for (const section of sections) {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        if (scroll >= top && scroll < bottom) {
          const id = section.id;
          if (id !== lastId) {
            lastId = id;
            links.forEach(link => {
              link.classList.toggle('nav__link--active', link.getAttribute('href') === '#' + id);
            });
          }
          break;
        }
      }
    }

    window.addEventListener('scroll', throttle(update, 100), { passive: true });
    update();

    links.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ─── CAROUSEL ──────────────────────────────────────────────── */
  function initCarousel() {
    const track = $('#carouselTrack');
    const dots = $$('.carousel-dot');
    if (!track || !dots.length) return;

    let autoAdvance = null;
    let currentIndex = 0;

    function goToSlide(index) {
      const slides = $$('.carousel-slide', track);
      if (index < 0 || index >= slides.length) return;
      currentIndex = index;

      // Scroll horizontally only — no vertical page jump
      const slide = slides[index];
      const trackRect = track.getBoundingClientRect();
      const slideRect = slide.getBoundingClientRect();
      const offset = slideRect.left - trackRect.left + track.scrollLeft;
      track.scrollTo({ left: offset, behavior: 'smooth' });

      dots.forEach(d => d.classList.remove('carousel-dot--active'));
      if (dots[index]) dots[index].classList.add('carousel-dot--active');
    }

    function startAuto() {
      stopAuto();
      // Set initial dot state without scrolling
      dots.forEach((d, i) => d.classList.toggle('carousel-dot--active', i === 0));
      currentIndex = 0;

      autoAdvance = setInterval(() => {
        const slides = $$('.carousel-slide', track);
        // Only advance if carousel is in viewport (prevents background scrolling)
        const rect = track.closest('.carousel-container').getBoundingClientRect();
        const inView = rect.top < window.innerHeight && rect.bottom > 0;
        if (inView) {
          goToSlide((currentIndex + 1) % slides.length);
        } else {
          // Reset to first slide when not visible so it's fresh when they return
          currentIndex = (currentIndex + 1) % slides.length;
          dots.forEach((d, i) => d.classList.toggle('carousel-dot--active', i === currentIndex));
        }
      }, 5000);
    }

    function stopAuto() { if (autoAdvance) { clearInterval(autoAdvance); autoAdvance = null; } }

    dots.forEach(dot => {
      dot.addEventListener('click', () => { goToSlide(parseInt(dot.dataset.index)); startAuto(); });
    });

    track.addEventListener('scroll', throttle(() => {
      const slides = $$('.carousel-slide', track);
      const tr = track.getBoundingClientRect();
      const center = tr.left + tr.width / 2;
      let closest = 0, closestDist = Infinity;
      slides.forEach((s, i) => {
        const sr = s.getBoundingClientRect();
        const sc = sr.left + sr.width / 2;
        const d = Math.abs(center - sc);
        if (d < closestDist) { closestDist = d; closest = i; }
      });
      if (closest !== currentIndex) {
        currentIndex = closest;
        dots.forEach(dd => dd.classList.remove('carousel-dot--active'));
        if (dots[closest]) dots[closest].classList.add('carousel-dot--active');
      }
    }, 100));

    const container = track.closest('.carousel-container');
    if (container) {
      container.addEventListener('mouseenter', stopAuto);
      container.addEventListener('mouseleave', startAuto);
      container.addEventListener('touchstart', stopAuto);
      container.addEventListener('touchend', startAuto);
    }

    startAuto();
  }

  /* ─── TIMELINE ─────────────────────────────────────────────────── */
  function initTimeline() {
    const events = $$('.timeline-event');
    if (!events.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('timeline-event--visible');
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -50px 0px' });

    events.forEach(e => observer.observe(e));
  }

  /* ─── SECTION REVEALS ────────────────────────────────────────── */
  function initReveals() {
    const reveals = $$('.reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const parent = entry.target.closest('.chapter-grid, .char-grid, .titan-grid, .moments-grid');
          if (parent) {
            const siblings = $$('.reveal', parent);
            siblings.forEach((el, i) => {
              el.style.transitionDelay = i * 0.08 + 's';
              el.classList.add('reveal--visible');
            });
            siblings.forEach(el => observer.unobserve(el));
          } else {
            entry.target.classList.add('reveal--visible');
            observer.unobserve(entry.target);
          }
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });

    reveals.forEach(el => observer.observe(el));
  }

  /* ─── CTA BAR ────────────────────────────────────────────────── */
  function initCTA() {
    const cta = $('#ctaBar');
    const hero = $('#hero');
    const btn = $('#readLatestCta');
    if (!cta || !hero) return;

    function update() {
      const heroBottom = hero.offsetTop + hero.offsetHeight;
      if (window.scrollY + window.innerHeight > heroBottom + 200) {
        cta.classList.add('cta-bar--visible');
      } else {
        cta.classList.remove('cta-bar--visible');
      }
    }

    window.addEventListener('scroll', throttle(update, 100), { passive: true });
    update();

    if (btn) {
      btn.addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'cta-button__ripple';
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    }
  }

  /* ─── INIT ──────────────────────────────────────────────────── */
  function init() {
    initThemeToggle();
    initAmbientAudio();
    initParallax();
    initNavigation();
    initCarousel();
    initTimeline();
    initReveals();
    initCTA();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
