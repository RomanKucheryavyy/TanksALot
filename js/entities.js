/* =========================================================================
 * TanksALot — Entities
 * Weapons, abilities, projectiles, FX, pickups, and every tank: the player
 * (arsenal + dash + perks), six enemy archetypes, a phased boss, and turrets.
 * Tanks are drawn procedurally so orientation/rotation are always correct.
 * ====================================================================== */

'use strict';

const CONFIG = {
  player: { radius: 21, maxHp: 100, speed: 235, turnSpeed: 6.0, turretTurn: 13 },
  bulletLife: 1.7,
  maxParticles: 900,
  maxDecals: 90,
};

const PALETTE = {
  player: { hull: '#3f86d4', hullDark: '#2c5f9a', hi: '#7fb4ee', tread: '#27384a', turret: '#cfe2f7', barrel: '#26425f' },
  enemy:  { hull: '#d1483f', hullDark: '#9a2f28', hi: '#ee8079', tread: '#3a2320', turret: '#f3c9c5', barrel: '#5f2622' },
  scout:  { hull: '#e0b53b', hullDark: '#a17f1f', hi: '#f4d878', tread: '#3a3015', turret: '#f7ecc4', barrel: '#5f4e1c' },
  heavy:  { hull: '#8a4a32', hullDark: '#5e3020', hi: '#b87a5c', tread: '#2e1c14', turret: '#e6cbbd', barrel: '#3d2316' },
  arty:   { hull: '#4f8a52', hullDark: '#335e36', hi: '#83b886', tread: '#1f3a20', turret: '#cfe6cf', barrel: '#26421f' },
  bomber: { hull: '#e07b2b', hullDark: '#a1531a', hi: '#f4a766', tread: '#3a2615', turret: '#f7d9b8', barrel: '#5f3a1c' },
  shield: { hull: '#5a7a8c', hullDark: '#3a525f', hi: '#8fb0c0', tread: '#1f2e36', turret: '#cfe0e8', barrel: '#26343c' },
  boss:   { hull: '#8e44ad', hullDark: '#5e2d73', hi: '#c89bdd', tread: '#2c1738', turret: '#e7d2f1', barrel: '#3d1f4d' },
};

// Player arsenal. Cannon has infinite ammo; the rest are picked up with ammo.
const WEAPONS = {
  cannon:     { name: 'Cannon',      key: 'cannon',     fireRate: 0.32, damage: 30, speed: 640, radius: 6, pellets: 1, spread: 0,    recoil: 6, shake: 4,   sound: 'fireCannon', kind: 'bullet', infinite: true,  color: '#ffd34d' },
  machinegun: { name: 'Machine Gun', key: 'machinegun', fireRate: 0.085, damage: 9, speed: 760, radius: 4, pellets: 1, spread: 0.07, recoil: 2, shake: 1.5, sound: 'fireMG',     kind: 'bullet', ammo: 220, color: '#ffe27a' },
  shotgun:    { name: 'Shotgun',     key: 'shotgun',    fireRate: 0.62, damage: 11, speed: 560, radius: 4, pellets: 6, spread: 0.5,  recoil: 9, shake: 6,   sound: 'fireShotgun', kind: 'bullet', ammo: 40, color: '#ffb454' },
  rockets:    { name: 'Rockets',     key: 'rockets',    fireRate: 0.8,  damage: 55, speed: 430, radius: 8, pellets: 1, spread: 0,    recoil: 8, shake: 7,   sound: 'fireRocket', kind: 'rocket', splash: 95, ammo: 24, color: '#ff7b4d' },
  laser:      { name: 'Laser',       key: 'laser',      fireRate: 0.46, damage: 42, speed: 1150, radius: 4, pellets: 1, spread: 0,   recoil: 3, shake: 2,   sound: 'fireLaser', kind: 'laser', pierce: 3, ammo: 60, color: '#4fe0ff' },
};

const ENEMY_TYPES = {
  grunt:    { hp: 55,  speed: 125, fireRate: 1.5, damage: 11, bulletSpeed: 430, radius: 21, detect: 560, preferred: 250, accuracy: 0.13, score: 100, pal: 'enemy',  turretTurn: 3.2, turnSpeed: 2.8, bulletRadius: 5 },
  scout:    { hp: 30,  speed: 220, fireRate: 0.7, damage: 7,  bulletSpeed: 520, radius: 17, detect: 660, preferred: 175, accuracy: 0.18, score: 120, pal: 'scout',  turretTurn: 4.5, turnSpeed: 4.4, bulletRadius: 4 },
  heavy:    { hp: 150, speed: 76,  fireRate: 2.2, damage: 22, bulletSpeed: 360, radius: 27, detect: 520, preferred: 285, accuracy: 0.09, score: 220, pal: 'heavy',  turretTurn: 1.8, turnSpeed: 1.5, bulletRadius: 8 },
  artillery:{ hp: 45,  speed: 68,  fireRate: 2.9, damage: 30, bulletSpeed: 320, radius: 22, detect: 780, preferred: 540, accuracy: 0.05, score: 190, pal: 'arty',   turretTurn: 1.4, turnSpeed: 1.4, bulletRadius: 7, kind: 'rocket', splash: 72 },
  bomber:   { hp: 42,  speed: 180, fireRate: 99,  damage: 0,  bulletSpeed: 0,   radius: 19, detect: 760, preferred: 0,   accuracy: 0,    score: 160, pal: 'bomber', turretTurn: 5.0, turnSpeed: 3.8, bulletRadius: 0, kamikaze: true },
  shielded: { hp: 85,  speed: 104, fireRate: 1.6, damage: 13, bulletSpeed: 420, radius: 23, detect: 560, preferred: 240, accuracy: 0.12, score: 180, pal: 'shield', turretTurn: 2.6, turnSpeed: 2.2, bulletRadius: 5, frontShield: true },
};

