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
    return { play: play, stop: stop, stopCursor: stopCursor };
  }

  /* --------------------------------------------------------------------------
     SVGScramble — text scramble transition for SVG <text> elements
     Uses tspan elements for per-character dud styling (no innerHTML in SVG)
     -------------------------------------------------------------------------- */

  function SVGScramble(el) {
    this.el       = el;
    this.chars    = '!<>-_\\/[]{}—=+*^?#';
    this.frame    = 0;
    this.frameReq = null;
    this.queue    = [];
    this.resolve  = null;
    var self = this;
    this._tick = function () { self._update(); };
  }

  SVGScramble.prototype.setText = function (newText) {
    var self    = this;
    var oldText = this.el.textContent;
    var len     = Math.max(oldText.length, newText.length);
    var promise = new Promise(function (resolve) { self.resolve = resolve; });
    this.queue  = [];
    for (var i = 0; i < len; i++) {
      var start = Math.floor(Math.random() * 20);
      var end   = start + Math.floor(Math.random() * 20) + 5;
      this.queue.push({ from: oldText[i] || '', to: newText[i] || '', start: start, end: end, char: null });
    }
    cancelAnimationFrame(this.frameReq);
    this.frame = 0;
    this._update();
    return promise;
  };

  SVGScramble.prototype._update = function () {
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);
    var complete = 0;
    for (var i = 0; i < this.queue.length; i++) {
      var q = this.queue[i];
      if (this.frame >= q.end) {
        complete++;
        if (q.to) this.el.appendChild(document.createTextNode(q.to));
      } else if (this.frame >= q.start) {
        if (!q.char || Math.random() < 0.28) {
          q.char = this.chars[Math.floor(Math.random() * this.chars.length)];
          this.queue[i].char = q.char;
        }
        var tspan = document.createElementNS(SVG_NS, 'tspan');
        tspan.setAttribute('fill-opacity', '0.35');
        tspan.textContent = q.char;
        this.el.appendChild(tspan);
      } else {
        if (q.from) this.el.appendChild(document.createTextNode(q.from));
      }
    }
    if (complete === this.queue.length) {
      if (this.resolve) this.resolve();
    } else {
      this.frameReq = requestAnimationFrame(this._tick);
      this.frame++;
    }
  };

  /* --------------------------------------------------------------------------
     Boot
     -------------------------------------------------------------------------- */

  function boot() {
    // Fade in nav badge once hero scrolls out of view
    var badge  = document.querySelector('.site-logo-badge');
    var heroBg = document.querySelector('#hero-bg');
    if (badge && heroBg) {
      var observer = new IntersectionObserver(function (entries) {
        var inView = entries[0].isIntersecting;
        badge.classList.toggle('is-visible', !inView);
        // Pause WebGL when hero scrolls out of view
        if (window.heroGradientApp) {
          inView ? window.heroGradientApp.resume() : window.heroGradientApp.pause();
        }
      }, { threshold: 0 });
      observer.observe(heroBg);
    }

    var openEl   = document.querySelector('.svg-open');
    var sourceEl = document.querySelector('.svg-source');
    if (!openEl || !sourceEl) return;

    openEl.textContent   = '';
    sourceEl.textContent = '';

    var indent = '\u00a0\u00a0';

    // Skip animation for users who prefer reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      openEl.textContent   = 'Open';
      sourceEl.textContent = indent + 'Source';
      window.heroAnimationComplete = true;
      return;
    }

    var initialDelay = 1800; // ms cursor blinks before typing begins
    var typeSpeed    = 130;  // ms per character

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
      window.heroOpenTyper = Typer(openEl, { type: typeSpeed, loop: false, keepCursor: false }, ['Open']);

      // 2. After Open finishes, start Source: <Sou → erase → [indent]Source
      //    Cursor stays and blinks forever on Source
      var openDuration = 'Open'.length * typeSpeed + 500;
      setTimeout(function () {
        window.heroSourceTyper = Typer(sourceEl, {
          type: typeSpeed, erase: 55, break: 900, loop: false, keepCursor: true,
          onComplete:  function () {
            window.heroAnimationComplete = true;
            setTimeout(function () {
              var hint = document.querySelector('.return-hint');
              if (hint && !window.heroFreezeUsed) hint.classList.add('is-visible');
            }, 800);
          }
        }, [
          '<Sou',
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
    var frozen    = false;
    var animating = false;

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (!window.heroAnimationComplete) return;
      if (animating) return;
      animating = true;

      frozen = !frozen;
      window.heroFreezeUsed = true;

      // Hide return hint permanently on first Enter
      var hint = document.querySelector('.return-hint');
      if (hint) hint.classList.remove('is-visible');

      var svgText  = document.querySelector('.hero-svg-text');
      var heroPage = document.querySelector('.hero-page');
      var openEl   = document.querySelector('.svg-open');
      var sourceEl = document.querySelector('.svg-source');
      var bpEl     = document.querySelector('.svg-bibleproject');

      // Immediate: blend mode toggle, blob freeze, kill cursor
      if (svgText) {
        svgText.classList.toggle('is-frozen', frozen);
        svgText.setAttribute('aria-label', frozen ? 'קוד פתוח' : 'Open Source');
      }
      if (heroPage) heroPage.classList.toggle('is-frozen', frozen);
      document.body.classList.toggle('theme-light', frozen);

      // Swap circles overlay image
      var circlesImg = document.getElementById('circles-image');
      if (circlesImg) circlesImg.src = frozen ? '/assets/images/circles-inverse.png' : '/assets/images/circles.png';

      // Swap WebGL canvas colors to match theme
      if (window.heroGradientApp) {
        var app = window.heroGradientApp;
        if (app.scene) {
          app.scene.background = new THREE.Color(frozen ? '#f2ede6' : '#1f192c');
        }
        if (app.gradientBackground && app.gradientBackground.uniforms) {
          var u = app.gradientBackground.uniforms;
          if (frozen) {
            // Light mode — barely-warm blobs on cream background
            var cLight = new THREE.Color('#F7F0E8'); // near-bg warm white
            var cWarm  = new THREE.Color('#EDD8C4'); // very light tan
            u.uColor1.value.set(cLight.r, cLight.g, cLight.b);
            u.uColor2.value.set(cWarm.r,  cWarm.g,  cWarm.b);
            u.uColor3.value.set(cLight.r, cLight.g, cLight.b);
            u.uColor4.value.set(cWarm.r,  cWarm.g,  cWarm.b);
            u.uColor5.value.set(cLight.r, cLight.g, cLight.b);
            u.uColor6.value.set(cWarm.r,  cWarm.g,  cWarm.b);
            var cBase = new THREE.Color('#F2EDE6'); u.uDarkNavy.value.set(cBase.r, cBase.g, cBase.b);
            u.uIntensity.value = 1.8;
          } else {
            // Dark mode — restore originals
            var co = new THREE.Color('#F25922');
            u.uColor1.value.set(co.r, co.g, co.b);
            u.uColor3.value.set(co.r, co.g, co.b);
            u.uColor5.value.set(co.r, co.g, co.b);
            var c2 = new THREE.Color('#0A0E27'); u.uColor2.value.set(c2.r, c2.g, c2.b);
            u.uColor4.value.set(c2.r, c2.g, c2.b);
            u.uColor6.value.set(c2.r, c2.g, c2.b);
            var cd = new THREE.Color('#06054A'); u.uDarkNavy.value.set(cd.r, cd.g, cd.b);
            u.uIntensity.value = 3.0;
          }
        }
      }
      window.heroCursorFrozen = frozen;
      if (window.heroSourceTyper) window.heroSourceTyper.stopCursor();
      if (window.heroOpenTyper)   window.heroOpenTyper.stopCursor();

      // Phase 1 — scramble current text OUT (left side / current position)
      var out = [];
      if (openEl)   out.push(new SVGScramble(openEl).setText(''));
      if (sourceEl) out.push(new SVGScramble(sourceEl).setText(''));
      if (bpEl)     out.push(new SVGScramble(bpEl).setText(''));

      Promise.all(out).then(function () {
        // Slide all elements to their new position (CSS transition handles animation)
        if (openEl)   openEl.classList.toggle('is-frozen', frozen);
        if (sourceEl) sourceEl.classList.toggle('is-frozen', frozen);
        if (bpEl) {
          bpEl.classList.toggle('is-frozen', frozen);
          bpEl.style.fontFamily = frozen ? "'Heebo', sans-serif" : '';
        }

        // Phase 2 — scramble new text IN after position transition completes
        setTimeout(function () {
          var inText = frozen
            ? { open: 'קוד', source: 'פתוח\u00a0\u00a0', bp: 'פרויקט המקרא' }
            : { open: 'Open', source: '\u00a0\u00a0Source', bp: 'BibleProject' };

          var inPromises = [];
          if (openEl)   inPromises.push(new SVGScramble(openEl).setText(inText.open));
          if (sourceEl) inPromises.push(new SVGScramble(sourceEl).setText(inText.source));
          if (bpEl)     inPromises.push(new SVGScramble(bpEl).setText(inText.bp));

          Promise.all(inPromises).then(function () { animating = false; });
        }, 500); // match CSS transition duration
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
