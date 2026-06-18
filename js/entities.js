/* =========================================================================
 * TanksALot — Entities
 * Every game object: obstacles, bullets, particles, explosions, power-ups,
 * floating text, and the tanks (player, enemy AI, turret, boss).
 * Tanks are drawn procedurally so orientation and rotation are always
 * correct and crisp at any zoom; the world still uses real art for ground,
 * obstacles, and explosions where available.
 * ====================================================================== */

'use strict';

/* Gameplay tuning. Spawn code scales these by difficulty/wave. */
const CONFIG = {
  player: { radius: 21, maxHp: 100, speed: 235, turnSpeed: 5.0, turretTurn: 12,
            fireRate: 0.26, bulletSpeed: 640, bulletDamage: 26, bulletRadius: 5 },
  enemy:  { radius: 21, maxHp: 55, speed: 125, turnSpeed: 2.8, turretTurn: 3.2,
            fireRate: 1.5, bulletSpeed: 430, bulletDamage: 11, bulletRadius: 5,
            detect: 560, preferred: 250, accuracy: 0.13 },
  turret: { radius: 25, maxHp: 80, turretTurn: 1.9, fireRate: 1.8, bulletSpeed: 470,
            bulletDamage: 13, bulletRadius: 6, range: 600, accuracy: 0.06 },
  bulletLife: 1.7,
  maxParticles: 520,
};

const PALETTE = {
  player: { hull: '#3f86d4', hullDark: '#2c5f9a', hi: '#7fb4ee', tread: '#27384a', turret: '#cfe2f7', barrel: '#26425f' },
  enemy:  { hull: '#d1483f', hullDark: '#9a2f28', hi: '#ee8079', tread: '#3a2320', turret: '#f3c9c5', barrel: '#5f2622' },
  boss:   { hull: '#8e44ad', hullDark: '#5e2d73', hi: '#c89bdd', tread: '#2c1738', turret: '#e7d2f1', barrel: '#3d1f4d' },
};

/* Small canvas helper (rounded rectangle path). */
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
// Axis-aligned blocker. Some are destructible (crates/barrels) and drop loot.
class Obstacle {
  constructor(game, x, y, w, h, opts = {}) {
    this.game = game;
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.kind = opts.kind || 'rock';      // rock | crate | barrel | tree | bush
    this.destructible = !!opts.destructible;
    this.hp = opts.hp || 40;
    this.maxHp = this.hp;
    this.blocksBullets = opts.blocksBullets !== false;
    this.dead = false;
    this.hitTimer = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  contains(px, py) { return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h; }

  // Closest point on the box to (px,py) — used for circle collision.
  closest(px, py) {
    return { x: Util.clamp(px, this.x, this.x + this.w), y: Util.clamp(py, this.y, this.y + this.h) };
  }

  damage(amount) {
    if (!this.destructible) return;
    this.hp -= amount;
    this.hitTimer = 0.08;
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      this.game.onObstacleDestroyed(this);
    }
  }

  update(dt) { if (this.hitTimer > 0) this.hitTimer -= dt; }

  draw(ctx) {
    if (!this.game.camera.visible(this.cx, this.cy, Math.max(this.w, this.h))) return;
    ctx.save();
    // soft shadow
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    roundRectPath(ctx, this.x + 4, this.y + 5, this.w, this.h, 6); ctx.fill();
    ctx.globalAlpha = 1;

    let base, top, line;
    if (this.kind === 'crate')      { base = '#a9712f'; top = '#caa05a'; line = '#5e3c14'; }
    else if (this.kind === 'barrel'){ base = '#b0392f'; top = '#d76a55'; line = '#5a1c16'; }
    else if (this.kind === 'tree')  { base = '#2f7d3a'; top = '#4fae5b'; line = '#1c4a23'; }
    else if (this.kind === 'bush')  { base = '#3c8d46'; top = '#62b86d'; line = '#234e29'; }
    else                            { base = '#7d8489'; top = '#a8b0b5'; line = '#454b4f'; }

    if (this.kind === 'tree' || this.kind === 'bush') {
      const r = this.w / 2;
      ctx.fillStyle = base; ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, TAU); ctx.fill();
      ctx.fillStyle = top; ctx.beginPath(); ctx.arc(this.cx - r * 0.18, this.cy - r * 0.18, r * 0.66, 0, TAU); ctx.fill();
      ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, TAU); ctx.stroke();
    } else {
      const g = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
      g.addColorStop(0, top); g.addColorStop(1, base);
      ctx.fillStyle = g;
      roundRectPath(ctx, this.x, this.y, this.w, this.h, 6); ctx.fill();
      ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.stroke();
      if (this.kind === 'crate') {
        ctx.strokeStyle = 'rgba(94,60,20,0.7)'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(this.x + 4, this.y + 4); ctx.lineTo(this.x + this.w - 4, this.y + this.h - 4);
        ctx.moveTo(this.x + this.w - 4, this.y + 4); ctx.lineTo(this.x + 4, this.y + this.h - 4);
        ctx.stroke();
      } else if (this.kind === 'barrel') {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 3, this.y + this.h * 0.33); ctx.lineTo(this.x + this.w - 3, this.y + this.h * 0.33);
        ctx.moveTo(this.x + 3, this.y + this.h * 0.66); ctx.lineTo(this.x + this.w - 3, this.y + this.h * 0.66);
        ctx.stroke();
      }
    }
    if (this.hitTimer > 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; roundRectPath(ctx, this.x, this.y, this.w, this.h, 6); ctx.fill(); }
    // damage cracks via health bar for destructibles
    if (this.destructible && this.hp < this.maxHp) {
      const w = this.w, p = this.hp / this.maxHp;
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(this.x, this.y - 7, w, 4);
      ctx.fillStyle = '#e0c341'; ctx.fillRect(this.x, this.y - 7, w * p, 4);
    }
    ctx.restore();
  }
}

