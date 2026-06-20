/* =========================================================================
 * TanksALot — World
 * Themes (each with an `ambient` value for the dynamic-lighting pass),
 * obstacles, hazards, weather/parallax, the rarity-tiered perk pool, and
 * wave composition (which enemy archetypes appear when).
 * ====================================================================== */

'use strict';

const DIFFICULTIES = {
  easy:   { label: 'Easy',   hp: 0.8, dmg: 0.65, fireRate: 1.45, speed: 0.85, count: 0.8, lives: 5, elite: 0.04, color: '#5fcf5f' },
  normal: { label: 'Normal', hp: 1.0, dmg: 1.0,  fireRate: 1.0,  speed: 1.0,  count: 1.0, lives: 3, elite: 0.08, color: '#e0c341' },
  hard:   { label: 'Hard',   hp: 1.3, dmg: 1.4,  fireRate: 0.8,  speed: 1.12, count: 1.3, lives: 2, elite: 0.14, color: '#e08a3b' },
  insane: { label: 'Insane', hp: 1.7, dmg: 1.9,  fireRate: 0.62, speed: 1.25, count: 1.6, lives: 1, elite: 0.22, color: '#e0503b' },
};

// `ambient` = opaque base colour the lighting pass multiplies the scene by.
// Lighter ambient => brighter scene; darker => more dramatic, lights pop more.
const THEMES = {
  forest:  { tile: 'img/forest/grass03.png', base: '#3f7a3f', alt: '#447f44', border: '#2c4a2c', grid: 'rgba(0,0,0,0.06)', weather: 'rain',   hazard: 'water', ambient: '#8b9088' },
  desert:  { tile: 'img/background/desertTile.png', base: '#cda564', alt: '#d2ab6c', border: '#9a7b44', grid: 'rgba(0,0,0,0.05)', weather: 'sand', hazard: 'lava',  ambient: '#9b9070' },
  arctic:  { tile: null, base: '#c4d2dc', alt: '#cdd9e2', border: '#8298a6', grid: 'rgba(0,0,0,0.05)', weather: 'snow',  hazard: 'ice',   ambient: '#aeb8c0' },
  neon:    { tile: null, base: '#13121f', alt: '#181830', border: '#3a2d6e', grid: 'rgba(120,90,255,0.25)', weather: 'stars', hazard: 'energy', ambient: '#241a40' },
  volcano: { tile: null, base: '#2a1c18', alt: '#33211c', border: '#5a2a1a', grid: 'rgba(120,40,20,0.25)', weather: 'embers', hazard: 'lava', ambient: '#3e2620' },
};

const RARITY = { common: { w: 60, color: '#cfd6de' }, rare: { w: 30, color: '#5fb8ff' }, epic: { w: 12, color: '#c45bd6' } };