const POWERUP_TYPES = {
  heal:   { color: '#46c46a', label: '+HP' },
  shield: { color: '#4ec3e0', label: 'SHIELD' },
  rapid:  { color: '#f0a93b', label: 'RAPID' },
  spread: { color: '#c45bd6', label: 'SPREAD' },
  speed:  { color: '#5bd6a8', label: 'SPEED' },
  damage: { color: '#e0563b', label: 'DAMAGE' },
};

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ----------------------------- Obstacle --------------------------------- */
class Obstacle {
  constructor(game, x, y, w, h, opts = {}) {
    this.game = game; this.x = x; this.y = y; this.w = w; this.h = h;
    this.kind = opts.kind || 'rock';
    this.destructible = !!opts.destructible;
    this.hp = opts.hp || 40; this.maxHp = this.hp;
    this.blocksBullets = opts.blocksBullets !== false;
    this.dead = false; this.hitTimer = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  contains(px, py) { return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h; }
  closest(px, py) { return { x: Util.clamp(px, this.x, this.x + this.w), y: Util.clamp(py, this.y, this.y + this.h) }; }
  damage(a) {
    if (!this.destructible) return;
    this.hp -= a; this.hitTimer = 0.08;
    if (this.hp <= 0 && !this.dead) { this.dead = true; this.game.onObstacleDestroyed(this); }
  }
  update(dt) { if (this.hitTimer > 0) this.hitTimer -= dt; }
  draw(ctx) {
    if (!this.game.camera.visible(this.cx, this.cy, Math.max(this.w, this.h))) return;
    ctx.save();
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#000'; roundRectPath(ctx, this.x + 4, this.y + 5, this.w, this.h, 6); ctx.fill(); ctx.globalAlpha = 1;
    let base, top, line;
    if (this.kind === 'crate') { base = '#a9712f'; top = '#caa05a'; line = '#5e3c14'; }
    else if (this.kind === 'barrel') { base = '#b0392f'; top = '#d76a55'; line = '#5a1c16'; }
    else if (this.kind === 'tree') { base = '#2f7d3a'; top = '#4fae5b'; line = '#1c4a23'; }
    else if (this.kind === 'bush') { base = '#3c8d46'; top = '#62b86d'; line = '#234e29'; }
    else { base = '#7d8489'; top = '#a8b0b5'; line = '#454b4f'; }
    if (this.kind === 'tree' || this.kind === 'bush') {
      const r = this.w / 2;
      ctx.fillStyle = base; ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, TAU); ctx.fill();
      ctx.fillStyle = top; ctx.beginPath(); ctx.arc(this.cx - r * 0.18, this.cy - r * 0.18, r * 0.66, 0, TAU); ctx.fill();
      ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, TAU); ctx.stroke();
    } else {
      const g = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
      g.addColorStop(0, top); g.addColorStop(1, base); ctx.fillStyle = g;
      roundRectPath(ctx, this.x, this.y, this.w, this.h, 6); ctx.fill();
      ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke();
      if (this.kind === 'crate') {
        ctx.strokeStyle = 'rgba(94,60,20,0.7)'; ctx.lineWidth = 2.5; ctx.beginPath();
        ctx.moveTo(this.x + 4, this.y + 4); ctx.lineTo(this.x + this.w - 4, this.y + this.h - 4);
        ctx.moveTo(this.x + this.w - 4, this.y + 4); ctx.lineTo(this.x + 4, this.y + this.h - 4); ctx.stroke();
      } else if (this.kind === 'barrel') {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(this.x + 3, this.y + this.h * 0.33); ctx.lineTo(this.x + this.w - 3, this.y + this.h * 0.33);
        ctx.moveTo(this.x + 3, this.y + this.h * 0.66); ctx.lineTo(this.x + this.w - 3, this.y + this.h * 0.66); ctx.stroke();
      }
    }
    if (this.hitTimer > 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; roundRectPath(ctx, this.x, this.y, this.w, this.h, 6); ctx.fill(); }
    if (this.destructible && this.hp < this.maxHp) {
      const p = this.hp / this.maxHp; ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(this.x, this.y - 7, this.w, 4);
      ctx.fillStyle = '#e0c341'; ctx.fillRect(this.x, this.y - 7, this.w * p, 4);
    }
    ctx.restore();
  }
}

/* ------------------------ Ground decals (scorch) ------------------------ */
class Decal {
  constructor(x, y, r, color) { this.x = x; this.y = y; this.r = r; this.color = color || 'rgba(20,12,8,0.55)'; this.life = 14; this.maxLife = 14; this.dead = false; this.rot = Util.rand(0, TAU); }
  update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; }
  draw(ctx) {
    ctx.save(); ctx.globalAlpha = 0.55 * Math.min(1, this.life / 4);
    ctx.translate(this.x, this.y); ctx.rotate(this.rot);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, this.r);
    g.addColorStop(0, this.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

/* ------------------------------ Bullet ---------------------------------- */
class Bullet {
  constructor(game, x, y, angle, opts) {
    this.game = game; this.x = x; this.y = y; this.angle = angle;
    this.speed = opts.speed;
    this.vx = Math.cos(angle) * this.speed; this.vy = Math.sin(angle) * this.speed;
    this.radius = opts.radius || 5;
    this.damage = opts.damage; this.team = opts.team;
    this.life = opts.life || CONFIG.bulletLife;
    this.kind = opts.kind || 'bullet';     // bullet | rocket | laser
    this.splash = opts.splash || 0;
    this.pierce = opts.pierce || 0;
    this.ricochet = opts.ricochet || 0;
    this.burn = opts.burn || 0;
    this.crit = opts.crit || false;
    this.dead = false; this._hit = new Set(); this._trailTimer = 0;
    this.color = opts.color || (this.team === 'player' ? '#ffd34d' : '#ff5a4d');
    this.glow = this.team === 'player' ? 'rgba(255,211,77,0.5)' : 'rgba(255,90,77,0.5)';
  }
  update(dt) {
    const px = this.x, py = this.y;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    // world bounds
    if (this.x < 0 || this.y < 0 || this.x > this.game.world.w || this.y > this.game.world.h) {
      if (this.ricochet > 0) {
        if (this.x < 0 || this.x > this.game.world.w) this.vx *= -1;
        if (this.y < 0 || this.y > this.game.world.h) this.vy *= -1;
        this.x = Util.clamp(this.x, 1, this.game.world.w - 1); this.y = Util.clamp(this.y, 1, this.game.world.h - 1);
        this.angle = Math.atan2(this.vy, this.vx); this.ricochet--; return;
      }
      this._impact(false); return;
    }
    // obstacles
    for (const o of this.game.obstacles) {
      if (o.dead || !o.blocksBullets) continue;
      const c = o.closest(this.x, this.y);
      if (Util.dist2(this.x, this.y, c.x, c.y) <= this.radius * this.radius) {
        if (o.destructible) o.damage(this.damage);
        if (this.ricochet > 0 && !o.destructible) {
          const dx = this.x - c.x, dy = this.y - c.y;
          if (Math.abs(dx) > Math.abs(dy)) this.vx *= -1; else this.vy *= -1;
          this.x += this.vx * dt; this.y += this.vy * dt;
          this.angle = Math.atan2(this.vy, this.vx); this.ricochet--; return;
        }
        this._impact(false); return;
      }
    }
    // tanks
    const targets = this.team === 'player' ? this.game.enemies : (this.game.player && this.game.player.alive ? [this.game.player] : []);
    for (const t of targets) {
      if (!t.alive || this._hit.has(t)) continue;
      const rr = t.radius + this.radius;
      if (Util.dist2(this.x, this.y, t.x, t.y) <= rr * rr) {
        const killed = t.takeDamage(this.damage, this.angle, this.team === 'player', { crit: this.crit, burn: this.burn });
        if (this.team === 'player' && killed === 'lifesteal') { /* handled in tank */ }
        if (this.splash > 0) { this._explodeSplash(); return; }
        this._hit.add(t);
        if (this.pierce > 0) { this.pierce--; continue; }
        this._impact(true); return;
      }
    }
    // trail
    this._trailTimer -= dt;
    if (this._trailTimer <= 0) {
      this._trailTimer = this.kind === 'rocket' ? 0.012 : 0.02;
      this.game.addParticle(new Particle(px, py, {
        vx: Util.rand(-12, 12), vy: Util.rand(-12, 12), life: this.kind === 'rocket' ? 0.35 : 0.18,
        size: this.radius * (this.kind === 'rocket' ? 1.1 : 0.8),
        color: this.kind === 'rocket' ? 'rgba(220,220,220,0.7)' : this.color, fade: true, shrink: true,
      }));
    }
  }
  _explodeSplash() {
    this.dead = true;
    this.game.spawnExplosion(this.x, this.y, 0.8);
    this.game.addDecal(new Decal(this.x, this.y, 38));
    this.game.camera.shake(5, 0.18);
    for (const t of (this.team === 'player' ? this.game.enemies : (this.game.player ? [this.game.player] : []))) {
      if (!t.alive) continue;
      const d = Util.dist(this.x, this.y, t.x, t.y);
      if (d < this.splash) t.takeDamage(this.damage * (1 - d / this.splash), Util.angleTo(this.x, this.y, t.x, t.y), this.team === 'player', {});
    }
  }
  _impact(hitTank) {
    this.dead = true; this.game.audio.hit();
    const n = hitTank ? 9 : 5;
    for (let i = 0; i < n; i++) {
      const a = Util.rand(0, TAU), sp = Util.rand(40, 160);
      this.game.addParticle(new Particle(this.x, this.y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: Util.rand(0.2, 0.4),
        size: Util.rand(2, 4), color: hitTank ? this.color : '#d9d2c5', fade: true, shrink: true,
      }));
    }
  }
  draw(ctx) {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    if (this.kind === 'laser') {
      ctx.shadowColor = this.color; ctx.shadowBlur = 12; ctx.fillStyle = this.color;
      roundRectPath(ctx, -this.radius * 3, -this.radius * 0.5, this.radius * 6, this.radius, this.radius * 0.5); ctx.fill();
    } else {
      ctx.shadowColor = this.glow; ctx.shadowBlur = 10; ctx.fillStyle = this.color;
      const len = this.kind === 'rocket' ? this.radius * 2.4 : this.radius * 1.6;
      roundRectPath(ctx, -len, -this.radius * 0.7, len * 2, this.radius * 1.4, this.radius * 0.7); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(this.radius * 0.7, 0, this.radius * 0.42, 0, TAU); ctx.fill();
    if (this.crit) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, this.radius * 1.7, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
}

/* ----------------------------- Particles -------------------------------- */
class Particle {
  constructor(x, y, opts = {}) {
    this.x = x; this.y = y; this.vx = opts.vx || 0; this.vy = opts.vy || 0;
    this.life = opts.life || 0.5; this.maxLife = this.life; this.size = opts.size || 3;
    this.color = opts.color || '#fff'; this.fade = opts.fade || false; this.shrink = opts.shrink || false;
    this.drag = opts.drag != null ? opts.drag : 0.9; this.glow = opts.glow || false; this.grav = opts.grav || 0; this.dead = false;
  }
  update(dt) {
    this.life -= dt; if (this.life <= 0) { this.dead = true; return; }
    this.x += this.vx * dt; this.y += this.vy * dt; this.vy += this.grav * dt;
    const d = Math.pow(this.drag, dt * 60); this.vx *= d; this.vy *= d;
  }
  draw(ctx) {
    const t = this.life / this.maxLife;
    ctx.save(); ctx.globalAlpha = this.fade ? Util.clamp(t, 0, 1) : 1;
    if (this.glow) { ctx.shadowColor = this.color; ctx.shadowBlur = 8; }
    ctx.fillStyle = this.color;
    const s = this.shrink ? this.size * t : this.size;
    ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0.5, s), 0, TAU); ctx.fill();
    ctx.restore();
  }
}
class TreadMark {
  constructor(x, y, a) { this.x = x; this.y = y; this.angle = a; this.life = 6; this.maxLife = 6; this.dead = false; }
  update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; }
  draw(ctx) { ctx.save(); ctx.globalAlpha = 0.16 * (this.life / this.maxLife); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.fillStyle = '#000'; ctx.fillRect(-12, -14, 6, 28); ctx.fillRect(6, -14, 6, 28); ctx.restore(); }
}
class ShellCasing {
  constructor(x, y, a) { this.x = x; this.y = y; const s = Util.rand(60, 140); this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s; this.life = 0.6; this.maxLife = 0.6; this.rot = Util.rand(0, TAU); this.vr = Util.rand(-12, 12); this.dead = false; }
  update(dt) { this.life -= dt; if (this.life <= 0) { this.dead = true; return; } this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 0.9; this.vy *= 0.9; this.rot += this.vr * dt; }
  draw(ctx) { ctx.save(); ctx.globalAlpha = Util.clamp(this.life / this.maxLife, 0, 1); ctx.translate(this.x, this.y); ctx.rotate(this.rot); ctx.fillStyle = '#c8a13a'; ctx.fillRect(-2, -1, 4, 2); ctx.restore(); }
}
class AfterImage {
  constructor(drawFn) { this.drawFn = drawFn; this.life = 0.3; this.maxLife = 0.3; this.dead = false; }
  update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; }
  draw(ctx) { ctx.save(); ctx.globalAlpha = 0.25 * (this.life / this.maxLife); this.drawFn(ctx); ctx.restore(); }
}

