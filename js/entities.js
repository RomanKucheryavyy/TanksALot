/* =========================================================================
 * TanksALot — Entities (epic edition)
 * 8 weapons, ultimate + shockwave abilities, 6+ enemy archetypes with elites,
 * phased bosses, splitters/snipers/drones, overhauled explosions with physics
 * debris, and beam/lightning/shockwave FX. Procedural tanks for crisp rotation.
 * ====================================================================== */

'use strict';

const CONFIG = {
  player: { radius: 21, maxHp: 100, speed: 235, turnSpeed: 6.0, turretTurn: 13 },
  bulletLife: 1.7, maxParticles: 1100, maxDecals: 110,
};

const PALETTE = {
  player:  { hull: '#3f86d4', hullDark: '#2c5f9a', hi: '#7fb4ee', tread: '#27384a', turret: '#cfe2f7', barrel: '#26425f' },
  enemy:   { hull: '#d1483f', hullDark: '#9a2f28', hi: '#ee8079', tread: '#3a2320', turret: '#f3c9c5', barrel: '#5f2622' },
  scout:   { hull: '#e0b53b', hullDark: '#a17f1f', hi: '#f4d878', tread: '#3a3015', turret: '#f7ecc4', barrel: '#5f4e1c' },
  heavy:   { hull: '#8a4a32', hullDark: '#5e3020', hi: '#b87a5c', tread: '#2e1c14', turret: '#e6cbbd', barrel: '#3d2316' },
  arty:    { hull: '#4f8a52', hullDark: '#335e36', hi: '#83b886', tread: '#1f3a20', turret: '#cfe6cf', barrel: '#26421f' },
  bomber:  { hull: '#e07b2b', hullDark: '#a1531a', hi: '#f4a766', tread: '#3a2615', turret: '#f7d9b8', barrel: '#5f3a1c' },
  shield:  { hull: '#5a7a8c', hullDark: '#3a525f', hi: '#8fb0c0', tread: '#1f2e36', turret: '#cfe0e8', barrel: '#26343c' },
  sniper:  { hull: '#2f8f86', hullDark: '#1d5d57', hi: '#5fc3b8', tread: '#143430', turret: '#c4ece7', barrel: '#194540' },
  splitter:{ hull: '#b04bd6', hullDark: '#7a2d96', hi: '#d98fee', tread: '#2e1738', turret: '#eccff7', barrel: '#43205f' },
  boss:    { hull: '#8e44ad', hullDark: '#5e2d73', hi: '#c89bdd', tread: '#2c1738', turret: '#e7d2f1', barrel: '#3d1f4d' },
};

// Cosmetic player tank skins, unlocked by lifetime coins collected.
const SKINS = [
  { id: 'default', name: 'Azure',   cost: 0,    palette: PALETTE.player },
  { id: 'crimson', name: 'Crimson', cost: 100,  palette: { hull: '#d14b4b', hullDark: '#8e2f2f', hi: '#ee8585', tread: '#3a1f1f', turret: '#f5cccc', barrel: '#4a2222' } },
  { id: 'toxic',   name: 'Toxic',   cost: 300,  palette: { hull: '#7ac43f', hullDark: '#4e8a23', hi: '#bdf07f', tread: '#243a18', turret: '#dff5c4', barrel: '#2c4a18' } },
  { id: 'sunset',  name: 'Sunset',  cost: 650,  palette: { hull: '#e08a3b', hullDark: '#a15a1a', hi: '#f4c07f', tread: '#3a2815', turret: '#f7e0c4', barrel: '#5f3a1c' } },
  { id: 'gold',    name: 'Gold',    cost: 1200, palette: { hull: '#e3c04a', hullDark: '#a3851f', hi: '#f7e08a', tread: '#3a3015', turret: '#fff4c4', barrel: '#5f4e1c' } },
  { id: 'shadow',  name: 'Shadow',  cost: 2500, palette: { hull: '#3a4150', hullDark: '#21262f', hi: '#5f6b80', tread: '#15181d', turret: '#aab4c4', barrel: '#262b33' } },
];

const WEAPONS = {
  cannon:      { name: 'Cannon',       fireRate: 0.32,  damage: 30, speed: 640, radius: 6, pellets: 1, spread: 0,    recoil: 6, shake: 4,   sound: 'fireCannon', kind: 'bullet', infinite: true, color: '#ffd34d' },
  machinegun:  { name: 'Machine Gun',  fireRate: 0.085, damage: 9,  speed: 760, radius: 4, pellets: 1, spread: 0.07, recoil: 2, shake: 1.5, sound: 'fireMG',     kind: 'bullet', ammo: 240, color: '#ffe27a' },
  shotgun:     { name: 'Shotgun',      fireRate: 0.62,  damage: 11, speed: 560, radius: 4, pellets: 6, spread: 0.5,  recoil: 9, shake: 6,   sound: 'fireShotgun',kind: 'bullet', ammo: 48, color: '#ffb454' },
  rockets:     { name: 'Rockets',      fireRate: 0.8,   damage: 55, speed: 430, radius: 8, pellets: 1, spread: 0,    recoil: 8, shake: 7,   sound: 'fireRocket', kind: 'rocket', splash: 95, ammo: 28, color: '#ff7b4d' },
  laser:       { name: 'Laser',        fireRate: 0.46,  damage: 42, speed: 1150,radius: 4, pellets: 1, spread: 0,    recoil: 3, shake: 2,   sound: 'fireLaser',  kind: 'laser', pierce: 3, ammo: 70, color: '#4fe0ff' },
  flamethrower:{ name: 'Flamethrower', fireRate: 0.045, damage: 5,  speed: 380, radius: 7, pellets: 2, spread: 0.32, recoil: 1, shake: 1,   sound: 'fireFlame',  kind: 'flame', life: 0.28, burn: 1.4, ammo: 400, color: '#ff7a2b' },
  railgun:     { name: 'Railgun',      fireRate: 0.95,  damage: 95, speed: 0,   radius: 0, pellets: 1, spread: 0,    recoil: 12,shake: 9,   sound: 'fireRail',   kind: 'rail',  ammo: 20, color: '#9b7bff' },
  tesla:       { name: 'Tesla Coil',   fireRate: 0.5,   damage: 26, speed: 0,   radius: 0, pellets: 1, spread: 0,    recoil: 3, shake: 2,   sound: 'fireTesla',  kind: 'tesla', chain: 4, range: 320, ammo: 90, color: '#7df9ff' },
};
const WEAPON_KEYS = Object.keys(WEAPONS);

const ENEMY_TYPES = {
  grunt:      { hp: 55,  speed: 125, fireRate: 1.5, damage: 11, bulletSpeed: 430, radius: 21, detect: 560, preferred: 250, accuracy: 0.13, score: 100, pal: 'enemy',  turretTurn: 3.2, turnSpeed: 2.8, bulletRadius: 5 },
  scout:      { hp: 30,  speed: 220, fireRate: 0.7, damage: 7,  bulletSpeed: 520, radius: 17, detect: 660, preferred: 175, accuracy: 0.18, score: 120, pal: 'scout',  turretTurn: 4.5, turnSpeed: 4.4, bulletRadius: 4 },
  heavy:      { hp: 150, speed: 76,  fireRate: 2.2, damage: 22, bulletSpeed: 360, radius: 27, detect: 520, preferred: 285, accuracy: 0.09, score: 220, pal: 'heavy',  turretTurn: 1.8, turnSpeed: 1.5, bulletRadius: 8 },
  artillery:  { hp: 45,  speed: 68,  fireRate: 2.9, damage: 30, bulletSpeed: 320, radius: 22, detect: 780, preferred: 540, accuracy: 0.05, score: 190, pal: 'arty',   turretTurn: 1.4, turnSpeed: 1.4, bulletRadius: 7, kind: 'rocket', splash: 72 },
  bomber:     { hp: 42,  speed: 180, fireRate: 99,  damage: 0,  bulletSpeed: 0,   radius: 19, detect: 760, preferred: 0,   accuracy: 0,    score: 160, pal: 'bomber', turretTurn: 5.0, turnSpeed: 3.8, bulletRadius: 0, kamikaze: true },
  shielded:   { hp: 85,  speed: 104, fireRate: 1.6, damage: 13, bulletSpeed: 420, radius: 23, detect: 560, preferred: 240, accuracy: 0.12, score: 180, pal: 'shield', turretTurn: 2.6, turnSpeed: 2.2, bulletRadius: 5, frontShield: true },
  sniper:     { hp: 35,  speed: 92,  fireRate: 3.2, damage: 48, bulletSpeed: 980, radius: 20, detect: 950, preferred: 620, accuracy: 0.015,score: 220, pal: 'sniper', turretTurn: 1.7, turnSpeed: 1.6, bulletRadius: 5, sniper: true },
  splitter:   { hp: 70,  speed: 112, fireRate: 1.8, damage: 12, bulletSpeed: 410, radius: 24, detect: 560, preferred: 260, accuracy: 0.13, score: 170, pal: 'splitter',turretTurn: 2.6, turnSpeed: 2.2, bulletRadius: 5, splits: 2 },
  splitling:  { hp: 18,  speed: 205, fireRate: 1.0, damage: 6,  bulletSpeed: 440, radius: 13, detect: 640, preferred: 150, accuracy: 0.2,  score: 40,  pal: 'splitter',turretTurn: 4.2, turnSpeed: 4.0, bulletRadius: 4 },
  drone:      { hp: 16,  speed: 235, fireRate: 0.9, damage: 5,  bulletSpeed: 480, radius: 12, detect: 720, preferred: 165, accuracy: 0.22, score: 50,  pal: 'scout',  turretTurn: 5.0, turnSpeed: 4.8, bulletRadius: 4 },
};