const PERKS = [
  { id: 'damage',     name: 'Bigger Shells',  desc: '+25% damage',            rarity: 'common', apply: (p) => p.damageMult *= 1.25 },
  { id: 'firerate',   name: 'Rapid Loader',   desc: '+18% fire rate',         rarity: 'common', apply: (p) => p.fireRateMult *= 0.82 },
  { id: 'speed',      name: 'Nitro',          desc: '+15% move speed',        rarity: 'common', apply: (p) => p.speedMult *= 1.15 },
  { id: 'hp',         name: 'Reinforced Hull',desc: '+30 max HP (healed)',    rarity: 'common', apply: (p) => { p.maxHp += 30; p.hp += 30; } },
  { id: 'bulletspeed',name: 'High Velocity',  desc: '+20% bullet speed',      rarity: 'common', apply: (p) => p.bulletSpeedMult *= 1.2 },
  { id: 'knockback',  name: 'Heavy Rounds',   desc: 'Knock enemies back',     rarity: 'common', apply: (p) => p.knockbackBonus += 16 },
  { id: 'scavenger',  name: 'Scavenger',      desc: '+ loot & coin drops',    rarity: 'common', apply: (p) => p.dropBonus += 0.14 },
  { id: 'magnet',     name: 'Magnet',         desc: '+60% pickup range',      rarity: 'common', apply: (p) => p.pickupRange *= 1.6 },
  { id: 'pierce',     name: 'Piercing Rounds',desc: 'Bullets pierce +1 foe',  rarity: 'rare',   apply: (p) => p.pierceBonus += 1 },
  { id: 'ricochet',   name: 'Ricochet',       desc: 'Bullets bounce +1',      rarity: 'rare',   apply: (p) => p.ricochet += 1 },
  { id: 'crit',       name: 'Marksman',       desc: '+10% crit chance',       rarity: 'rare',   apply: (p) => p.critChance += 0.10 },
  { id: 'critdmg',    name: 'Lethality',      desc: '+0.6x crit damage',      rarity: 'rare',   apply: (p) => p.critMult += 0.6 },
  { id: 'vamp',       name: 'Vampirism',      desc: 'Heal 4% max HP per kill',rarity: 'rare',   apply: (p) => p.lifestealPct += 0.04 },
  { id: 'freeze',     name: 'Cryo Rounds',    desc: 'Shots slow enemies',     rarity: 'rare',   apply: (p) => p.freezeRounds = Math.max(p.freezeRounds, 0.8) },
  { id: 'regen',      name: 'Nanobots',       desc: 'Regenerate +3 HP/s',     rarity: 'rare',   apply: (p) => p.regen += 3 },
  { id: 'dodge',      name: 'Evasion',        desc: '+14% dodge chance',      rarity: 'rare',   apply: (p) => p.dodgeChance = Math.min(0.6, p.dodgeChance + 0.14) },
  { id: 'dash',       name: 'Dash Master',    desc: '-30% dash cooldown',     rarity: 'rare',   apply: (p) => p.dashCdMult *= 0.7 },
  { id: 'adrenaline', name: 'Adrenaline',     desc: 'Fire faster when hurt',  rarity: 'rare',   apply: (p) => p.adrenaline = true },
  { id: 'thorns',     name: 'Thorns',         desc: 'Reflect contact damage', rarity: 'rare',   apply: (p) => p.thorns += 16 },
  { id: 'ultcharge',  name: 'Overclock',      desc: '+50% ultimate charge',   rarity: 'rare',   apply: (p) => p.ultGainMult += 0.5 },
  { id: 'incendiary', name: 'Incendiary',     desc: 'Shots ignite enemies',   rarity: 'epic',   apply: (p) => p.incendiary = Math.max(p.incendiary, 1.2) },
  { id: 'twin',       name: 'Twin Barrel',    desc: '+1 projectile',          rarity: 'epic',   apply: (p) => p.extraProjectiles += 1 },
  { id: 'explosive',  name: 'Explosive Rounds',desc: 'Bullets detonate on hit',rarity: 'epic',  apply: (p) => p.explosiveRounds = Math.max(p.explosiveRounds, 46) },
  { id: 'drone',      name: 'Combat Drone',   desc: '+1 orbiting attack drone',rarity: 'epic',  apply: (p) => p.drones += 1 },
  { id: 'revive',     name: 'Phoenix Core',   desc: 'Revive once on death',   rarity: 'epic',   apply: (p) => p.reviveCharges += 1 },
  { id: 'glass',      name: 'Glass Cannon',   desc: '+70% dmg, -25% max HP',  rarity: 'epic',   apply: (p) => { p.damageMult *= 1.7; p.maxHp = Math.max(40, Math.round(p.maxHp * 0.75)); p.hp = Math.min(p.hp, p.maxHp); } },
  { id: 'life',       name: 'Extra Life',     desc: '+1 life',                rarity: 'epic',   apply: (p, g) => g.lives += 1 },
];

function rollPerk(exclude) {
  const pool = PERKS.filter((p) => !exclude.has(p.id));
  let total = 0; for (const p of pool) total += RARITY[p.rarity].w;
  let r = Math.random() * total;
  for (const p of pool) { r -= RARITY[p.rarity].w; if (r <= 0) return p; }
  return pool[pool.length - 1];
}

/* ------------------------------- Game modes ----------------------------- */
const MODES = {
  survival: { name: 'Survival', icon: '🎯', desc: 'Clear 20 escalating waves and topple the final boss.', finalWave: 20 },
  endless:  { name: 'Endless',  icon: '♾️', desc: 'Never-ending waves that scale forever. Chase the high score.', endless: true },
  bossrush: { name: 'Boss Rush', icon: '👹', desc: 'Back-to-back bosses with no breaks. How many can you fell?', bossrush: true },
  blitz:    { name: 'Blitz',    icon: '⏱️', desc: 'Three minutes of nonstop carnage — rack up maximum score.', timeLimit: 180 },
  sandbox:  { name: 'Sandbox',  icon: '🛠️', desc: 'Full arsenal, no death. Practice builds, weapons and combos.', sandbox: true },
};

