/* =========================================================================
 * TanksALot — Game
 * Orchestrates everything: loading, states, the main loop (with slow-mo &
 * time-scale), waves + perk drafts, coins, bosses, kill feed, achievements,
 * settings, hazards, weather, screen effects, HUD + minimap, and menu wiring.
 * ====================================================================== */

'use strict';

const STATE = { LOADING: 'loading', MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', UPGRADE: 'upgrade', GAMEOVER: 'gameover', VICTORY: 'victory' };
const FINAL_WAVE = 20;

const ACHIEVEMENTS = [
  { id: 'firstblood', name: 'First Blood', desc: 'Destroy your first enemy' },
  { id: 'combo10', name: 'Killing Spree', desc: 'Reach a x10 combo' },
  { id: 'wave5', name: 'Survivor', desc: 'Reach wave 5' },
  { id: 'wave10', name: 'Veteran', desc: 'Reach wave 10' },
  { id: 'boss', name: 'Giant Slayer', desc: 'Defeat a boss' },
  { id: 'victory', name: 'Legend', desc: 'Beat the final boss' },
  { id: 'arsenal', name: 'Gun Nut', desc: 'Collect every weapon' },
  { id: 'rich', name: 'Tycoon', desc: 'Collect 500 coins total' },
  { id: 'untouchable', name: 'Untouchable', desc: 'Clear a wave unscathed' },
];

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.audio = new AudioManager();
    this.assets = new AssetManager();
    this.camera = new Camera(canvas.width, canvas.height, canvas.width, canvas.height);

    this.state = STATE.LOADING;
    this.time = 0; this.timeScale = 1; this._slowmo = 0;
    this.difficulty = Storage.get('difficulty', 'normal');
    this.theme = Storage.get('theme', 'forest');
    this.highScore = Storage.get('highscore', 0);
    this.bestWave = Storage.get('bestwave', 0);
    this.totalCoins = Storage.get('totalCoins', 0);
    this.achievements = new Set(Storage.get('achievements', []));
    this.shakeEnabled = Storage.get('shake', true);
    this.weatherEnabled = Storage.get('weather', true);

    this._reset();
    this._queueAssets();
    this._bindUI();
    this._lastTime = performance.now();
    this.toasts = [];
  }

  _reset() {
    this.world = null; this.player = null;
    this.enemies = []; this.bullets = []; this.particles = []; this.treadMarks = [];
    this.explosions = []; this.powerups = []; this.coins = []; this.crates = [];
    this.obstacles = []; this.floatingTexts = []; this.decals = []; this.casings = []; this.afterImages = [];
    this.spawnQueue = []; this.spawnTimer = 0;
    this.wave = 0; this.score = 0; this.combo = 0; this.comboTimer = 0; this.maxCombo = 0;
    this.lives = 3; this.coinCount = 0; this.intermission = 0; this.respawnTimer = 0;
    this.powerupTimer = Util.rand(8, 14); this.bossWave = false; this.boss = null;
    this.killfeed = []; this.damageFlash = 0; this._lastPlayerHp = 0; this.waveDamageTaken = 0;
    this._lowBeep = 0;
  }

  _queueAssets() {
    this.assets.queueImage('img/forest/grass03.png');
    this.assets.queueImage('img/background/desertTile.png');
    this.assets.queueImage('img/Explosion_C.png');
    this.assets.queueImage('img/Explosion_A.png');
  }

  /* ------------------------------ boot --------------------------------- */
  start() {
    this._showOverlay('loading');
    const tips = ['TIP: Right-click or Shift to DASH through danger.',
      'TIP: Pick up weapon crates — switch with 1-5 or the mouse wheel.',
      'TIP: Chain kills fast to build your combo multiplier.',
      'TIP: Choose a perk after every wave — build your tank.',
      'TIP: Barrels and lava explode. Use them on your enemies.',
      'TIP: Every 5th wave is a BOSS. Keep moving!'];
    document.getElementById('load-tip').textContent = Util.choice(tips);
    this.assets.downloadAll(() => {});
    const t0 = performance.now();
    const poll = () => {
      const p = this.assets.progress(), elapsed = (performance.now() - t0) / 1000;
      const shown = Math.min(p, elapsed / 0.7); // ease in over ~0.7s minimum
      document.getElementById('load-fill').style.width = (shown * 100) + '%';
      document.getElementById('load-pct').textContent = Math.round(shown * 100) + '%';
      if (this.assets.isDone() && elapsed > 0.7) { this._toMenu(); this._loop(); }
      else requestAnimationFrame(poll);
    };
    poll();
  }

  _loop() {
    const now = performance.now();
    let realDt = Math.min((now - this._lastTime) / 1000, 0.05);
    this._lastTime = now;
    if (this._slowmo > 0) { this._slowmo -= realDt; this.timeScale = 0.35; }
    else this.timeScale = Util.smooth(this.timeScale, 1, realDt, 0.001);
    const dt = realDt * this.timeScale;
    this.time += dt;
    this.update(dt, realDt);
    this.draw();
    this.input.endFrame();
    requestAnimationFrame(() => this._loop());
  }

  update(dt, realDt) {
    if (this.state === STATE.PLAYING) {
      if (this.input.justPressed('Escape') || this.input.justPressed('KeyP')) { this.pause(); return; }
      this._updatePlaying(dt);
    } else if (this.state === STATE.PAUSED) {
      if (this.input.justPressed('Escape') || this.input.justPressed('KeyP')) this.resume();
    }
    for (const t of this.toasts) t.life -= realDt; this.toasts = this.toasts.filter((t) => t.life > 0);
  }

  _updatePlaying(dt) {
    const p = this.player;
    if (p && p.alive) { p.update(dt); this.world.affect(p, dt); }
    for (const e of this.enemies) { e.update(dt); this.world.affect(e, dt); }
    for (const o of this.obstacles) o.update(dt);
    for (const b of this.bullets) b.update(dt);
    for (const pa of this.particles) pa.update(dt);
    for (const t of this.treadMarks) t.update(dt);
    for (const x of this.explosions) x.update(dt);
    for (const pu of this.powerups) pu.update(dt);
    for (const c of this.coins) c.update(dt);
    for (const cr of this.crates) cr.update(dt);
    for (const ft of this.floatingTexts) ft.update(dt);
    for (const d of this.decals) d.update(dt);
    for (const cs of this.casings) cs.update(dt);
    for (const ai of this.afterImages) ai.update(dt);

    // thorns aura
    if (p && p.alive && p.thorns > 0) {
      for (const e of this.enemies) { if (e.alive && Util.dist(p.x, p.y, e.x, e.y) < p.radius + e.radius + 6) e.takeDamage(p.thorns * dt, Util.angleTo(p.x, p.y, e.x, e.y), true, {}); }
    }
    // damage flash / low-hp warning (detect HP drop without entity hooks)
    if (p && p.alive) {
      if (p.hp < this._lastPlayerHp - 0.5) { this.damageFlash = Math.min(1, this.damageFlash + (this._lastPlayerHp - p.hp) / 60 + 0.2); this.waveDamageTaken += this._lastPlayerHp - p.hp; if (this.shakeEnabled) this.camera.shake(4, 0.12); }
      this._lastPlayerHp = p.hp;
      if (p.hp < p.maxHp * 0.25) { this._lowBeep -= dt; if (this._lowBeep <= 0) { this._lowBeep = 0.9; this.audio.lowHealth(); } }
    }
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 1.4);

    // prune
    this.enemies = this.enemies.filter((e) => e.alive);
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((x) => !x.dead);
    this.treadMarks = this.treadMarks.filter((x) => !x.dead);
    this.explosions = this.explosions.filter((x) => !x.dead);
    this.powerups = this.powerups.filter((x) => !x.dead);
    this.coins = this.coins.filter((x) => !x.dead);
    this.crates = this.crates.filter((x) => !x.dead);
    this.floatingTexts = this.floatingTexts.filter((x) => !x.dead);
    this.obstacles = this.obstacles.filter((o) => !o.dead);
    this.decals = this.decals.filter((d) => !d.dead);
    this.casings = this.casings.filter((c) => !c.dead);
    this.afterImages = this.afterImages.filter((a) => !a.dead);
    for (const kf of this.killfeed) kf.life -= dt; this.killfeed = this.killfeed.filter((k) => k.life > 0);

    if (this.combo > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }
    if (this.boss && !this.boss.alive) this.boss = null;

    // spawn trickle
    if (this.spawnQueue.length > 0) { this.spawnTimer -= dt; if (this.spawnTimer <= 0) { this.spawnTimer = 0.5; this._spawnEnemy(this.spawnQueue.shift()); } }
    // random powerups
    this.powerupTimer -= dt;
    if (this.powerupTimer <= 0 && this.powerups.length < 3) { this.powerupTimer = Util.rand(12, 20); this._dropPowerUp(this.world.randomSpawn(160)); }

    // respawn / gameover
    if (p && !p.alive && this.state === STATE.PLAYING) { this.respawnTimer -= dt; if (this.respawnTimer <= 0) { if (this.lives > 0) this._respawnPlayer(); else this._gameOver(); } }

    // wave progression
    if (this.intermission > 0) { this.intermission -= dt; if (this.intermission <= 0) this._openUpgrade(); }
    else if (this.enemies.length === 0 && this.spawnQueue.length === 0 && p && p.alive) this._onWaveCleared();

    // camera with look-ahead toward aim
    if (p && p.alive) { const m = this.camera.screenToWorld(this.input.mouse.x, this.input.mouse.y); this.camera.follow(p.x, p.y, dt, (m.x - p.x) * 0.18, (m.y - p.y) * 0.18); }
    else if (this.boss) this.camera.follow(this.boss.x, this.boss.y, dt);
    this._updateHUD();
  }

  /* --------------------------- world / waves --------------------------- */
  newGame() {
    this._reset();
    Storage.set('difficulty', this.difficulty); Storage.set('theme', this.theme);
    const d = DIFFICULTIES[this.difficulty]; this.lives = d.lives;
    const size = 2600;
    this.world = new World(this, size, size, this.theme);
    this.camera.setWorld(size, size); this.camera.zoom = 1; this.camera.targetZoom = 1;
    this.camera.x = size / 2 - this.canvas.width / 2; this.camera.y = size / 2 - this.canvas.height / 2;
    this.player = new PlayerTank(this, size / 2, size / 2); this._lastPlayerHp = this.player.hp;
    this.obstacles = this.world.generateObstacles(38, this.player.x, this.player.y);
    this.world.generateHazards(this.theme === 'arctic' ? 3 : 4, this.player.x, this.player.y);
    this.world.generateDecor(120);
    this.state = STATE.PLAYING; this._hideOverlays();
    this.audio.startMusic('Sounds/BGM.mp3');
    this._spawnWave(1);
  }

  _spawnWave(n) {
    this.wave = n; this.intermission = 0; this.bossWave = (n % 5 === 0); this.waveDamageTaken = 0;
    const d = DIFFICULTIES[this.difficulty];
    const queue = [];
    if (this.bossWave) {
      queue.push({ type: 'boss' });
      const adds = Math.min(2 + Math.floor(n / 5), 6);
      const pool = enemyPoolForWave(n);
      for (let i = 0; i < adds; i++) queue.push({ type: Util.choice(pool) });
      this._showBanner(n >= FINAL_WAVE ? 'FINAL BOSS' : 'BOSS WAVE', '#c45bd6');
      this.audio.bossRoar();
    } else {
      let count = Math.round((3 + n * 1.25) * d.count); count = Math.min(count, 16);
      const pool = enemyPoolForWave(n);
      for (let i = 0; i < count; i++) queue.push({ type: Util.choice(pool) });
      this._showBanner('WAVE ' + n, '#ffd34d');
    }
    // guaranteed weapon progression
    const weaponByWave = { 2: 'machinegun', 3: 'shotgun', 4: 'rockets', 5: 'laser' };
    if (weaponByWave[n] && this.player) { const s = this.world.randomSpawn(120); this.crates.push(new WeaponCrate(this, s.x, s.y, weaponByWave[n])); }
    this.spawnQueue = queue; this.spawnTimer = 0.2; this.audio.wave(); this.audio.setMusicIntensity(this.bossWave);
    if (n > this.bestWave) { this.bestWave = n; Storage.set('bestwave', n); }
    if (n >= 5) this._unlock('wave5'); if (n >= 10) this._unlock('wave10');
  }

  _spawnEnemy(desc) {
    const d = DIFFICULTIES[this.difficulty]; const waveHp = 1 + (this.wave - 1) * 0.07;
    const pos = this.world.randomSpawn(440);
    if (desc.type === 'boss') {
      const hp = Math.round(420 * d.hp * (1 + this.wave * 0.06));
      const b = new Boss(this, pos.x, pos.y, hp); b.bulletDamage = 16 * d.dmg; this.boss = b; this.enemies.push(b); this._spawnPoof(pos.x, pos.y, '#c45bd6');
      document.getElementById('boss-name').textContent = this.wave >= FINAL_WAVE ? 'FINAL BOSS' : 'BOSS';
      return;
    }
    if (desc.type === 'turret') { const t = new Turret(this, pos.x, pos.y, { hp: d.hp * waveHp, dmg: d.dmg, fireRate: d.fireRate }); this.enemies.push(t); this._spawnPoof(pos.x, pos.y); return; }
    const e = new EnemyTank(this, pos.x, pos.y, desc.type, { hp: d.hp * waveHp, dmg: d.dmg, fireRate: d.fireRate, speed: d.speed });
    this.enemies.push(e); this._spawnPoof(pos.x, pos.y);
  }
  summonAdds(n) { const pool = enemyPoolForWave(this.wave); for (let i = 0; i < n; i++) this.spawnQueue.push({ type: Util.choice(pool) }); }
  _spawnPoof(x, y, color) { for (let i = 0; i < 10; i++) { const a = Util.rand(0, TAU), sp = Util.rand(40, 120); this.addParticle(new Particle(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, size: Util.rand(2, 5), color: color || 'rgba(220,220,220,0.9)', fade: true, shrink: true })); } }

  _onWaveCleared() {
    this.intermission = 2.4; const bonus = 100 * this.wave; this.score += bonus;
    this._showBanner('WAVE ' + this.wave + ' CLEARED  +' + bonus, '#5fcf5f');
    if (this.player && this.player.alive) this.player.hp = Math.min(this.player.maxHp, this.player.hp + 15);
    if (this.waveDamageTaken < 1) this._unlock('untouchable');
    this._checkHighScore();
  }

  onBossPhase(boss, phase) { this._showBanner('BOSS ENRAGED — PHASE ' + phase, '#e0563b'); this.audio.bossRoar(); if (this.shakeEnabled) this.camera.shake(8, 0.4); }

  /* --------------------------- entity hooks ---------------------------- */
  addBullet(b) { this.bullets.push(b); }
  addParticle(p) { this.particles.push(p); if (this.particles.length > CONFIG.maxParticles) this.particles.shift(); }
  addTreadMark(t) { this.treadMarks.push(t); if (this.treadMarks.length > 220) this.treadMarks.shift(); }
  addDecal(d) { this.decals.push(d); if (this.decals.length > CONFIG.maxDecals) this.decals.shift(); }
  addShellCasing(c) { this.casings.push(c); if (this.casings.length > 60) this.casings.shift(); }
  addAfterImage(a) { this.afterImages.push(a); if (this.afterImages.length > 30) this.afterImages.shift(); }
  addFloatingText(x, y, text, opts) { this.floatingTexts.push(new FloatingText(x, y, text, opts)); }
  spawnExplosion(x, y, scale) { this.explosions.push(new Explosion(this, x, y, scale)); }
  allTanks() { return this.player && this.player.alive ? [this.player, ...this.enemies] : this.enemies; }
  onCoinCollected(v) { this.coinCount += v; this.totalCoins += v; Storage.set('totalCoins', this.totalCoins); this.score += v * 5; if (this.totalCoins >= 500) this._unlock('rich'); }

  onObstacleDestroyed(o) {
    this.spawnExplosion(o.cx, o.cy, o.kind === 'barrel' ? 0.9 : 0.5);
    if (o.kind === 'barrel') {
      for (const t of this.allTanks()) { const d = Util.dist(o.cx, o.cy, t.x, t.y); if (d < 90) t.takeDamage(30 * (1 - d / 90), Util.angleTo(o.cx, o.cy, t.x, t.y), true, {}); }
      if (this.shakeEnabled) this.camera.shake(6, 0.2); this.addDecal(new Decal(o.cx, o.cy, 44));
    }
    const bonus = this.player ? this.player.dropBonus : 0;
    if (Util.chance((o.kind === 'crate' ? 0.35 : 0.12) + bonus)) this._dropPowerUp({ x: o.cx, y: o.cy });
    if (Util.chance(0.5)) this.coins.push(new Coin(this, o.cx, o.cy, 1));
  }

  onTankDestroyed(tank, byPlayer) {
    if (tank.team === 'player') {
      this.lives--; this.respawnTimer = 1.6; this._slowmo = 0.6; this.damageFlash = 1;
      if (this.lives > 0) this._showBanner('LIFE LOST — ' + this.lives + ' LEFT', '#e0563b');
      return;
    }
    this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.comboTimer = 2.6;
    if (this.combo >= 10) this._unlock('combo10');
    this._unlock('firstblood');
    const mult = Math.min(1 + (this.combo - 1) * 0.25, 4);
    const pts = Math.round(tank.scoreValue * mult); this.score += pts;
    this.addFloatingText(tank.x, tank.y - tank.radius, '+' + pts, { color: '#ffd34d', size: 18 });
    if (this.combo >= 2) this.addFloatingText(tank.x, tank.y - tank.radius - 20, 'x' + this.combo, { color: '#ff8c2b', size: 16 });
    this._addKill(tank);
    if (this.player && this.player.alive) this.player.onKill();

    // drops
    const bonus = this.player ? this.player.dropBonus : 0;
    const coinN = tank.boss ? 25 : (tank.type === 'heavy' ? 4 : Util.randInt(1, 3));
    for (let i = 0; i < coinN; i++) this.coins.push(new Coin(this, tank.x, tank.y, 1));
    if (Util.chance((tank.boss ? 1 : 0.16) + bonus)) this._dropPowerUp({ x: tank.x, y: tank.y });
    if (tank.boss) { this._slowmo = 0.8; this._unlock('boss'); if (this.wave >= FINAL_WAVE) { this._victory(); return; } }
  }

  _addKill(tank) {
    const names = { grunt: 'Grunt', scout: 'Scout', heavy: 'Heavy', artillery: 'Artillery', bomber: 'Bomber', shielded: 'Shielded' };
    const name = tank.boss ? 'BOSS' : (tank instanceof Turret ? 'Turret' : (names[tank.type] || 'Tank'));
    const col = tank.boss ? '#c45bd6' : (tank.palette ? tank.palette.hull : '#fff');
    this.killfeed.unshift({ text: name, color: col, life: 4 }); if (this.killfeed.length > 5) this.killfeed.pop();
  }

  _dropPowerUp(pos) {
    const types = Object.keys(POWERUP_TYPES); let type;
    if (this.player && this.player.hp < this.player.maxHp * 0.4 && Util.chance(0.5)) type = 'heal'; else type = Util.choice(types);
    this.powerups.push(new PowerUp(this, pos.x, pos.y, type));
  }
  _respawnPlayer() {
    const p = this.player; p.alive = true; p.hp = p.maxHp; p.x = this.world.w / 2; p.y = this.world.h / 2; p.invuln = 2.0; p.shieldTime = 0; p.burn = 0;
    this._lastPlayerHp = p.hp; this._spawnPoof(p.x, p.y, '#5fa8ff');
  }

  /* ---------------------------- upgrades ------------------------------- */
  _openUpgrade() {
    if (this.wave >= FINAL_WAVE) { this._spawnWave(this.wave + 1); return; } // safety
    this.state = STATE.UPGRADE;
    this._pickedPerks = this._rollPerks();
    this._renderPerks();
    this._showOverlay('upgrade');
  }
  _rollPerks() {
    const pool = PERKS.slice(); const out = [];
    for (let i = 0; i < 3 && pool.length; i++) out.push(pool.splice(Util.randInt(0, pool.length - 1), 1)[0]);
    return out;
  }
  _renderPerks() {
    for (let i = 0; i < 3; i++) {
      const perk = this._pickedPerks[i], card = document.getElementById('perk-' + i);
      card.style.borderColor = perk.color;
      card.querySelector('.perk-name').textContent = perk.name;
      card.querySelector('.perk-name').style.color = perk.color;
      card.querySelector('.perk-desc').textContent = perk.desc;
    }
    document.getElementById('upgrade-coins').textContent = this.coinCount;
  }
  choosePerk(i) {
    const perk = this._pickedPerks[i]; if (!perk) return;
    perk.apply(this.player, this); this.audio.upgrade();
    this.state = STATE.PLAYING; this._hideOverlays(); this._lastTime = performance.now();
    this._spawnWave(this.wave + 1);
  }
  rerollPerks() {
    if (this.coinCount < 30) return; this.coinCount -= 30; this.audio.coin();
    this._pickedPerks = this._rollPerks(); this._renderPerks();
  }

  /* ------------------------------ states ------------------------------- */
  pause() { if (this.state !== STATE.PLAYING) return; this.state = STATE.PAUSED; this._showOverlay('pause'); }
  resume() { if (this.state !== STATE.PAUSED) return; this.state = STATE.PLAYING; this._hideOverlays(); this._lastTime = performance.now(); }
  _gameOver() {
    this.state = STATE.GAMEOVER; this.audio.gameover(); this._checkHighScore();
    document.getElementById('go-score').textContent = this.score.toLocaleString();
    document.getElementById('go-wave').textContent = this.wave;
    document.getElementById('go-high').textContent = this.highScore.toLocaleString();
    document.getElementById('go-combo').textContent = 'x' + this.maxCombo;
    this._showOverlay('gameover');
  }
  _victory() {
    this.state = STATE.VICTORY; this.audio.victory(); this._checkHighScore(); this._unlock('victory');
    document.getElementById('vic-score').textContent = this.score.toLocaleString();
    document.getElementById('vic-high').textContent = this.highScore.toLocaleString();
    this._showOverlay('victory');
  }
  _checkHighScore() { if (this.score > this.highScore) { this.highScore = this.score; Storage.set('highscore', this.score); } }
  _unlock(id) {
    if (this.achievements.has(id)) return;
    this.achievements.add(id); Storage.set('achievements', [...this.achievements]);
    const a = ACHIEVEMENTS.find((x) => x.id === id); if (a) { this.toasts.push({ name: a.name, desc: a.desc, life: 4 }); this.audio.upgrade(); this._renderToasts(); }
  }

  /* ----------------------------- rendering ----------------------------- */
  draw() {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (this.state === STATE.LOADING) { this._drawMenuBackdrop(ctx); return; }
    if (this.state === STATE.MENU) { this._drawMenuBackdrop(ctx); return; }

    ctx.save();
    this.camera.apply(ctx);
    this.world.draw(ctx);
    for (const d of this.decals) d.draw(ctx);
    for (const t of this.treadMarks) t.draw(ctx);
    for (const cs of this.casings) cs.draw(ctx);
    for (const o of this.obstacles) o.draw(ctx);
    for (const pu of this.powerups) pu.draw(ctx);
    for (const c of this.coins) c.draw(ctx);
    for (const cr of this.crates) cr.draw(ctx);
    for (const ai of this.afterImages) ai.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    if (this.player && this.player.alive) this.player.draw(ctx);
    for (const b of this.bullets) b.draw(ctx);
    for (const pa of this.particles) pa.draw(ctx);
    for (const x of this.explosions) x.draw(ctx);
    for (const ft of this.floatingTexts) ft.draw(ctx);
    ctx.restore();

    // screen-space
    if (this.weatherEnabled && this.world) this.world.drawWeather(ctx, W, H, this.time);
    this._drawScreenFX(ctx, W, H);
    if (this.state === STATE.PLAYING) this._drawCrosshair(ctx);
    if (this.state === STATE.PAUSED || this.state === STATE.UPGRADE) { ctx.fillStyle = 'rgba(8,12,20,0.5)'; ctx.fillRect(0, 0, W, H); }
  }

  _drawScreenFX(ctx, W, H) {
    const p = this.player;
    // damage vignette
    let v = this.damageFlash;
    if (p && p.alive && p.hp < p.maxHp * 0.25) v = Math.max(v, 0.25 + 0.15 * Math.sin(this.time * 6));
    if (v > 0.01) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, 'rgba(200,30,30,0)'); g.addColorStop(1, `rgba(200,30,30,${Util.clamp(v, 0, 0.6)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // soft vignette always
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  _drawCrosshair(ctx) {
    const m = this.input.mouse; ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.arc(m.x, m.y, 12, 0, TAU);
    ctx.moveTo(m.x - 18, m.y); ctx.lineTo(m.x - 6, m.y); ctx.moveTo(m.x + 6, m.y); ctx.lineTo(m.x + 18, m.y);
    ctx.moveTo(m.x, m.y - 18); ctx.lineTo(m.x, m.y - 6); ctx.moveTo(m.x, m.y + 6); ctx.lineTo(m.x, m.y + 18); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(m.x, m.y, 1.5, 0, TAU); ctx.fill(); ctx.restore();
  }
  _drawMenuBackdrop(ctx) {
    const w = this.canvas.width, h = this.canvas.height;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b2a3a'); g.addColorStop(1, '#0e1620');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; const off = (this.time * 18) % 48; ctx.beginPath();
    for (let x = -48 + off; x < w; x += 48) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = -48 + off; y < h; y += 48) { ctx.moveTo(0, y); ctx.lineTo(w, y); } ctx.stroke();
  }

  /* ------------------------------- HUD --------------------------------- */
  _updateHUD() {
    const p = this.player;
    const hpPct = p ? Util.clamp(p.hp / p.maxHp, 0, 1) : 0;
    const hpFill = document.getElementById('hp-fill');
    hpFill.style.width = (hpPct * 100) + '%';
    hpFill.style.background = hpPct > 0.5 ? '#4fcf6a' : (hpPct > 0.25 ? '#e0c341' : '#e05050');
    document.getElementById('hp-text').textContent = p ? Math.max(0, Math.ceil(p.hp)) + ' / ' + p.maxHp : '0';
    document.getElementById('stat-lives').textContent = '❤ '.repeat(Math.max(0, this.lives)).trim() || '—';
    document.getElementById('stat-score').textContent = this.score.toLocaleString();
    document.getElementById('stat-coins').textContent = this.coinCount;
    document.getElementById('stat-wave').textContent = this.wave;
    document.getElementById('stat-enemies').textContent = this.enemies.length + this.spawnQueue.length;

    // weapon + ammo
    if (p) {
      const w = WEAPONS[p.weapon]; const ammo = w.infinite ? '∞' : (p.weapons[p.weapon] || 0);
      const we = document.getElementById('weapon-name'); we.textContent = w.name; we.style.color = w.color;
      document.getElementById('weapon-ammo').textContent = ammo;
      const dashPct = Util.clamp(1 - p.dashCd / (1.5 * p.dashCdMult), 0, 1);
      document.getElementById('dash-fill').style.width = (dashPct * 100) + '%';
      document.getElementById('dash-label').style.opacity = dashPct >= 1 ? '1' : '0.4';
    }
    const comboEl = document.getElementById('combo');
    if (this.combo >= 2) { comboEl.style.opacity = '1'; comboEl.textContent = 'COMBO x' + this.combo; } else comboEl.style.opacity = '0';

    // boss bar
    const bb = document.getElementById('boss-bar');
    if (this.boss && this.boss.alive) { bb.classList.remove('hidden'); document.getElementById('boss-fill').style.width = Util.clamp(this.boss.hp / this.boss.maxHp, 0, 1) * 100 + '%'; }
    else bb.classList.add('hidden');

    this._updateBuffs(); this._renderKillFeed(); this._drawMinimap();
  }
  _updateBuffs() {
    const el = document.getElementById('buffs'); const p = this.player; if (!p) { el.innerHTML = ''; return; }
    const buffs = [];
    if (p.shieldTime > 0) buffs.push(['SHIELD', '#4ec3e0', p.shieldTime]);
    if (p.rapidTime > 0) buffs.push(['RAPID', '#f0a93b', p.rapidTime]);
    if (p.spreadTime > 0) buffs.push(['SPREAD', '#c45bd6', p.spreadTime]);
    if (p.speedTime > 0) buffs.push(['SPEED', '#5bd6a8', p.speedTime]);
    if (p.damageTime > 0) buffs.push(['DAMAGE', '#e0563b', p.damageTime]);
    if (p.burn > 0) buffs.push(['BURNING', '#ff8c2b', p.burn]);
    el.innerHTML = buffs.map(([n, c, t]) => `<span class="buff" style="border-color:${c};color:${c}">${n} ${Math.ceil(t)}</span>`).join('');
  }
  _renderKillFeed() { document.getElementById('killfeed').innerHTML = this.killfeed.map((k) => `<div class="kill" style="color:${k.color};opacity:${Util.clamp(k.life, 0, 1)}">✖ ${k.text}</div>`).join(''); }
  _renderToasts() { document.getElementById('ach-toasts').innerHTML = this.toasts.map((t) => `<div class="ach-toast"><b>🏆 ${t.name}</b><span>${t.desc}</span></div>`).join(''); }

  _drawMinimap() {
    const mm = document.getElementById('minimap'); if (!mm) return;
    const ctx = mm.getContext('2d'), W = mm.width, H = mm.height, sx = W / this.world.w, sy = H / this.world.h;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = 'rgba(10,16,24,0.85)'; ctx.fillRect(0, 0, W, H);
    for (const hz of this.world.hazards) { ctx.fillStyle = hz.type === 'lava' ? 'rgba(255,120,40,0.5)' : 'rgba(80,150,210,0.5)'; ctx.beginPath(); ctx.arc(hz.x * sx, hz.y * sy, hz.r * sx, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(160,160,160,0.55)';
    for (const o of this.obstacles) ctx.fillRect(o.x * sx, o.y * sy, Math.max(1, o.w * sx), Math.max(1, o.h * sy));
    for (const pu of this.powerups) { ctx.fillStyle = POWERUP_TYPES[pu.type].color; ctx.fillRect(pu.x * sx - 1, pu.y * sy - 1, 3, 3); }
    ctx.fillStyle = '#ffcf3a'; for (const c of this.coins) ctx.fillRect(c.x * sx - 0.5, c.y * sy - 0.5, 2, 2);
    for (const e of this.enemies) { ctx.fillStyle = e.boss ? '#c45bd6' : '#ff5a4d'; const s = e.boss ? 6 : 3; ctx.fillRect(e.x * sx - s / 2, e.y * sy - s / 2, s, s); }
    if (this.player && this.player.alive) { ctx.fillStyle = '#5fa8ff'; ctx.beginPath(); ctx.arc(this.player.x * sx, this.player.y * sy, 3, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(this.camera.x * sx, this.camera.y * sy, this.camera.vw * sx, this.camera.vh * sy);
  }
  _showBanner(text, color) { const b = document.getElementById('wave-banner'); b.textContent = text; b.style.color = color || '#fff'; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }

  /* ----------------------------- UI wiring ----------------------------- */
  _bindUI() {
    document.querySelectorAll('[data-diff]').forEach((btn) => btn.addEventListener('click', () => { this.difficulty = btn.dataset.diff; this._updateMenuUI(); }));
    document.querySelectorAll('[data-theme]').forEach((btn) => btn.addEventListener('click', () => { this.theme = btn.dataset.theme; this._updateMenuUI(); }));
    document.getElementById('btn-play').addEventListener('click', () => { this.audio._ensure(); this.newGame(); });
    document.getElementById('btn-resume').addEventListener('click', () => this.resume());
    document.getElementById('btn-restart').addEventListener('click', () => this.newGame());
    document.getElementById('btn-quit').addEventListener('click', () => this._toMenu());
    document.getElementById('btn-retry').addEventListener('click', () => this.newGame());
    document.getElementById('btn-menu').addEventListener('click', () => this._toMenu());
    document.getElementById('btn-vic-continue').addEventListener('click', () => { this.state = STATE.PLAYING; this._hideOverlays(); this._lastTime = performance.now(); this._spawnWave(this.wave + 1); });
    document.getElementById('btn-vic-menu').addEventListener('click', () => this._toMenu());
    for (let i = 0; i < 3; i++) document.getElementById('perk-' + i).addEventListener('click', () => this.choosePerk(i));
    document.getElementById('btn-reroll').addEventListener('click', () => this.rerollPerks());

    // settings
    const open = () => { this._syncSettings(); this._showOverlay('settings'); };
    document.getElementById('btn-settings').addEventListener('click', open);
    document.getElementById('btn-settings-pause').addEventListener('click', open);
    document.getElementById('btn-settings-back').addEventListener('click', () => { if (this.state === STATE.PAUSED) this._showOverlay('pause'); else this._showOverlay('menu'); });
    document.getElementById('sfx-slider').addEventListener('input', (e) => this.audio.setSfxVolume(+e.target.value / 100));
    document.getElementById('music-slider').addEventListener('input', (e) => this.audio.setMusicVolume(+e.target.value / 100));
    document.getElementById('shake-toggle').addEventListener('change', (e) => { this.shakeEnabled = e.target.checked; Storage.set('shake', this.shakeEnabled); });
    document.getElementById('weather-toggle').addEventListener('change', (e) => { this.weatherEnabled = e.target.checked; Storage.set('weather', this.weatherEnabled); });

    const muteBtns = document.querySelectorAll('.btn-mute');
    const syncMute = () => muteBtns.forEach((b) => b.textContent = this.audio.muted ? '🔇 Muted' : '🔊 Sound');
    muteBtns.forEach((btn) => btn.addEventListener('click', () => { this.audio.toggleMute(); syncMute(); })); syncMute();
  }
  _syncSettings() {
    document.getElementById('sfx-slider').value = Math.round(this.audio.sfxVolume * 100);
    document.getElementById('music-slider').value = Math.round(this.audio.musicVolume * 100);
    document.getElementById('shake-toggle').checked = this.shakeEnabled;
    document.getElementById('weather-toggle').checked = this.weatherEnabled;
  }
  _toMenu() { this.state = STATE.MENU; this._showOverlay('menu'); this._updateMenuUI(); this.audio.startMusic('Sounds/BGM.mp3'); }
  _updateMenuUI() {
    document.querySelectorAll('[data-diff]').forEach((b) => b.classList.toggle('active', b.dataset.diff === this.difficulty));
    document.querySelectorAll('[data-theme]').forEach((b) => b.classList.toggle('active', b.dataset.theme === this.theme));
    document.getElementById('menu-high').textContent = this.highScore.toLocaleString();
    document.getElementById('menu-bestwave').textContent = this.bestWave;
    document.getElementById('menu-ach').textContent = this.achievements.size + '/' + ACHIEVEMENTS.length;
  }
  _showOverlay(name) {
    this._hideOverlays();
    const el = document.getElementById('overlay-' + name); if (el) el.classList.remove('hidden');
    document.getElementById('hud').classList.toggle('hidden', !(this.state === STATE.PLAYING || this.state === STATE.PAUSED || this.state === STATE.UPGRADE));
  }
  _hideOverlays() {
    document.querySelectorAll('.overlay').forEach((o) => o.classList.add('hidden'));
    document.getElementById('hud').classList.toggle('hidden', !(this.state === STATE.PLAYING || this.state === STATE.PAUSED || this.state === STATE.UPGRADE));
  }
}

window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  window.GAME = game;
  game.start();
});