const POWERUP_TYPES = {
  heal:   { color: '#46c46a', label: '+HP' },
  shield: { color: '#4ec3e0', label: 'SHIELD' },
  rapid:  { color: '#f0a93b', label: 'RAPID' },
  spread: { color: '#c45bd6', label: 'SPREAD' },
  speed:  { color: '#5bd6a8', label: 'SPEED' },
  damage: { color: '#e0563b', label: 'DAMAGE' },
  nuke:   { color: '#ff5a4d', label: 'NUKE' },
  magnet: { color: '#ffcf3a', label: 'MAGNET' },
};

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/* ----------------------------- Obstacle --------------------------------- */
class Obstacle {
  constructor(game, x, y, w, h, opts = {}) {
    this.game = game; this.x = x; this.y = y; this.w = w; this.h = h;
    this.kind = opts.kind || 'rock'; this.destructible = !!opts.destructible;
    this.hp = opts.hp || 40; this.maxHp = this.hp; this.blocksBullets = opts.blocksBullets !== false; this.dead = false; this.hitTimer = 0;
  }
  get cx() { return this.x + this.w / 2; } get cy() { return this.y + this.h / 2; }
  contains(px, py) { return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h; }
  closest(px, py) { return { x: Util.clamp(px, this.x, this.x + this.w), y: Util.clamp(py, this.y, this.y + this.h) }; }
  damage(a) { if (!this.destructible) return; this.hp -= a; this.hitTimer = 0.08; if (this.hp <= 0 && !this.dead) { this.dead = true; this.game.onObstacleDestroyed(this); } }
  update(dt) { if (this.hitTimer > 0) this.hitTimer -= dt; }
  draw(ctx) {
    if (!this.game.camera.visible(this.cx, this.cy, Math.max(this.w, this.h))) return;
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000'; roundRectPath(ctx, this.x + 4, this.y + 5, this.w, this.h, 6); ctx.fill(); ctx.globalAlpha = 1;
    let base, top, line;
    if (this.kind === 'crate') { base = '#a9712f'; top = '#caa05a'; line = '#5e3c14'; }
    else if (this.kind === 'barrel') { base = '#b0392f'; top = '#d76a55'; line = '#5a1c16'; }
    else if (this.kind === 'tree') { base = '#2f7d3a'; top = '#4fae5b'; line = '#1c4a23'; }
    else if (this.kind === 'bush') { base = '#3c8d46'; top = '#62b86d'; line = '#234e29'; }
    else { base = '#7d8489'; top = '#a8b0b5'; line = '#454b4f'; }
    if (this.kind === 'tree' || this.kind === 'bush') {
      const r = this.w / 2; ctx.fillStyle = base; ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, TAU); ctx.fill();
      ctx.fillStyle = top; ctx.beginPath(); ctx.arc(this.cx - r * 0.18, this.cy - r * 0.18, r * 0.66, 0, TAU); ctx.fill();
      ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, TAU); ctx.stroke();
    } else {
      const g = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h); g.addColorStop(0, top); g.addColorStop(1, base); ctx.fillStyle = g;
      roundRectPath(ctx, this.x, this.y, this.w, this.h, 6); ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke();
      if (this.kind === 'crate') { ctx.strokeStyle = 'rgba(94,60,20,0.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(this.x + 4, this.y + 4); ctx.lineTo(this.x + this.w - 4, this.y + this.h - 4); ctx.moveTo(this.x + this.w - 4, this.y + 4); ctx.lineTo(this.x + 4, this.y + this.h - 4); ctx.stroke(); }
      else if (this.kind === 'barrel') { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x + 3, this.y + this.h * 0.33); ctx.lineTo(this.x + this.w - 3, this.y + this.h * 0.33); ctx.moveTo(this.x + 3, this.y + this.h * 0.66); ctx.lineTo(this.x + this.w - 3, this.y + this.h * 0.66); ctx.stroke(); }
    }
    if (this.hitTimer > 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; roundRectPath(ctx, this.x, this.y, this.w, this.h, 6); ctx.fill(); }
    if (this.destructible && this.hp < this.maxHp) { const p = this.hp / this.maxHp; ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(this.x, this.y - 7, this.w, 4); ctx.fillStyle = '#e0c341'; ctx.fillRect(this.x, this.y - 7, this.w * p, 4); }
    ctx.restore();
  }
}

/* ------------------------------- FX ------------------------------------- */
class Decal {
  constructor(x, y, r, color) { this.x = x; this.y = y; this.r = r; this.color = color || 'rgba(20,12,8,0.55)'; this.life = 16; this.maxLife = 16; this.dead = false; this.rot = Util.rand(0, TAU); }
  update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; }
  draw(ctx) { ctx.save(); ctx.globalAlpha = 0.55 * Math.min(1, this.life / 4); ctx.translate(this.x, this.y); ctx.rotate(this.rot); const g = ctx.createRadialGradient(0, 0, 1, 0, 0, this.r); g.addColorStop(0, this.color); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.fill(); ctx.restore(); }
}
class Particle {
  constructor(x, y, opts = {}) { this.x = x; this.y = y; this.vx = opts.vx || 0; this.vy = opts.vy || 0; this.life = opts.life || 0.5; this.maxLife = this.life; this.size = opts.size || 3; this.color = opts.color || '#fff'; this.fade = opts.fade || false; this.shrink = opts.shrink || false; this.drag = opts.drag != null ? opts.drag : 0.9; this.glow = opts.glow || false; this.grav = opts.grav || 0; this.add = opts.add || false; this.dead = false; }
  update(dt) { this.life -= dt; if (this.life <= 0) { this.dead = true; return; } this.x += this.vx * dt; this.y += this.vy * dt; this.vy += this.grav * dt; const d = Math.pow(this.drag, dt * 60); this.vx *= d; this.vy *= d; }
  draw(ctx) { const t = this.life / this.maxLife; ctx.save(); if (this.add) ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = this.fade ? Util.clamp(t, 0, 1) : 1; if (this.glow) { ctx.shadowColor = this.color; ctx.shadowBlur = 8; } ctx.fillStyle = this.color; const s = this.shrink ? this.size * t : this.size; ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0.5, s), 0, TAU); ctx.fill(); ctx.restore(); }
}
class DebrisChunk {
  constructor(x, y, color) { this.x = x; this.y = y; const a = Util.rand(0, TAU), s = Util.rand(120, 360); this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s; this.life = Util.rand(0.5, 1.0); this.maxLife = this.life; this.rot = Util.rand(0, TAU); this.vr = Util.rand(-14, 14); this.size = Util.rand(3, 7); this.color = color || '#3a3a3a'; this.dead = false; }
  update(dt) { this.life -= dt; if (this.life <= 0) { this.dead = true; return; } this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 0.92; this.vy *= 0.92; this.rot += this.vr * dt; }
  draw(ctx) { ctx.save(); ctx.globalAlpha = Util.clamp(this.life / this.maxLife, 0, 1); ctx.translate(this.x, this.y); ctx.rotate(this.rot); ctx.fillStyle = this.color; ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size); ctx.restore(); }
}
class TreadMark { constructor(x, y, a) { this.x = x; this.y = y; this.angle = a; this.life = 6; this.maxLife = 6; this.dead = false; } update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; } draw(ctx) { ctx.save(); ctx.globalAlpha = 0.16 * (this.life / this.maxLife); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.fillStyle = '#000'; ctx.fillRect(-12, -14, 6, 28); ctx.fillRect(6, -14, 6, 28); ctx.restore(); } }
class ShellCasing { constructor(x, y, a) { this.x = x; this.y = y; const s = Util.rand(60, 140); this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s; this.life = 0.6; this.maxLife = 0.6; this.rot = Util.rand(0, TAU); this.vr = Util.rand(-12, 12); this.dead = false; } update(dt) { this.life -= dt; if (this.life <= 0) { this.dead = true; return; } this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 0.9; this.vy *= 0.9; this.rot += this.vr * dt; } draw(ctx) { ctx.save(); ctx.globalAlpha = Util.clamp(this.life / this.maxLife, 0, 1); ctx.translate(this.x, this.y); ctx.rotate(this.rot); ctx.fillStyle = '#c8a13a'; ctx.fillRect(-2, -1, 4, 2); ctx.restore(); } }
class AfterImage { constructor(fn) { this.drawFn = fn; this.life = 0.3; this.maxLife = 0.3; this.dead = false; } update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; } draw(ctx) { ctx.save(); ctx.globalAlpha = 0.25 * (this.life / this.maxLife); this.drawFn(ctx); ctx.restore(); } }
class Beam {
  constructor(x1, y1, x2, y2, color, width) { this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2; this.color = color; this.width = width || 6; this.life = 0.28; this.maxLife = 0.28; this.dead = false; }
  update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; }
  draw(ctx) { const t = this.life / this.maxLife; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = t; ctx.strokeStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 16; ctx.lineWidth = this.width * t; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(this.x1, this.y1); ctx.lineTo(this.x2, this.y2); ctx.stroke(); ctx.lineWidth = this.width * 2.4 * t; ctx.globalAlpha = t * 0.4; ctx.stroke(); ctx.restore(); }
}
class Lightning {
  constructor(points, color) { this.points = points; this.color = color || '#7df9ff'; this.life = 0.22; this.maxLife = 0.22; this.dead = false; this.jit = points.map(() => Util.rand(-8, 8)); }
  update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; }
  draw(ctx) {
    const t = this.life / this.maxLife; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = t; ctx.strokeStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 14; ctx.lineWidth = 2.5;
    for (let s = 0; s < this.points.length - 1; s++) {
      const a = this.points[s], b = this.points[s + 1]; ctx.beginPath(); ctx.moveTo(a.x, a.y);
      const segs = 5; for (let i = 1; i < segs; i++) { const f = i / segs; ctx.lineTo(Util.lerp(a.x, b.x, f) + Util.rand(-9, 9), Util.lerp(a.y, b.y, f) + Util.rand(-9, 9)); }
      ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
}
class ShockwaveFX {
  constructor(x, y, maxR, color) { this.x = x; this.y = y; this.maxR = maxR; this.color = color || 'rgba(150,200,255,'; this.life = 0.4; this.maxLife = 0.4; this.dead = false; }
  update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; }
  draw(ctx) { const t = 1 - this.life / this.maxLife; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = this.color + (1 - t) + ')'; ctx.lineWidth = 8 * (1 - t); ctx.beginPath(); ctx.arc(this.x, this.y, this.maxR * Util.easeOutCubic(t), 0, TAU); ctx.stroke(); ctx.restore(); }
}
// Telegraphed area strike (boss mortar): a warning ring that detonates after a delay.
class Strike {
  constructor(game, x, y, r, delay, dmg, team) { this.game = game; this.x = x; this.y = y; this.r = r; this.delay = delay; this.t = 0; this.dmg = dmg; this.team = team || 'enemy'; this.dead = false; }
  update(dt) {
    this.t += dt;
    if (this.t >= this.delay) {
      this.dead = true; this.game.spawnExplosion(this.x, this.y, this.r / 60); this.game.addDecal(new Decal(this.x, this.y, this.r * 0.7)); this.game.camera.shake(6, 0.2);
      const targets = this.team === 'enemy' ? (this.game.player && this.game.player.alive ? [this.game.player] : []) : this.game.enemies;
      for (const tk of targets) { if (!tk.alive) continue; const d = Util.dist(this.x, this.y, tk.x, tk.y); if (d < this.r) tk.takeDamage(this.dmg * (1 - d / this.r), Util.angleTo(this.x, this.y, tk.x, tk.y), this.team !== 'enemy', {}); }
    }
  }
  draw(ctx) {
    const p = Math.min(this.t / this.delay, 1); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,90,60,${0.35 + 0.45 * p})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, TAU); ctx.stroke();
    ctx.fillStyle = `rgba(255,90,60,${0.14 * p})`; ctx.beginPath(); ctx.arc(this.x, this.y, this.r * p, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

/* ----------------------------- Explosion (overhauled) ------------------- */
class Explosion {
  constructor(game, x, y, scale = 1) {
    this.game = game; this.x = x; this.y = y; this.scale = scale; this.time = 0; this.dur = 0.55; this.dead = false;
    this.sheet = game.assets.getImage('img/Explosion_C.png') || game.assets.getImage('img/Explosion_A.png');
    this.frames = 5; this.frameW = 256; this.frameH = 256;
    // embers / sparks
    for (let i = 0; i < 16 * scale; i++) { const a = Util.rand(0, TAU), sp = Util.rand(80, 320) * scale; game.addParticle(new Particle(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: Util.rand(0.3, 0.8), size: Util.rand(2, 6) * scale, color: Util.choice(['#fff3c4', '#ffd34d', '#ff8c2b', '#ff5a2b']), fade: true, shrink: true, glow: true, add: true })); }
    // smoke
    for (let i = 0; i < 8 * scale; i++) { const a = Util.rand(0, TAU), sp = Util.rand(10, 70) * scale; game.addParticle(new Particle(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: Util.rand(0.7, 1.4), size: Util.rand(6, 12) * scale, color: 'rgba(50,50,50,0.5)', fade: true, drag: 0.96 })); }
    // debris
    for (let i = 0; i < 5 * scale; i++) game.addDebris(new DebrisChunk(x, y, Util.choice(['#3a3a3a', '#5a4a3a', '#777'])));
  }
  update(dt) { this.time += dt; if (this.time >= this.dur) this.dead = true; }
  draw(ctx) {
    const t = this.time / this.dur;
    // white flash core (additive)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const fl = Math.max(0, 1 - t * 3);
    if (fl > 0) { ctx.globalAlpha = fl; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.x, this.y, 40 * this.scale * (0.5 + t), 0, TAU); ctx.fill(); }
    // fireball
    ctx.globalAlpha = (1 - t) * 0.9; const g = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, 60 * this.scale * (0.4 + t));
    g.addColorStop(0, 'rgba(255,240,180,0.9)'); g.addColorStop(0.5, 'rgba(255,140,50,0.7)'); g.addColorStop(1, 'rgba(120,30,10,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, this.y, 60 * this.scale * (0.4 + t), 0, TAU); ctx.fill();
    // shockwave ring
    ctx.globalAlpha = (1 - t) * 0.6; ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 5 * (1 - t); ctx.beginPath(); ctx.arc(this.x, this.y, 20 + t * 90 * this.scale, 0, TAU); ctx.stroke();
    ctx.restore();
    // sprite sheet on top (subtle)
    if (this.sheet) { const idx = Math.min(this.frames - 1, Math.floor(t * this.frames)), size = 150 * this.scale; ctx.save(); ctx.globalAlpha = (1 - t) * 0.55; ctx.drawImage(this.sheet, idx * this.frameW, 0, this.frameW, this.frameH, this.x - size / 2, this.y - size / 2, size, size); ctx.restore(); }
  }
}

