/* =========================================================================
 * TanksALot — Game
 * The orchestrator: game states, the main loop, wave/score/combo systems,
 * lives & respawns, power-up drops, the HUD + minimap, and all menu wiring.
 * ====================================================================== */

'use strict';

const STATE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', GAMEOVER: 'gameover', VICTORY: 'victory' };
const FINAL_WAVE = 20; // beating the wave-20 boss = victory (you can keep going)

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.audio = new AudioManager();
    this.assets = new AssetManager();
    this.camera = new Camera(canvas.width, canvas.height, canvas.width, canvas.height);

    this.state = STATE.MENU;
    this.time = 0;
    this.difficulty = Storage.get('difficulty', 'normal');
    this.theme = Storage.get('theme', 'forest');
    this.highScore = Storage.get('highscore', 0);
    this.bestWave = Storage.get('bestwave', 0);

    this._reset();
    this._queueAssets();
    this._bindUI();
    this._lastTime = performance.now();
  }

  _reset() {
    this.world = null;
    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.treadMarks = [];
    this.explosions = [];
    this.powerups = [];
    this.obstacles = [];
    this.floatingTexts = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.wave = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.lives = 3;
    this.intermission = 0;
    this.respawnTimer = 0;
    this.powerupTimer = Util.rand(8, 14);
    this.bossWave = false;
  }

  _queueAssets() {
    // Only the few real-art assets we actually use; tanks are procedural.
    this.assets.queueImage('img/forest/grass03.png');
    this.assets.queueImage('img/background/desertTile.png');
    this.assets.queueImage('img/Explosion_C.png');
    this.assets.queueImage('img/Explosion_A.png');
  }

  start() {
    this.assets.downloadAll(() => {
      this._showOverlay('menu');
      this._updateMenuUI();
      this._loop();
    });
  }

  /* ----------------------------- main loop ----------------------------- */
  _loop() {
    const now = performance.now();
    let dt = (now - this._lastTime) / 1000;
    this._lastTime = now;
    dt = Math.min(dt, 0.05); // clamp to avoid huge steps after a tab switch
    this.time += dt;

    this.update(dt);
    this.draw();
    this.input.endFrame();
    requestAnimationFrame(() => this._loop());
  }

  update(dt) {
    if (this.state === STATE.PLAYING) {
      // global pause toggle
      if (this.input.justPressed('Escape') || this.input.justPressed('KeyP')) { this.pause(); return; }
      this._updatePlaying(dt);
    } else if (this.state === STATE.PAUSED) {
      if (this.input.justPressed('Escape') || this.input.justPressed('KeyP')) this.resume();
    }
  }

  _updatePlaying(dt) {
    // entities
    if (this.player && this.player.alive) this.player.update(dt);
    for (const e of this.enemies) e.update(dt);
    for (const o of this.obstacles) o.update(dt);
    for (const b of this.bullets) b.update(dt);
    for (const p of this.particles) p.update(dt);
    for (const t of this.treadMarks) t.update(dt);
    for (const x of this.explosions) x.update(dt);
    for (const pu of this.powerups) pu.update(dt);
    for (const ft of this.floatingTexts) ft.update(dt);

    // prune dead
    this.enemies = this.enemies.filter((e) => e.alive);
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((p) => !p.dead);
    this.treadMarks = this.treadMarks.filter((t) => !t.dead);
    this.explosions = this.explosions.filter((x) => !x.dead);
    this.powerups = this.powerups.filter((p) => !p.dead);
    this.floatingTexts = this.floatingTexts.filter((f) => !f.dead);
    this.obstacles = this.obstacles.filter((o) => !o.dead);

    // combo decay
    if (this.combo > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }

    // enemy trickle-spawning
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = 0.55;
        const desc = this.spawnQueue.shift();
        this._spawnEnemy(desc);
      }
    }

    // random power-up drops over time
    this.powerupTimer -= dt;
    if (this.powerupTimer <= 0 && this.powerups.length < 3) {
      this.powerupTimer = Util.rand(12, 20);
      this._dropPowerUp(this.world.randomSpawn(160));
    }

    // player respawn / game over handling
    if (!this.player.alive && this.state === STATE.PLAYING) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        if (this.lives > 0) this._respawnPlayer();
        else this._gameOver();
      }
    }

    // wave progression
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) this._spawnWave(this.wave + 1);
    } else if (this.enemies.length === 0 && this.spawnQueue.length === 0 && this.player.alive) {
      this._onWaveCleared();
    }

    // camera
    if (this.player) this.camera.follow(this.player.x, this.player.y, dt);
    else this.camera.follow(this.world.w / 2, this.world.h / 2, dt);

    this._updateHUD();
  }

  /* --------------------------- world / waves --------------------------- */
  newGame() {
    this._reset();
    Storage.set('difficulty', this.difficulty);
    Storage.set('theme', this.theme);
    const d = DIFFICULTIES[this.difficulty];
    this.lives = d.lives;

    const size = 2400;
    this.world = new World(this, size, size, this.theme);
    this.camera.setWorld(size, size);
    this.camera.x = size / 2 - this.canvas.width / 2;
    this.camera.y = size / 2 - this.canvas.height / 2;

    this.player = new PlayerTank(this, size / 2, size / 2);
    this.obstacles = this.world.generateObstacles(34, this.player.x, this.player.y);

    this.state = STATE.PLAYING;
    this._hideOverlays();
    this.audio.startMusic('Sounds/BGM.mp3');
    this._spawnWave(1);
  }

  _spawnWave(n) {
    this.wave = n;
    this.intermission = 0;
    this.bossWave = (n % 5 === 0);
    const d = DIFFICULTIES[this.difficulty];

    const queue = [];
    if (this.bossWave) {
      queue.push({ type: 'boss' });
      const adds = Math.min(2 + Math.floor(n / 5), 6);
      for (let i = 0; i < adds; i++) queue.push({ type: Util.chance(0.3) ? 'turret' : 'tank' });
      this._showBanner(n >= FINAL_WAVE ? 'FINAL BOSS' : 'BOSS WAVE', '#c45bd6');
    } else {
      let count = Math.round((3 + n * 1.3) * d.count);
      count = Math.min(count, 14);
      for (let i = 0; i < count; i++) {
        const turretChance = n >= 3 ? 0.18 : 0;
        queue.push({ type: Util.chance(turretChance) ? 'turret' : 'tank' });
      }
      this._showBanner('WAVE ' + n, '#ffd34d');
    }
    this.spawnQueue = queue;
    this.spawnTimer = 0.2;
    this.audio.wave();
    if (n > this.bestWave) { this.bestWave = n; Storage.set('bestwave', n); }
  }

  _spawnEnemy(desc) {
    const d = DIFFICULTIES[this.difficulty];
    const waveHp = 1 + (this.wave - 1) * 0.08; // enemies get tougher over time
    const pos = this.world.randomSpawn(420);

    if (desc.type === 'turret') {
      const t = new Turret(this, pos.x, pos.y);
      t.maxHp = t.hp = Math.round(CONFIG.turret.maxHp * d.hp * waveHp);
      t.bulletDamage = CONFIG.turret.bulletDamage * d.dmg;
      t.fireRate = CONFIG.turret.fireRate * d.fireRate;
      this.enemies.push(t);
      this._spawnPoof(pos.x, pos.y);
      return;
    }

    const boss = desc.type === 'boss';
    const cfg = Object.assign({}, CONFIG.enemy);
    const e = new EnemyTank(this, pos.x, pos.y, cfg, { boss });
    if (boss) {
      e.radius = 34;
      e.maxHp = e.hp = Math.round(420 * d.hp * (1 + this.wave * 0.05));
      e.speed = CONFIG.enemy.speed * 0.7 * d.speed;
      e.bulletDamage = 16 * d.dmg;
      e.bulletRadius = 8;
      e.fireRate = 0.9 * d.fireRate;
      e.bulletSpeed = 380;
      e.scoreValue = 800;
    } else {
      e.maxHp = e.hp = Math.round(CONFIG.enemy.maxHp * d.hp * waveHp);
      e.speed = CONFIG.enemy.speed * d.speed;
      e.bulletDamage = CONFIG.enemy.bulletDamage * d.dmg;
      e.fireRate = CONFIG.enemy.fireRate * d.fireRate;
    }
    this.enemies.push(e);
    this._spawnPoof(pos.x, pos.y);
  }

  _spawnPoof(x, y) {
    for (let i = 0; i < 10; i++) {
      const a = Util.rand(0, TAU), sp = Util.rand(40, 120);
      this.addParticle(new Particle(x, y, {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, size: Util.rand(2, 5),
        color: 'rgba(220,220,220,0.9)', fade: true, shrink: true,
      }));
    }
  }

  _onWaveCleared() {
    this.intermission = 3.2;
    const bonus = 100 * this.wave;
    this.score += bonus;
    this._showBanner('WAVE ' + this.wave + ' CLEARED  +' + bonus, '#5fcf5f');
    // reward: heal a little + chance for a power-up
    if (this.player && this.player.alive) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    }
    this._dropPowerUp(this.world.randomSpawn(120));
    this._checkHighScore();

    if (this.wave >= FINAL_WAVE && this.bossWave) {
      // already handled in onTankDestroyed -> victory; safety net here too
    }
  }

  /* --------------------------- entity hooks ---------------------------- */
  // Called by entities — keep the public surface small and stable.
  addBullet(b) { this.bullets.push(b); }
  addParticle(p) {
    this.particles.push(p);
    if (this.particles.length > CONFIG.maxParticles) this.particles.shift();
  }
  addTreadMark(t) { this.treadMarks.push(t); if (this.treadMarks.length > 200) this.treadMarks.shift(); }
  addFloatingText(x, y, text, opts) { this.floatingTexts.push(new FloatingText(x, y, text, opts)); }
  spawnExplosion(x, y, scale) { this.explosions.push(new Explosion(this, x, y, scale)); }
  allTanks() { return this.player && this.player.alive ? [this.player, ...this.enemies] : this.enemies; }

  onObstacleDestroyed(o) {
    this.spawnExplosion(o.cx, o.cy, o.kind === 'barrel' ? 0.9 : 0.5);
    if (o.kind === 'barrel') {
      // exploding barrel damages nearby tanks
      for (const t of this.allTanks()) {
        const d = Util.dist(o.cx, o.cy, t.x, t.y);
        if (d < 90) t.takeDamage(30 * (1 - d / 90), Util.angleTo(o.cx, o.cy, t.x, t.y), false);
      }
      this.camera.shake(6, 0.2);
    }
    if (Util.chance(o.kind === 'crate' ? 0.35 : 0.12)) this._dropPowerUp({ x: o.cx, y: o.cy });
  }

  onTankDestroyed(tank, byPlayer) {
    if (tank.team === 'player') {
      this.lives--;
      this.respawnTimer = 1.6;
      if (this.lives > 0) this._showBanner('LIFE LOST — ' + this.lives + ' LEFT', '#e0563b');
      return;
    }
    // enemy died
    this.combo++;
    this.comboTimer = 2.6;
    const mult = Math.min(1 + (this.combo - 1) * 0.25, 4);
    const pts = Math.round(tank.scoreValue * mult);
    this.score += pts;
    this.addFloatingText(tank.x, tank.y - tank.radius, '+' + pts, { color: '#ffd34d', size: 18 });
    if (this.combo >= 2) this.addFloatingText(tank.x, tank.y - tank.radius - 20, 'x' + this.combo, { color: '#ff8c2b', size: 16 });

    if (Util.chance(tank.boss ? 1 : 0.16)) this._dropPowerUp({ x: tank.x, y: tank.y });

    // victory check: final boss down
    if (tank.boss && this.wave >= FINAL_WAVE) { this._victory(); }
  }

  _dropPowerUp(pos) {
    const types = Object.keys(POWERUP_TYPES);
    // bias toward heal when the player is hurting
    let type;
    if (this.player && this.player.hp < this.player.maxHp * 0.4 && Util.chance(0.5)) type = 'heal';
    else type = Util.choice(types);
    this.powerups.push(new PowerUp(this, pos.x, pos.y, type));
  }

  _respawnPlayer() {
    this.player.alive = true;
    this.player.hp = this.player.maxHp;
    this.player.x = this.world.w / 2;
    this.player.y = this.world.h / 2;
    this.player.invuln = 2.0;
    this.player.shieldTime = 0;
    this._spawnPoof(this.player.x, this.player.y);
  }

  /* ------------------------------ states ------------------------------- */
  pause() {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.PAUSED;
    this._showOverlay('pause');
  }
  resume() {
    if (this.state !== STATE.PAUSED) return;
    this.state = STATE.PLAYING;
    this._hideOverlays();
    this._lastTime = performance.now();
  }
  _gameOver() {
    this.state = STATE.GAMEOVER;
    this.audio.gameover();
    this._checkHighScore();
    document.getElementById('go-score').textContent = this.score.toLocaleString();
    document.getElementById('go-wave').textContent = this.wave;
    document.getElementById('go-high').textContent = this.highScore.toLocaleString();
    this._showOverlay('gameover');
  }
  _victory() {
    this.state = STATE.VICTORY;
    this.audio.victory();
    this._checkHighScore();
    document.getElementById('vic-score').textContent = this.score.toLocaleString();
    document.getElementById('vic-high').textContent = this.highScore.toLocaleString();
    this._showOverlay('victory');
  }
  _checkHighScore() {
    if (this.score > this.highScore) { this.highScore = this.score; Storage.set('highscore', this.score); }
  }

  /* ----------------------------- rendering ----------------------------- */
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === STATE.MENU) { this._drawMenuBackdrop(ctx); return; }

    // world (camera space)
    ctx.save();
    this.camera.apply(ctx);
    this.world.draw(ctx);
    for (const t of this.treadMarks) t.draw(ctx);
    for (const o of this.obstacles) o.draw(ctx);
    for (const pu of this.powerups) pu.draw(ctx);
    for (const e of this.enemies) e.draw(ctx);
    if (this.player && this.player.alive) this.player.draw(ctx);
    for (const b of this.bullets) b.draw(ctx);
    for (const p of this.particles) p.draw(ctx);
    for (const x of this.explosions) x.draw(ctx);
    for (const ft of this.floatingTexts) ft.draw(ctx);
    ctx.restore();

    // screen-space: crosshair + dimmer when paused
    if (this.state === STATE.PLAYING) this._drawCrosshair(ctx);
    if (this.state === STATE.PAUSED) { ctx.fillStyle = 'rgba(8,12,20,0.55)'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }
  }

  _drawCrosshair(ctx) {
    const m = this.input.mouse;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 12, 0, TAU);
    ctx.moveTo(m.x - 18, m.y); ctx.lineTo(m.x - 6, m.y);
    ctx.moveTo(m.x + 6, m.y); ctx.lineTo(m.x + 18, m.y);
    ctx.moveTo(m.x, m.y - 18); ctx.lineTo(m.x, m.y - 6);
    ctx.moveTo(m.x, m.y + 6); ctx.lineTo(m.x, m.y + 18);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(m.x, m.y, 1.5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  _drawMenuBackdrop(ctx) {
    // animated gradient + drifting grid, so the menu isn't a dead screen
    const w = this.canvas.width, h = this.canvas.height;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1b2a3a'); g.addColorStop(1, '#0e1620');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    const off = (this.time * 18) % 48;
    ctx.beginPath();
    for (let x = -48 + off; x < w; x += 48) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = -48 + off; y < h; y += 48) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
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
    document.getElementById('stat-wave').textContent = this.wave;
    const remaining = this.enemies.length + this.spawnQueue.length;
    document.getElementById('stat-enemies').textContent = remaining;

    const comboEl = document.getElementById('combo');
    if (this.combo >= 2) { comboEl.style.opacity = '1'; comboEl.textContent = 'COMBO x' + this.combo; }
    else comboEl.style.opacity = '0';

    this._updateBuffs();
    this._drawMinimap();
  }

  _updateBuffs() {
    const el = document.getElementById('buffs');
    const p = this.player; if (!p) { el.innerHTML = ''; return; }
    const buffs = [];
    if (p.shieldTime > 0) buffs.push(['SHIELD', '#4ec3e0', p.shieldTime]);
    if (p.rapidTime > 0) buffs.push(['RAPID', '#f0a93b', p.rapidTime]);
    if (p.spreadTime > 0) buffs.push(['SPREAD', '#c45bd6', p.spreadTime]);
    if (p.speedTime > 0) buffs.push(['SPEED', '#5bd6a8', p.speedTime]);
    if (p.damageTime > 0) buffs.push(['DAMAGE', '#e0563b', p.damageTime]);
    el.innerHTML = buffs.map(([n, c, t]) =>
      `<span class="buff" style="border-color:${c};color:${c}">${n} ${Math.ceil(t)}</span>`).join('');
  }

  _drawMinimap() {
    const mm = document.getElementById('minimap');
    if (!mm) return;
    const ctx = mm.getContext('2d');
    const W = mm.width, H = mm.height;
    const sx = W / this.world.w, sy = H / this.world.h;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(10,16,24,0.85)'; ctx.fillRect(0, 0, W, H);
    // obstacles
    ctx.fillStyle = 'rgba(160,160,160,0.6)';
    for (const o of this.obstacles) ctx.fillRect(o.x * sx, o.y * sy, Math.max(1, o.w * sx), Math.max(1, o.h * sy));
    // powerups
    for (const pu of this.powerups) { ctx.fillStyle = POWERUP_TYPES[pu.type].color; ctx.fillRect(pu.x * sx - 1, pu.y * sy - 1, 3, 3); }
    // enemies
    for (const e of this.enemies) {
      ctx.fillStyle = e.boss ? '#c45bd6' : '#ff5a4d';
      const s = e.boss ? 5 : 3;
      ctx.fillRect(e.x * sx - s / 2, e.y * sy - s / 2, s, s);
    }
    // player
    if (this.player && this.player.alive) {
      ctx.fillStyle = '#5fa8ff';
      ctx.beginPath(); ctx.arc(this.player.x * sx, this.player.y * sy, 3, 0, TAU); ctx.fill();
    }
    // viewport
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
    ctx.strokeRect(this.camera.x * sx, this.camera.y * sy, this.canvas.width * sx, this.canvas.height * sy);
  }

  _showBanner(text, color) {
    const b = document.getElementById('wave-banner');
    b.textContent = text;
    b.style.color = color || '#fff';
    b.classList.remove('show'); void b.offsetWidth; // restart animation
    b.classList.add('show');
  }

  /* ----------------------------- UI wiring ----------------------------- */
  _bindUI() {
    // difficulty + theme selectors
    document.querySelectorAll('[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => { this.difficulty = btn.dataset.diff; this._updateMenuUI(); });
    });
    document.querySelectorAll('[data-theme]').forEach((btn) => {
      btn.addEventListener('click', () => { this.theme = btn.dataset.theme; this._updateMenuUI(); });
    });
    document.getElementById('btn-play').addEventListener('click', () => { this.audio._ensure(); this.newGame(); });
    document.getElementById('btn-resume').addEventListener('click', () => this.resume());
    document.getElementById('btn-restart').addEventListener('click', () => this.newGame());
    document.getElementById('btn-quit').addEventListener('click', () => this._toMenu());
    document.getElementById('btn-retry').addEventListener('click', () => this.newGame());
    document.getElementById('btn-menu').addEventListener('click', () => this._toMenu());
    document.getElementById('btn-vic-continue').addEventListener('click', () => { this.state = STATE.PLAYING; this._hideOverlays(); this._lastTime = performance.now(); this.intermission = 2; });
    document.getElementById('btn-vic-menu').addEventListener('click', () => this._toMenu());

    const muteBtns = document.querySelectorAll('.btn-mute');
    muteBtns.forEach((btn) => btn.addEventListener('click', () => {
      const m = this.audio.toggleMute();
      muteBtns.forEach((b) => b.textContent = m ? '🔇 Sound Off' : '🔊 Sound On');
    }));
    muteBtns.forEach((b) => b.textContent = this.audio.muted ? '🔇 Sound Off' : '🔊 Sound On');
  }

  _toMenu() {
    this.state = STATE.MENU;
    this._showOverlay('menu');
    this._updateMenuUI();
    this.audio.startMusic('Sounds/BGM.mp3');
  }

  _updateMenuUI() {
    document.querySelectorAll('[data-diff]').forEach((b) => b.classList.toggle('active', b.dataset.diff === this.difficulty));
    document.querySelectorAll('[data-theme]').forEach((b) => b.classList.toggle('active', b.dataset.theme === this.theme));
    document.getElementById('menu-high').textContent = this.highScore.toLocaleString();
    document.getElementById('menu-bestwave').textContent = this.bestWave;
  }

  _showOverlay(name) {
    this._hideOverlays();
    const el = document.getElementById('overlay-' + name);
    if (el) el.classList.remove('hidden');
    document.getElementById('hud').classList.toggle('hidden', name !== 'pause' && this.state !== STATE.PLAYING);
  }
  _hideOverlays() {
    document.querySelectorAll('.overlay').forEach((o) => o.classList.add('hidden'));
    document.getElementById('hud').classList.toggle('hidden', this.state !== STATE.PLAYING && this.state !== STATE.PAUSED);
  }
}

/* ------------------------------ bootstrap -------------------------------- */
window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  window.GAME = game; // handy for debugging
  game.start();
});
