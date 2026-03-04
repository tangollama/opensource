/* ==========================================================================
   Hero interactions — BibleProject Open Source Home
   ========================================================================== */

(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* --------------------------------------------------------------------------
     renderText — writes state + optional cursor into an SVG <text> element.
     Cursor is always font-weight:400 regardless of the element's own weight.
     -------------------------------------------------------------------------- */

  function renderText(element, state, showCursor, cursorChar) {
    // Clear existing children
    while (element.firstChild) element.removeChild(element.firstChild);
    // Main text node
    element.appendChild(document.createTextNode(state));
    // Cursor as a tspan so it can have its own weight
    if (showCursor && !window.heroCursorFrozen) {
      var tspan = document.createElementNS(SVG_NS, 'tspan');
      tspan.style.fontWeight = '400';
      tspan.style.fontStyle  = 'normal';
      tspan.textContent = cursorChar;
      element.appendChild(tspan);
    }
  }

  /* --------------------------------------------------------------------------
     Typer — types and erases text scenes on an SVG text element
     Options:
       type        ms per character while typing     (default 75)
       erase       ms per character while erasing    (default 55)
       break       ms pause after scene is complete  (default 800)
       loop        loop back to first scene          (default false)
       cursor      cursor character                  (default '|')
       keepCursor  keep cursor blinking after done   (default false)
     -------------------------------------------------------------------------- */

  function Typer(element, options, scenes) {
    var defaultOptions = { erase: 55, type: 75, break: 800, loop: false, cursor: '|', keepCursor: false, onLastScene: null, onComplete: null };
    var config = {};

    if (Array.isArray(options)) {
      scenes = options;
      options = {};
    }

    for (var key in defaultOptions) {
      if (!defaultOptions.hasOwnProperty(key)) continue;
      config[key] = options[key] != null ? options[key] : defaultOptions[key];
    }

    var status        = 'ready';
    var state         = '';
    var currentSceneIndex = 0;
    var cursorVisible = true;
    var cursorInterval = null;

    function render() {
      renderText(element, state, cursorVisible, config.cursor);
    }

    function startBlink() {
      if (cursorInterval) return;
      cursorInterval = setInterval(function () {
        cursorVisible = !cursorVisible;
        render();
      }, 530);
    }

    function stopCursor() {
      clearInterval(cursorInterval);
      cursorInterval  = null;
      cursorVisible   = false;
      renderText(element, state, false, config.cursor);
    }

    function type() {
      if (status !== 'playing') return;
      var scene = scenes[currentSceneIndex];

      if (state === scene) {
        var isLastScene = !config.loop && currentSceneIndex === scenes.length - 1;
        if (isLastScene) {
          if (config.keepCursor) {
            startBlink();
          } else {
            stopCursor();
          }
          if (config.onComplete) config.onComplete();
          return;
        }
        return setTimeout(erase, config.break);
      }

      state = scene.substr(0, state.length + 1);
      cursorVisible = true;
      render();
      setTimeout(type, config.type);
    }

    function erase() {
      if (status !== 'playing') return;

      if (state === '') {
        currentSceneIndex++;
        if (currentSceneIndex === scenes.length) {
          if (!config.loop) return;
          currentSceneIndex = 0;
        }
        if (config.onLastScene && currentSceneIndex === scenes.length - 1) {
          config.onLastScene();
        }
        return type();
      }

      state = state.substr(0, state.length - 1);
      cursorVisible = true;
      render();
      setTimeout(erase, config.erase);
    }

    function stop() { status = 'ready'; }
    function play() {
      if (status === 'ready') { status = 'playing'; type(); }
    }

    play();
    return { play: play, stop: stop };
  }

  /* --------------------------------------------------------------------------
     Boot
     -------------------------------------------------------------------------- */

  function boot() {
    // Fade in nav badge once hero scrolls out of view
    var badge  = document.querySelector('.site-logo-badge');
    var heroBg = document.querySelector('#hero-bg');
    if (badge && heroBg) {
      var observer = new IntersectionObserver(function (entries) {
        badge.classList.toggle('is-visible', !entries[0].isIntersecting);
      }, { threshold: 0 });
      observer.observe(heroBg);
    }

    var openEl   = document.querySelector('.svg-open');
    var sourceEl = document.querySelector('.svg-source');
    if (!openEl || !sourceEl) return;

    openEl.textContent   = '';
    sourceEl.textContent = '';

    var initialDelay = 1800; // ms cursor blinks before typing begins
    var typeSpeed    = 130;  // ms per character

    // Non-breaking spaces to indent final "Source" to the right
    var indent = '\u00a0\u00a0';

    // Show blinking cursor on Open element before typing starts
    var preCursorVisible  = true;
    var preCursorInterval = setInterval(function () {
      preCursorVisible = !preCursorVisible;
      renderText(openEl, '', preCursorVisible, '|');
    }, 530);
    renderText(openEl, '', true, '|');

    setTimeout(function () {
      clearInterval(preCursorInterval);

      // 1. Type "Open" — cursor regular weight, removed immediately when done
      Typer(openEl, { type: typeSpeed, loop: false, keepCursor: false }, ['Open']);

      // 2. After Open finishes, start Source: <Source /> → erase → [indent]Source
      //    Cursor stays and blinks forever on Source
      var openDuration = 'Open'.length * typeSpeed + 500;
      setTimeout(function () {
        Typer(sourceEl, {
          type: typeSpeed, erase: 55, break: 900, loop: false, keepCursor: true,
          onLastScene: function () { sourceEl.style.fontStyle = 'italic'; },
          onComplete:  function () { window.heroAnimationComplete = true; }
        }, [
          '<Source />',
          indent + 'Source'
        ]);
      }, openDuration);

    }, initialDelay);
  }

  /* --------------------------------------------------------------------------
     Projects — GSAP ScrollTrigger scroll-fill effect
     -------------------------------------------------------------------------- */

  /* --------------------------------------------------------------------------
     Mission — fade in on scroll via IntersectionObserver
     -------------------------------------------------------------------------- */

  function initMission() {
    var missionText = document.querySelector('.mission-text');
    if (!missionText) return;

    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        missionText.classList.add('is-visible');
        observer.disconnect();
      }
    }, { threshold: 0.2 });

    observer.observe(missionText);
  }

  function initProjects() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.project-name').forEach(function (el) {
      gsap.to(el, {
        backgroundSize: '100% 100%',
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'center 85%',
          end: 'center 25%',
          scrub: true,
        },
      });
    });
  }

  /* --------------------------------------------------------------------------
     Enter key — freeze hero state
     - Switches SVG text from mix-blend-mode overlay to solid white
     - Freezes blob animation at current position
     - Removes blinking cursor
     -------------------------------------------------------------------------- */

  function initEnterFreeze() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (!window.heroAnimationComplete) return;

      var svgText  = document.querySelector('.hero-svg-text');
      var heroPage = document.querySelector('.hero-page');
      if (svgText)  svgText.classList.toggle('is-frozen');
      if (heroPage) heroPage.classList.toggle('is-frozen');

      // Freeze / unfreeze blobs
      window.heroPaused = !window.heroPaused;

      // Stop cursor immediately — flag prevents renderText from re-adding it
      window.heroCursorFrozen = true;
      var textEls = document.querySelectorAll('.hero-svg-text text');
      textEls.forEach(function (el) {
        var tspan = el.querySelector('tspan');
        if (tspan) tspan.remove();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { boot(); initMission(); initProjects(); initEnterFreeze(); });
  } else {
    boot();
    initMission();
    initProjects();
    initEnterFreeze();
  }

})();