/* ------------------------------ Bullet ---------------------------------- */
class Bullet {
  constructor(game, x, y, angle, opts) {
    this.game = game;
    this.x = x; this.y = y;
    this.angle = angle;
    this.speed = opts.speed;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.radius = opts.radius || 5;
    this.damage = opts.damage;
    this.team = opts.team;            // 'player' | 'enemy'
    this.life = opts.life || CONFIG.bulletLife;
    this.dead = false;
    this.color = this.team === 'player' ? '#ffd34d' : '#ff5a4d';
    this.glow = this.team === 'player' ? 'rgba(255,211,77,0.5)' : 'rgba(255,90,77,0.5)';
    this._trailTimer = 0;
  }

  update(dt) {
    const px = this.x, py = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    // World bounds
    if (this.x < 0 || this.y < 0 || this.x > this.game.world.w || this.y > this.game.world.h) {
      this._impact(false); return;
    }
    // Obstacles
    for (const o of this.game.obstacles) {
      if (o.dead || !o.blocksBullets) continue;
      const c = o.closest(this.x, this.y);
      if (Util.dist2(this.x, this.y, c.x, c.y) <= this.radius * this.radius) {
        if (o.destructible) o.damage(this.damage);
        this._impact(false); return;
      }
    }
    // Tanks (opposing team only)
    const targets = this.team === 'player' ? this.game.enemies : (this.game.player ? [this.game.player] : []);
    for (const t of targets) {
      if (!t.alive) continue;
      const rr = t.radius + this.radius;
      if (Util.dist2(this.x, this.y, t.x, t.y) <= rr * rr) {
        t.takeDamage(this.damage, this.angle, this.team === 'player');
        this._impact(true); return;
      }
    }

    // Trail
    this._trailTimer -= dt;
    if (this._trailTimer <= 0) {
      this._trailTimer = 0.015;
      this.game.addParticle(new Particle(px, py, {
        vx: Util.rand(-12, 12), vy: Util.rand(-12, 12), life: 0.18, size: this.radius * 0.8,
        color: this.color, fade: true, shrink: true,
      }));
    }
  }