/* ----------------------------- Explosion -------------------------------- */
class Explosion {
  constructor(game, x, y, scale = 1) {
    this.game = game; this.x = x; this.y = y; this.scale = scale; this.time = 0; this.dur = 0.5; this.dead = false;
    this.sheet = game.assets.getImage('img/Explosion_C.png') || game.assets.getImage('img/Explosion_A.png');
    this.frames = 5; this.frameW = 256; this.frameH = 256;
    for (let i = 0; i < 14 * scale; i++) {
      const a = Util.rand(0, TAU), sp = Util.rand(60, 260) * scale;
      game.addParticle(new Particle(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: Util.rand(0.3, 0.7), size: Util.rand(3, 7) * scale, color: Util.choice(['#ffd34d', '#ff8c2b', '#ff5a2b', '#cfcfcf']), fade: true, shrink: true, glow: true }));
    }
    for (let i = 0; i < 6 * scale; i++) {
      const a = Util.rand(0, TAU), sp = Util.rand(10, 60) * scale;
      game.addParticle(new Particle(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: Util.rand(0.6, 1.1), size: Util.rand(5, 10) * scale, color: 'rgba(60,60,60,0.5)', fade: true, drag: 0.96 }));
    }
  }
  update(dt) { this.time += dt; if (this.time >= this.dur) this.dead = true; }
  draw(ctx) {
    const t = this.time / this.dur;
    if (this.sheet) {
      const idx = Math.min(this.frames - 1, Math.floor(t * this.frames)), size = 150 * this.scale;
      ctx.save(); ctx.globalAlpha = 1 - t * 0.3;
      ctx.drawImage(this.sheet, idx * this.frameW, 0, this.frameW, this.frameH, this.x - size / 2, this.y - size / 2, size, size); ctx.restore();
    } else {
      ctx.save(); ctx.globalAlpha = (1 - t) * 0.8; ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 6 * (1 - t);
      ctx.beginPath(); ctx.arc(this.x, this.y, 10 + t * 70 * this.scale, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(255,${Math.floor(180 - t * 120)},60,${(1 - t) * 0.6})`;
      ctx.beginPath(); ctx.arc(this.x, this.y, (1 - t) * 40 * this.scale, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
}

/* ---------------------------- Floating text ----------------------------- */
class FloatingText {
  constructor(x, y, text, opts = {}) {
    this.x = x; this.y = y; this.text = text; this.color = opts.color || '#fff'; this.size = opts.size || 18;
    this.life = opts.life || 0.9; this.maxLife = this.life; this.vy = opts.vy || -42; this.dead = false; this.bold = opts.bold !== false;
  }
  update(dt) { this.life -= dt; this.y += this.vy * dt; this.vy *= 0.94; if (this.life <= 0) this.dead = true; }
  draw(ctx) {
    ctx.save(); ctx.globalAlpha = Util.clamp(this.life / this.maxLife * 1.4, 0, 1);
    ctx.font = `${this.bold ? 'bold ' : ''}${this.size}px Trebuchet MS, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(this.text, this.x, this.y);
    ctx.fillStyle = this.color; ctx.fillText(this.text, this.x, this.y); ctx.restore();
  }
}

/* ----------------------------- Pickups ---------------------------------- */
class PowerUp {
  constructor(game, x, y, type) { this.game = game; this.x = x; this.y = y; this.type = type; this.radius = 16; this.bob = Math.random() * TAU; this.life = 20; this.dead = false; }
  update(dt) {
    this.bob += dt * 3; this.life -= dt; if (this.life <= 0) { this.dead = true; return; }
    const p = this.game.player;
    if (p && p.alive) {
      const d = Util.dist(this.x, this.y, p.x, p.y), mag = p.pickupRange || 120;
      if (d < mag) { const a = Util.angleTo(this.x, this.y, p.x, p.y), pull = (mag - d) * 2.2; this.x += Math.cos(a) * pull * dt; this.y += Math.sin(a) * pull * dt; }
      if (d < this.radius + p.radius) this._collect(p);
    }
  }
  _collect(p) {
    this.dead = true; this.game.audio.pickup(); p.applyPowerUp(this.type);
    const info = POWERUP_TYPES[this.type]; this.game.addFloatingText(this.x, this.y - 10, info.label, { color: info.color, size: 18 });
    for (let i = 0; i < 12; i++) { const a = Util.rand(0, TAU), sp = Util.rand(40, 140); this.game.addParticle(new Particle(this.x, this.y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, size: 3, color: info.color, fade: true, shrink: true, glow: true })); }
  }
  draw(ctx) {
    const info = POWERUP_TYPES[this.type], yoff = Math.sin(this.bob) * 4, blink = this.life < 4 && Math.floor(this.life * 6) % 2 === 0;
    ctx.save(); ctx.translate(this.x, this.y + yoff); if (blink) ctx.globalAlpha = 0.4;
    ctx.shadowColor = info.color; ctx.shadowBlur = 14; ctx.fillStyle = 'rgba(255,255,255,0.92)';
    roundRectPath(ctx, -this.radius, -this.radius, this.radius * 2, this.radius * 2, 6); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = info.color; ctx.lineWidth = 3; roundRectPath(ctx, -this.radius, -this.radius, this.radius * 2, this.radius * 2, 6); ctx.stroke();
    this._icon(ctx, info.color); ctx.restore();
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
    }
  }
}

