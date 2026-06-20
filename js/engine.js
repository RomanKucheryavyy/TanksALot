/* =========================================================================
 * TanksALot — Engine
 * Core building blocks: math/easing, input (keyboard+mouse+wheel+touch),
 * asset loading with progress, a WebAudio mixer with synthesized SFX +
 * music, settings/storage, and a look-ahead camera with shake & zoom.
 * Dependency-free and tolerant of missing assets.
 * ====================================================================== */

'use strict';

const TAU = Math.PI * 2;

/* ----------------------------- Math utilities --------------------------- */
const Util = {
  clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); },
  lerp(a, b, t) { return a + (b - a) * t; },
  smooth(a, b, dt, rate) { return Util.lerp(a, b, 1 - Math.pow(rate, dt)); },
  rand(min, max) { return min + Math.random() * (max - min); },
  randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); },
  chance(p) { return Math.random() < p; },
  choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); },
  dist2(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; },
  angleTo(x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); },
  angleDiff(a, b) { let d = (b - a) % TAU; if (d < -Math.PI) d += TAU; if (d > Math.PI) d -= TAU; return d; },
  rotateToward(c, t, maxStep) { const d = Util.angleDiff(c, t); if (Math.abs(d) <= maxStep) return t; return c + Math.sign(d) * maxStep; },
  approach(c, t, amt) { if (c < t) return Math.min(c + amt, t); if (c > t) return Math.max(c - amt, t); return t; },
  // easing
  easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
  easeInCubic(t) { return t * t * t; },
  easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  easeOutElastic(t) { const c4 = TAU / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; },
};

/* ------------------------------- Input ---------------------------------- */
class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = Object.create(null);
    this.pressed = Object.create(null);
    this.mouse = { x: 0, y: 0 };
    this.mouseDown = false;     // left
    this.rightDown = false;     // right (ability)
    this.rightPressed = false;
    this.wheel = 0;             // accumulated wheel delta (weapon switch)
    // virtual / mobile control state (driven by on-screen joysticks)
    this.move = { x: 0, y: 0 }; // left stick (movement)
    this.aimVec = { x: 0, y: 0 }; // right stick (aim)
    this.aimActive = false;     // right stick engaged
    this.firing = false;        // touch fire held
    this._bind();
  }
  _bind() {
    const c = this.canvas;
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    const setMouse = (e) => {
      const r = c.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (c.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (c.height / r.height);
    };
    c.addEventListener('mousemove', setMouse);
    c.addEventListener('mousedown', (e) => {
      setMouse(e);
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) { if (!this.rightDown) this.rightPressed = true; this.rightDown = true; }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; if (e.button === 2) this.rightDown = false; });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.wheel += Math.sign(e.deltaY); }, { passive: false });
    // Touches on the bare canvas just prevent page scroll/zoom; the on-screen
    // joysticks (MobileControls) own their own elements and drive move/aim/fire.
    c.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    c.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    window.addEventListener('blur', () => { this.keys = Object.create(null); this.mouseDown = false; this.rightDown = false; this.firing = false; this.move.x = this.move.y = 0; this.aimActive = false; });
  }
  down(code) { return !!this.keys[code]; }
  justPressed(code) { return !!this.pressed[code]; }
  takeWheel() { const w = this.wheel; this.wheel = 0; return w; }
  endFrame() { this.pressed = Object.create(null); this.rightPressed = false; }
}