  _impact(hitTank) {
    this.dead = true;
    this.game.audio.hit();
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
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    // glow
    ctx.shadowColor = this.glow; ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;
    roundRectPath(ctx, -this.radius * 1.6, -this.radius * 0.7, this.radius * 3.2, this.radius * 1.4, this.radius * 0.7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(this.radius * 0.7, 0, this.radius * 0.45, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

/* ----------------------------- Particle --------------------------------- */
class Particle {
  constructor(x, y, opts = {}) {
    this.x = x; this.y = y;
    this.vx = opts.vx || 0; this.vy = opts.vy || 0;
    this.life = opts.life || 0.5; this.maxLife = this.life;
    this.size = opts.size || 3;
    this.color = opts.color || '#fff';
    this.fade = opts.fade || false;
    this.shrink = opts.shrink || false;
    this.drag = opts.drag != null ? opts.drag : 0.9;
    this.glow = opts.glow || false;
    this.dead = false;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    const d = Math.pow(this.drag, dt * 60);
    this.vx *= d; this.vy *= d;
  }
  draw(ctx) {
    const t = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = this.fade ? Util.clamp(t, 0, 1) : 1;
    if (this.glow) { ctx.shadowColor = this.color; ctx.shadowBlur = 8; }
    ctx.fillStyle = this.color;
    const s = this.shrink ? this.size * t : this.size;
    ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0.5, s), 0, TAU); ctx.fill();
    ctx.restore();
  }
}

/* Long-lived tread mark drawn on the ground layer; fades slowly. */
class TreadMark {
  constructor(x, y, angle) { this.x = x; this.y = y; this.angle = angle; this.life = 6; this.maxLife = 6; this.dead = false; }
  update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.18 * (this.life / this.maxLife);
    ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    ctx.fillStyle = '#000';
    ctx.fillRect(-12, -14, 6, 28);
    ctx.fillRect(6, -14, 6, 28);
    ctx.restore();
  }
}

/* ----------------------------- Explosion -------------------------------- */
// Uses a real sprite sheet (5 frames of 256px) when available; otherwise a
// procedural shockwave. Always emits a particle burst.
class Explosion {
  constructor(game, x, y, scale = 1) {
    this.game = game; this.x = x; this.y = y; this.scale = scale;
    this.time = 0; this.dur = 0.5; this.dead = false;
    this.sheet = game.assets.getImage('img/Explosion_C.png') || game.assets.getImage('img/Explosion_A.png');
    this.frames = 5; this.frameW = 256; this.frameH = 256;
    for (let i = 0; i < 14 * scale; i++) {
      const a = Util.rand(0, TAU), sp = Util.rand(60, 260) * scale;
      game.addParticle(new Particle(x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: Util.rand(0.3, 0.7),
        size: Util.rand(3, 7) * scale, color: Util.choice(['#ffd34d', '#ff8c2b', '#ff5a2b', '#cfcfcf']),
        fade: true, shrink: true, glow: true,
      }));
    }
  }
  update(dt) { this.time += dt; if (this.time >= this.dur) this.dead = true; }
  draw(ctx) {
    const t = this.time / this.dur;
    if (this.sheet) {
      const idx = Math.min(this.frames - 1, Math.floor(t * this.frames));
      const size = 150 * this.scale;
      ctx.save();
      ctx.globalAlpha = 1 - t * 0.3;
      ctx.drawImage(this.sheet, idx * this.frameW, 0, this.frameW, this.frameH,
        this.x - size / 2, this.y - size / 2, size, size);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 6 * (1 - t);
      ctx.beginPath(); ctx.arc(this.x, this.y, 10 + t * 70 * this.scale, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(255,${Math.floor(180 - t * 120)},60,${(1 - t) * 0.6})`;
      ctx.beginPath(); ctx.arc(this.x, this.y, (1 - t) * 40 * this.scale, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
}

/* ---------------------------- Floating text ----------------------------- */
class FloatingText {
  constructor(x, y, text, opts = {}) {
    this.x = x; this.y = y; this.text = text;
    this.color = opts.color || '#fff';
    this.size = opts.size || 18;
    this.life = opts.life || 0.9; this.maxLife = this.life;
    this.vy = opts.vy || -42; this.dead = false;
  }
  update(dt) { this.life -= dt; this.y += this.vy * dt; if (this.life <= 0) this.dead = true; }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Util.clamp(this.life / this.maxLife, 0, 1);
    ctx.font = `bold ${this.size}px Trebuchet MS, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillStyle = this.color; ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

/* ----------------------------- Power-up ---------------------------------- */
const POWERUP_TYPES = {
  heal:   { color: '#46c46a', label: '+HP' },
  shield: { color: '#4ec3e0', label: 'SHIELD' },
  rapid:  { color: '#f0a93b', label: 'RAPID' },
  spread: { color: '#c45bd6', label: 'SPREAD' },
  speed:  { color: '#5bd6a8', label: 'SPEED' },
  damage: { color: '#e0563b', label: 'DAMAGE' },
};

class PowerUp {
  constructor(game, x, y, type) {
    this.game = game; this.x = x; this.y = y; this.type = type;
    this.radius = 16; this.bob = Math.random() * TAU; this.life = 18; this.dead = false;
  }
  update(dt) {
    this.bob += dt * 3;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    const p = this.game.player;
    if (p && p.alive) {
      const d = Util.dist(this.x, this.y, p.x, p.y);
      if (d < 120) { // magnet
        const a = Util.angleTo(this.x, this.y, p.x, p.y);
        const pull = (120 - d) * 2.2;
        this.x += Math.cos(a) * pull * dt; this.y += Math.sin(a) * pull * dt;
      }
      if (d < this.radius + p.radius) { this._collect(p); }
    }
  }
  _collect(p) {
    this.dead = true;
    this.game.audio.pickup();
    p.applyPowerUp(this.type);
    const info = POWERUP_TYPES[this.type];
    this.game.addFloatingText(this.x, this.y - 10, info.label, { color: info.color, size: 18 });
    for (let i = 0; i < 12; i++) {
      const a = Util.rand(0, TAU), sp = Util.rand(40, 140);
      this.game.addParticle(new Particle(this.x, this.y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, size: 3, color: info.color, fade: true, shrink: true, glow: true,
      }));
    }
  }
  draw(ctx) {
    const info = POWERUP_TYPES[this.type];
    const yoff = Math.sin(this.bob) * 4;
    const blink = this.life < 4 && Math.floor(this.life * 6) % 2 === 0;
    ctx.save();
    ctx.translate(this.x, this.y + yoff);
    if (blink) ctx.globalAlpha = 0.4;
    // glow halo
    ctx.shadowColor = info.color; ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    roundRectPath(ctx, -this.radius, -this.radius, this.radius * 2, this.radius * 2, 6); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = info.color; ctx.lineWidth = 3;
    roundRectPath(ctx, -this.radius, -this.radius, this.radius * 2, this.radius * 2, 6); ctx.stroke();
    this._icon(ctx, info.color);
    ctx.restore();
  }
  _icon(ctx, color) {
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (this.type) {
      case 'heal': // cross
        ctx.fillRect(-3, -9, 6, 18); ctx.fillRect(-9, -3, 18, 6); break;
      case 'shield':
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(8, -5); ctx.lineTo(8, 3);
        ctx.lineTo(0, 10); ctx.lineTo(-8, 3); ctx.lineTo(-8, -5); ctx.closePath(); ctx.fill(); break;
      case 'rapid': // double chevron
        ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(1, 0); ctx.lineTo(-7, 7);
        ctx.moveTo(0, -7); ctx.lineTo(8, 0); ctx.lineTo(0, 7); ctx.stroke(); break;
      case 'spread': // three lines fanning out
        ctx.beginPath();
        ctx.moveTo(0, 6); ctx.lineTo(0, -8);
        ctx.moveTo(0, 6); ctx.lineTo(-7, -5);
        ctx.moveTo(0, 6); ctx.lineTo(7, -5); ctx.stroke(); break;
      case 'speed': // lightning
        ctx.beginPath(); ctx.moveTo(2, -9); ctx.lineTo(-5, 1); ctx.lineTo(0, 1);
        ctx.lineTo(-2, 9); ctx.lineTo(6, -2); ctx.lineTo(1, -2); ctx.closePath(); ctx.fill(); break;
      case 'damage': // star burst
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU, r = i % 2 ? 4 : 9;
          ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill(); break;
    }
  }
}

/* ------------------------------- Tank ----------------------------------- */
// Base class shared by the player, enemy AI, and boss. Handles movement with
// collision resolution, turret aiming, firing, damage, and rendering.
class Tank {
  constructor(game, x, y, cfg, team, paletteKey) {
    this.game = game;
    this.x = x; this.y = y;
    this.radius = cfg.radius;
    this.team = team;
    this.palette = PALETTE[paletteKey];

    this.maxHp = cfg.maxHp; this.hp = cfg.maxHp;
    this.speed = cfg.speed || 0;
    this.turnSpeed = cfg.turnSpeed || 3;
    this.turretTurn = cfg.turretTurn || 3;

    this.fireRate = cfg.fireRate;
    this.fireCooldown = Util.rand(0, cfg.fireRate);
    this.bulletSpeed = cfg.bulletSpeed;
    this.bulletDamage = cfg.bulletDamage;
    this.bulletRadius = cfg.bulletRadius;

    this.bodyAngle = Util.rand(0, TAU);
    this.turretAngle = this.bodyAngle;
    this.alive = true;
    this.hitTimer = 0;
    this.recoil = 0;
    this.treadOffset = 0;
    this.moving = false;
    this._treadTimer = 0;

    // power-up state (player uses these; enemies ignore)
    this.shieldTime = 0;
    this.rapidTime = 0;
    this.spreadTime = 0;
    this.speedTime = 0;
    this.damageTime = 0;
  }

  get barrelLength() { return this.radius * 1.9; }

  // Move by an intended velocity vector and resolve collisions.
  moveBy(dx, dy, dt) {
    if (dx === 0 && dy === 0) { this.moving = false; return; }
    this.moving = true;
    this.x += dx;
    this.y += dy;
    this._resolveCollisions();
    // tread marks + animation
    this.treadOffset = (this.treadOffset + Math.hypot(dx, dy) * 0.4) % 12;
    this._treadTimer -= dt;
    if (this._treadTimer <= 0) {
      this._treadTimer = 0.08;
      this.game.addTreadMark(new TreadMark(this.x, this.y, this.bodyAngle));
    }
  }

  _resolveCollisions() {
    const w = this.game.world;
    this.x = Util.clamp(this.x, this.radius, w.w - this.radius);
    this.y = Util.clamp(this.y, this.radius, w.h - this.radius);
    // obstacles
    for (const o of this.game.obstacles) {
      if (o.dead) continue;
      const c = o.closest(this.x, this.y);
      const dx = this.x - c.x, dy = this.y - c.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < this.radius * this.radius) {
        const d = Math.sqrt(d2) || 0.0001;
        const push = this.radius - d;
        this.x += (dx / d) * push; this.y += (dy / d) * push;
      }
    }
    // other tanks (separation so they don't overlap)
    for (const t of this.game.allTanks()) {
      if (t === this || !t.alive) continue;
      const dx = this.x - t.x, dy = this.y - t.y;
      const min = this.radius + t.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const overlap = min - d;
        const nx = dx / d, ny = dy / d;
        if (t.movable === false) {
          // immovable (turret): push fully out of it
          this.x += nx * overlap; this.y += ny * overlap;
        } else {
          // share the separation evenly
          const half = overlap * 0.5;
          this.x += nx * half; this.y += ny * half;
          t.x -= nx * half; t.y -= ny * half;
        }
      }
    }
  }

  aimTurret(targetAngle, dt) {
    this.turretAngle = Util.rotateToward(this.turretAngle, targetAngle, this.turretTurn * dt);
  }

  canFire() { return this.fireCooldown <= 0; }

  fire() {
    if (!this.canFire()) return;
    const rate = this.rapidTime > 0 ? this.fireRate * 0.45 : this.fireRate;
    this.fireCooldown = rate;
    this.recoil = 5;

    const dmg = this.bulletDamage * (this.damageTime > 0 ? 1.6 : 1);
    const tipX = this.x + Math.cos(this.turretAngle) * this.barrelLength;
    const tipY = this.y + Math.sin(this.turretAngle) * this.barrelLength;

    const angles = (this.spreadTime > 0)
      ? [this.turretAngle - 0.22, this.turretAngle, this.turretAngle + 0.22]
      : [this.turretAngle];

    for (const a of angles) {
      this.game.addBullet(new Bullet(this.game, tipX, tipY, a, {
        speed: this.bulletSpeed, damage: dmg, team: this.team, radius: this.bulletRadius,
      }));
    }

    // muzzle flash
    for (let i = 0; i < 6; i++) {
      const a = this.turretAngle + Util.rand(-0.4, 0.4), sp = Util.rand(80, 200);
      this.game.addParticle(new Particle(tipX, tipY, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.16, size: Util.rand(2, 5),
        color: Util.choice(['#fff3c4', '#ffd34d', '#ff9a3b']), fade: true, shrink: true, glow: true,
      }));
    }
    if (this.team === 'player') { this.game.audio.shoot(); this.game.camera.shake(3, 0.08); }
    else this.game.audio.enemyShoot();
  }