/* ---------------------- Persistent meta-upgrades ------------------------ */
// Bought with credits between runs; applied to the player at run start.
const META_UPGRADES = [
  { id: 'hp',        name: 'Hull Plating',  desc: '+15 starting Max HP', max: 8, cost: (l) => 40 + l * 30, apply: (p, l) => { p.maxHp += 15 * l; p.hp = p.maxHp; } },
  { id: 'damage',    name: 'Munitions',     desc: '+8% damage',          max: 8, cost: (l) => 50 + l * 35, apply: (p, l) => { p.damageMult *= (1 + 0.08 * l); } },
  { id: 'firerate',  name: 'Autoloader',    desc: '+6% fire rate',       max: 6, cost: (l) => 50 + l * 40, apply: (p, l) => { p.fireRateMult *= Math.pow(0.94, l); } },
  { id: 'speed',     name: 'Engine Tuning', desc: '+6% move speed',      max: 6, cost: (l) => 40 + l * 30, apply: (p, l) => { p.speedMult *= (1 + 0.06 * l); } },
  { id: 'lives',     name: 'Spare Crew',    desc: '+1 starting life',    max: 3, cost: (l) => 120 + l * 120, apply: (p, l, g) => { g.lives += l; } },
  { id: 'magnet',    name: 'Tractor Beam',  desc: '+25% pickup range',   max: 4, cost: (l) => 40 + l * 30, apply: (p, l) => { p.pickupRange *= (1 + 0.25 * l); } },
  { id: 'crit',      name: 'Targeting AI',  desc: '+4% crit chance',     max: 5, cost: (l) => 60 + l * 40, apply: (p, l) => { p.critChance += 0.04 * l; } },
  { id: 'ultcharge', name: 'Capacitor',     desc: '+20% ult charge',     max: 4, cost: (l) => 70 + l * 50, apply: (p, l) => { p.ultGainMult += 0.2 * l; } },
  { id: 'shield',    name: 'Aegis Start',   desc: 'Begin each run shielded', max: 1, cost: () => 180, apply: (p, l) => { if (l) p.shieldTime = Math.max(p.shieldTime, 8); } },
  { id: 'startperk', name: 'Veteran',       desc: 'Start with a random perk', max: 1, cost: () => 260, apply: (p, l, g) => { if (l) { const pk = rollPerk(new Set()); pk.apply(p, g); } } },
];

// XP needed to advance from `level` to `level + 1`.
function xpForLevel(level) { return Math.round(90 + level * 60); }

function enemyPoolForWave(wave) {
  const pool = ['grunt'];
  if (wave >= 2) pool.push('scout');
  if (wave >= 3) pool.push('grunt', 'turret');
  if (wave >= 4) pool.push('heavy', 'sniper');
  if (wave >= 5) pool.push('shielded', 'drone', 'drone');
  if (wave >= 6) pool.push('artillery', 'splitter');
  if (wave >= 7) pool.push('bomber', 'scout');
  if (wave >= 9) pool.push('heavy', 'shielded', 'sniper');
  return pool;
}

class World {
  constructor(game, w, h, themeKey) {
    this.game = game; this.w = w; this.h = h; this.themeKey = themeKey; this.theme = THEMES[themeKey] || THEMES.forest;
    this.pattern = null; this.hazards = []; this.decor = []; this._buildPattern();
  }
  _buildPattern() { if (!this.theme.tile) return; const img = this.game.assets.getImage(this.theme.tile); if (img && img.width > 0) { try { this.pattern = this.game.ctx.createPattern(img, 'repeat'); } catch (e) { this.pattern = null; } } }