/* --------------------------- Asset manager ------------------------------ */
class AssetManager {
  constructor() { this.queue = []; this.cache = Object.create(null); this.success = 0; this.error = 0; }
  queueImage(path) { this.queue.push(path); }
  isDone() { return this.queue.length === (this.success + this.error); }
  progress() { return this.queue.length ? (this.success + this.error) / this.queue.length : 1; }
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
// Synthesized SFX routed through a master gain (so volume sliders work),
// plus optional music via <audio>. Everything is exception-safe.
class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = Storage.get('muted', false);
    this.sfxVolume = Storage.get('sfxVolume', 0.8);
    this.musicVolume = Storage.get('musicVolume', 0.45);
    this.sfxGain = null;
    this.musicEl = null;
    this._musicStarted = false;
  }
  _ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) { this.ctx = new AC(); this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.muted ? 0 : this.sfxVolume; this.sfxGain.connect(this.ctx.destination); }
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }
  setMuted(m) { this.muted = m; Storage.set('muted', m); if (this.sfxGain) this.sfxGain.gain.value = m ? 0 : this.sfxVolume; if (this.musicEl) this.musicEl.muted = m; }
  toggleMute() { this.setMuted(!this.muted); return this.muted; }
  setSfxVolume(v) { this.sfxVolume = v; Storage.set('sfxVolume', v); if (this.sfxGain && !this.muted) this.sfxGain.gain.value = v; }
  setMusicVolume(v) { this.musicVolume = v; Storage.set('musicVolume', v); if (this.musicEl) this.musicEl.volume = v; }

  tone({ freq = 440, type = 'sine', dur = 0.12, vol = 0.3, glide = 0, attack = 0.005, delay = 0 }) {
    const ctx = this._ensure(); if (!ctx || this.muted) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + glide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.sfxGain); osc.start(t); osc.stop(t + dur + 0.02);
  }
  noise({ dur = 0.3, vol = 0.4, cutoff = 1200, type = 'lowpass' }) {
    const ctx = this._ensure(); if (!ctx || this.muted) return;
    const t = ctx.currentTime, frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = type; filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, cutoff * 0.2), t + dur);
    const gain = ctx.createGain(); gain.gain.setValueAtTime(vol, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.sfxGain); src.start(t);
  }

  // weapon-specific fire sounds
  fireCannon() { this.tone({ freq: 240, type: 'square', dur: 0.1, vol: 0.18, glide: -150 }); this.noise({ dur: 0.12, vol: 0.1, cutoff: 1800 }); }
  fireMG() { this.tone({ freq: 380, type: 'square', dur: 0.05, vol: 0.09, glide: -120 }); }
  fireShotgun() { this.noise({ dur: 0.18, vol: 0.22, cutoff: 2200 }); this.tone({ freq: 160, type: 'square', dur: 0.12, vol: 0.12, glide: -80 }); }
  fireRocket() { this.tone({ freq: 200, type: 'sawtooth', dur: 0.3, vol: 0.14, glide: 180 }); this.noise({ dur: 0.3, vol: 0.08, cutoff: 1200 }); }
  fireLaser() { this.tone({ freq: 900, type: 'sawtooth', dur: 0.12, vol: 0.12, glide: -500 }); }
  enemyShoot() { this.tone({ freq: 200, type: 'sawtooth', dur: 0.09, vol: 0.08, glide: -120 }); }

  explosion(scale = 1) { this.noise({ dur: 0.45 * scale, vol: 0.4, cutoff: 1600 }); this.tone({ freq: 90, type: 'sine', dur: 0.4 * scale, vol: 0.22, glide: -40 }); }
  hit() { this.noise({ dur: 0.07, vol: 0.14, cutoff: 2600 }); }
  hitArmor() { this.tone({ freq: 520, type: 'square', dur: 0.05, vol: 0.08, glide: -200 }); }
  pickup() { this.tone({ freq: 520, type: 'sine', dur: 0.12, vol: 0.22, glide: 240 }); }
  coin() { this.tone({ freq: 880, type: 'triangle', dur: 0.07, vol: 0.16 }); this.tone({ freq: 1320, type: 'triangle', dur: 0.09, vol: 0.14, delay: 0.06 }); }
  powerHit() { this.tone({ freq: 660, type: 'triangle', dur: 0.18, vol: 0.22, glide: 200 }); }
  dash() { this.tone({ freq: 300, type: 'sawtooth', dur: 0.18, vol: 0.14, glide: 400 }); this.noise({ dur: 0.18, vol: 0.06, cutoff: 1400 }); }
  upgrade() { [523, 698, 880].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.16, vol: 0.22, delay: i * 0.08 })); }
  wave() { this.tone({ freq: 330, type: 'triangle', dur: 0.15, vol: 0.26 }); this.tone({ freq: 495, type: 'triangle', dur: 0.2, vol: 0.26, delay: 0.13 }); }
  bossRoar() { this.tone({ freq: 70, type: 'sawtooth', dur: 0.9, vol: 0.3, glide: 30 }); this.noise({ dur: 0.9, vol: 0.18, cutoff: 600 }); }
  lowHealth() { this.tone({ freq: 160, type: 'sine', dur: 0.16, vol: 0.18 }); }
  gameover() { [400, 340, 280, 200].forEach((f, i) => this.tone({ freq: f, type: 'sawtooth', dur: 0.3, vol: 0.22, delay: i * 0.18 })); }
  victory() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.22, vol: 0.28, delay: i * 0.14 })); }
  fireFlame() { this.noise({ dur: 0.16, vol: 0.07, cutoff: 1100 }); }
  fireRail() { this.tone({ freq: 200, type: 'sawtooth', dur: 0.12, vol: 0.1, glide: 1400 }); this.tone({ freq: 1400, type: 'square', dur: 0.18, vol: 0.16, glide: -1100, delay: 0.1 }); this.noise({ dur: 0.2, vol: 0.12, cutoff: 3000 }); }
  fireTesla() { this.tone({ freq: 1800, type: 'square', dur: 0.1, vol: 0.09, glide: -900 }); this.noise({ dur: 0.12, vol: 0.06, cutoff: 4000, type: 'highpass' }); }
  fireGrenade() { this.tone({ freq: 150, type: 'square', dur: 0.1, vol: 0.12, glide: -60 }); }
  ability() { this.tone({ freq: 420, type: 'sawtooth', dur: 0.22, vol: 0.14, glide: 300 }); this.noise({ dur: 0.2, vol: 0.08, cutoff: 1600 }); }
  shockwave() { this.tone({ freq: 120, type: 'sine', dur: 0.4, vol: 0.28, glide: -70 }); this.noise({ dur: 0.4, vol: 0.2, cutoff: 1400 }); }
  ultimate() { [330, 440, 587, 880].forEach((f, i) => this.tone({ freq: f, type: 'sawtooth', dur: 0.5, vol: 0.18, delay: i * 0.07, glide: 60 })); this.noise({ dur: 0.6, vol: 0.2, cutoff: 2200, delay: 0.25 }); }
  freeze() { this.tone({ freq: 1200, type: 'triangle', dur: 0.3, vol: 0.12, glide: -700 }); }
  elite() { this.tone({ freq: 90, type: 'sawtooth', dur: 0.6, vol: 0.2, glide: -30 }); }
  levelUp() { [523, 698, 880, 1175].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.22, delay: i * 0.07 })); }

  startMusic(src) {
    if (this._musicStarted) return;
    this._musicStarted = true;
    try { const el = new Audio(src); el.loop = true; el.volume = this.musicVolume; el.muted = this.muted; el.play().catch(() => {}); this.musicEl = el; }
    catch (e) {}
  }
  setMusicIntensity(boss) { if (this.musicEl) this.musicEl.volume = this.muted ? 0 : this.musicVolume * (boss ? 1.35 : 1); }
}