  takeDamage(amount, fromAngle, fromPlayer) {
    if (!this.alive) return;
    if (this.shieldTime > 0) {
      // shield absorbs the hit
      this.game.addFloatingText(this.x, this.y - this.radius - 8, 'BLOCK', { color: '#4ec3e0', size: 14 });
      return;
    }
    this.hp -= amount;
    this.hitTimer = 0.1;
    // knockback
    this.x += Math.cos(fromAngle) * 4; this.y += Math.sin(fromAngle) * 4;
    this._resolveCollisions();
    if (this.hp <= 0) this.die(fromPlayer);
  }

  die(byPlayer) {
    if (!this.alive) return;
    this.alive = false;
    this.hp = 0;
    this.game.spawnExplosion(this.x, this.y, this.radius / 21);
    this.game.audio.explosion();
    this.game.camera.shake(this.team === 'player' ? 12 : 6, 0.35);
    this.game.onTankDestroyed(this, byPlayer);
  }

  updateTimers(dt) {
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.hitTimer > 0) this.hitTimer -= dt;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 40);
    if (this.shieldTime > 0) this.shieldTime -= dt;
    if (this.rapidTime > 0) this.rapidTime -= dt;
    if (this.spreadTime > 0) this.spreadTime -= dt;
    if (this.speedTime > 0) this.speedTime -= dt;
    if (this.damageTime > 0) this.damageTime -= dt;
  }

  /* --------------------------- rendering ------------------------------- */
  draw(ctx) {
    if (!this.game.camera.visible(this.x, this.y, this.radius * 2)) return;
    const p = this.palette;
    const R = this.radius;
    ctx.save();
    ctx.translate(this.x, this.y);

    // shadow
    ctx.save();
    ctx.translate(4, 5); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.15, R * 0.95, 0, 0, TAU); ctx.fill();
    ctx.restore();

    // ---- hull (rotates with body) ----
    ctx.save();
    ctx.rotate(this.bodyAngle);
    const L = R * 2.2, W = R * 1.7;
    // treads
    ctx.fillStyle = p.tread;
    roundRectPath(ctx, -L / 2, -W / 2, L, W * 0.3, 4); ctx.fill();
    roundRectPath(ctx, -L / 2, W / 2 - W * 0.3, L, W * 0.3, 4); ctx.fill();
    // tread lugs (animated)
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (let i = -3; i <= 3; i++) {
      const lx = i * 12 + this.treadOffset - 6;
      if (lx > -L / 2 + 2 && lx < L / 2 - 4) {
        ctx.fillRect(lx, -W / 2 + 1, 3, W * 0.3 - 2);
        ctx.fillRect(lx, W / 2 - W * 0.3 + 1, 3, W * 0.3 - 2);
      }
    }
    // hull body with gradient
    const g = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
    g.addColorStop(0, p.hi); g.addColorStop(0.5, p.hull); g.addColorStop(1, p.hullDark);
    ctx.fillStyle = g;
    roundRectPath(ctx, -L * 0.42, -W * 0.32, L * 0.84, W * 0.64, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    // front indicator
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRectPath(ctx, L * 0.30, -W * 0.22, L * 0.1, W * 0.44, 2); ctx.fill();
    ctx.restore();

    // ---- turret + barrel (rotates independently) ----
    ctx.save();
    ctx.rotate(this.turretAngle);
    const recoil = this.recoil * 0.6;
    // barrel
    ctx.fillStyle = p.barrel;
    roundRectPath(ctx, R * 0.2 - recoil, -R * 0.16, this.barrelLength - R * 0.2, R * 0.32, R * 0.12); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    // muzzle
    ctx.fillStyle = '#1c1c1c';
    roundRectPath(ctx, this.barrelLength - R * 0.3 - recoil, -R * 0.22, R * 0.28, R * 0.44, 2); ctx.fill();
    // turret cap
    const tg = ctx.createRadialGradient(-R * 0.1, -R * 0.1, 2, 0, 0, R * 0.62);
    tg.addColorStop(0, p.turret); tg.addColorStop(1, p.hullDark);
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    // hatch dot
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.arc(-R * 0.12, 0, R * 0.16, 0, TAU); ctx.fill();
    ctx.restore();

    // ---- damage flash ----
    if (this.hitTimer > 0) {
      ctx.globalAlpha = this.hitTimer / 0.1 * 0.6;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, R * 1.2, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // ---- shield ----
    if (this.shieldTime > 0) {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.game.time * 8);
      ctx.strokeStyle = '#4ec3e0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, R * 1.35, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    this.drawHealthBar(ctx);
  }

  drawHealthBar(ctx) {
    if (this.hp >= this.maxHp && this.team !== 'player') return;
    const w = this.radius * 2.2, h = 5;
    const x = this.x - w / 2, y = this.y - this.radius - 14;
    const p = Util.clamp(this.hp / this.maxHp, 0, 1);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; roundRectPath(ctx, x - 1, y - 1, w + 2, h + 2, 3); ctx.fill();
    ctx.fillStyle = p > 0.5 ? '#5fcf5f' : (p > 0.25 ? '#e0c341' : '#e05050');
    roundRectPath(ctx, x, y, w * p, h, 2); ctx.fill();
    ctx.restore();
  }
}

