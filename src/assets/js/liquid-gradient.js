/* ==========================================================================
   Liquid Gradient — WebGL background for hero section
   Adapted from Cameron Knight's CodePen (ogxWmBP).
   Stripped to core engine only (no UI controls, no custom cursor).
   ========================================================================== */

class TouchTexture {
  constructor() {
    this.size = 64;
    this.width = this.height = this.size;
    this.maxAge = 64;
    this.radius = 0.25 * this.size;
    this.speed = 1 / this.maxAge;
    this.trail = [];
    this.last = null;
    this.initTexture();
  }

  initTexture() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.texture = new THREE.Texture(this.canvas);
  }

  update() {
    this.clear();
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      let f = point.force * this.speed * (1 - point.age / this.maxAge);
      point.x += point.vx * f;
      point.y += point.vy * f;
      point.age++;
      if (point.age > this.maxAge) {
        this.trail.splice(i, 1);
      } else {
        this.drawPoint(point);
      }
    }
    this.texture.needsUpdate = true;
  }

  clear() {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  addTouch(point) {
    let force = 0, vx = 0, vy = 0;
    const last = this.last;
    if (last) {
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      if (dx === 0 && dy === 0) return;
      // Ignore large jumps (cursor entering from outside)
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
        this.last = { x: point.x, y: point.y };
        return;
      }
      const d = Math.sqrt(dx * dx + dy * dy);
      vx = dx / d;
      vy = dy / d;
      force = Math.min((dx * dx + dy * dy) * 2000, 0.3);
    }
    this.last = { x: point.x, y: point.y };
    this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }

  drawPoint(point) {
    const pos = { x: point.x * this.width, y: (1 - point.y) * this.height };
    let intensity = 1;
    if (point.age < this.maxAge * 0.3) {
      intensity = Math.sin((point.age / (this.maxAge * 0.3)) * (Math.PI / 2));
    } else {
      const t = 1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7);
      intensity = -t * (t - 2);
    }
    intensity *= point.force;
    const radius = this.radius;
    const color = `${((point.vx + 1) / 2) * 255}, ${((point.vy + 1) / 2) * 255}, ${intensity * 255}`;
    const offset = this.size * 5;
    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = radius;
    this.ctx.shadowColor = `rgba(${color},${0.2 * intensity})`;
    this.ctx.beginPath();
    this.ctx.fillStyle = 'rgba(255,0,0,1)';
    this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
}