class Coin {
  constructor(game, x, y, value = 1) { this.game = game; this.x = x; this.y = y; this.value = value; this.radius = 9; this.bob = Math.random() * TAU; this.life = 22; this.dead = false; this.vx = Util.rand(-60, 60); this.vy = Util.rand(-60, 60); }
  update(dt) {
    this.bob += dt * 6; this.life -= dt; if (this.life <= 0) { this.dead = true; return; }
    this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 0.9; this.vy *= 0.9;
    const p = this.game.player;
    if (p && p.alive) {
      const d = Util.dist(this.x, this.y, p.x, p.y), mag = p.pickupRange || 120;
      if (d < mag) { const a = Util.angleTo(this.x, this.y, p.x, p.y), pull = (mag - d) * 2.6; this.x += Math.cos(a) * pull * dt; this.y += Math.sin(a) * pull * dt; }
      if (d < this.radius + p.radius) { this.dead = true; this.game.onCoinCollected(this.value); this.game.audio.coin(); }
    }
  }
  draw(ctx) {
    const s = 1 + Math.sin(this.bob) * 0.18, blink = this.life < 4 && Math.floor(this.life * 6) % 2 === 0;
    ctx.save(); ctx.translate(this.x, this.y); if (blink) ctx.globalAlpha = 0.45;
    ctx.shadowColor = '#ffcf3a'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.ellipse(0, 0, this.radius * s, this.radius, 0, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#b8902f'; ctx.beginPath(); ctx.ellipse(0, 0, this.radius * 0.55 * s, this.radius * 0.55, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

class WeaponCrate {
  constructor(game, x, y, weaponKey) { this.game = game; this.x = x; this.y = y; this.weaponKey = weaponKey; this.radius = 18; this.bob = Math.random() * TAU; this.life = 26; this.dead = false; }
  update(dt) {
    this.bob += dt * 2.5; this.life -= dt; if (this.life <= 0) { this.dead = true; return; }
    const p = this.game.player;
    if (p && p.alive && Util.dist(this.x, this.y, p.x, p.y) < this.radius + p.radius) {
      this.dead = true; p.giveWeapon(this.weaponKey); this.game.audio.powerHit();
      const w = WEAPONS[this.weaponKey];
      this.game.addFloatingText(this.x, this.y - 12, w.name.toUpperCase(), { color: w.color, size: 18 });
    }
  }
  draw(ctx) {
    const w = WEAPONS[this.weaponKey], yoff = Math.sin(this.bob) * 3;
    ctx.save(); ctx.translate(this.x, this.y + yoff);
    ctx.shadowColor = w.color; ctx.shadowBlur = 14; ctx.fillStyle = '#2b3340';
    roundRectPath(ctx, -this.radius, -this.radius, this.radius * 2, this.radius * 2, 5); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = w.color; ctx.lineWidth = 3; roundRectPath(ctx, -this.radius, -this.radius, this.radius * 2, this.radius * 2, 5); ctx.stroke();
    ctx.fillStyle = w.color; ctx.font = 'bold 16px Trebuchet MS'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(w.name[0], 0, 1);
    ctx.restore();
  }
}

/* ------------------------------- Tank ----------------------------------- */
class Tank {
  constructor(game, x, y, opts) {
    this.game = game; this.x = x; this.y = y;
    this.radius = opts.radius; this.team = opts.team; this.palette = PALETTE[opts.pal];
    this.maxHp = opts.maxHp; this.hp = opts.maxHp;
    this.speed = opts.speed || 0; this.turnSpeed = opts.turnSpeed || 3; this.turretTurn = opts.turretTurn || 3;
    this.bodyAngle = Util.rand(0, TAU); this.turretAngle = this.bodyAngle;
    this.alive = true; this.hitTimer = 0; this.recoil = 0; this.treadOffset = 0; this.moving = false;
    this._treadTimer = 0; this._smokeTimer = 0;
    this.shieldTime = 0; this.rapidTime = 0; this.spreadTime = 0; this.speedTime = 0; this.damageTime = 0;
    this.burn = 0; this.slow = 0;
  }
  get barrelLength() { return this.radius * 1.9; }

  moveBy(dx, dy, dt) {
    if (dx === 0 && dy === 0) { this.moving = false; return; }
    this.moving = true; this.x += dx; this.y += dy; this._resolveCollisions();
    this.treadOffset = (this.treadOffset + Math.hypot(dx, dy) * 0.4) % 12;
    this._treadTimer -= dt; if (this._treadTimer <= 0) { this._treadTimer = 0.08; this.game.addTreadMark(new TreadMark(this.x, this.y, this.bodyAngle)); }
  }
  _resolveCollisions() {
    const w = this.game.world;
    this.x = Util.clamp(this.x, this.radius, w.w - this.radius);
    this.y = Util.clamp(this.y, this.radius, w.h - this.radius);
    for (const o of this.game.obstacles) {
      if (o.dead) continue;
      const c = o.closest(this.x, this.y), dx = this.x - c.x, dy = this.y - c.y, d2 = dx * dx + dy * dy;
      if (d2 < this.radius * this.radius) { const d = Math.sqrt(d2) || 0.0001, push = this.radius - d; this.x += (dx / d) * push; this.y += (dy / d) * push; }
    }
    for (const t of this.game.allTanks()) {
      if (t === this || !t.alive) continue;
      const dx = this.x - t.x, dy = this.y - t.y, min = this.radius + t.radius, d2 = dx * dx + dy * dy;
      if (d2 < min * min && d2 > 0.0001) {
        const d = Math.sqrt(d2), overlap = min - d, nx = dx / d, ny = dy / d;
        if (t.movable === false) { this.x += nx * overlap; this.y += ny * overlap; }
        else { const half = overlap * 0.5; this.x += nx * half; this.y += ny * half; t.x -= nx * half; t.y -= ny * half; }
      }
    }
  }
  aimTurret(a, dt) { this.turretAngle = Util.rotateToward(this.turretAngle, a, this.turretTurn * dt); }

  takeDamage(amount, fromAngle, fromPlayer, opts = {}) {
    if (!this.alive) return false;
    if (this.shieldTime > 0) { this.game.addFloatingText(this.x, this.y - this.radius - 8, 'BLOCK', { color: '#4ec3e0', size: 14 }); return false; }
    // frontal shield (shielded enemy): block hits coming at the front arc
    if (this.frontShield) {
      const incoming = fromAngle + Math.PI; // direction from tank to shooter
      if (Math.abs(Util.angleDiff(this.bodyAngle, incoming)) < 1.1) {
        this.game.audio.hitArmor(); this.game.addFloatingText(this.x, this.y - this.radius - 8, 'BLOCKED', { color: '#9fd4e0', size: 13 });
        for (let i = 0; i < 4; i++) { const a = fromAngle + Math.PI + Util.rand(-0.6, 0.6); this.game.addParticle(new Particle(this.x + Math.cos(this.bodyAngle) * this.radius, this.y + Math.sin(this.bodyAngle) * this.radius, { vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.2, size: 3, color: '#cfe6ef', fade: true, shrink: true })); }
        return false;
      }
    }
    this.hp -= amount; this.hitTimer = 0.1;
    if (opts.burn) this.burn = Math.max(this.burn, opts.burn);
    this.x += Math.cos(fromAngle) * 4; this.y += Math.sin(fromAngle) * 4; this._resolveCollisions();
    const col = opts.crit ? '#ff5a4d' : (this.team === 'player' ? '#ff9a9a' : '#fff');
    this.game.addFloatingText(this.x + Util.rand(-6, 6), this.y - this.radius - 6, (opts.crit ? '' : '') + Math.round(amount), { color: col, size: opts.crit ? 17 : 13, bold: !!opts.crit });
    if (opts.crit) this.game.addFloatingText(this.x, this.y - this.radius - 22, 'CRIT!', { color: '#ffd34d', size: 15 });
    if (this.hp <= 0) { this.die(fromPlayer); return true; }
    return false;
  }
  die(byPlayer) {
    if (!this.alive) return; this.alive = false; this.hp = 0;
    this.game.spawnExplosion(this.x, this.y, this.radius / 21);
    this.game.addDecal(new Decal(this.x, this.y, this.radius * 1.6));
    this.game.audio.explosion(this.radius / 21);
    this.game.camera.shake(this.team === 'player' ? 12 : Math.min(9, 4 + this.radius / 8), 0.35);
    this.game.onTankDestroyed(this, byPlayer);
  }
  updateTimers(dt) {
    if (this.hitTimer > 0) this.hitTimer -= dt;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 40);
    for (const k of ['shieldTime', 'rapidTime', 'spreadTime', 'speedTime', 'damageTime', 'slow']) if (this[k] > 0) this[k] -= dt;
    if (this.burn > 0) {
      this.burn -= dt; this._burnTick = (this._burnTick || 0) - dt;
      if (this._burnTick <= 0) { this._burnTick = 0.4; this.takeDamage(6, Util.rand(0, TAU), true, {}); this.game.addParticle(new Particle(this.x + Util.rand(-8, 8), this.y + Util.rand(-8, 8), { vx: 0, vy: -40, life: 0.4, size: 4, color: Util.choice(['#ff8c2b', '#ffd34d']), fade: true, shrink: true, glow: true })); }
    }
    // damage smoke when hurt
    if (this.alive && this.hp < this.maxHp * 0.5) {
      this._smokeTimer -= dt;
      if (this._smokeTimer <= 0) { this._smokeTimer = this.hp < this.maxHp * 0.25 ? 0.1 : 0.22; this.game.addParticle(new Particle(this.x + Util.rand(-6, 6), this.y + Util.rand(-6, 6), { vx: Util.rand(-10, 10), vy: -Util.rand(20, 45), life: Util.rand(0.6, 1.1), size: Util.rand(4, 8), color: 'rgba(40,40,40,0.5)', fade: true, drag: 0.97 })); }
    }
  }

  draw(ctx) {
    if (!this.game.camera.visible(this.x, this.y, this.radius * 2)) return;
    const p = this.palette, R = this.radius;
    ctx.save(); ctx.translate(this.x, this.y);
    ctx.save(); ctx.translate(4, 5); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, R * 1.15, R * 0.95, 0, 0, TAU); ctx.fill(); ctx.restore();
    // hull
    ctx.save(); ctx.rotate(this.bodyAngle);
    const L = R * 2.2, W = R * 1.7;
    ctx.fillStyle = p.tread; roundRectPath(ctx, -L / 2, -W / 2, L, W * 0.3, 4); ctx.fill(); roundRectPath(ctx, -L / 2, W / 2 - W * 0.3, L, W * 0.3, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (let i = -3; i <= 3; i++) { const lx = i * 12 + this.treadOffset - 6; if (lx > -L / 2 + 2 && lx < L / 2 - 4) { ctx.fillRect(lx, -W / 2 + 1, 3, W * 0.3 - 2); ctx.fillRect(lx, W / 2 - W * 0.3 + 1, 3, W * 0.3 - 2); } }
    const g = ctx.createLinearGradient(0, -W / 2, 0, W / 2); g.addColorStop(0, p.hi); g.addColorStop(0.5, p.hull); g.addColorStop(1, p.hullDark);
    ctx.fillStyle = g; roundRectPath(ctx, -L * 0.42, -W * 0.32, L * 0.84, W * 0.64, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRectPath(ctx, L * 0.30, -W * 0.22, L * 0.1, W * 0.44, 2); ctx.fill();
    if (this.frontShield) { ctx.strokeStyle = '#bfe2ef'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, R * 1.18, -0.9, 0.9); ctx.stroke(); }
    ctx.restore();
    // turret + barrel
    ctx.save(); ctx.rotate(this.turretAngle);
    const recoil = this.recoil * 0.6;
    ctx.fillStyle = p.barrel; roundRectPath(ctx, R * 0.2 - recoil, -R * 0.16, this.barrelLength - R * 0.2, R * 0.32, R * 0.12); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#1c1c1c'; roundRectPath(ctx, this.barrelLength - R * 0.3 - recoil, -R * 0.22, R * 0.28, R * 0.44, 2); ctx.fill();
    const tg = ctx.createRadialGradient(-R * 0.1, -R * 0.1, 2, 0, 0, R * 0.62); tg.addColorStop(0, p.turret); tg.addColorStop(1, p.hullDark);
    ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(0, 0, R * 0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(-R * 0.12, 0, R * 0.16, 0, TAU); ctx.fill();
    ctx.restore();
    if (this.hitTimer > 0) { ctx.globalAlpha = this.hitTimer / 0.1 * 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, R * 1.2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (this.shieldTime > 0) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.game.time * 8); ctx.strokeStyle = '#4ec3e0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R * 1.35, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    if (this.burn > 0) { ctx.globalAlpha = 0.4; ctx.strokeStyle = '#ff8c2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * 1.25, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore();
    this.drawHealthBar(ctx);
  }
  drawHealthBar(ctx) {
    if (this.hp >= this.maxHp && this.team !== 'player') return;
    const w = this.radius * 2.2, h = 5, x = this.x - w / 2, y = this.y - this.radius - 14, p = Util.clamp(this.hp / this.maxHp, 0, 1);
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.6)'; roundRectPath(ctx, x - 1, y - 1, w + 2, h + 2, 3); ctx.fill();
    ctx.fillStyle = p > 0.5 ? '#5fcf5f' : (p > 0.25 ? '#e0c341' : '#e05050'); roundRectPath(ctx, x, y, w * p, h, 2); ctx.fill(); ctx.restore();
  }
}

/* --------------------------- Player tank -------------------------------- */
class PlayerTank extends Tank {
  constructor(game, x, y) {
    super(game, x, y, { radius: CONFIG.player.radius, team: 'player', pal: 'player', maxHp: CONFIG.player.maxHp, speed: CONFIG.player.speed, turnSpeed: CONFIG.player.turnSpeed, turretTurn: CONFIG.player.turretTurn });
    this.invuln = 1.0;
    // arsenal
    this.weapons = { cannon: Infinity };
    this.weaponOrder = ['cannon'];
    this.weapon = 'cannon';
    this.fireCooldown = 0;
    // dash
    this.dashTime = 0; this.dashCd = 0; this.dashDir = { x: 1, y: 0 };
    // perks / upgrades
    this.damageMult = 1; this.fireRateMult = 1; this.speedMult = 1; this.bulletSpeedMult = 1;
    this.extraProjectiles = 0; this.ricochet = 0; this.pierceBonus = 0; this.incendiary = 0;
    this.lifestealPct = 0; this.critChance = 0.06; this.critMult = 2; this.thorns = 0;
    this.pickupRange = 120; this.dropBonus = 0; this.adrenaline = false; this.dashCdMult = 1;
  }
  giveWeapon(key) {
    const w = WEAPONS[key];
    if (this.weapons[key] === undefined) { this.weapons[key] = w.ammo || 0; this.weaponOrder.push(key); }
    else this.weapons[key] += w.ammo || 0;
    this.weapon = key; // auto-equip
  }
  cycleWeapon(dir) {
    const i = this.weaponOrder.indexOf(this.weapon);
    this.weapon = this.weaponOrder[(i + dir + this.weaponOrder.length) % this.weaponOrder.length];
  }
  selectWeaponIndex(n) { if (n >= 0 && n < this.weaponOrder.length) this.weapon = this.weaponOrder[n]; }

  applyPowerUp(type) {
    switch (type) {
      case 'heal': this.hp = Math.min(this.maxHp, this.hp + 40); break;
      case 'shield': this.shieldTime = 8; break;
      case 'rapid': this.rapidTime = 8; break;
      case 'spread': this.spreadTime = 10; break;
      case 'speed': this.speedTime = 8; break;
      case 'damage': this.damageTime = 10; break;
    }
  }
  takeDamage(amount, fromAngle, fromPlayer, opts) {
    if (this.invuln > 0 || this.dashTime > 0) return false;
    return super.takeDamage(amount, fromAngle, fromPlayer, opts);
  }
  dash() {
    if (this.dashCd > 0) return;
    this.dashCd = 1.5 * this.dashCdMult; this.dashTime = 0.18;
    const input = this.game.input;
    let dx = 0, dy = 0;
    if (input.down('KeyW') || input.down('ArrowUp')) dy -= 1;
    if (input.down('KeyS') || input.down('ArrowDown')) dy += 1;
    if (input.down('KeyA') || input.down('ArrowLeft')) dx -= 1;
    if (input.down('KeyD') || input.down('ArrowRight')) dx += 1;
    if (dx === 0 && dy === 0) { dx = Math.cos(this.bodyAngle); dy = Math.sin(this.bodyAngle); }
    const len = Math.hypot(dx, dy); this.dashDir = { x: dx / len, y: dy / len };
    this.bodyAngle = Math.atan2(dy, dx);
    this.game.audio.dash();
    this.game.camera.shake(4, 0.12);
  }
  fire() {
    if (this.fireCooldown > 0) return;
    let w = WEAPONS[this.weapon];
    if (!w.infinite && (this.weapons[this.weapon] || 0) <= 0) { this.weapon = 'cannon'; w = WEAPONS.cannon; }
    const rate = w.fireRate * this.fireRateMult * (this.rapidTime > 0 ? 0.5 : 1) * (this.adrenaline && this.hp < this.maxHp * 0.4 ? 0.6 : 1);
    this.fireCooldown = rate; this.recoil = w.recoil;
    if (!w.infinite) this.weapons[this.weapon]--;

    const baseDmg = w.damage * this.damageMult * (this.damageTime > 0 ? 1.6 : 1);
    const tipX = this.x + Math.cos(this.turretAngle) * this.barrelLength, tipY = this.y + Math.sin(this.turretAngle) * this.barrelLength;
    let pellets = w.pellets + this.extraProjectiles + (this.spreadTime > 0 ? 2 : 0);
    const spreadBase = w.spread || (pellets > 1 ? 0.14 : 0);
    for (let i = 0; i < pellets; i++) {
      const t = pellets > 1 ? (i / (pellets - 1) - 0.5) : 0;
      const ang = this.turretAngle + t * spreadBase + Util.rand(-0.02, 0.02);
      const crit = Util.chance(this.critChance);
      this.game.addBullet(new Bullet(this.game, tipX, tipY, ang, {
        speed: w.speed * this.bulletSpeedMult, damage: baseDmg * (crit ? this.critMult : 1), team: 'player',
        radius: w.radius, kind: w.kind, splash: w.splash || 0, pierce: (w.pierce || 0) + this.pierceBonus,
        ricochet: this.ricochet, burn: this.incendiary, crit, color: w.color,
      }));
    }
    this.game.addShellCasing(new ShellCasing(tipX, tipY, this.turretAngle + Math.PI / 2 + Util.rand(-0.4, 0.4)));
    for (let i = 0; i < 6; i++) { const a = this.turretAngle + Util.rand(-0.4, 0.4), sp = Util.rand(80, 200); this.game.addParticle(new Particle(tipX, tipY, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.16, size: Util.rand(2, 5), color: Util.choice(['#fff3c4', '#ffd34d', '#ff9a3b']), fade: true, shrink: true, glow: true })); }
    if (this.game.audio[w.sound]) this.game.audio[w.sound]();
    this.game.camera.shake(w.shake, 0.08);
  }
  onKill() { if (this.lifestealPct > 0) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.lifestealPct); this.game.addFloatingText(this.x, this.y - this.radius - 10, '+' + Math.round(this.maxHp * this.lifestealPct), { color: '#5fcf5f', size: 14 }); } }

  update(dt) {
    if (!this.alive) return;
    this.updateTimers(dt);
    if (this.invuln > 0) this.invuln -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    const input = this.game.input;

    // weapon switching
    const wheel = input.takeWheel(); if (wheel) this.cycleWeapon(wheel > 0 ? 1 : -1);
    for (let n = 1; n <= 5; n++) if (input.justPressed('Digit' + n)) this.selectWeaponIndex(n - 1);
    if (input.justPressed('KeyQ')) this.cycleWeapon(-1);
    // dash
    if (input.justPressed('ShiftLeft') || input.justPressed('ShiftRight') || input.rightPressed) this.dash();

    if (this.dashTime > 0) {
      this.dashTime -= dt;
      const ds = this.speed * 2.7;
      this.moveBy(this.dashDir.x * ds * dt, this.dashDir.y * ds * dt, dt);
      if (Math.random() < 0.7) this.game.addAfterImage(new AfterImage((c) => { c.translate(this.x, this.y); c.rotate(this.bodyAngle); c.fillStyle = '#7fb4ee'; roundRectPath(c, -this.radius, -this.radius * 0.8, this.radius * 2, this.radius * 1.6, 6); c.fill(); }));
    } else {
      let dx = 0, dy = 0;
      if (input.down('KeyW') || input.down('ArrowUp')) dy -= 1;
      if (input.down('KeyS') || input.down('ArrowDown')) dy += 1;
      if (input.down('KeyA') || input.down('ArrowLeft')) dx -= 1;
      if (input.down('KeyD') || input.down('ArrowRight')) dx += 1;
      const spd = this.speed * this.speedMult * (this.speedTime > 0 ? 1.4 : 1) * (this.slow > 0 ? 0.5 : 1);
      if (dx !== 0 || dy !== 0) { const len = Math.hypot(dx, dy); dx /= len; dy /= len; this.bodyAngle = Util.rotateToward(this.bodyAngle, Math.atan2(dy, dx), this.turnSpeed * dt); this.moveBy(dx * spd * dt, dy * spd * dt, dt); }
      else this.moving = false;
    }
    const m = this.game.camera.screenToWorld(input.mouse.x, input.mouse.y);
    this.aimTurret(Util.angleTo(this.x, this.y, m.x, m.y), dt);
    if (input.mouseDown || input.down('Space')) this.fire();
  }
}