/* --------------------------- Player tank -------------------------------- */
class PlayerTank extends Tank {
  constructor(game, x, y) {
    super(game, x, y, CONFIG.player, 'player', 'player');
    this.lives = 3;
    this.invuln = 1.0; // brief spawn protection
  }

  applyPowerUp(type) {
    switch (type) {
      case 'heal':   this.hp = Math.min(this.maxHp, this.hp + 40); break;
      case 'shield': this.shieldTime = 8; break;
      case 'rapid':  this.rapidTime = 8; break;
      case 'spread': this.spreadTime = 10; break;
      case 'speed':  this.speedTime = 8; break;
      case 'damage': this.damageTime = 10; break;
    }
  }

  takeDamage(amount, fromAngle, fromPlayer) {
    if (this.invuln > 0) return;
    super.takeDamage(amount, fromAngle, fromPlayer);
  }

  update(dt) {
    if (!this.alive) return;
    this.updateTimers(dt);
    if (this.invuln > 0) this.invuln -= dt;

    const input = this.game.input;
    let dx = 0, dy = 0;
    if (input.down('KeyW') || input.down('ArrowUp')) dy -= 1;
    if (input.down('KeyS') || input.down('ArrowDown')) dy += 1;
    if (input.down('KeyA') || input.down('ArrowLeft')) dx -= 1;
    if (input.down('KeyD') || input.down('ArrowRight')) dx += 1;

    const spd = this.speed * (this.speedTime > 0 ? 1.4 : 1);
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      // rotate body toward movement direction
      const moveAngle = Math.atan2(dy, dx);
      this.bodyAngle = Util.rotateToward(this.bodyAngle, moveAngle, this.turnSpeed * dt);
      this.moveBy(dx * spd * dt, dy * spd * dt, dt);
    } else { this.moving = false; }

