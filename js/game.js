/* =========================================================================
 * TanksALot — Game (epic edition)
 * Orchestrates everything: loading, states, the loop (slow-mo + hit-stop),
 * dynamic lighting + screen FX, waves/perks/coins, abilities + ultimate,
 * elites/splitters/killstreaks, bosses, HUD + minimap, settings, run summary,
 * and mobile touch controls.
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
  { id: 'ultimate', name: 'Overkill', desc: 'Unleash your ultimate' },
  { id: 'elite', name: 'Elite Hunter', desc: 'Destroy an elite enemy' },
];

class Game {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas); this.audio = new AudioManager(); this.assets = new AssetManager();
    this.camera = new Camera(canvas.width, canvas.height, canvas.width, canvas.height);
    // offscreen light buffer for the dynamic-lighting pass
    this._lightCanvas = document.createElement('canvas'); this._lightCanvas.width = canvas.width; this._lightCanvas.height = canvas.height; this._lightCtx = this._lightCanvas.getContext('2d');

    this.state = STATE.LOADING; this.time = 0; this.timeScale = 1; this._slowmo = 0; this._hitstop = 0; this.fps = 60;
    this.difficulty = Storage.get('difficulty', 'normal'); this.theme = Storage.get('theme', 'forest');
    this.highScore = Storage.get('highscore', 0); this.bestWave = Storage.get('bestwave', 0); this.totalCoins = Storage.get('totalCoins', 0);
    this.achievements = new Set(Storage.get('achievements', []));
    this.settings = { shake: Storage.get('shake', true), weather: Storage.get('weather', true), lighting: Storage.get('lighting', true), flash: Storage.get('flash', true), fps: Storage.get('fps', false) };

    this._reset(); this._queueAssets(); this._bindUI();
    this.mobile = new MobileControls(this);
    this.stage = document.getElementById('stage');
    this._resize();
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this._resize(), 250));
    document.addEventListener('visibilitychange', () => { if (typeof document !== 'undefined' && document.hidden && this.state === STATE.PLAYING) this.pause(); });
    this._lastTime = performance.now(); this.toasts = [];
  }

  // Fit the canvas to the whole viewport (any orientation) at a consistent
  // world-scale, and resize the offscreen light buffer to match.
  _resize() {
    const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
    const rect = this.stage ? this.stage.getBoundingClientRect() : { width: 1280, height: 720 };
    let w = Math.max(480, Math.round((rect.width || 1280) * dpr));
    let h = Math.max(320, Math.round((rect.height || 720) * dpr));
    const maxDim = 2000, sc = Math.min(1, maxDim / Math.max(w, h)); // cap so the view never exceeds the world
    w = Math.round(w * sc); h = Math.round(h * sc);
    this.canvas.width = w; this.canvas.height = h;
    this._lightCanvas.width = w; this._lightCanvas.height = h;
    this.camera.resize(w, h);
    const z = Util.clamp(Math.min(w, h) / 640, 0.6, 2.6); // same comfortable world-area on phone or desktop
    this.camera.zoom = this.camera.targetZoom = z;
  }

  _reset() {
    this.world = null; this.player = null;
    this.enemies = []; this.bullets = []; this.particles = []; this.treadMarks = []; this.explosions = []; this.powerups = []; this.coins = []; this.crates = [];
    this.obstacles = []; this.floatingTexts = []; this.decals = []; this.casings = []; this.afterImages = []; this.debris = []; this.beams = []; this.lightnings = []; this.shockwaves = [];
    this.spawnQueue = []; this.spawnTimer = 0;
    this.wave = 0; this.score = 0; this.combo = 0; this.comboTimer = 0; this.maxCombo = 0;
    this.lives = 3; this.coinCount = 0; this.intermission = 0; this.respawnTimer = 0; this.powerupTimer = Util.rand(8, 14);
    this.bossWave = false; this.boss = null; this.killfeed = []; this.damageFlash = 0; this._lastPlayerHp = 0; this.waveDamageTaken = 0;
    this._lowBeep = 0; this.runKills = 0; this.runTime = 0; this.flash = { a: 0, color: 'rgba(255,255,255,' };
  }
  _queueAssets() { this.assets.queueImage('img/forest/grass03.png'); this.assets.queueImage('img/background/desertTile.png'); this.assets.queueImage('img/Explosion_C.png'); this.assets.queueImage('img/Explosion_A.png'); }

  start() {
    this._showOverlay('loading');
    const tips = ['TIP: Right-click or Shift to DASH. E for SHOCKWAVE, F for ULTIMATE.', 'TIP: Pick up weapon crates — 8 weapons to master.', 'TIP: Fill the ultimate meter with kills, then unleash it.', 'TIP: Draft a perk after every wave — go for synergies.', 'TIP: Barrels and lava explode. Bait enemies into them.', 'TIP: Every 5th wave is a BOSS. Keep moving!', 'TIP: On mobile, use the left stick to move, right to aim & fire.'];
    document.getElementById('load-tip').textContent = Util.choice(tips);
    this.assets.downloadAll(() => {});
    const t0 = performance.now();
    const poll = () => { const p = this.assets.progress(), el = (performance.now() - t0) / 1000, shown = Math.min(p, el / 0.7); document.getElementById('load-fill').style.width = (shown * 100) + '%'; document.getElementById('load-pct').textContent = Math.round(shown * 100) + '%'; if (this.assets.isDone() && el > 0.7) { this._toMenu(); this._loop(); } else requestAnimationFrame(poll); };
    poll();
  }

  _loop() {
    const now = performance.now(); let realDt = Math.min((now - this._lastTime) / 1000, 0.05); this._lastTime = now;
    this.fps = Util.lerp(this.fps, 1 / Math.max(realDt, 0.0001), 0.1);
    let dt;
    if (this._hitstop > 0) { this._hitstop -= realDt; dt = 0; }
    else { if (this._slowmo > 0) { this._slowmo -= realDt; this.timeScale = 0.35; } else this.timeScale = Util.smooth(this.timeScale, 1, realDt, 0.001); dt = realDt * this.timeScale; }
    this.time += dt; this.update(dt, realDt); this.draw(); this.input.endFrame();
    requestAnimationFrame(() => this._loop());
  }

  update(dt, realDt) {
    if (this.state === STATE.PLAYING) { if (this.input.justPressed('Escape') || this.input.justPressed('KeyP')) { this.pause(); return; } this._updatePlaying(dt); }
    else if (this.state === STATE.PAUSED) { if (this.input.justPressed('Escape') || this.input.justPressed('KeyP')) this.resume(); }
    for (const t of this.toasts) t.life -= realDt; this.toasts = this.toasts.filter((t) => t.life > 0);
    if (this.flash.a > 0) this.flash.a = Math.max(0, this.flash.a - realDt * 2);
  }

  _updatePlaying(dt) {
    this.runTime += dt;
    const p = this.player;
    if (p && p.alive) { p.update(dt); this.world.affect(p, dt); }
    for (const e of this.enemies) { e.update(dt); this.world.affect(e, dt); }
    for (const o of this.obstacles) o.update(dt);
    for (const arr of [this.bullets, this.particles, this.treadMarks, this.explosions, this.powerups, this.coins, this.crates, this.floatingTexts, this.decals, this.casings, this.afterImages, this.debris, this.beams, this.lightnings, this.shockwaves]) for (const o of arr) o.update(dt);

    if (p && p.alive && p.thorns > 0) for (const e of this.enemies) { if (e.alive && Util.dist(p.x, p.y, e.x, e.y) < p.radius + e.radius + 6) e.takeDamage(p.thorns * dt, Util.angleTo(p.x, p.y, e.x, e.y), true, {}); }
    if (p && p.alive) {
      if (p.hp < this._lastPlayerHp - 0.5) { this.damageFlash = Math.min(1, this.damageFlash + (this._lastPlayerHp - p.hp) / 60 + 0.2); this.waveDamageTaken += this._lastPlayerHp - p.hp; if (this.settings.shake) this.camera.shake(4, 0.12); }
      this._lastPlayerHp = p.hp;
      if (p.hp < p.maxHp * 0.25) { this._lowBeep -= dt; if (this._lowBeep <= 0) { this._lowBeep = 0.9; this.audio.lowHealth(); } if (this._slowmo <= 0) this.timeScale = 0.85; }
    }
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 1.4);

    this.enemies = this.enemies.filter((e) => e.alive);
    this.bullets = this.bullets.filter((b) => !b.dead); this.particles = this.particles.filter((x) => !x.dead); this.treadMarks = this.treadMarks.filter((x) => !x.dead);
    this.explosions = this.explosions.filter((x) => !x.dead); this.powerups = this.powerups.filter((x) => !x.dead); this.coins = this.coins.filter((x) => !x.dead);
    this.crates = this.crates.filter((x) => !x.dead); this.floatingTexts = this.floatingTexts.filter((x) => !x.dead); this.obstacles = this.obstacles.filter((o) => !o.dead);
    this.decals = this.decals.filter((d) => !d.dead); this.casings = this.casings.filter((c) => !c.dead); this.afterImages = this.afterImages.filter((a) => !a.dead);
    this.debris = this.debris.filter((d) => !d.dead); this.beams = this.beams.filter((b) => !b.dead); this.lightnings = this.lightnings.filter((l) => !l.dead); this.shockwaves = this.shockwaves.filter((s) => !s.dead);
    for (const kf of this.killfeed) kf.life -= dt; this.killfeed = this.killfeed.filter((k) => k.life > 0);

    if (this.combo > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }
    if (this.boss && !this.boss.alive) this.boss = null;

    if (this.spawnQueue.length > 0) { this.spawnTimer -= dt; if (this.spawnTimer <= 0) { this.spawnTimer = 0.5; this._spawnEnemy(this.spawnQueue.shift()); } }
    this.powerupTimer -= dt; if (this.powerupTimer <= 0 && this.powerups.length < 3) { this.powerupTimer = Util.rand(12, 20); this._dropPowerUp(this.world.randomSpawn(160)); }

    if (p && !p.alive && this.state === STATE.PLAYING) { this.respawnTimer -= dt; if (this.respawnTimer <= 0) { if (this.lives > 0) this._respawnPlayer(); else this._gameOver(); } }

    if (this.intermission > 0) { this.intermission -= dt; if (this.intermission <= 0) this._openUpgrade(); }
    else if (this.enemies.length === 0 && this.spawnQueue.length === 0 && p && p.alive) this._onWaveCleared();

    if (p && p.alive) { const m = this.camera.screenToWorld(this.input.mouse.x, this.input.mouse.y); this.camera.follow(p.x, p.y, dt, (m.x - p.x) * 0.18, (m.y - p.y) * 0.18); }
    else if (this.boss) this.camera.follow(this.boss.x, this.boss.y, dt);
    this._updateHUD();
  }

  /* --------------------------- world / waves --------------------------- */
  newGame() {
    this._reset(); Storage.set('difficulty', this.difficulty); Storage.set('theme', this.theme);
    const d = DIFFICULTIES[this.difficulty]; this.lives = d.lives;
    const size = 2600; this.world = new World(this, size, size, this.theme);
    this.camera.setWorld(size, size); this.camera.x = size / 2 - this.camera.vw / 2; this.camera.y = size / 2 - this.camera.vh / 2;
    this.player = new PlayerTank(this, size / 2, size / 2); this._lastPlayerHp = this.player.hp;
    this.obstacles = this.world.generateObstacles(38, this.player.x, this.player.y);
    this.world.generateHazards(this.theme === 'arctic' ? 3 : 4, this.player.x, this.player.y); this.world.generateDecor(120);
    this.state = STATE.PLAYING; this._hideOverlays(); this.audio.startMusic('Sounds/BGM.mp3'); this._spawnWave(1);
  }
  _spawnWave(n) {
    this.wave = n; this.intermission = 0; this.bossWave = (n % 5 === 0); this.waveDamageTaken = 0; const d = DIFFICULTIES[this.difficulty]; const queue = [];
    if (this.bossWave) { queue.push({ type: 'boss' }); const adds = Math.min(2 + Math.floor(n / 5), 6); const pool = enemyPoolForWave(n); for (let i = 0; i < adds; i++) queue.push({ type: Util.choice(pool) }); this._showBanner(n >= FINAL_WAVE ? 'FINAL BOSS' : 'BOSS WAVE', '#c45bd6'); this.audio.bossRoar(); }
    else { let count = Math.round((3 + n * 1.25) * d.count); count = Math.min(count, 16); const pool = enemyPoolForWave(n); for (let i = 0; i < count; i++) queue.push({ type: Util.choice(pool) }); this._showBanner('WAVE ' + n, '#ffd34d'); }
    const wbw = { 2: 'machinegun', 3: 'shotgun', 4: 'rockets', 5: 'laser', 6: 'flamethrower', 7: 'railgun', 8: 'tesla' };
    if (wbw[n] && this.player) { const s = this.world.randomSpawn(120); this.crates.push(new WeaponCrate(this, s.x, s.y, wbw[n])); }
    this.spawnQueue = queue; this.spawnTimer = 0.2; this.audio.wave(); this.audio.setMusicIntensity(this.bossWave);
    if (n > this.bestWave) { this.bestWave = n; Storage.set('bestwave', n); }
    if (n >= 5) this._unlock('wave5'); if (n >= 10) this._unlock('wave10');
  }
  _spawnEnemy(desc) {
    const d = DIFFICULTIES[this.difficulty]; const waveHp = 1 + (this.wave - 1) * 0.07; const pos = this.world.randomSpawn(440);
    if (desc.type === 'boss') { const hp = Math.round(440 * d.hp * (1 + this.wave * 0.06)); const b = new Boss(this, pos.x, pos.y, hp); b.bulletDamage = 16 * d.dmg; this.boss = b; this.enemies.push(b); this._spawnPoof(pos.x, pos.y, '#c45bd6'); document.getElementById('boss-name').textContent = this.wave >= FINAL_WAVE ? 'FINAL BOSS' : 'BOSS'; return; }
    if (desc.type === 'turret') { const t = new Turret(this, pos.x, pos.y, { hp: d.hp * waveHp, dmg: d.dmg, fireRate: d.fireRate }); this.enemies.push(t); this._spawnPoof(pos.x, pos.y); return; }
    const scale = { hp: d.hp * waveHp, dmg: d.dmg, fireRate: d.fireRate, speed: d.speed };
    const elite = !desc.noElite && this.wave >= 3 && Util.chance(d.elite);
    if (elite) { scale.hp *= 2.4; scale.dmg *= 1.4; scale.size = 1.3; }
    const e = new EnemyTank(this, pos.x, pos.y, desc.type, scale);
    if (elite) { e.elite = true; e.scoreValue *= 3; this.audio.elite(); }
    this.enemies.push(e); this._spawnPoof(pos.x, pos.y, elite ? '#ffd34d' : undefined);
  }
  summonAdds(n) { const pool = enemyPoolForWave(this.wave); for (let i = 0; i < n; i++) this.spawnQueue.push({ type: Util.choice(pool) }); }
  _spawnSplit(x, y, n) { for (let i = 0; i < n; i++) { const e = new EnemyTank(this, x + Util.rand(-20, 20), y + Util.rand(-20, 20), 'splitling', { hp: DIFFICULTIES[this.difficulty].hp, dmg: DIFFICULTIES[this.difficulty].dmg }); this.enemies.push(e); } this._spawnPoof(x, y, '#d98fee'); }
  _spawnPoof(x, y, color) { for (let i = 0; i < 10; i++) { const a = Util.rand(0, TAU), sp = Util.rand(40, 120); this.addParticle(new Particle(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4, size: Util.rand(2, 5), color: color || 'rgba(220,220,220,0.9)', fade: true, shrink: true, add: !!color })); } }
  _onWaveCleared() {
    this.intermission = 2.4; const bonus = 100 * this.wave; this.score += bonus; this._showBanner('WAVE ' + this.wave + ' CLEARED  +' + bonus, '#5fcf5f');
    if (this.player && this.player.alive) this.player.hp = Math.min(this.player.maxHp, this.player.hp + 15);
    if (this.waveDamageTaken < 1) this._unlock('untouchable'); this._checkHighScore();
  }
  onBossPhase(boss, phase) { this._showBanner('BOSS ENRAGED — PHASE ' + phase, '#e0563b'); this.audio.bossRoar(); if (this.settings.shake) this.camera.shake(8, 0.4); if (this.settings.flash) this.screenFlash('rgba(200,80,230,', 0.3); }

  /* --------------------------- entity hooks ---------------------------- */
  addBullet(b) { this.bullets.push(b); }
  addParticle(p) { this.particles.push(p); if (this.particles.length > CONFIG.maxParticles) this.particles.shift(); }
  addTreadMark(t) { this.treadMarks.push(t); if (this.treadMarks.length > 220) this.treadMarks.shift(); }
  addDecal(d) { this.decals.push(d); if (this.decals.length > CONFIG.maxDecals) this.decals.shift(); }
  addShellCasing(c) { this.casings.push(c); if (this.casings.length > 70) this.casings.shift(); }
  addAfterImage(a) { this.afterImages.push(a); if (this.afterImages.length > 36) this.afterImages.shift(); }
  addDebris(d) { this.debris.push(d); if (this.debris.length > 160) this.debris.shift(); }
  addBeam(b) { this.beams.push(b); }
  addLightning(l) { this.lightnings.push(l); }
  addShockwaveFX(s) { this.shockwaves.push(s); }
  addFloatingText(x, y, text, opts) { this.floatingTexts.push(new FloatingText(x, y, text, opts)); }
  spawnExplosion(x, y, scale) { this.explosions.push(new Explosion(this, x, y, scale)); if (this.settings.flash && scale >= 1) this.screenFlash('rgba(255,200,120,', 0.25 * scale); }
  allTanks() { return this.player && this.player.alive ? [this.player, ...this.enemies] : this.enemies; }
  hitStop(d) { this._hitstop = Math.max(this._hitstop, d); }
  setSlowmo(d) { this._slowmo = Math.max(this._slowmo, d); }
  screenFlash(color, a) { if (!this.settings.flash) return; this.flash.color = color; this.flash.a = Math.max(this.flash.a, a); }
  onCoinCollected(v) { this.coinCount += v; this.totalCoins += v; Storage.set('totalCoins', this.totalCoins); this.score += v * 5; if (this.totalCoins >= 500) this._unlock('rich'); }
  onRevive() { this.screenFlash('rgba(120,220,160,', 0.5); this.camera.shake(8, 0.4); this._spawnPoof(this.player.x, this.player.y, '#5fcf5f'); this._showBanner('REVIVED!', '#5fcf5f'); this._lastPlayerHp = this.player.hp; }
  nukeScreen() {
    this.screenFlash('rgba(255,255,255,', 0.85); this.camera.shake(16, 0.6); this.hitStop(0.06);
    for (const e of [...this.enemies]) { if (e.alive && this.camera.visible(e.x, e.y, 0)) { this.spawnExplosion(e.x, e.y, 0.7); e.takeDamage(260, Util.rand(0, TAU), true, {}); } }
  }
  magnetPickup() { for (const c of this.coins) { c.vx = 0; c.vy = 0; } if (this.player) this.player.pickupRange = Math.max(this.player.pickupRange, 9999); setTimeout(() => { if (this.player) this.player.pickupRange = Math.min(this.player.pickupRange, 1200); }, 50); }

  onObstacleDestroyed(o) {
    this.spawnExplosion(o.cx, o.cy, o.kind === 'barrel' ? 0.9 : 0.5);
    if (o.kind === 'barrel') { for (const t of this.allTanks()) { const d = Util.dist(o.cx, o.cy, t.x, t.y); if (d < 90) t.takeDamage(30 * (1 - d / 90), Util.angleTo(o.cx, o.cy, t.x, t.y), true, {}); } if (this.settings.shake) this.camera.shake(6, 0.2); this.addDecal(new Decal(o.cx, o.cy, 44)); }
    const bonus = this.player ? this.player.dropBonus : 0;
    if (Util.chance((o.kind === 'crate' ? 0.35 : 0.12) + bonus)) this._dropPowerUp({ x: o.cx, y: o.cy });
    if (Util.chance(0.5)) this.coins.push(new Coin(this, o.cx, o.cy, 1));
  }
  onTankDestroyed(tank, byPlayer) {
    if (tank.team === 'player') { this.lives--; this.respawnTimer = 1.6; this.setSlowmo(0.6); this.damageFlash = 1; if (this.settings.flash) this.screenFlash('rgba(220,40,40,', 0.5); if (this.lives > 0) this._showBanner('LIFE LOST — ' + this.lives + ' LEFT', '#e0563b'); return; }
    this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.comboTimer = 2.6; this.runKills++;
    if (this.combo >= 10) this._unlock('combo10'); this._unlock('firstblood'); if (tank.elite) this._unlock('elite');
    const mult = Math.min(1 + (this.combo - 1) * 0.25, 4); const pts = Math.round(tank.scoreValue * mult); this.score += pts;
    this.addFloatingText(tank.x, tank.y - tank.radius, '+' + pts, { color: '#ffd34d', size: 18 });
    if (this.combo >= 2) this.addFloatingText(tank.x, tank.y - tank.radius - 20, 'x' + this.combo, { color: '#ff8c2b', size: 16 });
    this._addKill(tank); if (this.player && this.player.alive) this.player.onKill();
    if (tank.splits) this._spawnSplit(tank.x, tank.y, tank.splits);
    const bonus = this.player ? this.player.dropBonus : 0;
    const coinN = tank.boss ? 25 : (tank.elite ? 6 : (tank.type === 'heavy' ? 4 : Util.randInt(1, 3)));
    for (let i = 0; i < coinN; i++) this.coins.push(new Coin(this, tank.x, tank.y, 1));
    if (Util.chance((tank.boss ? 1 : (tank.elite ? 0.5 : 0.16)) + bonus)) this._dropPowerUp({ x: tank.x, y: tank.y });
    if (this.runKills % 18 === 0 && this.player) { const owned = this.player.weaponOrder; const all = WEAPON_KEYS.filter((k) => k !== 'cannon'); const k = Util.choice(all); this.crates.push(new WeaponCrate(this, tank.x, tank.y, k)); this._showBanner('KILLSTREAK!', '#ffcf3a'); }
    if (this.player && this.player.weaponOrder.length >= WEAPON_KEYS.length) this._unlock('arsenal');
    if (tank.boss) { this.setSlowmo(0.8); this._unlock('boss'); if (this.settings.flash) this.screenFlash('rgba(255,220,150,', 0.6); if (this.wave >= FINAL_WAVE) { this._victory(); return; } }
  }
  _addKill(tank) { const names = { grunt: 'Grunt', scout: 'Scout', heavy: 'Heavy', artillery: 'Artillery', bomber: 'Bomber', shielded: 'Shielded', sniper: 'Sniper', splitter: 'Splitter', splitling: 'Splitling', drone: 'Drone' }; const name = (tank.elite ? 'Elite ' : '') + (tank.boss ? 'BOSS' : (tank instanceof Turret ? 'Turret' : (names[tank.type] || 'Tank'))); const col = tank.boss ? '#c45bd6' : (tank.elite ? '#ffd34d' : (tank.palette ? tank.palette.hull : '#fff')); this.killfeed.unshift({ text: name, color: col, life: 4 }); if (this.killfeed.length > 5) this.killfeed.pop(); }
  _dropPowerUp(pos) { const types = Object.keys(POWERUP_TYPES); let type; if (this.player && this.player.hp < this.player.maxHp * 0.4 && Util.chance(0.5)) type = 'heal'; else if (Util.chance(0.06)) type = 'nuke'; else if (Util.chance(0.08)) type = 'magnet'; else type = Util.choice(['heal', 'shield', 'rapid', 'spread', 'speed', 'damage']); this.powerups.push(new PowerUp(this, pos.x, pos.y, type)); }
  _respawnPlayer() { const p = this.player; p.alive = true; p.hp = p.maxHp; p.x = this.world.w / 2; p.y = this.world.h / 2; p.invuln = 2.0; p.shieldTime = 0; p.burn = 0; this._lastPlayerHp = p.hp; this._spawnPoof(p.x, p.y, '#5fa8ff'); }

  /* ---------------------------- upgrades ------------------------------- */
  _openUpgrade() { if (this.wave >= FINAL_WAVE) { this._spawnWave(this.wave + 1); return; } this.state = STATE.UPGRADE; this._pickedPerks = this._rollPerks(); this._renderPerks(); this._showOverlay('upgrade'); }
  _rollPerks() { const ex = new Set(); const out = []; for (let i = 0; i < 3; i++) { const p = rollPerk(ex); if (!p) break; ex.add(p.id); out.push(p); } return out; }
  _renderPerks() { for (let i = 0; i < 3; i++) { const perk = this._pickedPerks[i], card = document.getElementById('perk-' + i); if (!perk) { card.style.display = 'none'; continue; } card.style.display = ''; const col = RARITY[perk.rarity].color; card.style.borderColor = col; card.querySelector('.perk-name').textContent = perk.name; card.querySelector('.perk-name').style.color = col; card.querySelector('.perk-desc').textContent = perk.desc; card.querySelector('.perk-rarity').textContent = perk.rarity.toUpperCase(); card.querySelector('.perk-rarity').style.color = col; } document.getElementById('upgrade-coins').textContent = this.coinCount; }
  choosePerk(i) { const perk = this._pickedPerks[i]; if (!perk) return; perk.apply(this.player, this); this.audio.levelUp(); this.state = STATE.PLAYING; this._hideOverlays(); this._lastTime = performance.now(); this._spawnWave(this.wave + 1); }
  rerollPerks() { if (this.coinCount < 30) return; this.coinCount -= 30; this.audio.coin(); this._pickedPerks = this._rollPerks(); this._renderPerks(); }

  /* ------------------------------ states ------------------------------- */
  pause() { if (this.state !== STATE.PLAYING) return; this.state = STATE.PAUSED; this._showOverlay('pause'); }
  resume() { if (this.state !== STATE.PAUSED) return; this.state = STATE.PLAYING; this._hideOverlays(); this._lastTime = performance.now(); }
  _gameOver() {
    this.state = STATE.GAMEOVER; this.audio.gameover(); this._checkHighScore();
    document.getElementById('go-score').textContent = this.score.toLocaleString(); document.getElementById('go-wave').textContent = this.wave;
    document.getElementById('go-kills').textContent = this.runKills; document.getElementById('go-combo').textContent = 'x' + this.maxCombo;
    document.getElementById('go-time').textContent = this._fmtTime(this.runTime); document.getElementById('go-high').textContent = this.highScore.toLocaleString();
    this._showOverlay('gameover');
  }
  _victory() {
    this.state = STATE.VICTORY; this.audio.victory(); this._checkHighScore(); this._unlock('victory'); this.screenFlash('rgba(120,255,160,', 0.7);
    document.getElementById('vic-score').textContent = this.score.toLocaleString(); document.getElementById('vic-high').textContent = this.highScore.toLocaleString();
    this._showOverlay('victory');
  }
  _fmtTime(s) { const m = Math.floor(s / 60), ss = Math.floor(s % 60); return m + ':' + (ss < 10 ? '0' : '') + ss; }
  _checkHighScore() { if (this.score > this.highScore) { this.highScore = this.score; Storage.set('highscore', this.score); } }
  _unlock(id) { if (this.achievements.has(id)) return; this.achievements.add(id); Storage.set('achievements', [...this.achievements]); const a = ACHIEVEMENTS.find((x) => x.id === id); if (a) { this.toasts.push({ name: a.name, desc: a.desc, life: 4 }); this.audio.levelUp(); this._renderToasts(); } }

  /* ----------------------------- rendering ----------------------------- */
  draw() {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height; ctx.clearRect(0, 0, W, H);
    if (this.state === STATE.LOADING || this.state === STATE.MENU) { this._drawMenuBackdrop(ctx); return; }
    ctx.save(); this.camera.apply(ctx);
    this.world.draw(ctx);
    for (const d of this.decals) d.draw(ctx); for (const t of this.treadMarks) t.draw(ctx); for (const cs of this.casings) cs.draw(ctx); for (const d of this.debris) d.draw(ctx);
    for (const o of this.obstacles) o.draw(ctx); for (const pu of this.powerups) pu.draw(ctx); for (const c of this.coins) c.draw(ctx); for (const cr of this.crates) cr.draw(ctx);
    for (const ai of this.afterImages) ai.draw(ctx); for (const e of this.enemies) e.draw(ctx); if (this.player && this.player.alive) this.player.draw(ctx);
    for (const b of this.bullets) b.draw(ctx); for (const s of this.shockwaves) s.draw(ctx); for (const pa of this.particles) pa.draw(ctx);
    for (const x of this.explosions) x.draw(ctx); for (const b of this.beams) b.draw(ctx); for (const l of this.lightnings) l.draw(ctx);
    ctx.restore();
    this._drawLighting(ctx, W, H);
    // floating combat text on top of lighting so it stays readable
    ctx.save(); this.camera.apply(ctx); for (const ft of this.floatingTexts) ft.draw(ctx); ctx.restore();
    if (this.settings.weather && this.world) this.world.drawWeather(ctx, W, H, this.time);
    this._drawScreenFX(ctx, W, H);
    if (this.state === STATE.PLAYING) { this._drawOffscreenArrows(ctx, W, H); if (!this.mobile.enabled) this._drawCrosshair(ctx); }
    if (this.state === STATE.PAUSED || this.state === STATE.UPGRADE) { ctx.fillStyle = 'rgba(8,12,20,0.5)'; ctx.fillRect(0, 0, W, H); }
  }
  _drawLighting(ctx, W, H) {
    if (!this.settings.lighting || !this.world) return;
    const lx = this._lightCtx; lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.fillStyle = this.world.theme.ambient; lx.fillRect(0, 0, W, H);
    lx.globalCompositeOperation = 'lighter'; lx.save(); this.camera.apply(lx);
    const L = (x, y, r, color) => { if (!this.camera.visible(x, y, r)) return; const g = lx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)'); lx.fillStyle = g; lx.fillRect(x - r, y - r, r * 2, r * 2); };
    const p = this.player; if (p && p.alive) L(p.x, p.y, 200, 'rgba(150,180,220,0.7)');
    const bcap = Math.min(this.bullets.length, 70); // cap bullet lights for perf on weaker devices
    for (let i = 0; i < bcap; i++) { const b = this.bullets[i]; L(b.x, b.y, b.kind === 'rocket' ? 80 : 50, b.team === 'player' ? 'rgba(255,210,120,0.8)' : 'rgba(255,110,90,0.7)'); }
    for (const e of this.explosions) { const t = 1 - e.time / e.dur; L(e.x, e.y, 170 * e.scale * t + 40, `rgba(255,180,90,${0.9 * t})`); }
    for (const pu of this.powerups) L(pu.x, pu.y, 80, POWERUP_TYPES[pu.type].color);
    for (const hz of this.world.hazards) if (hz.dmg) L(hz.x, hz.y, hz.r * 1.7, hz.type === 'energy' ? 'rgba(160,100,255,0.6)' : 'rgba(255,120,40,0.6)');
    for (const bm of this.beams) L((bm.x1 + bm.x2) / 2, (bm.y1 + bm.y2) / 2, 120, 'rgba(160,120,255,0.5)');
    if (this.boss && this.boss.alive) L(this.boss.x, this.boss.y, 240, 'rgba(200,120,230,0.6)');
    lx.restore(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(this._lightCanvas, 0, 0); ctx.globalCompositeOperation = 'source-over';
  }
  _drawScreenFX(ctx, W, H) {
    if (this.flash.a > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = this.flash.color + Util.clamp(this.flash.a, 0, 0.85) + ')'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    const p = this.player; let v = this.damageFlash; if (p && p.alive && p.hp < p.maxHp * 0.25) v = Math.max(v, 0.25 + 0.15 * Math.sin(this.time * 6));
    if (v > 0.01) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); g.addColorStop(0, 'rgba(200,30,30,0)'); g.addColorStop(1, `rgba(200,30,30,${Util.clamp(v, 0, 0.6)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.3)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  _drawOffscreenArrows(ctx, W, H) {
    const p = this.player; if (!p || !p.alive) return;
    for (const e of this.enemies) {
      if (!e.boss && !e.elite) continue; if (this.camera.visible(e.x, e.y, e.radius)) continue;
      const sx = (e.x - this.camera.x) * this.camera.zoom, sy = (e.y - this.camera.y) * this.camera.zoom; const ang = Math.atan2(sy - H / 2, sx - W / 2);
      const ax = W / 2 + Math.cos(ang) * (Math.min(W, H) / 2 - 40), ay = H / 2 + Math.sin(ang) * (Math.min(W, H) / 2 - 40);
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang); ctx.fillStyle = e.boss ? '#c45bd6' : '#ffd34d'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -7); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  _drawCrosshair(ctx) {
    const m = this.input.mouse; let lock = false; const wp = this.camera.screenToWorld(m.x, m.y);
    for (const e of this.enemies) if (e.alive && Util.dist(wp.x, wp.y, e.x, e.y) < e.radius + 10) { lock = true; break; }
    ctx.save(); ctx.strokeStyle = lock ? '#ff5a4d' : 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; const r = lock ? 16 : 12; ctx.translate(m.x, m.y); ctx.rotate(this.time * (lock ? 2 : 0.6));
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.moveTo(-r - 6, 0); ctx.lineTo(-r + 4, 0); ctx.moveTo(r - 4, 0); ctx.lineTo(r + 6, 0); ctx.moveTo(0, -r - 6); ctx.lineTo(0, -r + 4); ctx.moveTo(0, r - 4); ctx.lineTo(0, r + 6); ctx.stroke();
    ctx.rotate(-this.time * (lock ? 2 : 0.6)); ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, TAU); ctx.fill(); ctx.restore();
  }
  _drawMenuBackdrop(ctx) { const w = this.canvas.width, h = this.canvas.height; const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b2a3a'); g.addColorStop(1, '#0e1620'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; const off = (this.time * 18) % 48; ctx.beginPath(); for (let x = -48 + off; x < w; x += 48) { ctx.moveTo(x, 0); ctx.lineTo(x, h); } for (let y = -48 + off; y < h; y += 48) { ctx.moveTo(0, y); ctx.lineTo(w, y); } ctx.stroke(); }

  /* ------------------------------- HUD --------------------------------- */
  _updateHUD() {
    const p = this.player; const hpPct = p ? Util.clamp(p.hp / p.maxHp, 0, 1) : 0; const hpFill = document.getElementById('hp-fill');
    hpFill.style.width = (hpPct * 100) + '%'; hpFill.style.background = hpPct > 0.5 ? '#4fcf6a' : (hpPct > 0.25 ? '#e0c341' : '#e05050');
    document.getElementById('hp-text').textContent = p ? Math.max(0, Math.ceil(p.hp)) + ' / ' + p.maxHp : '0';
    document.getElementById('stat-lives').textContent = '❤ '.repeat(Math.max(0, this.lives)).trim() || '—';
    document.getElementById('stat-score').textContent = this.score.toLocaleString(); document.getElementById('stat-coins').textContent = this.coinCount;
    document.getElementById('stat-wave').textContent = this.wave; document.getElementById('stat-enemies').textContent = this.enemies.length + this.spawnQueue.length;
    if (p) {
      const w = WEAPONS[p.weapon]; const we = document.getElementById('weapon-name'); we.textContent = w.name; we.style.color = w.color; document.getElementById('weapon-ammo').textContent = w.infinite ? '∞' : (p.weapons[p.weapon] || 0);
      document.getElementById('ab-dash').style.width = Util.clamp(1 - p.dashCd / (1.5 * p.dashCdMult), 0, 1) * 100 + '%';
      document.getElementById('ab-shock').style.width = Util.clamp(1 - p.shockCd / 6, 0, 1) * 100 + '%';
      const ultEl = document.getElementById('ab-ult'); ultEl.style.width = (p.ultMeter * 100) + '%'; document.getElementById('ult-ready').classList.toggle('on', p.ultMeter >= 1);
    }
    const comboEl = document.getElementById('combo'); if (this.combo >= 2) { comboEl.style.opacity = '1'; comboEl.textContent = 'COMBO x' + this.combo; comboEl.style.color = this.combo >= 10 ? '#ff4d4d' : (this.combo >= 5 ? '#ff8c2b' : '#ffd34d'); } else comboEl.style.opacity = '0';
    const bb = document.getElementById('boss-bar'); if (this.boss && this.boss.alive) { bb.classList.remove('hidden'); document.getElementById('boss-fill').style.width = Util.clamp(this.boss.hp / this.boss.maxHp, 0, 1) * 100 + '%'; } else bb.classList.add('hidden');
    const fpsEl = document.getElementById('fps'); fpsEl.style.display = this.settings.fps ? 'block' : 'none'; if (this.settings.fps) fpsEl.textContent = Math.round(this.fps) + ' FPS';
    this._updateBuffs(); this._renderKillFeed(); this._drawMinimap();
  }
  _updateBuffs() {
    const el = document.getElementById('buffs'); const p = this.player; if (!p) { el.innerHTML = ''; return; } const b = [];
    if (p.shieldTime > 0) b.push(['SHIELD', '#4ec3e0', p.shieldTime]); if (p.rapidTime > 0) b.push(['RAPID', '#f0a93b', p.rapidTime]); if (p.spreadTime > 0) b.push(['SPREAD', '#c45bd6', p.spreadTime]);
    if (p.speedTime > 0) b.push(['SPEED', '#5bd6a8', p.speedTime]); if (p.damageTime > 0) b.push(['DAMAGE', '#e0563b', p.damageTime]); if (p.burn > 0) b.push(['BURNING', '#ff8c2b', p.burn]);
    el.innerHTML = b.map(([n, c, t]) => `<span class="buff" style="border-color:${c};color:${c}">${n} ${Math.ceil(t)}</span>`).join('');
  }
  _renderKillFeed() { document.getElementById('killfeed').innerHTML = this.killfeed.map((k) => `<div class="kill" style="color:${k.color};opacity:${Util.clamp(k.life, 0, 1)}">✖ ${k.text}</div>`).join(''); }
  _renderToasts() { document.getElementById('ach-toasts').innerHTML = this.toasts.map((t) => `<div class="ach-toast"><b>🏆 ${t.name}</b><span>${t.desc}</span></div>`).join(''); }
  _drawMinimap() {
    const mm = document.getElementById('minimap'); if (!mm) return; const ctx = mm.getContext('2d'), W = mm.width, H = mm.height, sx = W / this.world.w, sy = H / this.world.h;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = 'rgba(10,16,24,0.85)'; ctx.fillRect(0, 0, W, H);
    for (const hz of this.world.hazards) { ctx.fillStyle = hz.dmg ? 'rgba(255,120,40,0.5)' : 'rgba(80,150,210,0.5)'; ctx.beginPath(); ctx.arc(hz.x * sx, hz.y * sy, hz.r * sx, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(160,160,160,0.55)'; for (const o of this.obstacles) ctx.fillRect(o.x * sx, o.y * sy, Math.max(1, o.w * sx), Math.max(1, o.h * sy));
    for (const pu of this.powerups) { ctx.fillStyle = POWERUP_TYPES[pu.type].color; ctx.fillRect(pu.x * sx - 1, pu.y * sy - 1, 3, 3); }
    ctx.fillStyle = '#ffcf3a'; for (const c of this.coins) ctx.fillRect(c.x * sx - 0.5, c.y * sy - 0.5, 2, 2);
    for (const e of this.enemies) { ctx.fillStyle = e.boss ? '#c45bd6' : (e.elite ? '#ffd34d' : '#ff5a4d'); const s = e.boss ? 6 : (e.elite ? 4 : 3); ctx.fillRect(e.x * sx - s / 2, e.y * sy - s / 2, s, s); }
    if (this.player && this.player.alive) { ctx.fillStyle = '#5fa8ff'; ctx.beginPath(); ctx.arc(this.player.x * sx, this.player.y * sy, 3, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(this.camera.x * sx, this.camera.y * sy, this.camera.vw * sx, this.camera.vh * sy);
  }
  _showBanner(text, color) { const b = document.getElementById('wave-banner'); b.textContent = text; b.style.color = color || '#fff'; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }

  /* ----------------------------- UI wiring ----------------------------- */
  _bindUI() {
    document.querySelectorAll('[data-diff]').forEach((b) => b.addEventListener('click', () => { this.difficulty = b.dataset.diff; this._updateMenuUI(); }));
    document.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => { this.theme = b.dataset.theme; this._updateMenuUI(); }));
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
    const open = () => { this._syncSettings(); this._showOverlay('settings'); };
    document.getElementById('btn-settings').addEventListener('click', open); document.getElementById('btn-settings-pause').addEventListener('click', open);
    document.getElementById('btn-settings-back').addEventListener('click', () => { if (this.state === STATE.PAUSED) this._showOverlay('pause'); else this._showOverlay('menu'); });
    document.getElementById('sfx-slider').addEventListener('input', (e) => this.audio.setSfxVolume(+e.target.value / 100));
    document.getElementById('music-slider').addEventListener('input', (e) => this.audio.setMusicVolume(+e.target.value / 100));
    const tog = (id, key) => document.getElementById(id).addEventListener('change', (e) => { this.settings[key] = e.target.checked; Storage.set(key, this.settings[key]); });
    tog('shake-toggle', 'shake'); tog('weather-toggle', 'weather'); tog('lighting-toggle', 'lighting'); tog('flash-toggle', 'flash'); tog('fps-toggle', 'fps');
    const muteBtns = document.querySelectorAll('.btn-mute'); const sync = () => muteBtns.forEach((b) => b.textContent = this.audio.muted ? '🔇 Muted' : '🔊 Sound'); muteBtns.forEach((b) => b.addEventListener('click', () => { this.audio.toggleMute(); sync(); })); sync();
  }
  _syncSettings() { document.getElementById('sfx-slider').value = Math.round(this.audio.sfxVolume * 100); document.getElementById('music-slider').value = Math.round(this.audio.musicVolume * 100); document.getElementById('shake-toggle').checked = this.settings.shake; document.getElementById('weather-toggle').checked = this.settings.weather; document.getElementById('lighting-toggle').checked = this.settings.lighting; document.getElementById('flash-toggle').checked = this.settings.flash; document.getElementById('fps-toggle').checked = this.settings.fps; }
  _toMenu() { this.state = STATE.MENU; this._showOverlay('menu'); this._updateMenuUI(); this.audio.startMusic('Sounds/BGM.mp3'); }
  _updateMenuUI() { document.querySelectorAll('[data-diff]').forEach((b) => b.classList.toggle('active', b.dataset.diff === this.difficulty)); document.querySelectorAll('[data-theme]').forEach((b) => b.classList.toggle('active', b.dataset.theme === this.theme)); document.getElementById('menu-high').textContent = this.highScore.toLocaleString(); document.getElementById('menu-bestwave').textContent = this.bestWave; document.getElementById('menu-ach').textContent = this.achievements.size + '/' + ACHIEVEMENTS.length; }
  _showOverlay(name) { this._hideOverlays(); const el = document.getElementById('overlay-' + name); if (el) el.classList.remove('hidden'); this._syncHud(); }
  _hideOverlays() { document.querySelectorAll('.overlay').forEach((o) => o.classList.add('hidden')); this._syncHud(); }
  _syncHud() { const playing = this.state === STATE.PLAYING || this.state === STATE.PAUSED || this.state === STATE.UPGRADE; document.getElementById('hud').classList.toggle('hidden', !playing); if (this.mobile) this.mobile.show(this.state === STATE.PLAYING); }
}

/* ------------------------- Mobile touch controls ------------------------ */
class MobileControls {
  constructor(game) {
    this.game = game; this.input = game.input;
    this.enabled = (typeof window !== 'undefined' && 'ontouchstart' in window) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
    this.root = document.getElementById('mobile-controls');
    this.moveBase = document.getElementById('move-stick'); this.moveKnob = document.getElementById('move-knob');
    this.aimBase = document.getElementById('aim-stick'); this.aimKnob = document.getElementById('aim-knob');
    this.moveId = null; this.aimId = null; this._mo = null; this._ao = null;
    if (this.enabled) { document.body.classList.add('is-touch'); this._bind(); }
  }
  show(v) { if (this.enabled && this.root) this.root.classList.toggle('hidden', !v); }
  _bind() {
    const stage = document.getElementById('stage');
    stage.addEventListener('touchstart', (e) => this._start(e), { passive: false });
    stage.addEventListener('touchmove', (e) => this._move(e), { passive: false });
    stage.addEventListener('touchend', (e) => this._end(e), { passive: false });
    stage.addEventListener('touchcancel', (e) => this._end(e), { passive: false });
    const btn = (id, down) => { const el = document.getElementById(id); if (!el) return; el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); down(); el.classList.add('pressed'); }, { passive: false }); el.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('pressed'); }, { passive: false }); };
    btn('btn-dash', () => { this.input.pressed['ShiftLeft'] = true; });
    btn('btn-shock', () => { this.input.pressed['KeyE'] = true; });
    btn('btn-ult', () => { this.input.pressed['KeyF'] = true; });
    btn('btn-weapon-m', () => { if (this.game.player) this.game.player.cycleWeapon(1); });
    btn('btn-pause-m', () => { if (this.game.state === 'playing') this.game.pause(); else if (this.game.state === 'paused') this.game.resume(); });
  }
  _r() { return document.getElementById('stage').getBoundingClientRect(); }
  // Fixed, always-visible thumbsticks anchored in the bottom corners. A touch
  // in the left half drives the move stick; the right half drives aim & fire.
  _start(e) {
    if (this.game.state !== 'playing') return;
    const r = this._r();
    for (const t of e.changedTouches) {
      const lx = t.clientX - r.left;
      if (lx < r.width * 0.5 && this.moveId === null) { this.moveId = t.identifier; this._apply(t, 'move'); }
      else if (lx >= r.width * 0.5 && this.aimId === null) { this.aimId = t.identifier; this.input.aimActive = true; this.input.firing = true; this._apply(t, 'aim'); }
    }
    if (this.moveId !== null || this.aimId !== null) e.preventDefault();
  }
  _move(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.moveId) this._apply(t, 'move');
      else if (t.identifier === this.aimId) this._apply(t, 'aim');
    }
    if (this.moveId !== null || this.aimId !== null) e.preventDefault();
  }
  _end(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.moveId) { this.moveId = null; this.input.move.x = 0; this.input.move.y = 0; this._center(this.moveKnob); }
      else if (t.identifier === this.aimId) { this.aimId = null; this.input.aimActive = false; this.input.firing = false; this._center(this.aimKnob); }
    }
  }
  _apply(t, which) {
    const base = which === 'move' ? this.moveBase : this.aimBase, knob = which === 'move' ? this.moveKnob : this.aimKnob;
    if (!base) return; const r = base.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width / 2 - 6;
    let dx = t.clientX - cx, dy = t.clientY - cy; const d = Math.hypot(dx, dy) || 0.0001; const ux = dx / d, uy = dy / d; const mag = Math.min(d / max, 1);
    if (which === 'move') { this.input.move.x = ux * mag; this.input.move.y = uy * mag; }
    else if (mag > 0.2) { this.input.aimVec.x = ux; this.input.aimVec.y = uy; }
    const kd = Math.min(d, max); if (knob) knob.style.transform = `translate(calc(-50% + ${ux * kd}px), calc(-50% + ${uy * kd}px))`;
  }
  _center(knob) { if (knob) knob.style.transform = 'translate(-50%, -50%)'; }
}

window.addEventListener('load', () => { const canvas = document.getElementById('game'); const game = new Game(canvas); window.GAME = game; game.start(); });