  generateObstacles(count, px, py) {
    const obstacles = [], clearR = 230, margin = 120; let attempts = 0;
    while (obstacles.length < count && attempts < count * 30) {
      attempts++; const w = Util.randInt(40, 84), h = Util.randInt(40, 84); const x = Util.rand(margin, this.w - margin - w), y = Util.rand(margin, this.h - margin - h); const cx = x + w / 2, cy = y + h / 2;
      if (Util.dist(cx, cy, px, py) < clearR) continue;
      let ok = true; for (const o of obstacles) if (cx > o.x - w - 30 && cx < o.x + o.w + 30 && cy > o.y - h - 30 && cy < o.y + o.h + 30) { ok = false; break; }
      if (!ok) continue; const roll = Math.random(); let kind, destructible, hp, blocksBullets = true;
      if (this.themeKey === 'desert' || this.themeKey === 'volcano') { if (roll < 0.45) { kind = 'crate'; destructible = true; hp = 40; } else if (roll < 0.7) { kind = 'barrel'; destructible = true; hp = 30; } else { kind = 'rock'; destructible = false; hp = 0; } }
      else if (this.themeKey === 'arctic' || this.themeKey === 'neon') { if (roll < 0.35) { kind = 'tree'; destructible = false; hp = 0; } else if (roll < 0.62) { kind = 'crate'; destructible = true; hp = 40; } else { kind = 'rock'; destructible = false; hp = 0; } }
      else { if (roll < 0.4) { kind = 'tree'; destructible = false; hp = 0; } else if (roll < 0.6) { kind = 'bush'; destructible = true; hp = 25; blocksBullets = false; } else if (roll < 0.8) { kind = 'crate'; destructible = true; hp = 40; } else { kind = 'rock'; destructible = false; hp = 0; } }
      if (kind === 'tree' || kind === 'bush') { const s = Math.max(w, h); obstacles.push(new Obstacle(this.game, cx - s / 2, cy - s / 2, s, s, { kind, destructible, hp, blocksBullets })); }
      else obstacles.push(new Obstacle(this.game, x, y, w, h, { kind, destructible, hp, blocksBullets }));
    }
    return obstacles;
  }
  generateHazards(count, px, py) {
    const list = []; let attempts = 0; const t = this.theme.hazard; const dmg = (t === 'lava' || t === 'energy');
    while (list.length < count && attempts < count * 20) {
      attempts++; const r = Util.rand(55, 110), x = Util.rand(160, this.w - 160), y = Util.rand(160, this.h - 160);
      if (Util.dist(x, y, px, py) < 280) continue; let ok = true; for (const hz of list) if (Util.dist(x, y, hz.x, hz.y) < r + hz.r + 60) { ok = false; break; } if (!ok) continue;
      list.push({ x, y, r, type: t, slow: !dmg, dmg: dmg ? 9 : 0, tick: 0 });
    }
    this.hazards = list;
  }
  generateDecor(count) { const list = []; for (let i = 0; i < count; i++) list.push({ x: Util.rand(40, this.w - 40), y: Util.rand(40, this.h - 40), r: Util.rand(3, 8) }); this.decor = list; }
  affect(tank, dt) { if (!tank.alive) return; for (const hz of this.hazards) { if (Util.dist(tank.x, tank.y, hz.x, hz.y) < hz.r) { if (hz.slow) tank.slow = Math.max(tank.slow, 0.14); if (hz.dmg) { tank._hazTick = (tank._hazTick || 0) - dt; if (tank._hazTick <= 0) { tank._hazTick = 0.3; tank.takeDamage(hz.dmg, Util.rand(0, TAU), false, {}); } } } } }
  randomSpawn(minDist) {
    const margin = 140;
    for (let i = 0; i < 60; i++) { const x = Util.rand(margin, this.w - margin), y = Util.rand(margin, this.h - margin), p = this.game.player; if (p && Util.dist(x, y, p.x, p.y) < minDist) continue; let blocked = false; for (const o of this.game.obstacles) { if (!o.dead && o.contains(x, y)) { blocked = true; break; } if (!o.dead && Util.dist(x, y, o.cx, o.cy) < 50) { blocked = true; break; } } for (const hz of this.hazards) if (Util.dist(x, y, hz.x, hz.y) < hz.r + 30) { blocked = true; break; } if (!blocked) return { x, y }; }
    return { x: Util.choice([margin, this.w - margin]), y: Util.choice([margin, this.h - margin]) };
  }