    // aim turret at mouse (in world space)
    const m = this.game.camera.screenToWorld(input.mouse.x, input.mouse.y);
    this.aimTurret(Util.angleTo(this.x, this.y, m.x, m.y), dt);

    if (input.mouseDown || input.down('Space')) this.fire();
  }
}

/* ---------------------------- Enemy tank -------------------------------- */
class EnemyTank extends Tank {
  constructor(game, x, y, cfg, opts = {}) {
    super(game, x, y, cfg, 'enemy', opts.boss ? 'boss' : 'enemy');
    this.detect = cfg.detect;
    this.preferred = cfg.preferred;
    this.accuracy = cfg.accuracy;
    this.boss = !!opts.boss;
    this.aggro = false;
    this.wanderAngle = Util.rand(0, TAU);
    this.wanderTimer = Util.rand(1, 3);
    this.strafeDir = Util.chance(0.5) ? 1 : -1;
    this.strafeTimer = Util.rand(1.5, 3.5);
    this.scoreValue = opts.boss ? 500 : 100;
  }

  hasLineOfSight(tx, ty) {
    const steps = 10;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const px = Util.lerp(this.x, tx, t), py = Util.lerp(this.y, ty, t);
      for (const o of this.game.obstacles) {
        if (!o.dead && o.blocksBullets && o.contains(px, py)) return false;
      }
    }
    return true;
  }

  update(dt) {
    if (!this.alive) return;
    this.updateTimers(dt);
    const player = this.game.player;

    if (!player || !player.alive) { this._wander(dt); return; }

    const d = Util.dist(this.x, this.y, player.x, player.y);
    if (d < this.detect) this.aggro = true;
    if (!this.aggro) { this._wander(dt); return; }

    const toPlayer = Util.angleTo(this.x, this.y, player.x, player.y);

    // movement: maintain preferred range + strafe
    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) { this.strafeDir *= -1; this.strafeTimer = Util.rand(1.5, 3.5); }

    let mx = 0, my = 0;
    const dead = 40;
    if (d > this.preferred + dead) { mx += Math.cos(toPlayer); my += Math.sin(toPlayer); }
    else if (d < this.preferred - dead) { mx -= Math.cos(toPlayer); my -= Math.sin(toPlayer); }
    // strafe perpendicular
    mx += Math.cos(toPlayer + Math.PI / 2) * this.strafeDir * 0.7;
    my += Math.sin(toPlayer + Math.PI / 2) * this.strafeDir * 0.7;
    // separation from other enemies
    const sep = this._separation();
    mx += sep.x * 1.2; my += sep.y * 1.2;

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my); mx /= len; my /= len;
      this.bodyAngle = Util.rotateToward(this.bodyAngle, Math.atan2(my, mx), this.turnSpeed * dt);
      this.moveBy(mx * this.speed * dt, my * this.speed * dt, dt);
    }

    // aim with a little inaccuracy
    const aim = toPlayer + Util.rand(-this.accuracy, this.accuracy);
    this.aimTurret(aim, dt);

    // fire when roughly aimed, within range, and with line of sight
    const aligned = Math.abs(Util.angleDiff(this.turretAngle, toPlayer)) < 0.22;
    if (aligned && d < this.detect && this.hasLineOfSight(player.x, player.y)) {
      if (this.boss && this.canFire()) { this._bossFire(); }
      else this.fire();
    }
  }

  _bossFire() {
    // triple spread shot
    this.fireCooldown = this.fireRate;
    this.recoil = 6;
    const tipX = this.x + Math.cos(this.turretAngle) * this.barrelLength;
    const tipY = this.y + Math.sin(this.turretAngle) * this.barrelLength;
    for (const off of [-0.18, 0, 0.18]) {
      this.game.addBullet(new Bullet(this.game, tipX, tipY, this.turretAngle + off, {
        speed: this.bulletSpeed, damage: this.bulletDamage, team: 'enemy', radius: this.bulletRadius,
      }));
    }
    this.game.audio.enemyShoot();
  }

  _separation() {
    let x = 0, y = 0;
    for (const e of this.game.enemies) {
      if (e === this || !e.alive) continue;
      const dx = this.x - e.x, dy = this.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < this.radius * 3) { x += dx / d; y += dy / d; }
    }
    return { x, y };
  }

  _wander(dt) {
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) { this.wanderAngle = Util.rand(0, TAU); this.wanderTimer = Util.rand(2, 4); }
    const mx = Math.cos(this.wanderAngle), my = Math.sin(this.wanderAngle);
    this.bodyAngle = Util.rotateToward(this.bodyAngle, this.wanderAngle, this.turnSpeed * 0.5 * dt);
    this.moveBy(mx * this.speed * 0.4 * dt, my * this.speed * 0.4 * dt, dt);
    this.aimTurret(this.bodyAngle, dt);
  }
}