/* ---------------------------- Enemy tank -------------------------------- */
class EnemyTank extends Tank {
  constructor(game, x, y, type, scale = {}) {
    const cfg = ENEMY_TYPES[type];
    super(game, x, y, { radius: cfg.radius, team: 'enemy', pal: cfg.pal, maxHp: Math.round(cfg.hp * (scale.hp || 1)), speed: cfg.speed * (scale.speed || 1), turnSpeed: cfg.turnSpeed, turretTurn: cfg.turretTurn });
    this.type = type; this.cfg = cfg;
    this.fireRate = cfg.fireRate * (scale.fireRate || 1); this.fireCooldown = Util.rand(0, this.fireRate);
    this.bulletSpeed = cfg.bulletSpeed; this.bulletDamage = cfg.damage * (scale.dmg || 1); this.bulletRadius = cfg.bulletRadius || 5;
    this.detect = cfg.detect; this.preferred = cfg.preferred; this.accuracy = cfg.accuracy;
    this.kind = cfg.kind || 'bullet'; this.splash = cfg.splash || 0;
    this.kamikaze = !!cfg.kamikaze; this.frontShield = !!cfg.frontShield;
    this.scoreValue = cfg.score; this.boss = false;
    this.aggro = false; this.wanderAngle = Util.rand(0, TAU); this.wanderTimer = Util.rand(1, 3);
    this.strafeDir = Util.chance(0.5) ? 1 : -1; this.strafeTimer = Util.rand(1.5, 3.5);
  }
  hasLineOfSight(tx, ty) {
    for (let s = 1; s < 10; s++) { const t = s / 10, px = Util.lerp(this.x, tx, t), py = Util.lerp(this.y, ty, t); for (const o of this.game.obstacles) if (!o.dead && o.blocksBullets && o.contains(px, py)) return false; }
    return true;
  }
  fire() {
    if (this.fireCooldown > 0) return;
    this.fireCooldown = this.fireRate; this.recoil = 5;
    const tipX = this.x + Math.cos(this.turretAngle) * this.barrelLength, tipY = this.y + Math.sin(this.turretAngle) * this.barrelLength;
    this.game.addBullet(new Bullet(this.game, tipX, tipY, this.turretAngle, { speed: this.bulletSpeed, damage: this.bulletDamage, team: 'enemy', radius: this.bulletRadius, kind: this.kind, splash: this.splash }));
    this.game.audio.enemyShoot();
  }
  update(dt) {
    if (!this.alive) return;
    this.updateTimers(dt); if (this.fireCooldown > 0) this.fireCooldown -= dt;
    const player = this.game.player;
    if (!player || !player.alive) { this._wander(dt); return; }
    const d = Util.dist(this.x, this.y, player.x, player.y);
    if (d < this.detect) this.aggro = true;
    if (!this.aggro) { this._wander(dt); return; }
    const toPlayer = Util.angleTo(this.x, this.y, player.x, player.y);

    if (this.kamikaze) { this._kamikaze(dt, d, toPlayer, player); return; }

    this.strafeTimer -= dt; if (this.strafeTimer <= 0) { this.strafeDir *= -1; this.strafeTimer = Util.rand(1.5, 3.5); }
    let mx = 0, my = 0; const dead = 40;
    if (d > this.preferred + dead) { mx += Math.cos(toPlayer); my += Math.sin(toPlayer); }
    else if (d < this.preferred - dead) { mx -= Math.cos(toPlayer); my -= Math.sin(toPlayer); }
    mx += Math.cos(toPlayer + Math.PI / 2) * this.strafeDir * 0.7; my += Math.sin(toPlayer + Math.PI / 2) * this.strafeDir * 0.7;
    const sep = this._separation(); mx += sep.x * 1.2; my += sep.y * 1.2;
    if (mx !== 0 || my !== 0) { const len = Math.hypot(mx, my); mx /= len; my /= len; const spd = this.speed * (this.slow > 0 ? 0.5 : 1); this.bodyAngle = Util.rotateToward(this.bodyAngle, Math.atan2(my, mx), this.turnSpeed * dt); this.moveBy(mx * spd * dt, my * spd * dt, dt); }
    const aim = toPlayer + Util.rand(-this.accuracy, this.accuracy); this.aimTurret(aim, dt);
    const aligned = Math.abs(Util.angleDiff(this.turretAngle, toPlayer)) < 0.22;
    if (aligned && d < this.detect && this.hasLineOfSight(player.x, player.y)) this.fire();
  }
  _kamikaze(dt, d, toPlayer, player) {
    this.bodyAngle = Util.rotateToward(this.bodyAngle, toPlayer, this.turnSpeed * dt); this.turretAngle = this.bodyAngle;
    this.moveBy(Math.cos(this.bodyAngle) * this.speed * dt, Math.sin(this.bodyAngle) * this.speed * dt, dt);
    if (d < 100) { this._blink = (this._blink || 0) - dt; if (this._blink <= 0) { this._blink = 0.12; this.game.audio.lowHealth(); this.hitTimer = 0.1; } }
    if (d < this.radius + player.radius + 6) this._detonate(player);
  }
  _detonate(player) {
    this.game.spawnExplosion(this.x, this.y, 1.3); this.game.addDecal(new Decal(this.x, this.y, 60)); this.game.camera.shake(9, 0.3); this.game.audio.explosion(1.2);
    for (const t of this.game.allTanks()) { if (!t.alive || t === this) continue; const dd = Util.dist(this.x, this.y, t.x, t.y); if (dd < 110) t.takeDamage(40 * (1 - dd / 110), Util.angleTo(this.x, this.y, t.x, t.y), false, {}); }
    this.alive = false; this.hp = 0; this.game.onTankDestroyed(this, false);
  }
  _separation() { let x = 0, y = 0; for (const e of this.game.enemies) { if (e === this || !e.alive) continue; const dx = this.x - e.x, dy = this.y - e.y, dd = Math.hypot(dx, dy); if (dd > 0 && dd < this.radius * 3) { x += dx / dd; y += dy / dd; } } return { x, y }; }
  _wander(dt) {
    this.wanderTimer -= dt; if (this.wanderTimer <= 0) { this.wanderAngle = Util.rand(0, TAU); this.wanderTimer = Util.rand(2, 4); }
    this.bodyAngle = Util.rotateToward(this.bodyAngle, this.wanderAngle, this.turnSpeed * 0.5 * dt);
    this.moveBy(Math.cos(this.wanderAngle) * this.speed * 0.4 * dt, Math.sin(this.wanderAngle) * this.speed * 0.4 * dt, dt);
    this.aimTurret(this.bodyAngle, dt);
  }
}