  draw(ctx) {
    if (this.pattern) { ctx.fillStyle = this.pattern; ctx.fillRect(0, 0, this.w, this.h); }
    else { ctx.fillStyle = this.theme.base; ctx.fillRect(0, 0, this.w, this.h); ctx.fillStyle = this.theme.alt; const s = 64; for (let y = 0; y < this.h; y += s) for (let x = 0; x < this.w; x += s) if (((x / s) + (y / s)) % 2 === 0) ctx.fillRect(x, y, s, s); }
    ctx.fillStyle = this.themeKey === 'desert' ? 'rgba(120,90,40,0.25)' : (this.themeKey === 'arctic' ? 'rgba(255,255,255,0.5)' : (this.themeKey === 'neon' ? 'rgba(120,90,255,0.3)' : (this.themeKey === 'volcano' ? 'rgba(255,120,40,0.2)' : 'rgba(30,70,30,0.25)')));
    for (const d of this.decor) { if (!this.game.camera.visible(d.x, d.y, 10)) continue; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); }
    for (const hz of this.hazards) {
      if (!this.game.camera.visible(hz.x, hz.y, hz.r)) continue; ctx.save();
      const g = ctx.createRadialGradient(hz.x, hz.y, hz.r * 0.3, hz.x, hz.y, hz.r);
      if (hz.type === 'lava') { g.addColorStop(0, 'rgba(255,120,30,0.85)'); g.addColorStop(1, 'rgba(140,30,10,0.7)'); }
      else if (hz.type === 'energy') { g.addColorStop(0, 'rgba(150,90,255,0.8)'); g.addColorStop(1, 'rgba(60,20,140,0.5)'); }
      else if (hz.type === 'ice') { g.addColorStop(0, 'rgba(180,225,245,0.7)'); g.addColorStop(1, 'rgba(120,180,210,0.45)'); }
      else { g.addColorStop(0, 'rgba(40,90,140,0.6)'); g.addColorStop(1, 'rgba(20,50,90,0.45)'); }
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = (hz.type === 'lava') ? 'rgba(255,180,80,0.5)' : (hz.type === 'energy' ? 'rgba(200,150,255,0.6)' : 'rgba(255,255,255,0.25)'); ctx.lineWidth = 2; ctx.stroke();
      if (hz.dmg) { ctx.fillStyle = (hz.type === 'energy' ? 'rgba(200,160,255,' : 'rgba(255,220,120,') + (0.3 + 0.2 * Math.sin(this.game.time * 3 + hz.x)) + ')'; ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r * 0.5, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    ctx.strokeStyle = this.theme.grid; ctx.lineWidth = this.themeKey === 'neon' ? 1.5 : 1; ctx.beginPath();
    for (let x = 0; x <= this.w; x += 128) { ctx.moveTo(x, 0); ctx.lineTo(x, this.h); }
    for (let y = 0; y <= this.h; y += 128) { ctx.moveTo(0, y); ctx.lineTo(this.w, y); } ctx.stroke();
    const bw = 16; ctx.fillStyle = this.theme.border; ctx.fillRect(0, 0, this.w, bw); ctx.fillRect(0, this.h - bw, this.w, bw); ctx.fillRect(0, 0, bw, this.h); ctx.fillRect(this.w - bw, 0, bw, this.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(bw, bw, this.w - bw * 2, this.h - bw * 2);
  }

  drawWeather(ctx, vw, vh, time) {
    const wx = this.theme.weather; if (!wx) return; ctx.save();
    if (wx === 'rain') { ctx.strokeStyle = 'rgba(180,200,230,0.35)'; ctx.lineWidth = 1.5; for (let i = 0; i < 90; i++) { const x = (i * 137.5 + time * 220) % (vw + 40) - 20; const y = (i * 53.3 + time * 900) % (vh + 40) - 20; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14); ctx.stroke(); } }
    else if (wx === 'snow') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 110; i++) { const x = (i * 97.3 + Math.sin(time + i) * 30 + time * 30) % (vw + 20) - 10; const y = (i * 61.7 + time * 60) % (vh + 20) - 10; ctx.beginPath(); ctx.arc(x, y, 1.6 + (i % 3) * 0.7, 0, TAU); ctx.fill(); } }
    else if (wx === 'sand') { ctx.fillStyle = 'rgba(210,170,110,0.06)'; ctx.fillRect(0, 0, vw, vh); ctx.strokeStyle = 'rgba(220,190,140,0.18)'; ctx.lineWidth = 1.5; for (let i = 0; i < 60; i++) { const x = (i * 211 + time * 600) % (vw + 60) - 30; const y = (i * 89.5) % vh; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 22, y + 2); ctx.stroke(); } }
    else if (wx === 'stars') { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 80; i++) { const x = (i * 167.3) % vw; const y = (i * 91.7 + time * 12) % (vh + 20) - 10; const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 2 + i)); ctx.fillStyle = `rgba(160,140,255,${tw})`; ctx.beginPath(); ctx.arc(x, y, 1.2 + (i % 3) * 0.5, 0, TAU); ctx.fill(); } }
    else if (wx === 'embers') { ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 70; i++) { const x = (i * 137.5 + Math.sin(time * 1.5 + i) * 20) % (vw + 20) - 10; const y = (vh - (i * 73.1 + time * 80) % (vh + 40)) + 20; const a = 0.4 + 0.5 * Math.abs(Math.sin(time * 3 + i)); ctx.fillStyle = `rgba(255,${120 + (i % 80)},40,${a})`; ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3) * 0.7, 0, TAU); ctx.fill(); } }
    ctx.restore();
  }
}