/* ------------------------------ Turret ---------------------------------- */
// Stationary emplacement: doesn't move, rotates to track the player.
class Turret extends Tank {
  constructor(game, x, y) {
    super(game, x, y, CONFIG.turret, 'enemy', 'enemy');
    this.movable = false;
    this.range = CONFIG.turret.range;
    this.accuracy = CONFIG.turret.accuracy;
    this.scoreValue = 150;
    this.palette = { hull: '#6b7076', hullDark: '#3f4448', hi: '#9aa0a6', tread: '#2a2d30', turret: '#cdd2d6', barrel: '#33383c' };
  }

  hasLineOfSight(tx, ty) { return EnemyTank.prototype.hasLineOfSight.call(this, tx, ty); }

  update(dt) {
    if (!this.alive) return;
    this.updateTimers(dt);
    const player = this.game.player;
    if (!player || !player.alive) return;
    const d = Util.dist(this.x, this.y, player.x, player.y);
    const toPlayer = Util.angleTo(this.x, this.y, player.x, player.y);
    this.aimTurret(toPlayer + Util.rand(-this.accuracy, this.accuracy), dt);
    const aligned = Math.abs(Util.angleDiff(this.turretAngle, toPlayer)) < 0.18;
    if (d < this.range && aligned && this.hasLineOfSight(player.x, player.y)) this.fire();
  }

