/* =========================================================================
 * TanksALot — World
 * The battlefield: tiled ground, border walls, procedurally placed
 * obstacles, and helpers for finding valid spawn points. Also defines the
 * difficulty tuning table used when spawning enemies.
 * ====================================================================== */

'use strict';

const DIFFICULTIES = {
  easy:   { label: 'Easy',   hp: 0.8, dmg: 0.65, fireRate: 1.45, speed: 0.85, count: 0.8, lives: 5, color: '#5fcf5f' },
  normal: { label: 'Normal', hp: 1.0, dmg: 1.0,  fireRate: 1.0,  speed: 1.0,  count: 1.0, lives: 3, color: '#e0c341' },
  hard:   { label: 'Hard',   hp: 1.3, dmg: 1.4,  fireRate: 0.8,  speed: 1.12, count: 1.3, lives: 2, color: '#e08a3b' },
  insane: { label: 'Insane', hp: 1.7, dmg: 1.9,  fireRate: 0.62, speed: 1.25, count: 1.6, lives: 1, color: '#e0503b' },
};

const THEMES = {
  forest: { tile: 'img/forest/grass03.png', base: '#3f7a3f', alt: '#447f44', border: '#2c4a2c', grid: 'rgba(0,0,0,0.06)' },
  desert: { tile: 'img/background/desertTile.png', base: '#cda564', alt: '#d2ab6c', border: '#9a7b44', grid: 'rgba(0,0,0,0.05)' },
};

class World {
  constructor(game, w, h, themeKey) {
    this.game = game;
    this.w = w; this.h = h;
    this.themeKey = themeKey;
    this.theme = THEMES[themeKey] || THEMES.forest;
    this.pattern = null;
    this._buildPattern();
  }

  _buildPattern() {
    const img = this.game.assets.getImage(this.theme.tile);
    if (img && img.width > 0) {
      try { this.pattern = this.game.ctx.createPattern(img, 'repeat'); } catch (e) { this.pattern = null; }
    }
  }

  // Scatter non-overlapping obstacles, keeping a clear zone around the
  // player's central spawn so the game never starts the player stuck.
  generateObstacles(count, playerX, playerY) {
    const obstacles = [];
    const clearR = 220;
    const margin = 120;
    let attempts = 0;
    while (obstacles.length < count && attempts < count * 30) {
      attempts++;
      const w = Util.randInt(40, 84);
      const h = Util.randInt(40, 84);
      const x = Util.rand(margin, this.w - margin - w);
      const y = Util.rand(margin, this.h - margin - h);
      const cx = x + w / 2, cy = y + h / 2;
      if (Util.dist(cx, cy, playerX, playerY) < clearR) continue;
      // no overlap with existing (with padding so tanks can pass between)
      let ok = true;
      for (const o of obstacles) {
        if (cx > o.x - w - 30 && cx < o.x + o.w + 30 && cy > o.y - h - 30 && cy < o.y + o.h + 30) { ok = false; break; }
      }
      if (!ok) continue;

      const roll = Math.random();
      let kind, destructible, hp, blocksBullets = true;
      if (this.themeKey === 'desert') {
        if (roll < 0.45) { kind = 'crate'; destructible = true; hp = 40; }
        else if (roll < 0.7) { kind = 'barrel'; destructible = true; hp = 30; }
        else { kind = 'rock'; destructible = false; hp = 0; }
      } else {
        if (roll < 0.4) { kind = 'tree'; destructible = false; hp = 0; }
        else if (roll < 0.6) { kind = 'bush'; destructible = true; hp = 25; blocksBullets = false; }
        else if (roll < 0.8) { kind = 'crate'; destructible = true; hp = 40; }
        else { kind = 'rock'; destructible = false; hp = 0; }
      }
      if (kind === 'tree' || kind === 'bush') {
        const s = Math.max(w, h); // keep round things square
        obstacles.push(new Obstacle(this.game, cx - s / 2, cy - s / 2, s, s, { kind, destructible, hp, blocksBullets }));
      } else {
        obstacles.push(new Obstacle(this.game, x, y, w, h, { kind, destructible, hp, blocksBullets }));
      }
    }
    return obstacles;
  }

  // A random point at least minDist from the player and not inside an obstacle.
  randomSpawn(minDist) {
    const margin = 140;
    for (let i = 0; i < 60; i++) {
      const x = Util.rand(margin, this.w - margin);
      const y = Util.rand(margin, this.h - margin);
      const p = this.game.player;
      if (p && Util.dist(x, y, p.x, p.y) < minDist) continue;
      let blocked = false;
      for (const o of this.game.obstacles) {
        if (!o.dead && o.contains(x, y)) { blocked = true; break; }
        if (!o.dead && Util.dist(x, y, o.cx, o.cy) < 50) { blocked = true; break; }
      }
      if (!blocked) return { x, y };
    }
    // fallback: a corner
    return { x: Util.choice([margin, this.w - margin]), y: Util.choice([margin, this.h - margin]) };
  }

  draw(ctx) {
    // ground
    if (this.pattern) {
      ctx.fillStyle = this.pattern;
      ctx.fillRect(0, 0, this.w, this.h);
    } else {
      ctx.fillStyle = this.theme.base;
      ctx.fillRect(0, 0, this.w, this.h);
      // subtle checker for texture
      ctx.fillStyle = this.theme.alt;
      const s = 64;
      for (let y = 0; y < this.h; y += s) {
        for (let x = 0; x < this.w; x += s) {
          if (((x / s) + (y / s)) % 2 === 0) ctx.fillRect(x, y, s, s);
        }
      }
    }
    // faint grid for spatial reference
    ctx.strokeStyle = this.theme.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= this.w; x += 128) { ctx.moveTo(x, 0); ctx.lineTo(x, this.h); }
    for (let y = 0; y <= this.h; y += 128) { ctx.moveTo(0, y); ctx.lineTo(this.w, y); }
    ctx.stroke();

    // border wall
    const bw = 16;
    ctx.fillStyle = this.theme.border;
    ctx.fillRect(0, 0, this.w, bw);
    ctx.fillRect(0, this.h - bw, this.w, bw);
    ctx.fillRect(0, 0, bw, this.h);
    ctx.fillRect(this.w - bw, 0, bw, this.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    ctx.strokeRect(bw, bw, this.w - bw * 2, this.h - bw * 2);
  }
}