/* ---------------------------- Storage ----------------------------------- */
const Storage = {
  get(key, fallback) { try { const v = localStorage.getItem('tanksalot.' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
  set(key, value) { try { localStorage.setItem('tanksalot.' + key, JSON.stringify(value)); } catch (e) {} },
};

/* ----------------------------- Camera ----------------------------------- */
class Camera {
  constructor(viewW, viewH, worldW, worldH) {
    this.x = 0; this.y = 0; this.viewW = viewW; this.viewH = viewH; this.worldW = worldW; this.worldH = worldH;
    this.shakeMag = 0; this.shakeTime = 0; this.shakeDur = 1; this.ox = 0; this.oy = 0;
    this.zoom = 1; this.targetZoom = 1;
    this.lax = 0; this.lay = 0; // look-ahead offset
  }
  resize(viewW, viewH) { this.viewW = viewW; this.viewH = viewH; }
  setWorld(w, h) { this.worldW = w; this.worldH = h; }
  get vw() { return this.viewW / this.zoom; }
  get vh() { return this.viewH / this.zoom; }

  follow(tx, ty, dt, aheadX = 0, aheadY = 0) {
    this.lax = Util.smooth(this.lax, aheadX, dt, 0.001);
    this.lay = Util.smooth(this.lay, aheadY, dt, 0.001);
    this.zoom = Util.smooth(this.zoom, this.targetZoom, dt, 0.002);
    const targetX = tx + this.lax - this.vw / 2;
    const targetY = ty + this.lay - this.vh / 2;
    const k = 1 - Math.pow(0.0008, dt);
    this.x = Util.lerp(this.x, targetX, k);
    this.y = Util.lerp(this.y, targetY, k);
    this.x = Util.clamp(this.x, 0, Math.max(0, this.worldW - this.vw));
    this.y = Util.clamp(this.y, 0, Math.max(0, this.worldH - this.vh));
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const m = this.shakeMag * Math.max(0, this.shakeTime / this.shakeDur);
      this.ox = Util.rand(-m, m); this.oy = Util.rand(-m, m);
    } else { this.ox = 0; this.oy = 0; }
  }
  shake(mag, dur) { if (mag >= this.shakeMag || this.shakeTime <= 0) { this.shakeMag = mag; this.shakeDur = dur; this.shakeTime = dur; } }
  apply(ctx) { ctx.scale(this.zoom, this.zoom); ctx.translate(-Math.round(this.x + this.ox), -Math.round(this.y + this.oy)); }
  screenToWorld(sx, sy) { return { x: sx / this.zoom + this.x, y: sy / this.zoom + this.y }; }
  visible(x, y, r) { return x + r >= this.x && x - r <= this.x + this.vw && y + r >= this.y && y - r <= this.y + this.vh; }
}
