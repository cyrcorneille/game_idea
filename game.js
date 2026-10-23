/* ============================================================================
   EMBERLINE
   A one-button momentum game. Hold to tether, release to fly.
   Vanilla JS + Canvas 2D, no dependencies, no assets.
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------- utilities */

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (min, max) => min + Math.random() * (max - min);
  const hash = (n) => {
    const x = Math.sin(n * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };

  /* ------------------------------------------------------------ constants */

  const FRAME_H = 620;       // world height the camera tries to frame
  const MIN_VW = 820;        // minimum visible world width
  const CORRIDOR_MID = 392;  // vertical centre of the cave corridor
  const SEG = 40;            // terrain sample spacing
  const GRAVITY = 1500;
  const MAX_SPEED = 1250;
  const PLAYER_R = 10;
  const TETHER_RANGE = 355;
  const MIN_ROPE = 120;
  const REEL = 74;
  const START_X = 330;

  const BEST_KEY = 'emberline.best.v1';
  const MUTE_KEY = 'emberline.muted.v1';

  const GLOW = {
    amber: '255,180,90',
    hot: '255,224,170',
    white: '255,246,232',
    teal: '94,234,212',
    violet: '167,139,250',
    pink: '255,120,180',
    red: '255,107,107',
  };

  /* ------------------------------------------------------------------ dom */

  const $ = (id) => document.getElementById(id);
  const canvas = $('stage');
  const ctx = canvas.getContext('2d', { alpha: false });
  const app = $('app');

  const dom = {
    hud: $('hud'),
    distance: $('distance'),
    best: $('best'),
    motes: $('motes'),
    ember: $('ember'),
    emberFill: $('ember-fill'),
    emberPct: $('ember-pct'),
    hint: $('hint'),
    title: $('screen-title'),
    dead: $('screen-dead'),
    pause: $('screen-pause'),
    deathReason: $('death-reason'),
    deathDistance: $('death-distance'),
    deathMotes: $('death-motes'),
    deathBest: $('death-best'),
    deathRank: $('death-rank'),
    mute: $('btn-mute'),
    pauseBtn: $('btn-pause'),
    start: $('btn-start'),
    retry: $('btn-retry'),
    resume: $('btn-resume'),
    rotator: $('screen-rotate'),
    rotatorDismiss: $('btn-rotate-dismiss'),
  };

  /* ----------------------------------------------------------------- view */

  const view = { w: 0, h: 0, dpr: 1, scale: 1, worldW: 1152, worldH: 720 };

  function resize() {
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const w = Math.max(1, app.clientWidth);
    const h = Math.max(1, app.clientHeight);
    view.w = w;
    view.h = h;
    view.dpr = dpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    view.scale = Math.min(h / FRAME_H, w / MIN_VW);
    view.worldW = w / view.scale;
    view.worldH = h / view.scale;
    G.cam.y = CORRIDOR_MID - view.worldH / 2;
    G.cam.x = Math.max(G.cam.x, G.player.x - view.worldW * 0.34 - 1);
    updateOrientation();
  }

  /* ----------------------------------------------------------------- glow */

  const glowSprites = new Map();

  function glowSprite(rgb) {
    let c = glowSprites.get(rgb);
    if (c) return c;
    const size = 128;
    c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = size / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(0.16, `rgba(${rgb},0.6)`);
    grad.addColorStop(0.42, `rgba(${rgb},0.2)`);
    grad.addColorStop(0.72, `rgba(${rgb},0.05)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    glowSprites.set(rgb, c);
    return c;
  }

  let grainPattern = null;

  function buildGrain() {
    const size = 160;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const a = Math.random();
      const r = Math.random() * 1.7 + 0.3;
      g.fillStyle = a > 0.72
        ? `rgba(150,180,230,${0.05 + Math.random() * 0.16})`
        : `rgba(4,7,14,${0.12 + Math.random() * 0.4})`;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }
    // faint fissures
    g.strokeStyle = 'rgba(2,4,10,0.5)';
    for (let i = 0; i < 9; i++) {
      g.lineWidth = 0.6 + Math.random();
      g.beginPath();
      let x = Math.random() * size;
      let y = Math.random() * size;
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (Math.random() - 0.5) * 46;
        y += (Math.random() - 0.5) * 46;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    grainPattern = ctx.createPattern(c, 'repeat');
  }

  function drawGlow(rgb, x, y, radius, alpha) {
    if (alpha <= 0.001 || radius <= 0.5) return;
    const img = glowSprite(rgb);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
  }

  function updateOrientation() {
    const portrait = view.h > view.w * 1.18;
    app.classList.toggle('portrait', portrait);
    const show = portrait && !G.portraitDismissed;
    dom.rotator.classList.toggle('hidden', !show);
    if (show) G.state === 'playing' && setPaused(true);
  }

  function dismissRotator() {
    G.portraitDismissed = true;
    dom.rotator.classList.add('hidden');
  }

  /* ---------------------------------------------------------------- sound */

  const Sound = {
    ctx: null,
    master: null,
    noiseBuf: null,
    padGain: null,
    muted: false,

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        const c = new AC();
        this.ctx = c;
        this.master = c.createGain();
        this.master.gain.value = this.muted ? 0 : 0.42;
        this.master.connect(c.destination);

        const len = Math.floor(c.sampleRate * 1.2);
        const buf = c.createBuffer(1, len, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuf = buf;

        this.startPad();
      } catch (err) {
        this.ctx = null;
      }
    },

    startPad() {
      const c = this.ctx;
      if (!c) return;
      const filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 480;
      filt.Q.value = 1.5;

      const g = c.createGain();
      g.gain.value = 0;
      filt.connect(g);
      g.connect(this.master);
      this.padGain = g;

      const freqs = [55, 82.5, 110, 164.81];
      freqs.forEach((f, i) => {
        const o = c.createOscillator();
        o.type = i % 2 ? 'sine' : 'triangle';
        o.frequency.value = f;
        o.detune.value = (i - 1.5) * 7;
        o.connect(filt);
        o.start();
      });

      const lfo = c.createOscillator();
      lfo.frequency.value = 0.06;
      const lfoGain = c.createGain();
      lfoGain.gain.value = 170;
      lfo.connect(lfoGain);
      lfoGain.connect(filt.frequency);
      lfo.start();
    },

    sync(state) {
      if (!this.padGain || !this.ctx) return;
      if (this._state === state) return;
      this._state = state;
      const target = this.muted ? 0 : state === 'playing' ? 0.05 : state === 'title' ? 0.022 : 0.012;
      this.padGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.5);
    },

    tone(freq, dur, opts = {}) {
      const c = this.ctx;
      if (!c) return;
      const { type = 'sine', gain = 0.15, to = null, delay = 0 } = opts;
      const t0 = c.currentTime + delay;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t0);
      o.stop(t0 + dur + 0.06);
    },

    noise(dur, gain, freq, delay = 0) {
      const c = this.ctx;
      if (!c || !this.noiseBuf) return;
      const t0 = c.currentTime + delay;
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = 1.1;
      const g = c.createGain();
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(t0);
      src.stop(t0 + dur + 0.05);
    },

    attach() {
      this.tone(300, 0.1, { type: 'triangle', gain: 0.16, to: 500 });
      this.noise(0.09, 0.05, 2200);
    },

    scrape() {
      this.noise(0.16, 0.09, 1300);
      this.tone(190, 0.1, { type: 'sawtooth', gain: 0.03, to: 120 });
    },

    release() {
      this.tone(540, 0.16, { type: 'sine', gain: 0.055, to: 250 });
      this.noise(0.2, 0.075, 950);
    },

    pickup(n) {
      const scale = [0, 2, 4, 7, 9, 12, 14, 16];
      const step = scale[n % scale.length];
      const f = 523.25 * Math.pow(2, step / 12);
      this.tone(f, 0.34, { type: 'sine', gain: 0.09 });
      this.tone(f * 2, 0.2, { type: 'sine', gain: 0.028 });
    },

    death() {
      this.tone(130, 1.1, { type: 'sine', gain: 0.26, to: 36 });
      this.tone(70, 0.9, { type: 'triangle', gain: 0.14, to: 30 });
      this.noise(0.7, 0.2, 340);
    },

    start() {
      [392, 523.25, 659.25].forEach((f, i) => {
        this.tone(f, 0.5, { type: 'sine', gain: 0.08, delay: i * 0.075 });
      });
    },

    setMuted(m) {
      this.muted = m;
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(m ? 0 : 0.42, this.ctx.currentTime, 0.05);
      }
    },
  };

  /* ----------------------------------------------------------------- state */

  const G = {
    state: 'title',
    time: 0,
    runTime: 0,
    best: 0,
    player: { x: START_X, y: 470, vx: 300, vy: -380, r: PLAYER_R, angle: 0 },
    cam: { x: 0, y: 0 },
    anchors: [],
    motes: [],
    particles: [],
    rings: [],
    floaters: [],
    dust: [],
    tether: null,
    ropeLen: 0,
    gloom: { x: -900 },
    distance: 0,
    motesCollected: 0,
    ember: 100,
    holding: false,
    shake: 0,
    deathReason: '',
    restartAt: 0,
    hintStage: 0,
    hintUntil: 0,
    trailAcc: 0,
    lastScrape: 0,
    rollSpeed: 300,
    engaged: false,
    portraitDismissed: false,
    lastHud: { dist: -1, best: -1, motes: -1, pct: -1, low: null, critical: null },
  };

  /* --------------------------------------------------------------- terrain */

  const terrain = [];
  const genState = { floor: 660, ceil: 130, nextAnchor: 0 };

  function difficulty(x) {
    return clamp((x - 1500) / 52000, 0, 1);
  }

  function pushTerrain(floor, ceil) {
    terrain.push({
      x: terrain.length * SEG,
      floor,
      ceil,
      moss: Math.random() < 0.3 ? (Math.random() < 0.55 ? 1 : -1) : 0,
    });
  }

  function resetTerrain() {
    terrain.length = 0;
    genState.floor = 660;
    genState.ceil = 130;
    genState.nextAnchor = START_X + 110;
    for (let i = 0; i < 22; i++) pushTerrain(660, 130);
  }

  function ensureTerrainTo(xMax) {
    const limit = Math.min(xMax, 900000);
    while (terrain.length * SEG < limit && terrain.length < 22000) {
      const x = terrain.length * SEG;
      const t = difficulty(x);
      const gap =
        lerp(505, 335, t) + Math.sin(x * 0.0034 + 1.2) * 32 + Math.sin(x * 0.0011) * 20;
      const center = 392 + Math.sin(x * 0.0016) * 30 + Math.sin(x * 0.0007 + 2.1) * 20;

      let floor = center + gap / 2 + rnd(-5, 5);
      let ceil = floor - gap;

      floor = clamp(floor, 505, 688);
      ceil = clamp(ceil, 44, floor - 268);

      const prev = terrain[terrain.length - 1] || { floor: 660, ceil: 130 };
      floor = lerp(prev.floor, floor, 0.32);
      ceil = lerp(prev.ceil, ceil, 0.32);
      if (floor - ceil < 268) ceil = floor - 268;
      if (ceil < 34) {
        ceil = 34;
        floor = Math.max(floor, ceil + 300);
      }

      pushTerrain(floor, ceil);
    }
  }

  function sampleTerrain(x) {
    const n = terrain.length;
    if (n < 2) return { floor: 660, ceil: 130 };
    const f = clamp(x / SEG, 0, n - 1.001);
    const i = Math.floor(f);
    const k = f - i;
    const a = terrain[i];
    const b = terrain[Math.min(i + 1, n - 1)];
    return {
      floor: lerp(a.floor, b.floor, k),
      ceil: lerp(a.ceil, b.ceil, k),
    };
  }

  /* --------------------------------------------------------------- anchors */

  function anchorY(a) {
    return a.amp ? a.y + Math.sin(G.time * a.sp + a.ph) * a.amp : a.y;
  }

  function spawnMote(x, y) {
    G.motes.push({
      x,
      y,
      x0: x,
      y0: y,
      ph: Math.random() * TAU,
      r: 4.6,
    });
  }

  function spawnAnchor(x) {
    const tr = sampleTerrain(x);
    const gap = tr.floor - tr.ceil;
    const t = difficulty(x);
    const y = tr.ceil + gap * rnd(0.14, 0.4);
    const moving = t > 0.18 && Math.random() < 0.3;
    const a = {
      x,
      y,
      amp: moving ? Math.min(78, gap * 0.17) : 0,
      sp: rnd(0.55, 1.35),
      ph: Math.random() * TAU,
      pulse: Math.random() * TAU,
    };
    G.anchors.push(a);

    // motes trailing the pyre — placed high, mid or low so gathering costs a risk
    const n = 1 + (Math.random() < 0.55 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const mx = x + rnd(-20, 170);
      const mtr = sampleTerrain(mx);
      const band = Math.random();
      const bandY =
        band < 0.24
          ? rnd(0.74, 0.9)     // skimming the floor
          : band < 0.44
            ? rnd(0.1, 0.24)   // hugging the roof
            : rnd(0.36, 0.7);  // the safe middle
      spawnMote(mx, mtr.ceil + (mtr.floor - mtr.ceil) * bandY);
    }

    // occasional ribbon of motes
    if (Math.random() < 0.16) {
      const rx = x + rnd(40, 130);
      const ry = tr.ceil + gap * rnd(0.42, 0.66);
      for (let i = 0; i < 3; i++) spawnMote(rx + i * 36, ry + Math.sin(i * 0.9) * 24);
    }
  }

  function ensureAnchorsTo(xMax) {
    let guard = 0;
    while (genState.nextAnchor < xMax && guard++ < 200) {
      spawnAnchor(genState.nextAnchor);
      const t = difficulty(genState.nextAnchor);
      genState.nextAnchor += lerp(282, 335, t) * rnd(0.86, 1.16);
    }
  }

  function ensureWorld(xMax) {
    ensureTerrainTo(xMax + 500);
    ensureAnchorsTo(xMax);
  }

  function cullWorld() {
    const left = G.cam.x - 700;
    for (let i = G.anchors.length - 1; i >= 0; i--) {
      if (G.anchors[i].x < left) {
        if (G.tether === G.anchors[i]) detach(false);
        G.anchors.splice(i, 1);
      }
    }
    for (let i = G.motes.length - 1; i >= 0; i--) {
      if (G.motes[i].x < left) G.motes.splice(i, 1);
    }
    for (let i = G.floaters.length - 1; i >= 0; i--) {
      if (G.floaters[i].x < left) G.floaters.splice(i, 1);
    }
  }

  /* --------------------------------------------------------------- effects */

  function burst(x, y, rgb, speed, life, size, count = 12) {
    for (let i = 0; i < count; i++) {
      if (G.particles.length > 460) G.particles.shift();
      const ang = Math.random() * TAU;
      const sp = rnd(speed * 0.2, speed);
      const lf = rnd(life * 0.5, life);
      G.particles.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: lf,
        max: lf,
        size: rnd(size * 0.5, size),
        rgb,
        drag: rnd(0.8, 2.2),
        grav: rnd(0.05, 0.35),
      });
    }
  }

  function ripple(x, y, rgb, max = 70, life = 0.5) {
    G.rings.push({ x, y, r: 4, max, life, maxLife: life, rgb });
  }

  function floater(text, x, y, rgb) {
    G.floaters.push({ text, x, y, vy: -34, life: 1.1, max: 1.1, rgb });
  }

  function updateParticles(dt) {
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const p = G.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        G.particles.splice(i, 1);
        continue;
      }
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy = p.vy * d + 240 * p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function updateFx(dt) {
    for (let i = G.rings.length - 1; i >= 0; i--) {
      const r = G.rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        G.rings.splice(i, 1);
        continue;
      }
      const k = 1 - r.life / r.maxLife;
      r.r = 4 + (r.max - 4) * (1 - (1 - k) * (1 - k));
    }
    for (let i = G.floaters.length - 1; i >= 0; i--) {
      const f = G.floaters[i];
      f.life -= dt;
      if (f.life <= 0) {
        G.floaters.splice(i, 1);
        continue;
      }
      f.y += f.vy * dt;
      f.vy *= Math.exp(-1.6 * dt);
    }
  }

  function initDust() {
    G.dust.length = 0;
    for (let i = 0; i < 80; i++) {
      G.dust.push({
        x: Math.random() * (view.w || 1200),
        y: Math.random() * (view.h || 800),
        layer: rnd(0.25, 1),
        r: rnd(0.7, 2.4),
        a: rnd(0.25, 1),
        ph: Math.random() * TAU,
      });
    }
  }

  function updateDust(dt) {
    const w = view.w || 1200;
    const h = view.h || 800;
    for (const d of G.dust) {
      d.x -= (10 + 26 * d.layer) * dt;
      d.y += Math.sin(G.time * 0.5 + d.ph) * 4 * dt;
      if (d.x < -30) {
        d.x = w + rnd(0, 40);
        d.y = rnd(0, h);
      }
      if (d.y < -30) d.y = h + 20;
      if (d.y > h + 30) d.y = -20;
    }
  }

  /* ------------------------------------------------------------- gameplay */

  function resetGame() {
    resetTerrain();
    G.anchors.length = 0;
    G.motes.length = 0;
    G.particles.length = 0;
    G.rings.length = 0;
    G.floaters.length = 0;
    G.tether = null;
    G.ropeLen = 0;
    G.player = { x: START_X, y: 474, vx: 0, vy: 0, r: PLAYER_R, angle: 0 };
    G.engaged = false;
    G.gloom.x = START_X - 1020;
    G.distance = 0;
    G.motesCollected = 0;
    G.ember = 100;
    G.holding = false;
    G.shake = 0;
    G.runTime = 0;
    G.deathReason = '';
    G.cam.x = START_X - view.worldW * 0.34;
    G.cam.y = CORRIDOR_MID - view.worldH / 2;
    G.hintStage = 1;
    G.hintUntil = G.time + 5;
    G.trailAcc = 0;
    G.lastScrape = 0;
    G.rollSpeed = 300;
    ensureWorld(G.cam.x + view.worldW + 1400);
    updateHud(true);
  }

  function startGame(pressStartsHold) {
    Sound.init();
    blurActive();
    resetGame();
    G.state = 'playing';
    G.holding = !!pressStartsHold;
    setScreens(null);
    dom.hud.classList.add('on');
    Sound.start();
    setHint('HOLD to tether');
  }

  function die(reason) {
    if (G.state !== 'playing') return;
    const p = G.player;
    G.state = 'dead';
    G.holding = false;
    G.tether = null;
    G.deathReason = reason;
    G.restartAt = G.time + 0.8;
    G.shake = 26;
    burst(p.x, p.y, GLOW.amber, 340, 1.5, 3.4, 26);
    burst(p.x, p.y, GLOW.hot, 190, 1, 2.2, 14);
    ripple(p.x, p.y, GLOW.amber, 180, 0.8);
    Sound.death();

    const meters = G.distance;
    const isBest = meters > G.best;
    if (isBest) {
      G.best = meters;
      saveBest();
    }
    showDeath(meters, isBest);
    updateHud(true);
  }

  function tryAttach() {
    const p = G.player;
    let best = null;
    let bestScore = Infinity;

    for (const a of G.anchors) {
      const dx = a.x - p.x;
      const dy = anchorY(a) - p.y;
      const d = Math.hypot(dx, dy);
      if (d > TETHER_RANGE || d < 30) continue;
      let score = d;
      if (dy > 30) score += 260;   // swinging from below is awkward
      if (dx < -40) score += 320;  // backwards is awkward
      if (score < bestScore) {
        bestScore = score;
        best = a;
      }
    }
    if (!best) return;

    G.tether = best;
    const d = Math.hypot(best.x - p.x, anchorY(best) - p.y);
    G.ropeLen = clamp(d, MIN_ROPE, 320);
    const ay = anchorY(best);
    burst(best.x, ay, GLOW.amber, 130, 0.6, 1.8, 8);
    ripple(best.x, ay, GLOW.amber, 52, 0.4);
    Sound.attach();
    if (!G.hintStage || G.hintStage === 1) {
      G.hintStage = 2;
      G.hintUntil = G.time + 3;
      setHint('release to fly');
    }
  }

  function detach(boost) {
    if (!G.tether) return;
    const p = G.player;
    const a = G.tether;
    if (boost) {
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 40) {
        p.vx *= 1.055;
        p.vy *= 1.055;
      }
      p.vy -= 26;
      const ay = anchorY(a);
      ripple(a.x, ay, GLOW.amber, 44, 0.35);
      burst(p.x, p.y, GLOW.hot, 90, 0.4, 1.4, 5);
      Sound.release();
    }
    G.tether = null;
  }

  function solveRope(dt) {
    const p = G.player;
    const a = G.tether;
    const ay = anchorY(a);
    const prev = G.ropeLen;
    G.ropeLen = Math.max(MIN_ROPE, prev - REEL * dt);

    const dx = p.x - a.x;
    const dy = p.y - ay;
    const d = Math.hypot(dx, dy) || 0.0001;

    if (d > G.ropeLen) {
      const nx = dx / d;
      const ny = dy / d;

      // swing assist: nudge any slow hang into a forward arc
      let tx = -ny;
      let ty = nx;
      if (tx < 0) {
        tx = -tx;
        ty = -ty;
      }
      const tang = p.vx * tx + p.vy * ty;
      if (tang < 240) {
        const add = Math.min(240 - tang, 520 * dt);
        p.vx += tx * add;
        p.vy += ty * add;
      }

      const vr = p.vx * nx + p.vy * ny;
      const k = clamp(prev / G.ropeLen, 1, 1.12);
      p.vx = (p.vx - vr * nx) * k;
      p.vy = (p.vy - vr * ny) * k;
      p.x = a.x + nx * G.ropeLen;
      p.y = ay + ny * G.ropeLen;
    }
  }

  function collectMote(i) {
    const m = G.motes[i];
    G.motes.splice(i, 1);
    G.motesCollected++;
    G.ember = Math.min(100, G.ember + 15);
    burst(m.x, m.y, GLOW.teal, 150, 0.55, 1.8, 8);
    ripple(m.x, m.y, GLOW.teal, 40, 0.4);
    floater('+15', m.x, m.y - 5, GLOW.teal);
    Sound.pickup(G.motesCollected);
    G.shake = Math.max(G.shake, 3);
  }

  function updatePlay(dt) {
    const p = G.player;

    // ready state: the ember hovers until the first hold
    if (!G.engaged) {
      if (!G.holding) {
        p.x = START_X;
        p.y = 474 + Math.sin(G.time * 2.1) * 6;
        p.vx = 0;
        p.vy = 0;
        p.angle = -0.35;
        G.cam.x += (START_X - view.worldW * 0.34 - G.cam.x) * clamp(dt * 4, 0, 1);
        ensureWorld(G.cam.x + view.worldW + 900);
        cullWorld();
        return;
      }
      G.engaged = true;
      p.vx = 320;
      p.vy = -520;
      ripple(p.x, p.y, GLOW.amber, 64, 0.5);
      burst(p.x, p.y, GLOW.hot, 160, 0.6, 2, 10);
    }

    G.runTime += dt;

    if (G.holding) {
      if (!G.tether) tryAttach();
    } else if (G.tether) {
      detach(true);
    }

    // integrate
    p.vy += GRAVITY * dt;
    const drag = Math.exp(-0.16 * dt);
    p.vx *= drag;
    p.vy *= drag;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (G.tether) solveRope(dt);

    const sp = Math.hypot(p.vx, p.vy);
    if (sp > MAX_SPEED) {
      p.vx = (p.vx / sp) * MAX_SPEED;
      p.vy = (p.vy / sp) * MAX_SPEED;
    }
    if (sp > 80) p.angle = Math.atan2(p.vy, p.vx);

    // trail
    G.trailAcc += dt;
    while (G.trailAcc > 0.02) {
      G.trailAcc -= 0.02;
      if (G.particles.length < 460) {
        const lf = rnd(0.25, 0.55);
        G.particles.push({
          x: p.x + rnd(-3, 3),
          y: p.y + rnd(-3, 3),
          vx: -p.vx * 0.06 + rnd(-16, 16),
          vy: -p.vy * 0.06 + rnd(-20, 6),
          life: lf,
          max: lf,
          size: rnd(1.4, 3.2),
          rgb: Math.random() < 0.35 ? GLOW.hot : GLOW.amber,
          drag: 1.4,
          grav: -0.05,
        });
      }
    }

    // distance + fuel
    G.distance = Math.max(0, Math.floor((p.x - START_X) / 30));
    G.ember -= (5.0 + G.distance * 0.0022) * dt;
    if (G.ember <= 0) {
      G.ember = 0;
      die('your light went out');
      return;
    }

    // motes
    for (let i = G.motes.length - 1; i >= 0; i--) {
      const m = G.motes[i];
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 96) {
        const pull = (1 - d / 96) * 300 * dt;
        m.x += (dx / d) * pull;
        m.y += (dy / d) * pull;
      }
      if (d < p.r + 13) collectMote(i);
    }

    // gloom
    const t = difficulty(p.x);
    G.rollSpeed = lerp(G.rollSpeed, Math.max(0, p.vx), clamp(dt * 0.9, 0, 1));
    const behind = p.x - G.gloom.x;
    let gSpeed = clamp(G.rollSpeed * 0.52, 150, 430) + 70 * t;
    if (behind > 1250) gSpeed += (behind - 1250) * 0.55;
    gSpeed *= clamp((G.runTime - 2) / 4, 0, 1); // brief grace so a first run can breathe
    G.gloom.x += gSpeed * dt;

    // camera
    const lookahead = clamp(Math.abs(p.vx) / 2600, 0, 0.14);
    const targetX = p.x - view.worldW * (0.34 - lookahead);
    G.cam.x += (targetX - G.cam.x) * clamp(dt * 7, 0, 1);
    G.cam.y = CORRIDOR_MID - view.worldH / 2;

    ensureWorld(G.cam.x + view.worldW + 900);
    cullWorld();

    // hazards
    if (p.y < -400) return die('you fell out of the world');
    const tr = sampleTerrain(p.x);
    if (p.y - p.r * 0.5 < tr.ceil) scrapeCeiling(tr.ceil);
    if (p.y + p.r * 0.5 > tr.floor) return die('the rock closed in');
    if (p.x < G.gloom.x + p.r * 0.7) return die('the gloom took you');

    updateHint();
  }

  function scrapeCeiling(ceil) {
    const p = G.player;
    p.y = ceil + p.r * 0.5 + 0.6;
    if (p.vy < 0) p.vy = Math.max(-p.vy * 0.4, 40);
    else p.vy = Math.max(p.vy, 40);
    p.vx *= 0.965;

    if (G.time - G.lastScrape < 0.45) return;
    G.lastScrape = G.time;
    G.ember -= 2;
    G.shake = Math.max(G.shake, 5);
    burst(p.x, ceil + 6, GLOW.teal, 120, 0.5, 1.6, 7);
    burst(p.x, ceil + 6, GLOW.hot, 90, 0.35, 1.2, 4);
    ripple(p.x, ceil + 4, GLOW.teal, 34, 0.35);
    Sound.scrape();
    if (G.ember <= 0) {
      G.ember = 0;
      die('your light went out');
    }
  }

  function updateTitle(dt) {
    if (G.cam.x > 15000) {
      G.cam.x = 0;
      resetTerrain();
      G.anchors.length = 0;
      G.motes.length = 0;
    }
    G.cam.x += 24 * dt;
    ensureWorld(G.cam.x + view.worldW + 900);
    cullWorld();
  }

  /* ------------------------------------------------------------------- hud */

  function setHint(text) {
    if (!text) {
      dom.hint.classList.remove('on');
      return;
    }
    dom.hint.textContent = text;
    dom.hint.classList.add('on');
  }

  function updateHint() {
    if (G.hintStage && G.time > G.hintUntil) {
      G.hintStage = 0;
      setHint(null);
    }
  }

  function updateHud(force) {
    const meters = G.distance;
    const pct = Math.round(G.ember);
    const L = G.lastHud;

    if (force || meters !== L.dist) {
      dom.distance.textContent = meters;
      L.dist = meters;
    }
    if (force || G.best !== L.best) {
      dom.best.textContent = G.best;
      dom.deathBest.textContent = G.best;
      L.best = G.best;
    }
    if (force || G.motesCollected !== L.motes) {
      dom.motes.textContent = G.motesCollected;
      L.motes = G.motesCollected;
    }
    if (force || pct !== L.pct) {
      dom.emberPct.textContent = pct + '%';
      L.pct = pct;
    }
    dom.emberFill.style.transform = `scaleX(${clamp(G.ember / 100, 0, 1)})`;

    const critical = G.ember < 28;
    if (force || critical !== L.critical) {
      dom.ember.classList.toggle('critical', critical);
      L.critical = critical;
    }
    const gloomClose = G.state === 'playing' && G.player.x - G.gloom.x < 400;
    const low = G.state === 'playing' && (G.ember < 22 || gloomClose);
    if (force || low !== L.low) {
      app.classList.toggle('low', low);
      L.low = low;
    }
  }

  function rankFor(m) {
    if (m < 60) return 'a brief flicker';
    if (m < 180) return 'a stubborn spark';
    if (m < 420) return 'a steady flame';
    if (m < 900) return 'a roaming ember';
    if (m < 1600) return 'a beacon in the deep';
    if (m < 2600) return 'a wildfire on a wire';
    return 'the cavern remembers you';
  }

  function showDeath(meters, isBest) {
    dom.deathReason.textContent = G.deathReason;
    dom.deathDistance.textContent = meters;
    dom.deathMotes.textContent = G.motesCollected;
    dom.deathBest.textContent = G.best;
    dom.deathRank.textContent = isBest ? 'a new best — ' + rankFor(meters) : rankFor(meters);
    dom.deathRank.classList.toggle('is-best', !!isBest);
    setScreens('dead');
    dom.hud.classList.remove('on');
    app.classList.remove('low');
  }

  function setScreens(which) {
    dom.title.classList.toggle('hidden', which !== 'title');
    dom.dead.classList.toggle('hidden', which !== 'dead');
    dom.pause.classList.toggle('hidden', which !== 'pause');
  }

  function setPaused(on) {
    if (on && G.state === 'playing') {
      G.state = 'paused';
      G.holding = false;
      setScreens('pause');
      dom.hud.classList.remove('on');
    } else if (!on && G.state === 'paused') {
      G.state = 'playing';
      setScreens(null);
      dom.hud.classList.add('on');
      updateHud(true);
    }
  }

  /* --------------------------------------------------------------- storage */

  function loadPrefs() {
    try {
      const b = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
      if (Number.isFinite(b) && b > 0) G.best = b;
      Sound.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch (err) {
      /* storage unavailable */
    }
    dom.mute.classList.toggle('muted', Sound.muted);
    dom.best.textContent = G.best;
  }

  function saveBest() {
    try {
      localStorage.setItem(BEST_KEY, String(G.best));
    } catch (err) {
      /* ignore */
    }
  }

  function saveMute() {
    try {
      localStorage.setItem(MUTE_KEY, Sound.muted ? '1' : '0');
    } catch (err) {
      /* ignore */
    }
  }

  function toggleMute() {
    Sound.init();
    Sound.setMuted(!Sound.muted);
    dom.mute.classList.toggle('muted', Sound.muted);
    saveMute();
  }

  /* ---------------------------------------------------------------- render */

  function render() {
    const { w, h, dpr, scale } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    drawBackground(w, h);

    const shake = G.shake;
    const sx = shake > 0.2 ? rnd(-shake, shake) : 0;
    const sy = shake > 0.2 ? rnd(-shake, shake) : 0;

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-G.cam.x + sx, -G.cam.y + sy);

    drawCave();
    drawMotes();
    drawAnchors();
    drawReachHint();
    drawTether();
    drawParticles();
    if (G.state !== 'dead') drawPlayer();
    drawRings();
    drawFloaters();
    drawGloom();

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    drawVignette(w, h);
  }

  function drawBackground(w, h) {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#070c17');
    bg.addColorStop(0.5, '#050810');
    bg.addColorStop(1, '#020307');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    const drift = -G.cam.x * 0.05;
    const big = Math.max(w, h);
    drawGlow(GLOW.teal, w * 0.2 + ((drift * 0.4) % 1500), h * 0.14, big * 0.55, 0.05);
    drawGlow(GLOW.violet, w * 0.84 + ((drift * 0.7) % 1800), h * 0.8, big * 0.62, 0.055);
    drawGlow(GLOW.amber, w * 0.5, h * 0.52, big * 0.7, 0.022);

    // slow mist banks for depth
    const mist = -G.cam.x * 0.22;
    for (let i = 0; i < 3; i++) {
      const mx = ((mist + i * 900) % (w + 1600) + w + 1600) % (w + 1600) - 800;
      drawGlow(i === 1 ? GLOW.violet : GLOW.teal, mx, h * (0.34 + i * 0.18), big * 0.42, 0.035);
    }

    for (const d of G.dust) {
      drawGlow(GLOW.hot, d.x, d.y, d.r * 7, 0.05 * d.a);
      drawGlow(GLOW.white, d.x, d.y, d.r * 1.7, 0.32 * d.a);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // A slower-moving rock layer behind the play space, so the corridor has depth.
  function drawFarCave() {
    const left = G.cam.x - 120;
    const right = G.cam.x + view.worldW + 120;
    const top = G.cam.y - 400;
    const bot = G.cam.y + view.worldH + 400;
    const shift = G.cam.x * 0.45;
    const step = 46;
    const inset = 96;

    const farY = (x, key) => {
      const tr = sampleTerrain(x + shift);
      return key === 'ceil' ? tr.ceil + inset : tr.floor - inset;
    };

    ctx.globalAlpha = 0.9;
    for (const key of ['ceil', 'floor']) {
      const dir = key === 'ceil' ? -1 : 1;

      // stalactites / stalagmites hanging off the far ledge
      ctx.fillStyle = 'rgba(12,19,34,0.95)';
      for (let x = Math.floor(left / step) * step; x < right; x += step) {
        const h = hash(Math.round(x / step) * 1.7);
        if (h < 0.62) continue;
        const base = farY(x, key);
        const len = 18 + h * 62;
        const wdt = 9 + h * 13;
        ctx.beginPath();
        ctx.moveTo(x - wdt, base);
        ctx.lineTo(x + wdt, base);
        ctx.lineTo(x + h * 4 - 2, base + dir * len);
        ctx.closePath();
        ctx.fill();
      }

      // the ledge itself
      ctx.beginPath();
      for (let x = left; x <= right; x += step) {
        const y = farY(x, key);
        if (x === left) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const edge = dir < 0 ? top : bot;
      ctx.lineTo(right, edge);
      ctx.lineTo(left, edge);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, key === 'ceil' ? farY(left, key) : farY(left, key) - 120, 0, key === 'ceil' ? farY(left, key) - 120 : farY(left, key));
      g.addColorStop(0, 'rgba(14,22,39,0.98)');
      g.addColorStop(1, 'rgba(7,11,21,0.9)');
      ctx.fillStyle = g;
      ctx.fill();

      // faint rim on the far ledge
      ctx.beginPath();
      for (let x = left; x <= right; x += step) {
        const y = farY(x, key);
        if (x === left) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(94,234,212,0.065)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(94,234,212,0.022)';
      ctx.lineWidth = 7;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // fog that separates near rock from far
    const fog = ctx.createLinearGradient(0, G.cam.y, 0, G.cam.y + view.worldH);
    fog.addColorStop(0, 'rgba(6,11,22,0.55)');
    fog.addColorStop(0.28, 'rgba(6,11,22,0)');
    fog.addColorStop(0.72, 'rgba(6,11,22,0)');
    fog.addColorStop(1, 'rgba(6,11,22,0.55)');
    ctx.fillStyle = fog;
    ctx.fillRect(left, G.cam.y, right - left, view.worldH);
  }

  function drawCave() {
    const n = terrain.length;
    if (n < 3) return;

    const left = G.cam.x - 160;
    const right = G.cam.x + view.worldW + 160;
    const i0 = clamp(Math.floor(left / SEG), 0, n - 1);
    const i1 = clamp(Math.ceil(right / SEG), 0, n - 1);
    if (i1 - i0 < 2) return;

    const top = G.cam.y - 500;
    const bot = G.cam.y + view.worldH + 500;

    drawFarCave();

    // ---- solid rock -------------------------------------------------------
    const fillRock = (key, dir, colorA, colorB) => {
      ctx.beginPath();
      ctx.moveTo(terrain[i0].x, terrain[i0][key]);
      for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(terrain[i].x, terrain[i][key]);
      const edge = dir > 0 ? bot : top;
      ctx.lineTo(terrain[i1].x, edge);
      ctx.lineTo(terrain[i0].x, edge);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, terrain[i0][key], 0, terrain[i0][key] + dir * 190);
      g.addColorStop(0, colorA);
      g.addColorStop(1, colorB);
      ctx.fillStyle = g;
      ctx.fill();
    };
    fillRock('floor', 1, '#1b2a46', '#05080f');
    fillRock('ceil', -1, '#172440', '#04070d');

    // rock grain
    if (grainPattern) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(terrain[i0].x, terrain[i0].floor);
      for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(terrain[i].x, terrain[i].floor);
      ctx.lineTo(terrain[i1].x, bot);
      ctx.lineTo(terrain[i0].x, bot);
      ctx.closePath();
      ctx.moveTo(terrain[i0].x, terrain[i0].ceil);
      for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(terrain[i].x, terrain[i].ceil);
      ctx.lineTo(terrain[i1].x, top);
      ctx.lineTo(terrain[i0].x, top);
      ctx.closePath();
      ctx.globalAlpha = 0.36;
      ctx.fillStyle = grainPattern;
      ctx.fill('nonzero');
      ctx.restore();
    }

    // ambient bounce light hugging the rock surface, so it reads as solid
    ctx.globalCompositeOperation = 'lighter';
    const DEPTH = 130;
    const bounce = (key, dir) => {
      let minY = Infinity;
      let maxY = -Infinity;
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) {
        const y = terrain[i][key];
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        if (i === i0) ctx.moveTo(terrain[i].x, y);
        else ctx.lineTo(terrain[i].x, y);
      }
      for (let i = i1; i >= i0; i--) {
        ctx.lineTo(terrain[i].x, terrain[i][key] + dir * DEPTH);
      }
      ctx.closePath();
      const g2 = ctx.createLinearGradient(0, dir > 0 ? minY : maxY, 0, (dir > 0 ? minY : maxY) + dir * DEPTH);
      g2.addColorStop(0, 'rgba(94,234,212,0.085)');
      g2.addColorStop(0.45, 'rgba(94,234,212,0.03)');
      g2.addColorStop(1, 'rgba(94,234,212,0)');
      ctx.fillStyle = g2;
      ctx.fill();
    };
    bounce('floor', 1);
    bounce('ceil', -1);
    ctx.globalCompositeOperation = 'source-over';

    // ---- strata: layers of rock parallel to the surface -------------------
    ctx.lineJoin = 'round';
    for (const [off, a, w] of [[14, 0.5, 2.2], [34, 0.34, 3], [62, 0.22, 4], [104, 0.13, 6]]) {
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) {
        const y = terrain[i].floor + off + Math.sin(terrain[i].x * 0.013 + off) * 7;
        if (i === i0) ctx.moveTo(terrain[i].x, y);
        else ctx.lineTo(terrain[i].x, y);
      }
      ctx.strokeStyle = `rgba(46,68,110,${a * 0.55})`;
      ctx.lineWidth = w;
      ctx.stroke();
    }
    for (const [off, a, w] of [[16, 0.42, 2.2], [40, 0.28, 3], [78, 0.16, 5]]) {
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) {
        const y = terrain[i].ceil - off - Math.sin(terrain[i].x * 0.011 + off) * 6;
        if (i === i0) ctx.moveTo(terrain[i].x, y);
        else ctx.lineTo(terrain[i].x, y);
      }
      ctx.strokeStyle = `rgba(40,60,102,${a * 0.55})`;
      ctx.lineWidth = w;
      ctx.stroke();
    }

    // ---- speckle + crystal detail ----------------------------------------
    ctx.fillStyle = 'rgba(120,150,200,0.20)';
    for (let i = i0; i <= i1; i++) {
      const s0 = terrain[i];
      for (let k = 0; k < 3; k++) {
        const h1 = hash(i * 7.31 + k * 3.7);
        const h2 = hash(i * 3.17 + k * 9.1);
        const px = s0.x + h1 * SEG;
        ctx.globalAlpha = 0.12 + h2 * 0.2;
        const size = 1 + h2 * 1.9;
        ctx.fillRect(px, s0.floor + 8 + h1 * 96, size, size);
        ctx.fillRect(px, s0.ceil - 8 - h1 * 86, size, size);
      }
    }
    ctx.globalAlpha = 1;

    // crystal clusters on some segments
    ctx.globalCompositeOperation = 'lighter';
    for (let i = i0; i <= i1; i++) {
      const s0 = terrain[i];
      if (!s0.moss) continue;
      const flick = 0.7 + 0.3 * Math.sin(G.time * 2.1 + i);
      const dir = s0.moss > 0 ? 1 : -1;
      const by = dir > 0 ? s0.floor + 2 : s0.ceil - 2;
      drawGlow(GLOW.teal, s0.x, by + dir * 10, 34 * flick, 0.18);
      ctx.globalAlpha = 0.6 * flick;
      ctx.fillStyle = dir > 0 ? 'rgba(130,245,220,0.85)' : 'rgba(185,165,255,0.82)';
      for (let k = 0; k < 3; k++) {
        const h = hash(i * 5.7 + k);
        const cx = s0.x + (k - 1) * 9 + (h - 0.5) * 8;
        const hgt = 9 + h * 16;
        const wdt = 2.6 + h * 2.2;
        ctx.beginPath();
        ctx.moveTo(cx, by);
        ctx.lineTo(cx + wdt, by + dir * hgt * 0.55);
        ctx.lineTo(cx, by + dir * hgt);
        ctx.lineTo(cx - wdt, by + dir * hgt * 0.55);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // ---- glowing rims -----------------------------------------------------
    ctx.globalCompositeOperation = 'lighter';
    const rim = (key, rgb) => {
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) {
        if (i === i0) ctx.moveTo(terrain[i].x, terrain[i][key]);
        else ctx.lineTo(terrain[i].x, terrain[i][key]);
      }
      ctx.strokeStyle = `rgba(${rgb},0.09)`;
      ctx.lineWidth = 18;
      ctx.stroke();
      ctx.strokeStyle = `rgba(${rgb},0.22)`;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = `rgba(${rgb},0.8)`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    };

    rim('floor', GLOW.teal);
    rim('ceil', GLOW.teal);

    // moss lights along the rims
    for (let i = i0; i <= i1; i++) {
      const s0 = terrain[i];
      if (!s0.moss) continue;
      const pulse = 0.55 + 0.45 * Math.sin(G.time * 1.7 + i * 0.9);
      drawGlow(GLOW.teal, s0.x, s0.floor + 5, 26 * pulse + 10, 0.16);
      drawGlow(GLOW.violet, s0.x, s0.ceil - 5, 20 * pulse + 8, 0.1);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawMotes() {
    ctx.globalCompositeOperation = 'lighter';
    const l = G.cam.x - 80;
    const r = G.cam.x + view.worldW + 80;
    for (const m of G.motes) {
      if (m.x < l || m.x > r) continue;
      const bob = Math.sin(G.time * 2.2 + m.ph) * 4;
      const pulse = 0.6 + 0.4 * Math.sin(G.time * 3 + m.ph);
      drawGlow(GLOW.teal, m.x, m.y + bob, 30 * pulse + 12, 0.5);
      drawGlow(GLOW.teal, m.x, m.y + bob, 9, 0.4);
      drawGlow(GLOW.white, m.x, m.y + bob, 3.8, 0.95);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawAnchors() {
    const l = G.cam.x - 200;
    const r = G.cam.x + view.worldW + 200;
    ctx.globalCompositeOperation = 'lighter';

    for (const a of G.anchors) {
      if (a.x < l || a.x > r) continue;
      const y = anchorY(a);
      const active = G.tether === a;
      const pulse = 0.7 + 0.3 * Math.sin(G.time * 1.9 + a.pulse);

      drawGlow(GLOW.amber, a.x, y, (active ? 84 : 58) * pulse + 12, active ? 0.5 : 0.3);
      drawGlow(GLOW.hot, a.x, y, active ? 26 : 18, active ? 0.7 : 0.45);

      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#fff4dc';
      ctx.beginPath();
      ctx.arc(a.x, y, 3.4, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = 'rgba(255,196,107,0.9)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(a.x, y, 9.5, 0, TAU);
      ctx.stroke();

      if (active) {
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = 'rgba(255,244,220,0.9)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(a.x, y, 16 + Math.sin(G.time * 7) * 2.4, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawReachHint() {
    if (G.state !== 'playing' || !G.holding || G.tether) return;
    const p = G.player;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = 'rgba(255,196,107,0.9)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 12]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, TETHER_RANGE, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawTether() {
    if (!G.tether) return;
    const p = G.player;
    const a = G.tether;
    const ay = anchorY(a);

    const grad = ctx.createLinearGradient(p.x, p.y, a.x, ay);
    grad.addColorStop(0, 'rgba(255,246,232,0.95)');
    grad.addColorStop(1, 'rgba(255,186,100,0.5)');

    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(a.x, ay);
    ctx.strokeStyle = 'rgba(255,180,90,0.12)';
    ctx.lineWidth = 11;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(a.x, ay);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.7;
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      const k = (G.time * 0.7 + i / 3) % 1;
      const x = lerp(p.x, a.x, k);
      const y = lerp(p.y, ay, k);
      drawGlow(GLOW.hot, x, y, 8, 0.5 * (1 - Math.abs(k - 0.5) * 1.2));
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawPlayer() {
    const p = G.player;
    const sp = Math.hypot(p.vx, p.vy);
    const squash = clamp(1 + sp / 2600, 1, 1.55);

    ctx.globalCompositeOperation = 'lighter';
    drawGlow(GLOW.white, p.x, p.y, 82, 0.26);
    drawGlow(GLOW.amber, p.x, p.y, 36, 0.65);

    // flickering flame tongues trailing the direction of travel
    const flick = 0.75 + 0.25 * Math.sin(G.time * 23);
    for (let i = 0; i < 3; i++) {
      const back = 8 + i * 6;
      const wob = Math.sin(G.time * 17 + i * 2.1) * 3;
      drawGlow(i === 0 ? GLOW.hot : GLOW.amber,
        p.x - Math.cos(p.angle) * back + wob * 0.3,
        p.y - Math.sin(p.angle) * back + wob,
        14 - i * 3, (0.45 - i * 0.1) * flick);
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.2 * squash, 7.2 / squash, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,214,140,0.95)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.4 * squash, 4.4 / squash, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.globalCompositeOperation = 'source-over';
  }

  function drawParticles() {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of G.particles) {
      const k = p.life / p.max;
      drawGlow(p.rgb, p.x, p.y, p.size * 4.2, 0.5 * k);
      drawGlow(p.rgb, p.x, p.y, p.size, 0.9 * k);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawRings() {
    ctx.globalCompositeOperation = 'lighter';
    for (const r of G.rings) {
      const k = r.life / r.maxLife;
      ctx.globalAlpha = k * k * 0.75;
      ctx.strokeStyle = `rgba(${r.rgb},0.9)`;
      ctx.lineWidth = 2 * k + 0.4;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawFloaters() {
    ctx.globalCompositeOperation = 'lighter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    for (const f of G.floaters) {
      const k = f.life / f.max;
      ctx.globalAlpha = k;
      ctx.fillStyle = `rgba(${f.rgb},0.95)`;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawGloom() {
    const front = G.gloom.x;
    if (front + 80 < G.cam.x) return;

    const x0 = G.cam.x - 420;
    const y0 = G.cam.y - 420;
    const y1 = G.cam.y + view.worldH + 420;
    const step = 36;

    const edge = (y) =>
      front +
      Math.sin(y * 0.017 + G.time * 1.6) * 15 +
      Math.sin(y * 0.0051 - G.time * 0.9) * 27 +
      Math.sin(y * 0.041 + G.time * 2.7) * 5;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let y = y0; y <= y1; y += step) ctx.lineTo(edge(y), y);
    ctx.lineTo(x0, y1);
    ctx.closePath();

    const grad = ctx.createLinearGradient(x0, 0, front + 30, 0);
    grad.addColorStop(0, 'rgba(2,3,7,1)');
    grad.addColorStop(0.62, 'rgba(3,4,10,0.99)');
    grad.addColorStop(0.88, 'rgba(9,6,18,0.96)');
    grad.addColorStop(1, 'rgba(26,12,42,0.88)');
    ctx.fillStyle = grad;
    ctx.fill();

    // hungry edge
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    for (let y = y0; y <= y1; y += step) {
      const x = edge(y);
      if (y === y0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(167,139,250,0.34)';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,120,180,0.10)';
    ctx.lineWidth = 18;
    ctx.stroke();

    // wisps reaching forward
    for (let i = 0; i < 5; i++) {
      const wy = y0 + ((i + 0.5) / 5) * (y1 - y0) + Math.sin(G.time * 0.7 + i * 2.1) * 40;
      const reach = 40 + Math.sin(G.time * 0.9 + i * 1.7) * 34 + 40;
      drawGlow(GLOW.violet, front + reach * 0.4, wy, 120, 0.05);
      drawGlow(GLOW.pink, front + reach * 0.2, wy, 70, 0.045);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawVignette(w, h) {
    const r0 = Math.min(w, h) * 0.22;
    const r1 = Math.max(w, h) * 0.8;
    const g = ctx.createRadialGradient(w * 0.5, h * 0.5, r0, w * 0.5, h * 0.5, r1);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.3)');
    g.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /* ----------------------------------------------------------------- input */

  function primaryPress() {
    Sound.init();
    if (G.state === 'title') {
      startGame(true);
      return;
    }
    if (G.state === 'paused') {
      setPaused(false);
      return;
    }
    if (G.state === 'dead') {
      if (G.time >= G.restartAt) startGame(true);
      return;
    }
    G.holding = true;
  }

  function primaryRelease() {
    G.holding = false;
  }

  function blurActive() {
    const a = document.activeElement;
    if (a && a !== document.body && typeof a.blur === 'function') a.blur();
  }

  function isButton(target) {
    return target && target.closest && target.closest('button');
  }

  window.addEventListener('pointerdown', (e) => {
    if (isButton(e.target)) return;
    e.preventDefault();
    primaryPress();
  }, { passive: false });

  window.addEventListener('pointerup', primaryRelease);
  window.addEventListener('pointercancel', primaryRelease);
  window.addEventListener('blur', () => {
    primaryRelease();
    setPaused(true);
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
      e.preventDefault();
      primaryPress();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      if (G.state === 'playing') setPaused(true);
      else if (G.state === 'paused') setPaused(false);
    } else if (e.code === 'KeyM') {
      toggleMute();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') primaryRelease();
  });

  window.addEventListener('contextmenu', (e) => e.preventDefault());

  dom.start.addEventListener('click', () => {
    if (G.state === 'title') startGame(false);
  });
  dom.retry.addEventListener('click', () => {
    if (G.state === 'dead' && G.time >= G.restartAt) startGame(false);
  });
  dom.resume.addEventListener('click', () => setPaused(false));
  dom.pauseBtn.addEventListener('click', () => {
    if (G.state === 'playing') setPaused(true);
    else if (G.state === 'paused') setPaused(false);
  });
  dom.mute.addEventListener('click', toggleMute);
  dom.rotatorDismiss.addEventListener('click', (e) => {
    e.stopPropagation();
    dismissRotator();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      primaryRelease();
      setPaused(true);
    }
  });

  window.addEventListener('resize', () => {
    resize();
    initDust();
  });

  /* ------------------------------------------------------------------ loop */

  let lastTs = 0;
  let acc = 0;
  const FIXED = 1 / 120;

  function frame(ts) {
    requestAnimationFrame(frame);
    if (!lastTs) lastTs = ts;
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (!Number.isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 0.1);

    acc += dt;
    let steps = 0;
    while (acc >= FIXED && steps < 14) {
      step(FIXED);
      acc -= FIXED;
      steps++;
    }
    if (steps >= 14) acc = 0;

    G.shake *= Math.exp(-7 * dt);
    render();
    Sound.sync(G.state);
  }

  function step(dt) {
    G.time += dt;
    updateDust(dt);
    updateParticles(dt);
    updateFx(dt);

    if (G.state === 'playing') {
      updatePlay(dt);
      updateHud(false);
    } else if (G.state === 'title') {
      updateTitle(dt);
    }
  }

  /* --------------------------------------------------------------- startup */

  function boot() {
    buildGrain();
    loadPrefs();
    resize();
    initDust();
    resetTerrain();
    G.cam.x = 0;
    ensureWorld(view.worldW + 900);
    G.player.x = START_X;
    G.player.y = 470;
    updateHud(true);
    setScreens('title');
    requestAnimationFrame(frame);
  }

  boot();
})();