// Convert a hex color string to a THREE.Vector3 (r/g/b each 0–1)
function hexColor(hex) {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

class GradientBackground {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.mesh = null;
    // -------------------------------------------------------------------------
    // TWEAK ZONE — all the knobs you'll want to adjust
    // -------------------------------------------------------------------------
    this.uniforms = {
      uTime:          { value: 0 },                                              // auto-increments each frame — don't touch
      uResolution:    { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }, // auto — don't touch

      // --- Colors — edit the hex values ----------------------------------------
      uColor1:        { value: hexColor('#F25922') },  // COLOR A — warm orange
      uColor2:        { value: hexColor('#0A0E27') },  // COLOR B — dark navy
      uColor3:        { value: hexColor('#F25922') },  // COLOR C — warm orange  (same as A by default)
      uColor4:        { value: hexColor('#0A0E27') },  // COLOR D — dark navy    (same as B by default)
      uColor5:        { value: hexColor('#F25922') },  // COLOR E — warm orange
      uColor6:        { value: hexColor('#0A0E27') },  // COLOR F — dark navy
      uDarkNavy:      { value: hexColor('#06054A') },  // BASE/SHADOW — fills dark areas between blobs

      // --- Motion ---
      uSpeed:         { value: 0.2 },   // overall animation speed — lower = slower (try 0.05–0.5)

      // --- Appearance ---
      uIntensity:     { value: 3.0 },    // brightness/contrast of the whole gradient (try 0.5–3.0)
      uGradientSize:  { value: 0.3 },   // blob softness/blur — larger = blobs bleed into each other more (try 0.2–0.8)
      uGradientCount: { value: 6.0 },   // how many blobs are active: 6, 10, or 12
      uColor1Weight:  { value: 0.2 },    // brightness multiplier for odd-colored blobs (Color A/C/E)
      uColor2Weight:  { value: 1.2 },    // brightness multiplier for even-colored blobs (Color B/D/F)
      uGrainIntensity:{ value: 0.06 },   // grain strength — how visible the film grain is (try 0–0.2; 0 = off)
      uZoom:          { value: 1.0 },    // not currently wired into shader — reserved

      uTouchTexture:  { value: null },   // internal — touch distortion map, don't touch
    };
  }

  init() {
    const viewSize = this.sceneManager.getViewSize();
    const geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1.);
          vUv = uv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec3 uColor1, uColor2, uColor3, uColor4, uColor5, uColor6;
        uniform float uSpeed, uIntensity;
        uniform sampler2D uTouchTexture;
        uniform float uGrainIntensity;
        uniform float uZoom;
        uniform vec3 uDarkNavy;
        uniform float uGradientSize, uGradientCount;
        uniform float uColor1Weight, uColor2Weight;
        varying vec2 vUv;
        #define PI 3.14159265359

        float grain(vec2 uv, float time) {
          vec2 g = uv * uResolution * 1.9; // grain size — smaller multiplier = bigger/coarser grains (try 0.05–1.0)
          return fract(sin(dot(g + time, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
        }

        vec3 getGradientColor(vec2 uv, float time) {
          float r = uGradientSize; // blob radius — set via uGradientSize above

          // ---- BLOB POSITIONS -----------------------------------------------
          // Format: vec2(X_anchor + sin/cos(speed) * drift,  Y_anchor + sin/cos(speed) * drift)
          //   X anchor : 0.0 = left,   1.0 = right   ← increase to push blobs right
          //   Y anchor : 0.0 = bottom, 1.0 = top     ← increase to push blobs up
          //   drift    : wander radius from anchor    (0.05 = barely moves, 0.4 = wide)
          // -------------------------------------------------------------------

          // Active when uGradientCount >= 6  (always on):
          vec2 c1  = vec2(0.55 + sin(time*uSpeed*0.40 + 0.00)*0.18, 0.85 + cos(time*uSpeed*0.50 + 1.30)*0.12); // COLOR A
          vec2 c2  = vec2(0.45 + cos(time*uSpeed*0.60 + 2.10)*0.18, 0.75 + sin(time*uSpeed*0.45 + 0.80)*0.18); // COLOR B
          vec2 c3  = vec2(0.60 + sin(time*uSpeed*0.35 + 3.50)*0.10, 0.65 + cos(time*uSpeed*0.55 + 1.90)*0.18); // COLOR C
          vec2 c4  = vec2(0.40 + cos(time*uSpeed*0.50 + 0.60)*0.18, 0.90 + sin(time*uSpeed*0.40 + 4.20)*0.10); // COLOR D
          vec2 c5  = vec2(0.58 + sin(time*uSpeed*0.70 + 2.80)*0.14, 0.60 + cos(time*uSpeed*0.60 + 0.40)*0.18); // COLOR E
          vec2 c6  = vec2(0.48 + cos(time*uSpeed*0.45 + 5.10)*0.20, 0.80 + sin(time*uSpeed*0.65 + 1.50)*0.16); // COLOR F
          // Active when uGradientCount > 6  (set to 10 or 12 to enable):
          vec2 c7  = vec2(0.52 + sin(time*uSpeed*0.55 + 3.80)*0.18, 0.70 + cos(time*uSpeed*0.48 + 2.30)*0.20); // COLOR A
          vec2 c8  = vec2(0.42 + cos(time*uSpeed*0.65 + 0.90)*0.16, 0.88 + sin(time*uSpeed*0.52 + 4.70)*0.12); // COLOR B
          vec2 c9  = vec2(0.62 + sin(time*uSpeed*0.42 + 1.70)*0.12, 0.72 + cos(time*uSpeed*0.58 + 3.20)*0.18); // COLOR C
          vec2 c10 = vec2(0.44 + cos(time*uSpeed*0.48 + 5.60)*0.20, 0.82 + sin(time*uSpeed*0.62 + 0.20)*0.14); // COLOR D
          // Active when uGradientCount > 10  (set to 12 to enable):
          vec2 c11 = vec2(0.56 + sin(time*uSpeed*0.68 + 2.50)*0.16, 0.68 + cos(time*uSpeed*0.44 + 4.90)*0.18); // COLOR E
          vec2 c12 = vec2(0.46 + cos(time*uSpeed*0.38 + 1.10)*0.14, 0.78 + sin(time*uSpeed*0.56 + 3.60)*0.18); // COLOR F

          float i1  = 1.0 - smoothstep(0.0, r, length(uv-c1));
          float i2  = 1.0 - smoothstep(0.0, r, length(uv-c2));
          float i3  = 1.0 - smoothstep(0.0, r, length(uv-c3));
          float i4  = 1.0 - smoothstep(0.0, r, length(uv-c4));
          float i5  = 1.0 - smoothstep(0.0, r, length(uv-c5));
          float i6  = 1.0 - smoothstep(0.0, r, length(uv-c6));
          float i7  = 1.0 - smoothstep(0.0, r, length(uv-c7));
          float i8  = 1.0 - smoothstep(0.0, r, length(uv-c8));
          float i9  = 1.0 - smoothstep(0.0, r, length(uv-c9));
          float i10 = 1.0 - smoothstep(0.0, r, length(uv-c10));
          float i11 = 1.0 - smoothstep(0.0, r, length(uv-c11));
          float i12 = 1.0 - smoothstep(0.0, r, length(uv-c12));

          vec2 rv1 = uv - 0.5;
          float a1 = time*uSpeed*0.15;
          rv1 = vec2(rv1.x*cos(a1)-rv1.y*sin(a1), rv1.x*sin(a1)+rv1.y*cos(a1)) + 0.5;
          vec2 rv2 = uv - 0.5;
          float a2 = -time*uSpeed*0.12;
          rv2 = vec2(rv2.x*cos(a2)-rv2.y*sin(a2), rv2.x*sin(a2)+rv2.y*cos(a2)) + 0.5;
          float ri1 = 1.0 - smoothstep(0.0, 0.8, length(rv1-0.5));
          float ri2 = 1.0 - smoothstep(0.0, 0.8, length(rv2-0.5));

          vec3 color = vec3(0.0);
          color += uColor1*(i1*(0.55+0.45*sin(time*uSpeed)))*uColor1Weight;
          color += uColor2*(i2*(0.55+0.45*cos(time*uSpeed*1.2)))*uColor2Weight;
          color += uColor3*(i3*(0.55+0.45*sin(time*uSpeed*0.8)))*uColor1Weight;
          color += uColor4*(i4*(0.55+0.45*cos(time*uSpeed*1.3)))*uColor2Weight;
          color += uColor5*(i5*(0.55+0.45*sin(time*uSpeed*1.1)))*uColor1Weight;
          color += uColor6*(i6*(0.55+0.45*cos(time*uSpeed*0.9)))*uColor2Weight;
          if (uGradientCount > 6.0) {
            color += uColor1*(i7*(0.55+0.45*sin(time*uSpeed*1.4)))*uColor1Weight;
            color += uColor2*(i8*(0.55+0.45*cos(time*uSpeed*1.5)))*uColor2Weight;
            color += uColor3*(i9*(0.55+0.45*sin(time*uSpeed*1.6)))*uColor1Weight;
            color += uColor4*(i10*(0.55+0.45*cos(time*uSpeed*1.7)))*uColor2Weight;
          }
          if (uGradientCount > 10.0) {
            color += uColor5*(i11*(0.55+0.45*sin(time*uSpeed*1.8)))*uColor1Weight;
            color += uColor6*(i12*(0.55+0.45*cos(time*uSpeed*1.9)))*uColor2Weight;
          }
          color += mix(uColor1,uColor3,ri1)*0.45*uColor1Weight;
          color += mix(uColor2,uColor4,ri2)*0.40*uColor2Weight;

          color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;
          float lum = dot(color, vec3(0.299,0.587,0.114));
          color = mix(vec3(lum), color, 1.35);
          color = pow(color, vec3(0.92));
          float b1 = length(color);
          color = mix(uDarkNavy, color, max(b1*1.2, 0.15));
          float mb = length(color);
          if (mb > 1.0) color *= 1.0/mb;
          return color;
        }

        void main() {
          vec2 uv = vUv;
          vec4 touch = texture2D(uTouchTexture, uv);
          float vx = -(touch.r*2.0-1.0);
          float vy = -(touch.g*2.0-1.0);
          float strength = touch.b;
          uv.x += vx*0.12*strength;
          uv.y += vy*0.12*strength;
          float dist = length(uv - 0.5);
          float ripple = sin(dist*20.0 - uTime*3.0)*0.006*strength;
          float wave   = sin(dist*15.0 - uTime*2.0)*0.005*strength;
          uv += vec2(ripple + wave);

          vec3 color = getGradientColor(uv, uTime);
          color += grain(uv, uTime) * uGrainIntensity;
          float ts = uTime * 0.5;
          color.r += sin(ts)*0.02;
          color.g += cos(ts*1.4)*0.02;
          color.b += sin(ts*1.2)*0.02;
          float b2 = length(color);
          color = mix(uDarkNavy, color, max(b2*1.2, 0.15));
          color = clamp(color, vec3(0.0), vec3(1.0));
          float mb2 = length(color);
          if (mb2 > 1.0) color *= 1.0/mb2;
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.sceneManager.scene.add(this.mesh);
  }

  update(delta) {
    if (!window.heroPaused) this.uniforms.uTime.value += delta;
  }

  onResize(width, height) {
    const viewSize = this.sceneManager.getViewSize();
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);
    }
    this.uniforms.uResolution.value.set(width, height);
  }
}

class LiquidGradientApp {
  constructor(container) {
    this.container = container;

    const w = container.clientWidth  || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: false,
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
    this.camera.position.z = 50;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1f192c'); // Match --hero-bg
    this.clock = new THREE.Clock();

    this.touchTexture = new TouchTexture();
    this.gradientBackground = new GradientBackground(this);
    this.gradientBackground.uniforms.uTouchTexture.value = this.touchTexture.texture;

    this.init();
  }

  init() {
    this.gradientBackground.init();
    this.tick();
    window.addEventListener('resize', () => this.onResize());
  }

  getViewSize() {
    const fov = (this.camera.fov * Math.PI) / 180;
    const h = Math.abs(this.camera.position.z * Math.tan(fov / 2) * 2);
    return { width: h * this.camera.aspect, height: h };
  }

  tick() {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.touchTexture.update();
    this.gradientBackground.update(delta);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.tick());
  }

  onResize() {
    const w = this.container.clientWidth  || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.gradientBackground.onResize(w, h);
  }
}

function boot() {
  const container = document.getElementById('hero-bg');
  if (!container) return;
  // rAF ensures layout is calculated so the container has real dimensions
  requestAnimationFrame(() => { window.heroGradientApp = new LiquidGradientApp(container); });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