  // Custom draw: sandbag/concrete base + rotating turret.
  draw(ctx) {
    if (!this.game.camera.visible(this.x, this.y, this.radius * 2)) return;
    const R = this.radius;
    ctx.save();
    ctx.translate(this.x, this.y);
    // base
    ctx.save(); ctx.translate(3, 4); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(0, 0, R * 1.25, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#5a5f64';
    ctx.beginPath(); ctx.arc(0, 0, R * 1.15, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3; ctx.stroke();
    // sandbag ring
    ctx.fillStyle = '#7d756a';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95, R * 0.3, 0, TAU); ctx.fill();
    }
    // rotating turret + barrel
    ctx.save();
    ctx.rotate(this.turretAngle);
    const recoil = this.recoil * 0.6;
    ctx.fillStyle = this.palette.barrel;
    roundRectPath(ctx, R * 0.2 - recoil, -R * 0.18, this.barrelLength - R * 0.2, R * 0.36, R * 0.14); ctx.fill();
    ctx.fillStyle = '#1c1c1c';
    roundRectPath(ctx, this.barrelLength - R * 0.3 - recoil, -R * 0.24, R * 0.3, R * 0.48, 2); ctx.fill();
    const tg = ctx.createRadialGradient(-R * 0.1, -R * 0.1, 2, 0, 0, R * 0.7);
    tg.addColorStop(0, this.palette.turret); tg.addColorStop(1, this.palette.hullDark);
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.7, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    if (this.hitTimer > 0) {
      ctx.globalAlpha = this.hitTimer / 0.1 * 0.6; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, R * 1.2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.restore();
    this.drawHealthBar(ctx);
  }
}
