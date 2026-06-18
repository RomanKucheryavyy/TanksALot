/* =========================================================================
 * TanksALot — Engine
 * Core building blocks: math utils, input, asset loading, audio, storage,
 * and the camera. Intentionally dependency-free and tolerant of missing
 * assets so the game keeps running even if a file fails to load.
 * ====================================================================== */

'use strict';

/* ----------------------------- Math utilities --------------------------- */
const TAU = Math.PI * 2;

const Util = {
  clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); },
  lerp(a, b, t) { return a + (b - a) * t; },
  rand(min, max) { return min + Math.random() * (max - min); },
  randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); },
  chance(p) { return Math.random() < p; },
  choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); },
  dist2(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; },
  angleTo(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); },
  // Smallest signed difference between two angles, result in (-PI, PI].
  angleDiff(a, b) {
    let d = (b - a) % TAU;
    if (d < -Math.PI) d += TAU;
    if (d > Math.PI) d -= TAU;
    return d;
  },
  // Rotate `current` toward `target` by at most `maxStep` radians.
  rotateToward(current, target, maxStep) {
    const d = Util.angleDiff(current, target);
    if (Math.abs(d) <= maxStep) return target;
    return current + Math.sign(d) * maxStep;
  },
  // Approach a value toward a target by a fixed amount.
  approach(current, target, amount) {
    if (current < target) return Math.min(current + amount, target);
    if (current > target) return Math.max(current - amount, target);
    return target;
  },
};

/* ------------------------------- Input ---------------------------------- */
class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = Object.create(null);       // held keys (by e.code)
    this.pressed = Object.create(null);     // edge: pressed this frame
    this.mouse = { x: 0, y: 0, wx: 0, wy: 0 };
    this.mouseDown = false;
    this._bind();
  }

  _bind() {
    const c = this.canvas;
    window.addEventListener('keydown', (e) => {
      // Avoid scrolling the page with arrows/space while playing.
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    const setMouse = (e) => {
      const r = c.getBoundingClientRect();
      // Account for CSS scaling of the canvas.
      this.mouse.x = (e.clientX - r.left) * (c.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (c.height / r.height);
    };
    c.addEventListener('mousemove', setMouse);
    c.addEventListener('mousedown', (e) => { setMouse(e); if (e.button === 0) this.mouseDown = true; });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch support (basic): aim + fire toward touch point.
    c.addEventListener('touchstart', (e) => { e.preventDefault(); this._touch(e); this.mouseDown = true; }, { passive: false });
    c.addEventListener('touchmove', (e) => { e.preventDefault(); this._touch(e); }, { passive: false });
    c.addEventListener('touchend', (e) => { e.preventDefault(); this.mouseDown = false; }, { passive: false });

    // Lose focus → release all keys so the tank doesn't "stick".
    window.addEventListener('blur', () => { this.keys = Object.create(null); this.mouseDown = false; });
  }

  _touch(e) {
    if (!e.touches.length) return;
    const t = e.touches[0];
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = (t.clientX - r.left) * (this.canvas.width / r.width);
    this.mouse.y = (t.clientY - r.top) * (this.canvas.height / r.height);
  }

  down(code) { return !!this.keys[code]; }
  // True only on the first frame the key went down.
  justPressed(code) { return !!this.pressed[code]; }
  // Call at the very end of each frame to clear edge state.
  endFrame() { this.pressed = Object.create(null); }
}

/* --------------------------- Asset manager ------------------------------ */
// Loads images, never blocks the game on a failed asset. getImage() returns
// null for anything that did not load, so every draw path has a fallback.
class AssetManager {
  constructor() {
    this.queue = [];
    this.cache = Object.create(null);
    this.success = 0;
    this.error = 0;
  }
  queueImage(path) { this.queue.push(path); }
  isDone() { return this.queue.length === (this.success + this.error); }
  getImage(path) { return this.cache[path] || null; }

  downloadAll(callback) {
    if (this.queue.length === 0) { callback(); return; }
    const done = () => { if (this.isDone()) callback(); };
    for (const path of this.queue) {
      const img = new Image();
      img.addEventListener('load', () => { this.success++; this.cache[path] = img; done(); });
      img.addEventListener('error', () => { this.error++; done(); });
      img.src = path;
    }
  }
}

/* ----------------------------- Audio ------------------------------------ */
// SFX are synthesized with WebAudio (no file dependency); music uses an
// <audio> element if the file is present. All wrapped so it can never throw.
class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = Storage.get('muted', false);
    this.musicEl = null;
    this._musicStarted = false;
  }

  _ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') { this.ctx.resume().catch(() => {}); }
    return this.ctx;
  }

  setMuted(m) {
    this.muted = m;
    Storage.set('muted', m);
    if (this.musicEl) this.musicEl.muted = m;
  }
  toggleMute() { this.setMuted(!this.muted); return this.muted; }

  // Generic tone with an ADSR-ish envelope.
  tone({ freq = 440, type = 'sine', dur = 0.12, vol = 0.3, glide = 0, attack = 0.005 }) {
    const ctx = this._ensure();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + glide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Filtered noise burst (explosions, hits).
  noise({ dur = 0.3, vol = 0.4, cutoff = 1200 }) {
    const ctx = this._ensure();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.2), t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
  }

  shoot() { this.tone({ freq: 320, type: 'square', dur: 0.08, vol: 0.18, glide: -180 }); }
  enemyShoot() { this.tone({ freq: 200, type: 'sawtooth', dur: 0.09, vol: 0.10, glide: -120 }); }
  explosion() { this.noise({ dur: 0.45, vol: 0.45, cutoff: 1600 }); this.tone({ freq: 90, type: 'sine', dur: 0.4, vol: 0.25, glide: -40 }); }
  hit() { this.noise({ dur: 0.08, vol: 0.18, cutoff: 2500 }); }
  pickup() { this.tone({ freq: 520, type: 'sine', dur: 0.12, vol: 0.25, glide: 240 }); }
  powerHit() { this.tone({ freq: 660, type: 'triangle', dur: 0.18, vol: 0.25, glide: 200 }); }
  wave() { this.tone({ freq: 330, type: 'triangle', dur: 0.15, vol: 0.28 }); setTimeout(() => this.tone({ freq: 495, type: 'triangle', dur: 0.2, vol: 0.28 }), 130); }
  gameover() { this.tone({ freq: 300, type: 'sawtooth', dur: 0.5, vol: 0.3, glide: -180 }); }
  victory() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone({ freq: f, type: 'triangle', dur: 0.2, vol: 0.3 }), i * 140)); }

  startMusic(src) {
    if (this._musicStarted) return;
    this._musicStarted = true;
    try {
      const el = new Audio(src);
      el.loop = true;
      el.volume = 0.25;
      el.muted = this.muted;
      el.play().catch(() => {});
      this.musicEl = el;
    } catch (e) { /* no music, no problem */ }
  }
}