/* ------------------------------- Boss ----------------------------------- */
class Boss extends Tank {
  constructor(game, x, y, hp) {
    super(game, x, y, { radius: 36, team: 'enemy', pal: 'boss', maxHp: hp, speed: 70, turnSpeed: 1.6, turretTurn: 2.0 });
    this.boss = true; this.scoreValue = 900; this.fireCooldown = 1.2; this.phase = 1;
    this.detect = 2000; this.preferred = 300; this.bulletSpeed = 380; this.bulletDamage = 16;
    this._burstTimer = 3; this._summonTimer = 8;
  }
  hasLineOfSight() { return true; }
  update(dt) {
    if (!this.alive) return;
    this.updateTimers(dt); if (this.fireCooldown > 0) this.fireCooldown -= dt;
    const player = this.game.player; if (!player || !player.alive) return;
    const ratio = this.hp / this.maxHp;
    const newPhase = ratio < 0.33 ? 3 : (ratio < 0.66 ? 2 : 1);
    if (newPhase !== this.phase) { this.phase = newPhase; this.game.onBossPhase(this, this.phase); }
    const d = Util.dist(this.x, this.y, player.x, player.y), toPlayer = Util.angleTo(this.x, this.y, player.x, player.y);
    // movement: keep medium distance, strafe
    let mx = Math.cos(toPlayer + Math.PI / 2) * 0.6, my = Math.sin(toPlayer + Math.PI / 2) * 0.6;
    if (d > 420) { mx += Math.cos(toPlayer); my += Math.sin(toPlayer); } else if (d < 240) { mx -= Math.cos(toPlayer); my -= Math.sin(toPlayer); }
    const len = Math.hypot(mx, my) || 1; const spd = this.speed * (this.phase === 3 ? 1.5 : 1);
    this.bodyAngle = Util.rotateToward(this.bodyAngle, Math.atan2(my, mx), this.turnSpeed * dt);
    this.moveBy(mx / len * spd * dt, my / len * spd * dt, dt);
    this.aimTurret(toPlayer, dt);
    // primary: aimed spread
    if (this.fireCooldown <= 0) {
      this.fireCooldown = this.phase === 3 ? 0.6 : (this.phase === 2 ? 0.9 : 1.2); this.recoil = 6;
      const tipX = this.x + Math.cos(this.turretAngle) * this.barrelLength, tipY = this.y + Math.sin(this.turretAngle) * this.barrelLength;
      const spreads = this.phase >= 2 ? [-0.22, -0.07, 0.07, 0.22] : [-0.15, 0, 0.15];
      for (const off of spreads) this.game.addBullet(new Bullet(this.game, tipX, tipY, this.turretAngle + off, { speed: this.bulletSpeed, damage: this.bulletDamage, team: 'enemy', radius: 7 }));
      this.game.audio.enemyShoot();
    }
    // phase 2+: radial burst
    if (this.phase >= 2) { this._burstTimer -= dt; if (this._burstTimer <= 0) { this._burstTimer = this.phase === 3 ? 2.2 : 3.2; const n = this.phase === 3 ? 18 : 12; for (let i = 0; i < n; i++) { const a = i / n * TAU; this.game.addBullet(new Bullet(this.game, this.x + Math.cos(a) * this.radius, this.y + Math.sin(a) * this.radius, a, { speed: 300, damage: 12, team: 'enemy', radius: 6 })); } this.game.camera.shake(5, 0.2); } }
    // phase 3: summon adds
    if (this.phase === 3) { this._summonTimer -= dt; if (this._summonTimer <= 0) { this._summonTimer = 10; this.game.summonAdds(2); this.game.addFloatingText(this.x, this.y - this.radius - 20, 'REINFORCEMENTS!', { color: '#c45bd6', size: 16 }); } }
  }
  draw(ctx) {
    super.draw(ctx);
    if (!this.game.camera.visible(this.x, this.y, this.radius * 2)) return;
    ctx.save(); ctx.translate(this.x, this.y);
    ctx.strokeStyle = `rgba(200,120,230,${0.3 + 0.2 * Math.sin(this.game.time * 4)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, this.radius * 1.45, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

/* ------------------------------ Turret ---------------------------------- */
class Turret extends Tank {
  constructor(game, x, y, scale = {}) {
    super(game, x, y, { radius: 25, team: 'enemy', pal: 'enemy', maxHp: Math.round(80 * (scale.hp || 1)), turretTurn: 1.9 });
    this.movable = false; this.range = 600; this.accuracy = 0.06; this.scoreValue = 150;
    this.fireRate = 1.8 * (scale.fireRate || 1); this.fireCooldown = Util.rand(0, this.fireRate);
    this.bulletSpeed = 470; this.bulletDamage = 13 * (scale.dmg || 1); this.bulletRadius = 6;
    this.palette = { hull: '#6b7076', hullDark: '#3f4448', hi: '#9aa0a6', tread: '#2a2d30', turret: '#cdd2d6', barrel: '#33383c' };
  }
  hasLineOfSight(tx, ty) { return EnemyTank.prototype.hasLineOfSight.call(this, tx, ty); }
  fire() {
    if (this.fireCooldown > 0) return; this.fireCooldown = this.fireRate; this.recoil = 5;
    const tipX = this.x + Math.cos(this.turretAngle) * this.barrelLength, tipY = this.y + Math.sin(this.turretAngle) * this.barrelLength;
    this.game.addBullet(new Bullet(this.game, tipX, tipY, this.turretAngle, { speed: this.bulletSpeed, damage: this.bulletDamage, team: 'enemy', radius: this.bulletRadius }));
    this.game.audio.enemyShoot();
  }
  update(dt) {
    if (!this.alive) return; this.updateTimers(dt); if (this.fireCooldown > 0) this.fireCooldown -= dt;
    const player = this.game.player; if (!player || !player.alive) return;
    const d = Util.dist(this.x, this.y, player.x, player.y), toPlayer = Util.angleTo(this.x, this.y, player.x, player.y);
    this.aimTurret(toPlayer + Util.rand(-this.accuracy, this.accuracy), dt);
    if (d < this.range && Math.abs(Util.angleDiff(this.turretAngle, toPlayer)) < 0.18 && this.hasLineOfSight(player.x, player.y)) this.fire();
  }
  draw(ctx) {
    if (!this.game.camera.visible(this.x, this.y, this.radius * 2)) return;
    const R = this.radius; ctx.save(); ctx.translate(this.x, this.y);
    ctx.save(); ctx.translate(3, 4); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, R * 1.25, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#5a5f64'; ctx.beginPath(); ctx.arc(0, 0, R * 1.15, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#7d756a'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95, R * 0.3, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.rotate(this.turretAngle); const recoil = this.recoil * 0.6;
    ctx.fillStyle = this.palette.barrel; roundRectPath(ctx, R * 0.2 - recoil, -R * 0.18, this.barrelLength - R * 0.2, R * 0.36, R * 0.14); ctx.fill();
    ctx.fillStyle = '#1c1c1c'; roundRectPath(ctx, this.barrelLength - R * 0.3 - recoil, -R * 0.24, R * 0.3, R * 0.48, 2); ctx.fill();
    const tg = ctx.createRadialGradient(-R * 0.1, -R * 0.1, 2, 0, 0, R * 0.7); tg.addColorStop(0, this.palette.turret); tg.addColorStop(1, this.palette.hullDark);
    ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(0, 0, R * 0.7, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    if (this.hitTimer > 0) { ctx.globalAlpha = this.hitTimer / 0.1 * 0.6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, R * 1.2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore(); this.drawHealthBar(ctx);
  }
}