class FloatingText {
  constructor(x, y, text, opts = {}) { this.x = x; this.y = y; this.text = text; this.color = opts.color || '#fff'; this.size = opts.size || 18; this.life = opts.life || 0.9; this.maxLife = this.life; this.vy = opts.vy || -42; this.dead = false; this.bold = opts.bold !== false; }
  update(dt) { this.life -= dt; this.y += this.vy * dt; this.vy *= 0.94; if (this.life <= 0) this.dead = true; }
  draw(ctx) { const k = Util.clamp(this.life / this.maxLife * 1.4, 0, 1); const pop = this.life > this.maxLife - 0.1 ? Util.easeOutBack(1 - (this.life - (this.maxLife - 0.1)) / 0.1) : 1; ctx.save(); ctx.globalAlpha = k; ctx.font = `${this.bold ? 'bold ' : ''}${this.size * pop}px Trebuchet MS, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(this.text, this.x, this.y); ctx.fillStyle = this.color; ctx.fillText(this.text, this.x, this.y); ctx.restore(); }
}

/* ----------------------------- Pickups ---------------------------------- */
class PowerUp {
  constructor(game, x, y, type) { this.game = game; this.x = x; this.y = y; this.type = type; this.radius = 16; this.bob = Math.random() * TAU; this.life = 20; this.dead = false; }
  update(dt) {
    this.bob += dt * 3; this.life -= dt; if (this.life <= 0) { this.dead = true; return; }
    const p = this.game.player;
    if (p && p.alive) { const d = Util.dist(this.x, this.y, p.x, p.y), mag = p.pickupRange || 120; if (d < mag) { const a = Util.angleTo(this.x, this.y, p.x, p.y), pull = (mag - d) * 2.2; this.x += Math.cos(a) * pull * dt; this.y += Math.sin(a) * pull * dt; } if (d < this.radius + p.radius) this._collect(p); }
  }
  _collect(p) {
    this.dead = true; this.game.audio.pickup();
    if (this.type === 'nuke') this.game.nukeScreen(); else if (this.type === 'magnet') this.game.magnetPickup(); else p.applyPowerUp(this.type);
    const info = POWERUP_TYPES[this.type]; this.game.addFloatingText(this.x, this.y - 10, info.label, { color: info.color, size: 18 });
    for (let i = 0; i < 12; i++) { const a = Util.rand(0, TAU), sp = Util.rand(40, 140); this.game.addParticle(new Particle(this.x, this.y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, size: 3, color: info.color, fade: true, shrink: true, glow: true, add: true })); }
  }
  draw(ctx) {
    const info = POWERUP_TYPES[this.type], yoff = Math.sin(this.bob) * 4, blink = this.life < 4 && Math.floor(this.life * 6) % 2 === 0;
    ctx.save(); ctx.translate(this.x, this.y + yoff); if (blink) ctx.globalAlpha = 0.4;
    ctx.shadowColor = info.color; ctx.shadowBlur = 14; ctx.fillStyle = 'rgba(255,255,255,0.92)'; roundRectPath(ctx, -this.radius, -this.radius, this.radius * 2, this.radius * 2, 6); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = info.color; ctx.lineWidth = 3; roundRectPath(ctx, -this.radius, -this.radius, this.radius * 2, this.radius * 2, 6); ctx.stroke(); this._icon(ctx, info.color); ctx.restore();
  }
  _icon(ctx, color) {
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (this.type) {
      case 'heal': ctx.fillRect(-3, -9, 6, 18); ctx.fillRect(-9, -3, 18, 6); break;
      case 'shield': ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(8, -5); ctx.lineTo(8, 3); ctx.lineTo(0, 10); ctx.lineTo(-8, 3); ctx.lineTo(-8, -5); ctx.closePath(); ctx.fill(); break;
      case 'rapid': ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(1, 0); ctx.lineTo(-7, 7); ctx.moveTo(0, -7); ctx.lineTo(8, 0); ctx.lineTo(0, 7); ctx.stroke(); break;
      case 'spread': ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -8); ctx.moveTo(0, 6); ctx.lineTo(-7, -5); ctx.moveTo(0, 6); ctx.lineTo(7, -5); ctx.stroke(); break;
      case 'speed': ctx.beginPath(); ctx.moveTo(2, -9); ctx.lineTo(-5, 1); ctx.lineTo(0, 1); ctx.lineTo(-2, 9); ctx.lineTo(6, -2); ctx.lineTo(1, -2); ctx.closePath(); ctx.fill(); break;
      case 'damage': ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = i % 2 ? 4 : 9; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); break;
      case 'nuke': ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill(); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 9, i / 3 * TAU + 0.3, i / 3 * TAU + 1.2); ctx.lineWidth = 4; ctx.stroke(); } break;
      case 'magnet': ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 1, 7, Math.PI, TAU); ctx.stroke(); ctx.fillRect(-7, 1, 4, 6); ctx.fillRect(3, 1, 4, 6); break;
    }
  }
}
class Coin {
  constructor(game, x, y, value = 1) { this.game = game; this.x = x; this.y = y; this.value = value; this.radius = 9; this.bob = Math.random() * TAU; this.life = 22; this.dead = false; this.vx = Util.rand(-60, 60); this.vy = Util.rand(-60, 60); }
  update(dt) {
    this.bob += dt * 6; this.life -= dt; if (this.life <= 0) { this.dead = true; return; } this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 0.9; this.vy *= 0.9;
    const p = this.game.player;
    if (p && p.alive) { const d = Util.dist(this.x, this.y, p.x, p.y), mag = p.pickupRange || 120; if (d < mag) { const a = Util.angleTo(this.x, this.y, p.x, p.y), pull = (mag - d) * 2.6; this.x += Math.cos(a) * pull * dt; this.y += Math.sin(a) * pull * dt; } if (d < this.radius + p.radius) { this.dead = true; this.game.onCoinCollected(this.value); this.game.audio.coin(); } }
  }
  draw(ctx) { const s = 1 + Math.sin(this.bob) * 0.18, blink = this.life < 4 && Math.floor(this.life * 6) % 2 === 0; ctx.save(); ctx.translate(this.x, this.y); if (blink) ctx.globalAlpha = 0.45; ctx.shadowColor = '#ffcf3a'; ctx.shadowBlur = 10; ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.ellipse(0, 0, this.radius * s, this.radius, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#b8902f'; ctx.beginPath(); ctx.ellipse(0, 0, this.radius * 0.55 * s, this.radius * 0.55, 0, 0, TAU); ctx.fill(); ctx.restore(); }
}
class WeaponCrate {
  constructor(game, x, y, weaponKey) { this.game = game; this.x = x; this.y = y; this.weaponKey = weaponKey; this.radius = 18; this.bob = Math.random() * TAU; this.life = 30; this.dead = false; }
  update(dt) { this.bob += dt * 2.5; this.life -= dt; if (this.life <= 0) { this.dead = true; return; } const p = this.game.player; if (p && p.alive && Util.dist(this.x, this.y, p.x, p.y) < this.radius + p.radius) { this.dead = true; p.giveWeapon(this.weaponKey); this.game.audio.powerHit(); const w = WEAPONS[this.weaponKey]; this.game.addFloatingText(this.x, this.y - 12, w.name.toUpperCase(), { color: w.color, size: 18 }); } }
  draw(ctx) { const w = WEAPONS[this.weaponKey], yoff = Math.sin(this.bob) * 3; ctx.save(); ctx.translate(this.x, this.y + yoff); ctx.shadowColor = w.color; ctx.shadowBlur = 16; ctx.fillStyle = '#2b3340'; roundRectPath(ctx, -this.radius, -this.radius, this.radius * 2, this.radius * 2, 5); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = w.color; ctx.lineWidth = 3; roundRectPath(ctx, -this.radius, -this.radius, this.radius * 2, this.radius * 2, 5); ctx.stroke(); ctx.fillStyle = w.color; ctx.font = 'bold 16px Trebuchet MS'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(w.name[0], 0, 1); ctx.restore(); }
}

/* ------------------------------- Tank ----------------------------------- */
class Tank {
  constructor(game, x, y, opts) {
    this.game = game; this.x = x; this.y = y; this.radius = opts.radius; this.team = opts.team; this.palette = PALETTE[opts.pal];
    this.maxHp = opts.maxHp; this.hp = opts.maxHp; this.speed = opts.speed || 0; this.turnSpeed = opts.turnSpeed || 3; this.turretTurn = opts.turretTurn || 3;
    this.bodyAngle = Util.rand(0, TAU); this.turretAngle = this.bodyAngle; this.alive = true; this.hitTimer = 0; this.recoil = 0; this.treadOffset = 0; this.moving = false; this._treadTimer = 0; this._smokeTimer = 0;
    this.shieldTime = 0; this.rapidTime = 0; this.spreadTime = 0; this.speedTime = 0; this.damageTime = 0; this.burn = 0; this.slow = 0; this.elite = false;
  }
  get barrelLength() { return this.radius * 1.9; }
  moveBy(dx, dy, dt) { if (dx === 0 && dy === 0) { this.moving = false; return; } this.moving = true; this.x += dx; this.y += dy; this._resolveCollisions(); this.treadOffset = (this.treadOffset + Math.hypot(dx, dy) * 0.4) % 12; this._treadTimer -= dt; if (this._treadTimer <= 0) { this._treadTimer = 0.08; this.game.addTreadMark(new TreadMark(this.x, this.y, this.bodyAngle)); } }
  _resolveCollisions() {
    const w = this.game.world; this.x = Util.clamp(this.x, this.radius, w.w - this.radius); this.y = Util.clamp(this.y, this.radius, w.h - this.radius);
    for (const o of this.game.obstacles) { if (o.dead) continue; const c = o.closest(this.x, this.y), dx = this.x - c.x, dy = this.y - c.y, d2 = dx * dx + dy * dy; if (d2 < this.radius * this.radius) { const d = Math.sqrt(d2) || 0.0001, push = this.radius - d; this.x += (dx / d) * push; this.y += (dy / d) * push; } }
    for (const t of this.game.allTanks()) { if (t === this || !t.alive) continue; const dx = this.x - t.x, dy = this.y - t.y, min = this.radius + t.radius, d2 = dx * dx + dy * dy; if (d2 < min * min && d2 > 0.0001) { const d = Math.sqrt(d2), ov = min - d, nx = dx / d, ny = dy / d; if (t.movable === false) { this.x += nx * ov; this.y += ny * ov; } else { const h = ov * 0.5; this.x += nx * h; this.y += ny * h; t.x -= nx * h; t.y -= ny * h; } } }
  }
  aimTurret(a, dt) { this.turretAngle = Util.rotateToward(this.turretAngle, a, this.turretTurn * dt); }
  takeDamage(amount, fromAngle, fromPlayer, opts = {}) {
    if (!this.alive) return false;
    if (this.shieldTime > 0) { this.game.addFloatingText(this.x, this.y - this.radius - 8, 'BLOCK', { color: '#4ec3e0', size: 14 }); return false; }
    if (this.frontShield) { const incoming = fromAngle + Math.PI; if (Math.abs(Util.angleDiff(this.bodyAngle, incoming)) < 1.1) { this.game.audio.hitArmor(); this.game.addFloatingText(this.x, this.y - this.radius - 8, 'BLOCKED', { color: '#9fd4e0', size: 13 }); return false; } }
    this.hp -= amount; this.hitTimer = 0.1; if (opts.burn) this.burn = Math.max(this.burn, opts.burn); if (opts.freeze) this.slow = Math.max(this.slow, opts.freeze);
    const kb = opts.knockback || 4; this.x += Math.cos(fromAngle) * kb; this.y += Math.sin(fromAngle) * kb; this._resolveCollisions();
    const col = opts.crit ? '#ffd34d' : (this.team === 'player' ? '#ff9a9a' : '#fff'); this.game.addFloatingText(this.x + Util.rand(-6, 6), this.y - this.radius - 6, Math.round(amount), { color: col, size: opts.crit ? 17 : 13, bold: !!opts.crit });
    if (opts.crit) this.game.addFloatingText(this.x, this.y - this.radius - 22, 'CRIT!', { color: '#ffd34d', size: 15 });
    if (this.hp <= 0) { this.die(fromPlayer); return true; }
    return false;
  }
  die(byPlayer) {
    if (!this.alive) return; this.alive = false; this.hp = 0;
    const sc = this.radius / 21 * (this.elite ? 1.3 : 1); this.game.spawnExplosion(this.x, this.y, sc); this.game.addDecal(new Decal(this.x, this.y, this.radius * 1.6));
    this.game.audio.explosion(sc); this.game.camera.shake(this.team === 'player' ? 12 : Math.min(10, 4 + this.radius / 7), 0.35); this.game.hitStop(this.team === 'player' || this.boss ? 0.08 : 0.03);
    this.game.onTankDestroyed(this, byPlayer);
  }
  updateTimers(dt) {
    if (this.hitTimer > 0) this.hitTimer -= dt; if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 40);
    for (const k of ['shieldTime', 'rapidTime', 'spreadTime', 'speedTime', 'damageTime', 'slow']) if (this[k] > 0) this[k] -= dt;
    if (this.burn > 0) { this.burn -= dt; this._burnTick = (this._burnTick || 0) - dt; if (this._burnTick <= 0) { this._burnTick = 0.4; this.takeDamage(6, Util.rand(0, TAU), true, {}); this.game.addParticle(new Particle(this.x + Util.rand(-8, 8), this.y + Util.rand(-8, 8), { vx: 0, vy: -40, life: 0.4, size: 4, color: Util.choice(['#ff8c2b', '#ffd34d']), fade: true, shrink: true, glow: true, add: true })); } }
    if (this.alive && this.hp < this.maxHp * 0.5) { this._smokeTimer -= dt; if (this._smokeTimer <= 0) { this._smokeTimer = this.hp < this.maxHp * 0.25 ? 0.1 : 0.22; this.game.addParticle(new Particle(this.x + Util.rand(-6, 6), this.y + Util.rand(-6, 6), { vx: Util.rand(-10, 10), vy: -Util.rand(20, 45), life: Util.rand(0.6, 1.1), size: Util.rand(4, 8), color: 'rgba(40,40,40,0.5)', fade: true, drag: 0.97 })); } }
  }
  draw(ctx) {
    if (!this.game.camera.visible(this.x, this.y, this.radius * 2)) return;
    const p = this.palette, R = this.radius; ctx.save(); ctx.translate(this.x, this.y);
    if (this.elite) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + 0.15 * Math.sin(this.game.time * 6); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(0, 0, R * 1.5, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.save(); ctx.translate(4, 5); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, R * 1.15, R * 0.95, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.save(); ctx.rotate(this.bodyAngle); const L = R * 2.2, W = R * 1.7;
    ctx.fillStyle = p.tread; roundRectPath(ctx, -L / 2, -W / 2, L, W * 0.3, 4); ctx.fill(); roundRectPath(ctx, -L / 2, W / 2 - W * 0.3, L, W * 0.3, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; for (let i = -3; i <= 3; i++) { const lx = i * 12 + this.treadOffset - 6; if (lx > -L / 2 + 2 && lx < L / 2 - 4) { ctx.fillRect(lx, -W / 2 + 1, 3, W * 0.3 - 2); ctx.fillRect(lx, W / 2 - W * 0.3 + 1, 3, W * 0.3 - 2); } }
    const g = ctx.createLinearGradient(0, -W / 2, 0, W / 2); g.addColorStop(0, p.hi); g.addColorStop(0.5, p.hull); g.addColorStop(1, p.hullDark); ctx.fillStyle = g; roundRectPath(ctx, -L * 0.42, -W * 0.32, L * 0.84, W * 0.64, 5); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; roundRectPath(ctx, -L * 0.40, -W * 0.30, L * 0.8, W * 0.12, 4); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRectPath(ctx, L * 0.30, -W * 0.22, L * 0.1, W * 0.44, 2); ctx.fill();
    if (this.frontShield) { ctx.strokeStyle = '#bfe2ef'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, R * 1.18, -0.9, 0.9); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.rotate(this.turretAngle); const recoil = this.recoil * 0.6;
    ctx.fillStyle = p.barrel; roundRectPath(ctx, R * 0.2 - recoil, -R * 0.16, this.barrelLength - R * 0.2, R * 0.32, R * 0.12); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#1c1c1c'; roundRectPath(ctx, this.barrelLength - R * 0.3 - recoil, -R * 0.22, R * 0.28, R * 0.44, 2); ctx.fill();
    const tg = ctx.createRadialGradient(-R * 0.1, -R * 0.1, 2, 0, 0, R * 0.62); tg.addColorStop(0, p.turret); tg.addColorStop(1, p.hullDark); ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(0, 0, R * 0.6, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(-R * 0.12, 0, R * 0.16, 0, TAU); ctx.fill(); ctx.restore();
    if (this.hitTimer > 0) { ctx.globalAlpha = this.hitTimer / 0.1 * 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, R * 1.2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (this.shieldTime > 0) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.game.time * 8); ctx.strokeStyle = '#4ec3e0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R * 1.35, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    if (this.burn > 0) { ctx.globalAlpha = 0.4; ctx.strokeStyle = '#ff8c2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * 1.25, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    if (this.slow > 0) { ctx.globalAlpha = 0.4; ctx.strokeStyle = '#7df9ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * 1.3, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore(); this.drawHealthBar(ctx);
  }
  drawHealthBar(ctx) {
    if (this.hp >= this.maxHp && this.team !== 'player') return;
    const w = this.radius * 2.2, h = 5, x = this.x - w / 2, y = this.y - this.radius - 14, p = Util.clamp(this.hp / this.maxHp, 0, 1);
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.6)'; roundRectPath(ctx, x - 1, y - 1, w + 2, h + 2, 3); ctx.fill(); ctx.fillStyle = p > 0.5 ? '#5fcf5f' : (p > 0.25 ? '#e0c341' : '#e05050'); roundRectPath(ctx, x, y, w * p, h, 2); ctx.fill();
    if (this.elite) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 1; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2); } ctx.restore();
  }
}

/* ------------------------------ Bullet ---------------------------------- */
class Bullet {
  constructor(game, x, y, angle, opts) {
    this.game = game; this.x = x; this.y = y; this.angle = angle; this.speed = opts.speed;
    this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed;
    this.radius = opts.radius || 5; this.damage = opts.damage; this.team = opts.team;
    this.life = opts.life || CONFIG.bulletLife; this.kind = opts.kind || 'bullet';
    this.splash = opts.splash || 0; this.pierce = opts.pierce || 0; this.ricochet = opts.ricochet || 0;
    this.burn = opts.burn || 0; this.freeze = opts.freeze || 0; this.knockback = opts.knockback || 0;
    this.explode = opts.explode || 0; this.crit = opts.crit || false; this.dead = false; this._hit = new Set(); this._trailTimer = 0;
    this.color = opts.color || (this.team === 'player' ? '#ffd34d' : '#ff5a4d');
    this.glow = this.team === 'player' ? 'rgba(255,211,77,0.5)' : 'rgba(255,90,77,0.5)';
  }
  update(dt) {
    const px = this.x, py = this.y; this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt;
    if (this.life <= 0) { this.dead = true; if (this.explode || this.splash) this._boom(); return; }
    if (this.x < 0 || this.y < 0 || this.x > this.game.world.w || this.y > this.game.world.h) {
      if (this.ricochet > 0) { if (this.x < 0 || this.x > this.game.world.w) this.vx *= -1; if (this.y < 0 || this.y > this.game.world.h) this.vy *= -1; this.x = Util.clamp(this.x, 1, this.game.world.w - 1); this.y = Util.clamp(this.y, 1, this.game.world.h - 1); this.angle = Math.atan2(this.vy, this.vx); this.ricochet--; return; }
      this._impact(false); return;
    }
    for (const o of this.game.obstacles) {
      if (o.dead || !o.blocksBullets) continue; const c = o.closest(this.x, this.y);
      if (Util.dist2(this.x, this.y, c.x, c.y) <= this.radius * this.radius) {
        if (o.destructible) o.damage(this.damage);
        if (this.ricochet > 0 && !o.destructible) { const dx = this.x - c.x, dy = this.y - c.y; if (Math.abs(dx) > Math.abs(dy)) this.vx *= -1; else this.vy *= -1; this.x += this.vx * dt; this.y += this.vy * dt; this.angle = Math.atan2(this.vy, this.vx); this.ricochet--; return; }
        if (this.explode || this.splash) { this._boom(); return; } this._impact(false); return;
      }
    }
    const targets = this.team === 'player' ? this.game.enemies : (this.game.player && this.game.player.alive ? [this.game.player] : []);
    for (const t of targets) {
      if (!t.alive || this._hit.has(t)) continue; const rr = t.radius + this.radius;
      if (Util.dist2(this.x, this.y, t.x, t.y) <= rr * rr) {
        t.takeDamage(this.damage, this.angle, this.team === 'player', { crit: this.crit, burn: this.burn, freeze: this.freeze, knockback: this.knockback });
        if (this.explode || this.splash) { this._boom(); return; }
        this._hit.add(t); if (this.pierce > 0) { this.pierce--; continue; } this._impact(true); return;
      }
    }
    this._trailTimer -= dt;
    if (this._trailTimer <= 0) {
      this._trailTimer = this.kind === 'rocket' ? 0.012 : 0.02;
      if (this.kind === 'flame') this.game.addParticle(new Particle(this.x, this.y, { vx: Util.rand(-20, 20), vy: Util.rand(-20, 20), life: 0.3, size: this.radius * 1.3, color: Util.choice(['#ffd34d', '#ff8c2b', '#ff5a2b']), fade: true, shrink: true, add: true }));
      else this.game.addParticle(new Particle(px, py, { vx: Util.rand(-12, 12), vy: Util.rand(-12, 12), life: this.kind === 'rocket' ? 0.35 : 0.18, size: this.radius * (this.kind === 'rocket' ? 1.1 : 0.8), color: this.kind === 'rocket' ? 'rgba(220,220,220,0.7)' : this.color, fade: true, shrink: true, add: this.team === 'player' }));
    }
  }
  _boom() {
    this.dead = true; const r = this.splash || this.explode; this.game.spawnExplosion(this.x, this.y, r > 80 ? 0.9 : 0.6); this.game.addDecal(new Decal(this.x, this.y, r * 0.5)); this.game.camera.shake(4, 0.15);
    for (const t of (this.team === 'player' ? this.game.enemies : (this.game.player && this.game.player.alive ? [this.game.player] : []))) { if (!t.alive) continue; const d = Util.dist(this.x, this.y, t.x, t.y); if (d < r) t.takeDamage(this.damage * (1 - d / r), Util.angleTo(this.x, this.y, t.x, t.y), this.team === 'player', { burn: this.burn }); }
  }
  _impact(hitTank) { this.dead = true; this.game.audio.hit(); const n = hitTank ? 9 : 5; for (let i = 0; i < n; i++) { const a = Util.rand(0, TAU), sp = Util.rand(40, 160); this.game.addParticle(new Particle(this.x, this.y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: Util.rand(0.2, 0.4), size: Util.rand(2, 4), color: hitTank ? this.color : '#d9d2c5', fade: true, shrink: true, add: hitTank })); } }
  draw(ctx) {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    if (this.kind === 'flame') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, TAU); ctx.fill(); ctx.restore(); return; }
    if (this.kind === 'laser') { ctx.shadowColor = this.color; ctx.shadowBlur = 12; ctx.fillStyle = this.color; roundRectPath(ctx, -this.radius * 3, -this.radius * 0.5, this.radius * 6, this.radius, this.radius * 0.5); ctx.fill(); }
    else { ctx.shadowColor = this.glow; ctx.shadowBlur = 10; ctx.fillStyle = this.color; const len = this.kind === 'rocket' ? this.radius * 2.4 : this.radius * 1.6; roundRectPath(ctx, -len, -this.radius * 0.7, len * 2, this.radius * 1.4, this.radius * 0.7); ctx.fill(); }
    ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.radius * 0.7, 0, this.radius * 0.42, 0, TAU); ctx.fill();
    if (this.crit) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, this.radius * 1.7, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
}

/* --------------------------- Player tank -------------------------------- */
class PlayerTank extends Tank {
  constructor(game, x, y) {
    super(game, x, y, { radius: CONFIG.player.radius, team: 'player', pal: 'player', maxHp: CONFIG.player.maxHp, speed: CONFIG.player.speed, turnSpeed: CONFIG.player.turnSpeed, turretTurn: CONFIG.player.turretTurn });
    this.invuln = 1.0;
    this.weapons = { cannon: Infinity }; this.weaponOrder = ['cannon']; this.weapon = 'cannon'; this.fireCooldown = 0;
    this.dashTime = 0; this.dashCd = 0; this.dashDir = { x: 1, y: 0 }; this.shockCd = 0; this.ultMeter = 0;
    this.damageMult = 1; this.fireRateMult = 1; this.speedMult = 1; this.bulletSpeedMult = 1; this.extraProjectiles = 0; this.ricochet = 0; this.pierceBonus = 0; this.incendiary = 0;
    this.lifestealPct = 0; this.critChance = 0.06; this.critMult = 2; this.thorns = 0; this.pickupRange = 120; this.dropBonus = 0; this.adrenaline = false; this.dashCdMult = 1;
    this.explosiveRounds = 0; this.freezeRounds = 0; this.knockbackBonus = 0; this.dodgeChance = 0; this.regen = 0; this.drones = 0; this.ultGainMult = 1; this.reviveCharges = 0; this.droneAngle = 0; this.droneCd = 0;
  }
  giveWeapon(key) { const w = WEAPONS[key]; if (this.weapons[key] === undefined) { this.weapons[key] = w.ammo || 0; this.weaponOrder.push(key); } else this.weapons[key] += w.ammo || 0; this.weapon = key; }
  cycleWeapon(d) { const i = this.weaponOrder.indexOf(this.weapon); this.weapon = this.weaponOrder[(i + d + this.weaponOrder.length) % this.weaponOrder.length]; }
  selectWeaponIndex(n) { if (n >= 0 && n < this.weaponOrder.length) this.weapon = this.weaponOrder[n]; }
  addUlt(k) { this.ultMeter = Math.min(1, this.ultMeter + k * this.ultGainMult); }
  applyPowerUp(type) { switch (type) { case 'heal': this.hp = Math.min(this.maxHp, this.hp + 40); break; case 'shield': this.shieldTime = 8; break; case 'rapid': this.rapidTime = 8; break; case 'spread': this.spreadTime = 10; break; case 'speed': this.speedTime = 8; break; case 'damage': this.damageTime = 10; break; } }
  takeDamage(amount, fromAngle, fromPlayer, opts) {
    if (this.invuln > 0 || this.dashTime > 0) return false;
    if (this.dodgeChance > 0 && Util.chance(this.dodgeChance)) { this.game.addFloatingText(this.x, this.y - this.radius - 8, 'DODGE', { color: '#7df9ff', size: 14 }); return false; }
    const killed = super.takeDamage(amount, fromAngle, fromPlayer, opts);
    if (killed && this.reviveCharges > 0) { this.reviveCharges--; this.alive = true; this.hp = this.maxHp * 0.6; this.invuln = 2.5; this.shieldTime = 3; this.game.onRevive(); return false; }
    return killed;
  }
  dash() {
    if (this.dashCd > 0) return; this.dashCd = 1.5 * this.dashCdMult; this.dashTime = 0.18; const input = this.game.input; let dx = 0, dy = 0;
    if (input.down('KeyW') || input.down('ArrowUp')) dy -= 1; if (input.down('KeyS') || input.down('ArrowDown')) dy += 1; if (input.down('KeyA') || input.down('ArrowLeft')) dx -= 1; if (input.down('KeyD') || input.down('ArrowRight')) dx += 1;
    if (dx === 0 && dy === 0 && (input.move.x || input.move.y)) { dx = input.move.x; dy = input.move.y; }
    if (dx === 0 && dy === 0) { dx = Math.cos(this.bodyAngle); dy = Math.sin(this.bodyAngle); }
    const len = Math.hypot(dx, dy); this.dashDir = { x: dx / len, y: dy / len }; this.bodyAngle = Math.atan2(dy, dx); this.game.audio.dash(); this.game.camera.shake(4, 0.12);
  }
  shockwave() {
    if (this.shockCd > 0) return; this.shockCd = 6; this.game.audio.shockwave(); this.game.addShockwaveFX(new ShockwaveFX(this.x, this.y, 220, 'rgba(120,200,255,')); this.game.camera.shake(8, 0.3); this.game.hitStop(0.05);
    for (const e of this.game.enemies) { if (!e.alive) continue; const d = Util.dist(this.x, this.y, e.x, e.y); if (d < 220) { const a = Util.angleTo(this.x, this.y, e.x, e.y); e.takeDamage(40, a, true, { knockback: 60 * (1 - d / 220), freeze: 1 }); } }
  }
  useUltimate() {
    if (this.ultMeter < 1) return; this.ultMeter = 0; this.game.audio.ultimate(); this.game.screenFlash('rgba(255,240,180,', 0.6); this.game.setSlowmo(1.2); this.invuln = Math.max(this.invuln, 1.4); this.game.camera.shake(10, 0.6);
    const n = 28; for (let i = 0; i < n; i++) { const a = i / n * TAU; this.game.addBullet(new Bullet(this.game, this.x + Math.cos(a) * this.radius, this.y + Math.sin(a) * this.radius, a, { speed: 720, damage: 40 * this.damageMult, team: 'player', radius: 6, pierce: 2, color: '#ffe27a' })); }
  }
  fire() {
    if (this.fireCooldown > 0) return; let w = WEAPONS[this.weapon];
    if (!w.infinite && (this.weapons[this.weapon] || 0) <= 0) { this.weapon = 'cannon'; w = WEAPONS.cannon; }
    const rate = w.fireRate * this.fireRateMult * (this.rapidTime > 0 ? 0.5 : 1) * (this.adrenaline && this.hp < this.maxHp * 0.4 ? 0.6 : 1);
    this.fireCooldown = rate; this.recoil = w.recoil; if (!w.infinite) this.weapons[this.weapon]--;
    const baseDmg = w.damage * this.damageMult * (this.damageTime > 0 ? 1.6 : 1);
    const tipX = this.x + Math.cos(this.turretAngle) * this.barrelLength, tipY = this.y + Math.sin(this.turretAngle) * this.barrelLength;
    if (w.kind === 'rail') this._fireRail(tipX, tipY, baseDmg, w);
    else if (w.kind === 'tesla') this._fireTesla(tipX, tipY, baseDmg, w);
    else {
      const pellets = w.pellets + this.extraProjectiles + (this.spreadTime > 0 ? 2 : 0); const spreadBase = w.spread || (pellets > 1 ? 0.14 : 0);
      for (let i = 0; i < pellets; i++) {
        const t = pellets > 1 ? (i / (pellets - 1) - 0.5) : 0; const ang = this.turretAngle + t * spreadBase + Util.rand(-0.02, 0.02); const crit = Util.chance(this.critChance);
        this.game.addBullet(new Bullet(this.game, tipX, tipY, ang, { speed: w.speed * this.bulletSpeedMult, damage: baseDmg * (crit ? this.critMult : 1), team: 'player', radius: w.radius, kind: w.kind, splash: w.splash || 0, pierce: (w.pierce || 0) + this.pierceBonus, ricochet: this.ricochet, burn: this.incendiary || w.burn || 0, freeze: this.freezeRounds, knockback: this.knockbackBonus, explode: this.explosiveRounds, crit, color: w.color, life: w.life }));
      }
      this.game.addShellCasing(new ShellCasing(tipX, tipY, this.turretAngle + Math.PI / 2 + Util.rand(-0.4, 0.4)));
    }
    for (let i = 0; i < 6; i++) { const a = this.turretAngle + Util.rand(-0.4, 0.4), sp = Util.rand(80, 200); this.game.addParticle(new Particle(tipX, tipY, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.16, size: Util.rand(2, 5), color: Util.choice(['#fff3c4', '#ffd34d', '#ff9a3b']), fade: true, shrink: true, glow: true, add: true })); }
    if (this.game.audio[w.sound]) this.game.audio[w.sound](); this.game.camera.shake(w.shake, 0.08);
  }
  _raycast(x, y, angle, range) {
    let end = range; const step = 14, dx = Math.cos(angle), dy = Math.sin(angle);
    for (let d = step; d < range; d += step) { const px = x + dx * d, py = y + dy * d; if (px < 0 || py < 0 || px > this.game.world.w || py > this.game.world.h) { end = d; break; } let blocked = false; for (const o of this.game.obstacles) { if (o.dead) continue; if (o.destructible && o.contains(px, py)) o.damage(9999); else if (o.blocksBullets && o.contains(px, py)) { blocked = true; break; } } if (blocked) { end = d; break; } }
    return { x: x + dx * end, y: y + dy * end, dist: end };
  }
  _fireRail(tipX, tipY, dmg, w) {
    const r = this._raycast(tipX, tipY, this.turretAngle, 1500); const crit = Util.chance(this.critChance); const finalDmg = dmg * (crit ? this.critMult : 1);
    const dx = Math.cos(this.turretAngle), dy = Math.sin(this.turretAngle);
    for (const e of this.game.enemies) { if (!e.alive) continue; const ex = e.x - tipX, ey = e.y - tipY; const proj = ex * dx + ey * dy; if (proj < 0 || proj > r.dist) continue; const perp = Math.abs(ex * dy - ey * dx); if (perp < e.radius + 10) e.takeDamage(finalDmg, this.turretAngle, true, { crit, burn: this.incendiary, knockback: this.knockbackBonus + 8 }); }
    this.game.addBeam(new Beam(tipX, tipY, r.x, r.y, '#b39bff', 8)); this.game.camera.shake(w.shake, 0.12); this.game.hitStop(0.04);
  }
  _fireTesla(tipX, tipY, dmg, w) {
    const pts = [{ x: tipX, y: tipY }]; const hit = new Set(); let from = { x: this.x, y: this.y }; let chain = w.chain;
    while (chain-- > 0) { let best = null, bd = w.range; for (const e of this.game.enemies) { if (!e.alive || hit.has(e)) continue; const d = Util.dist(from.x, from.y, e.x, e.y); if (d < bd) { bd = d; best = e; } } if (!best) break; hit.add(best); const crit = Util.chance(this.critChance); best.takeDamage(dmg * (crit ? this.critMult : 1), Util.angleTo(from.x, from.y, best.x, best.y), true, { crit, freeze: 0.6 }); pts.push({ x: best.x, y: best.y }); from = best; }
    if (pts.length > 1) this.game.addLightning(new Lightning(pts, w.color));
  }
  onKill() { this.addUlt(0.05); if (this.lifestealPct > 0) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.lifestealPct); }
  update(dt) {
    if (!this.alive) return; this.updateTimers(dt);
    if (this.invuln > 0) this.invuln -= dt; if (this.dashCd > 0) this.dashCd -= dt; if (this.shockCd > 0) this.shockCd -= dt; if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.regen > 0 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    const input = this.game.input;
    const wheel = input.takeWheel(); if (wheel) this.cycleWeapon(wheel > 0 ? 1 : -1);
    for (let n = 1; n <= 8; n++) if (input.justPressed('Digit' + n)) this.selectWeaponIndex(n - 1);
    if (input.justPressed('KeyQ')) this.cycleWeapon(-1);
    if (input.justPressed('ShiftLeft') || input.justPressed('ShiftRight')) this.dash();
    if (input.justPressed('KeyE')) this.shockwave();
    if (input.justPressed('KeyF') || input.justPressed('KeyR')) this.useUltimate();
    if (this.dashTime > 0) {
      this.dashTime -= dt; const ds = this.speed * 2.7; this.moveBy(this.dashDir.x * ds * dt, this.dashDir.y * ds * dt, dt);
      if (Math.random() < 0.7) this.game.addAfterImage(new AfterImage((c) => { c.translate(this.x, this.y); c.rotate(this.bodyAngle); c.fillStyle = '#7fb4ee'; roundRectPath(c, -this.radius, -this.radius * 0.8, this.radius * 2, this.radius * 1.6, 6); c.fill(); }));
    } else {
      let dx = 0, dy = 0;
      if (input.down('KeyW') || input.down('ArrowUp')) dy -= 1; if (input.down('KeyS') || input.down('ArrowDown')) dy += 1; if (input.down('KeyA') || input.down('ArrowLeft')) dx -= 1; if (input.down('KeyD') || input.down('ArrowRight')) dx += 1;
      if (dx === 0 && dy === 0 && (input.move.x || input.move.y)) { dx = input.move.x; dy = input.move.y; }
      const spd = this.speed * this.speedMult * (this.speedTime > 0 ? 1.4 : 1) * (this.slow > 0 ? 0.5 : 1);
      if (dx !== 0 || dy !== 0) { const len = Math.hypot(dx, dy); dx /= len; dy /= len; this.bodyAngle = Util.rotateToward(this.bodyAngle, Math.atan2(dy, dx), this.turnSpeed * dt); this.moveBy(dx * spd * dt, dy * spd * dt, dt); } else this.moving = false;
    }
    let aimAngle;
    if (input.aimActive && (input.aimVec.x || input.aimVec.y)) aimAngle = Math.atan2(input.aimVec.y, input.aimVec.x);
    else { const m = this.game.camera.screenToWorld(input.mouse.x, input.mouse.y); aimAngle = Util.angleTo(this.x, this.y, m.x, m.y); }
    this.aimTurret(aimAngle, dt);
    if (input.mouseDown || input.down('Space') || input.firing) this.fire();
    if (this.drones > 0) { this.droneAngle += dt * 2; this.droneCd -= dt; if (this.droneCd <= 0) { this.droneCd = 0.5; let best = null, bd = 520; for (const e of this.game.enemies) { if (!e.alive) continue; const d = Util.dist(this.x, this.y, e.x, e.y); if (d < bd) { bd = d; best = e; } } if (best) for (let i = 0; i < this.drones; i++) { const a = this.droneAngle + i / this.drones * TAU, dxp = this.x + Math.cos(a) * 46, dyp = this.y + Math.sin(a) * 46, ang = Util.angleTo(dxp, dyp, best.x, best.y); this.game.addBullet(new Bullet(this.game, dxp, dyp, ang, { speed: 560, damage: 8 * this.damageMult, team: 'player', radius: 4, color: '#9fe6ff' })); } } }
  }
  draw(ctx) { super.draw(ctx); if (this.drones > 0 && this.game.camera.visible(this.x, this.y, 60)) for (let i = 0; i < this.drones; i++) { const a = this.droneAngle + i / this.drones * TAU, x = this.x + Math.cos(a) * 46, y = this.y + Math.sin(a) * 46; ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#9fe6ff'; ctx.shadowColor = '#9fe6ff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill(); ctx.restore(); } }
}

/* ---------------------------- Enemy tank -------------------------------- */
class EnemyTank extends Tank {
  constructor(game, x, y, type, scale = {}) {
    const cfg = ENEMY_TYPES[type];
    super(game, x, y, { radius: cfg.radius * (scale.size || 1), team: 'enemy', pal: cfg.pal, maxHp: Math.round(cfg.hp * (scale.hp || 1)), speed: cfg.speed * (scale.speed || 1), turnSpeed: cfg.turnSpeed, turretTurn: cfg.turretTurn });
    this.type = type; this.cfg = cfg;
    this.fireRate = cfg.fireRate * (scale.fireRate || 1); this.fireCooldown = Util.rand(0, this.fireRate);
    this.bulletSpeed = cfg.bulletSpeed; this.bulletDamage = cfg.damage * (scale.dmg || 1); this.bulletRadius = cfg.bulletRadius || 5;
    this.detect = cfg.detect; this.preferred = cfg.preferred; this.accuracy = cfg.accuracy; this.kind = cfg.kind || 'bullet'; this.splash = cfg.splash || 0;
    this.kamikaze = !!cfg.kamikaze; this.frontShield = !!cfg.frontShield; this.sniper = !!cfg.sniper; this.splits = cfg.splits || 0;
    this.scoreValue = cfg.score; this.boss = false; this.aggro = false; this.charge = 0;
    this.wanderAngle = Util.rand(0, TAU); this.wanderTimer = Util.rand(1, 3); this.strafeDir = Util.chance(0.5) ? 1 : -1; this.strafeTimer = Util.rand(1.5, 3.5);
  }
  hasLineOfSight(tx, ty) { for (let s = 1; s < 10; s++) { const t = s / 10, px = Util.lerp(this.x, tx, t), py = Util.lerp(this.y, ty, t); for (const o of this.game.obstacles) if (!o.dead && o.blocksBullets && o.contains(px, py)) return false; } return true; }
  fire() { if (this.fireCooldown > 0) return; this.fireCooldown = this.fireRate; this.recoil = 5; const tipX = this.x + Math.cos(this.turretAngle) * this.barrelLength, tipY = this.y + Math.sin(this.turretAngle) * this.barrelLength; this.game.addBullet(new Bullet(this.game, tipX, tipY, this.turretAngle, { speed: this.bulletSpeed, damage: this.bulletDamage, team: 'enemy', radius: this.bulletRadius, kind: this.kind, splash: this.splash })); this.game.audio.enemyShoot(); }
  update(dt) {
    if (!this.alive) return; this.updateTimers(dt); if (this.fireCooldown > 0) this.fireCooldown -= dt;
    const player = this.game.player; if (!player || !player.alive) { this._wander(dt); return; }
    const d = Util.dist(this.x, this.y, player.x, player.y); if (d < this.detect) this.aggro = true; if (!this.aggro) { this._wander(dt); return; }
    const toPlayer = Util.angleTo(this.x, this.y, player.x, player.y);
    if (this.kamikaze) { this._kamikaze(dt, d, toPlayer, player); return; }
    this.strafeTimer -= dt; if (this.strafeTimer <= 0) { this.strafeDir *= -1; this.strafeTimer = Util.rand(1.5, 3.5); }
    let mx = 0, my = 0; const dead = 40;
    if (d > this.preferred + dead) { mx += Math.cos(toPlayer); my += Math.sin(toPlayer); } else if (d < this.preferred - dead) { mx -= Math.cos(toPlayer); my -= Math.sin(toPlayer); }
    mx += Math.cos(toPlayer + Math.PI / 2) * this.strafeDir * 0.7; my += Math.sin(toPlayer + Math.PI / 2) * this.strafeDir * 0.7;
    const sep = this._separation(); mx += sep.x * 1.2; my += sep.y * 1.2;
    if (mx !== 0 || my !== 0) { const len = Math.hypot(mx, my); mx /= len; my /= len; const spd = this.speed * (this.slow > 0 ? 0.5 : 1); this.bodyAngle = Util.rotateToward(this.bodyAngle, Math.atan2(my, mx), this.turnSpeed * dt); this.moveBy(mx * spd * dt, my * spd * dt, dt); }
    this.aimTurret(toPlayer + Util.rand(-this.accuracy, this.accuracy), dt);
    const aligned = Math.abs(Util.angleDiff(this.turretAngle, toPlayer)) < 0.22;
    if (this.sniper) { if (aligned && d < this.detect && this.hasLineOfSight(player.x, player.y)) { this.charge += dt; if (this.charge >= 1.1) { this.charge = 0; this.fire(); } } else this.charge = Math.max(0, this.charge - dt); }
    else if (aligned && d < this.detect && this.hasLineOfSight(player.x, player.y)) this.fire();
  }
  _kamikaze(dt, d, toPlayer, player) { this.bodyAngle = Util.rotateToward(this.bodyAngle, toPlayer, this.turnSpeed * dt); this.turretAngle = this.bodyAngle; this.moveBy(Math.cos(this.bodyAngle) * this.speed * dt, Math.sin(this.bodyAngle) * this.speed * dt, dt); if (d < 100) { this._blink = (this._blink || 0) - dt; if (this._blink <= 0) { this._blink = 0.12; this.game.audio.lowHealth(); this.hitTimer = 0.1; } } if (d < this.radius + player.radius + 6) this._detonate(player); }
  _detonate(player) { this.game.spawnExplosion(this.x, this.y, 1.3); this.game.addDecal(new Decal(this.x, this.y, 60)); this.game.camera.shake(9, 0.3); this.game.audio.explosion(1.2); for (const t of this.game.allTanks()) { if (!t.alive || t === this) continue; const dd = Util.dist(this.x, this.y, t.x, t.y); if (dd < 110) t.takeDamage(40 * (1 - dd / 110), Util.angleTo(this.x, this.y, t.x, t.y), false, {}); } this.alive = false; this.hp = 0; this.game.onTankDestroyed(this, false); }
  _separation() { let x = 0, y = 0; for (const e of this.game.enemies) { if (e === this || !e.alive) continue; const dx = this.x - e.x, dy = this.y - e.y, dd = Math.hypot(dx, dy); if (dd > 0 && dd < this.radius * 3) { x += dx / dd; y += dy / dd; } } return { x, y }; }
  _wander(dt) { this.wanderTimer -= dt; if (this.wanderTimer <= 0) { this.wanderAngle = Util.rand(0, TAU); this.wanderTimer = Util.rand(2, 4); } this.bodyAngle = Util.rotateToward(this.bodyAngle, this.wanderAngle, this.turnSpeed * 0.5 * dt); this.moveBy(Math.cos(this.wanderAngle) * this.speed * 0.4 * dt, Math.sin(this.wanderAngle) * this.speed * 0.4 * dt, dt); this.aimTurret(this.bodyAngle, dt); }
  draw(ctx) { super.draw(ctx); if (this.sniper && this.charge > 0 && this.alive && this.game.player && this.game.player.alive && this.game.camera.visible(this.x, this.y, 200)) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.4 * this.charge; ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 1 + this.charge; ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(this.turretAngle) * 900, this.y + Math.sin(this.turretAngle) * 900); ctx.stroke(); ctx.restore(); } }
}

/* ------------------------------- Boss ----------------------------------- */
const BOSS_NAMES = { warlord: 'WARLORD', gunner: 'SENTINEL', mortar: 'FORTRESS', final: 'FINAL BOSS' };
class Boss extends Tank {
  constructor(game, x, y, hp, variant) {
    super(game, x, y, { radius: 36, team: 'enemy', pal: 'boss', maxHp: hp, speed: 70, turnSpeed: 1.6, turretTurn: 2.0 });
    this.boss = true; this.variant = variant || 'warlord'; this.scoreValue = 900; this.fireCooldown = 1.2; this.phase = 1;
    this.detect = 2200; this.preferred = this.variant === 'mortar' ? 460 : 300; this.bulletSpeed = 380; this.bulletDamage = 16;
    this._burstTimer = 3; this._summonTimer = 8; this._spiral = 0; this.spiralAngle = Util.rand(0, TAU); this._mortar = 2.5;
    if (this.variant === 'gunner') { this.speed = 95; this.turretTurn = 2.6; }
    if (this.variant === 'mortar') { this.speed = 48; }
  }
  hasLineOfSight() { return true; }
  update(dt) {
    if (!this.alive) return; this.updateTimers(dt); if (this.fireCooldown > 0) this.fireCooldown -= dt;
    const player = this.game.player; if (!player || !player.alive) return;
    const ratio = this.hp / this.maxHp; const np = ratio < 0.33 ? 3 : (ratio < 0.66 ? 2 : 1); if (np !== this.phase) { this.phase = np; this.game.onBossPhase(this, this.phase); }
    const d = Util.dist(this.x, this.y, player.x, player.y), toPlayer = Util.angleTo(this.x, this.y, player.x, player.y);
    // movement: orbit + maintain range
    const strafe = this.variant === 'gunner' ? 0.9 : 0.6;
    let mx = Math.cos(toPlayer + Math.PI / 2) * strafe, my = Math.sin(toPlayer + Math.PI / 2) * strafe;
    const far = this.preferred + 120, near = this.preferred - 60;
    if (d > far) { mx += Math.cos(toPlayer); my += Math.sin(toPlayer); } else if (d < near) { mx -= Math.cos(toPlayer); my -= Math.sin(toPlayer); }
    const len = Math.hypot(mx, my) || 1; const spd = this.speed * (this.phase === 3 ? 1.5 : 1) * (this.slow > 0 ? 0.5 : 1);
    this.bodyAngle = Util.rotateToward(this.bodyAngle, Math.atan2(my, mx), this.turnSpeed * dt); this.moveBy(mx / len * spd * dt, my / len * spd * dt, dt);
    this.aimTurret(toPlayer, dt);
    // aimed spread (all variants; mortar fires less)
    if (this.fireCooldown <= 0) {
      const base = this.variant === 'mortar' ? 1.6 : 1.2; this.fireCooldown = this.phase === 3 ? base * 0.5 : (this.phase === 2 ? base * 0.75 : base); this.recoil = 6;
      const tipX = this.x + Math.cos(this.turretAngle) * this.barrelLength, tipY = this.y + Math.sin(this.turretAngle) * this.barrelLength;
      const spreads = this.phase >= 2 ? [-0.22, -0.07, 0.07, 0.22] : [-0.15, 0, 0.15];
      for (const off of spreads) this.game.addBullet(new Bullet(this.game, tipX, tipY, this.turretAngle + off, { speed: this.bulletSpeed, damage: this.bulletDamage, team: 'enemy', radius: 7 }));
      this.game.audio.enemyShoot();
    }
    // ---- variant-specific attacks ----
    if (this.variant === 'gunner') {
      this.spiralAngle += dt * (this.phase === 3 ? 6 : 3.5); this._spiral -= dt;
      if (this._spiral <= 0) { this._spiral = 0.09; const arms = this.phase >= 2 ? 3 : 2; for (let a = 0; a < arms; a++) { const ang = this.spiralAngle + a / arms * TAU; this.game.addBullet(new Bullet(this.game, this.x + Math.cos(ang) * this.radius, this.y + Math.sin(ang) * this.radius, ang, { speed: 270, damage: 10, team: 'enemy', radius: 6 })); } }
    } else if (this.variant === 'mortar') {
      this._mortar -= dt; if (this._mortar <= 0) { this._mortar = this.phase === 3 ? 1.7 : 2.7; const n = this.phase >= 2 ? 4 : 3; for (let i = 0; i < n; i++) { const px = player.x + Util.rand(-170, 170), py = player.y + Util.rand(-170, 170); this.game.addStrike(new Strike(this.game, px, py, 72, 1.1, 26, 'enemy')); } this.game.addFloatingText(this.x, this.y - this.radius - 18, 'MORTAR!', { color: '#ff8c5a', size: 14 }); }
    } else { // warlord / final: radial bursts + summons
      if (this.phase >= 2) { this._burstTimer -= dt; if (this._burstTimer <= 0) { this._burstTimer = this.phase === 3 ? 2.2 : 3.2; const n = this.phase === 3 ? 18 : 12; for (let i = 0; i < n; i++) { const a = i / n * TAU; this.game.addBullet(new Bullet(this.game, this.x + Math.cos(a) * this.radius, this.y + Math.sin(a) * this.radius, a, { speed: 300, damage: 12, team: 'enemy', radius: 6 })); } this.game.camera.shake(5, 0.2); } }
      if (this.phase === 3) { this._summonTimer -= dt; if (this._summonTimer <= 0) { this._summonTimer = 10; this.game.summonAdds(2); this.game.addFloatingText(this.x, this.y - this.radius - 20, 'REINFORCEMENTS!', { color: '#c45bd6', size: 16 }); } }
    }
  }
  draw(ctx) { super.draw(ctx); if (!this.game.camera.visible(this.x, this.y, this.radius * 2)) return; ctx.save(); ctx.translate(this.x, this.y); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(200,120,230,${0.3 + 0.2 * Math.sin(this.game.time * 4)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, this.radius * 1.45, 0, TAU); ctx.stroke(); ctx.restore(); }
}

/* ------------------------------ Turret ---------------------------------- */
class Turret extends Tank {
  constructor(game, x, y, scale = {}) {
    super(game, x, y, { radius: 25, team: 'enemy', pal: 'enemy', maxHp: Math.round(80 * (scale.hp || 1)), turretTurn: 1.9 });
    this.movable = false; this.range = 600; this.accuracy = 0.06; this.scoreValue = 150; this.fireRate = 1.8 * (scale.fireRate || 1); this.fireCooldown = Util.rand(0, this.fireRate); this.bulletSpeed = 470; this.bulletDamage = 13 * (scale.dmg || 1); this.bulletRadius = 6;
    this.palette = { hull: '#6b7076', hullDark: '#3f4448', hi: '#9aa0a6', tread: '#2a2d30', turret: '#cdd2d6', barrel: '#33383c' };
  }
  hasLineOfSight(tx, ty) { return EnemyTank.prototype.hasLineOfSight.call(this, tx, ty); }
  fire() { if (this.fireCooldown > 0) return; this.fireCooldown = this.fireRate; this.recoil = 5; const tipX = this.x + Math.cos(this.turretAngle) * this.barrelLength, tipY = this.y + Math.sin(this.turretAngle) * this.barrelLength; this.game.addBullet(new Bullet(this.game, tipX, tipY, this.turretAngle, { speed: this.bulletSpeed, damage: this.bulletDamage, team: 'enemy', radius: this.bulletRadius })); this.game.audio.enemyShoot(); }
  update(dt) { if (!this.alive) return; this.updateTimers(dt); if (this.fireCooldown > 0) this.fireCooldown -= dt; const player = this.game.player; if (!player || !player.alive) return; const d = Util.dist(this.x, this.y, player.x, player.y), toPlayer = Util.angleTo(this.x, this.y, player.x, player.y); this.aimTurret(toPlayer + Util.rand(-this.accuracy, this.accuracy), dt); if (d < this.range && Math.abs(Util.angleDiff(this.turretAngle, toPlayer)) < 0.18 && this.hasLineOfSight(player.x, player.y)) this.fire(); }
  draw(ctx) {
    if (!this.game.camera.visible(this.x, this.y, this.radius * 2)) return; const R = this.radius; ctx.save(); ctx.translate(this.x, this.y);
    ctx.save(); ctx.translate(3, 4); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, R * 1.25, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#5a5f64'; ctx.beginPath(); ctx.arc(0, 0, R * 1.15, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#7d756a'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95, R * 0.3, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.rotate(this.turretAngle); const recoil = this.recoil * 0.6; ctx.fillStyle = this.palette.barrel; roundRectPath(ctx, R * 0.2 - recoil, -R * 0.18, this.barrelLength - R * 0.2, R * 0.36, R * 0.14); ctx.fill(); ctx.fillStyle = '#1c1c1c'; roundRectPath(ctx, this.barrelLength - R * 0.3 - recoil, -R * 0.24, R * 0.3, R * 0.48, 2); ctx.fill(); const tg = ctx.createRadialGradient(-R * 0.1, -R * 0.1, 2, 0, 0, R * 0.7); tg.addColorStop(0, this.palette.turret); tg.addColorStop(1, this.palette.hullDark); ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(0, 0, R * 0.7, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    if (this.hitTimer > 0) { ctx.globalAlpha = this.hitTimer / 0.1 * 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, R * 1.2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore(); this.drawHealthBar(ctx);
  }
}