/* ---------------------------- Storage ----------------------------------- */
// Thin, exception-safe wrapper over localStorage (private-mode safe).
const Storage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('tanksalot.' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('tanksalot.' + key, JSON.stringify(value)); } catch (e) {}
  },
};

/* ----------------------------- Camera ----------------------------------- */
class Camera {
  constructor(viewW, viewH, worldW, worldH) {
    this.x = 0; this.y = 0;
    this.viewW = viewW; this.viewH = viewH;
    this.worldW = worldW; this.worldH = worldH;
    this.shakeMag = 0; this.shakeTime = 0;
    this.ox = 0; this.oy = 0; // current shake offset
  }
  resize(viewW, viewH) { this.viewW = viewW; this.viewH = viewH; }
  setWorld(w, h) { this.worldW = w; this.worldH = h; }

  follow(tx, ty, dt) {
    const targetX = tx - this.viewW / 2;
    const targetY = ty - this.viewH / 2;
    // Smooth, frame-rate independent damping.
    const k = 1 - Math.pow(0.0008, dt);
    this.x = Util.lerp(this.x, targetX, k);
    this.y = Util.lerp(this.y, targetY, k);
    this.x = Util.clamp(this.x, 0, Math.max(0, this.worldW - this.viewW));
    this.y = Util.clamp(this.y, 0, Math.max(0, this.worldH - this.viewH));

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const m = this.shakeMag * (this.shakeTime > 0 ? this.shakeTime / this.shakeDur : 0);
      this.ox = Util.rand(-m, m);
      this.oy = Util.rand(-m, m);
    } else { this.ox = 0; this.oy = 0; }
  }

  shake(mag, dur) {
    // Don't let a small shake cancel a bigger ongoing one.
    if (mag >= this.shakeMag || this.shakeTime <= 0) {
      this.shakeMag = mag; this.shakeDur = dur; this.shakeTime = dur;
    }
  }

  apply(ctx) { ctx.translate(-Math.round(this.x + this.ox), -Math.round(this.y + this.oy)); }
  screenToWorld(sx, sy) { return { x: sx + this.x, y: sy + this.y }; }
  // Is a circle visible (with margin)? Used to cull off-screen draws.
  visible(x, y, r) {
    return x + r >= this.x && x - r <= this.x + this.viewW &&
           y + r >= this.y && y - r <= this.y + this.viewH;
  }
}
