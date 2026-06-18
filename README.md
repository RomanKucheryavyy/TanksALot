# 🛡️ TanksALot

A fast, polished **top-down tank survival shooter** for the browser. Drive a
tank, aim with the mouse, and survive escalating waves of enemy armor, gun
emplacements, and bosses. Grab power-ups, chain combo kills, and climb the
high-score board.

This is a **complete, ground-up rework** of the original TCSS-491
*"Tank's Alot"* student prototype — rebuilt into a clean, bug-free, fully
playable game while reusing the project's original art and audio.

---

## ▶️ Play

No build step, no dependencies. Just open the game:

```
# easiest: double-click index.html, or
python3 -m http.server 8000      # then visit http://localhost:8000
```

> Running from a local web server is recommended so the ground textures,
> explosion sprites, and music load. The game is built to run fine even if
> those assets are missing — it falls back to procedural visuals and
> synthesized sound.

### Controls

| Action | Keys |
| --- | --- |
| Move | `W` `A` `S` `D` or Arrow keys |
| Aim | Mouse |
| Fire | Left-click or `Space` |
| Pause | `Esc` or `P` |

Basic touch controls (aim + fire toward your finger) work on mobile too.

### How to play

- **Survive waves.** Each wave throws more (and tougher) enemies at you. Clear
  them all to advance and earn a bonus + a partial heal.
- **Every 5th wave is a boss wave.** Bosses are big, tanky, and fire spread
  shots. Beat the **wave-20 final boss** to win — then keep going in endless mode.
- **Chain kills** within a few seconds to build a **combo multiplier** (up to ×4)
  for huge score.
- **Grab power-ups:** Heal, Shield, Rapid-fire, Spread-shot, Speed, and
  Damage-boost. They also drop from destroyed crates/barrels and enemies.
- **Use the terrain.** Obstacles block shots; crates and barrels are
  destructible — and barrels explode, damaging anything nearby.
- Pick **Easy / Normal / Hard / Insane** and a **Forest** or **Desert**
  battlefield from the menu.

---

## 🧱 Project structure

```
index.html        Single-page shell: canvas + HUD + menus
css/style.css     Military-HUD theme, responsive letterboxed layout
js/engine.js      Math utils, input, asset loader, WebAudio, storage, camera
js/entities.js    Tanks (player/enemy/turret/boss), bullets, particles,
                  explosions, power-ups, obstacles, floating text
js/world.js       Tiled ground, obstacle generation, themes, difficulty table
js/game.js        Game states, main loop, waves, scoring/combos, lives,
                  HUD + minimap, menu wiring
img/ Sounds/ TileSet/   Original art & audio (reused)
legacy/           The original prototype source, preserved for reference
```

The game is plain ES6 + Canvas 2D with **no external libraries** and runs
straight from the file system.

---

## ✨ What changed — 100+ improvements over the original

The original was an unfinished class prototype: ~30 source files where roughly
half of every file was commented-out duplicate code, debug `console.log` spam
everywhere, four hand-copied level blocks, broken mouse/camera math, a
non-functional map-selection screen, and leaked global state. Here's what the
rework delivers.

### Architecture & code quality
1. Full rewrite into **4 focused modules** replacing ~30 tangled files.
2. Removed **all** duplicated commented-out code (every old file was ~50% dead code).
3. Removed all debug `console.log` spam.
4. Single source of truth for tuning (`CONFIG`, `DIFFICULTIES`, `THEMES`, `PALETTE`).
5. Proper **state machine** (Menu / Playing / Paused / Game Over / Victory).
6. Replaced leaked globals (`MapSelection`, `MapType`, stray `W/A/S/D`) with encapsulated state.
7. ES6 class inheritance (`Tank` → Player / Enemy / Turret) instead of copy-pasted prototypes.
8. `'use strict'` throughout.
9. **Delta-time** loop that is frame-rate independent and clamps tab-switch spikes.
10. A single `requestAnimationFrame` loop (the original had duplicate/commented variants).
11. Data-driven wave/level generation instead of four copy-pasted setup blocks.
12. Deleted dead/unused systems (robot, old enemy, agent, barrell, bounding-box, etc.).
13. A **headless test harness** with 25 automated checks (runs the real game loop).

### Rendering & visuals
14. Crisp **procedural, team-colored tanks** — always correctly oriented at any zoom.
15. Gradient hull shading + highlights.
16. **Animated treads** with moving lugs that respond to motion.
17. **Independent turret rotation** from the hull (true twin-stick aiming).
18. Barrel **recoil** animation on each shot.
19. Tank drop shadows.
20. White **damage flash** on hit.
21. Floating **health bars** with green/yellow/red states.
22. **Muzzle-flash** particles.
23. Bullet **trails** and glowing projectiles.
24. **Explosion sprite-sheet** animation (reusing original art) + particle burst, with procedural fallback.
25. **Screen shake** scaled to the event (firing, explosions, deaths).
26. Smooth, frame-rate-independent **camera** that follows the player and clamps to the world.
27. **Off-screen culling** of draws for performance.
28. **Tread marks** left on the ground that fade over time.
29. A capped **particle system** (smoke, sparks, debris).
30. Floating **score / combo** popups.
31. Custom **crosshair** that hides the OS cursor.
32. **Tiled ground** from the original grass/sand art (with a procedural checker fallback).
33. Border walls + a faint reference grid.
34. **Animated menu backdrop** (drifting grid + gradient).
35. **Shield bubble** effect while shielded.
36. Hand-drawn **power-up icons** with glow, bobbing, and blink-before-expiry.
37. Visually distinct **boss** tanks (larger, purple palette).
38. **Turret emplacements** with sandbag ring + concrete base.
39. Dim/vignette overlay while paused.

### Gameplay systems
40. Smooth WASD movement; hull turns toward travel direction.
41. **Fixed** mouse→world aiming (accounts for camera *and* CSS canvas scaling).
42. Fire with left-click **or** Space.
43. Fire-rate cooldown + bullet lifetime/range.
44. **Team-based** collision (no friendly fire).
45. Circle-vs-AABB collision resolution against obstacles.
46. Tank-vs-tank **separation** (no overlapping/stacking).
47. World-bounds clamping + knockback on hit.
48. **Wave-based survival** with escalating enemy count and toughness.
49. **Trickle spawning** so enemies arrive over time (pacing + performance).
50. **Boss wave every 5 waves**; multi-shot boss attack.
51. **Wave-20 final boss → Victory**, then optional **endless mode**.
52. **4 difficulties** scaling HP, damage, fire-rate, speed, count, and lives.
53. **Lives** with respawn + brief spawn invulnerability.
54. Wave-clear **bonus** + partial heal between waves.
55. **Score** + **combo multiplier** (×4 max) with a decay timer.
56. **High score** and **best wave** saved to `localStorage`.
57. **6 power-up types** (Heal, Shield, Rapid, Spread, Speed, Damage).
58. **Timed buffs** with on-screen countdown badges.
59. Power-ups **magnet** toward a nearby player and expire to keep the field clean.
60. **Smart drops** — biased toward Heal when you're low.
61. Power-ups drop from crates, barrels, and enemy kills.
62. **Destructible** crates/barrels/bushes with HP bars.
63. **Exploding barrels** deal area damage.
64. **Two themes** (Forest / Desert) with different obstacle mixes.
65. **Procedurally generated**, non-overlapping obstacle layouts; guaranteed-clear spawn.

### Enemy AI
66. Detection range + aggro state.
67. Maintains a **preferred engagement distance** (advances / retreats).
68. **Strafing** that periodically reverses direction.
69. **Separation steering** so packs don't clump.
70. Turret tracks the target with a **turn-rate limit** (no instant snap).
71. Built-in **aiming inaccuracy** for fairness.
72. Fires only when **aligned, in range, and with line-of-sight** (obstacle raycast).
73. **Idle wander** when the player isn't detected or is down.
74. Stationary **turret** enemies that track and fire.

### UI / UX
75. Polished **main menu** with difficulty + battlefield selection.
76. **Pause** menu (Resume / Restart / Quit).
77. **Game-over** screen: score, wave reached, high score, Retry / Menu.
78. **Victory** screen with endless continue.
79. Live **HUD**: HP bar + value, lives, score, wave, enemies remaining.
80. **Minimap** with obstacles, enemies, boss, power-ups, player, and viewport.
81. Active-**buff badges** with countdowns.
82. Animated **banners** for wave start / boss / life lost / wave cleared.
83. **Combo** indicator.
84. **Responsive** layout: canvas letterboxes to any screen; mobile meta tag.
85. Arrow-key support alongside WASD; basic **touch** controls.
86. Keys **released on window blur** (no stuck tank when you alt-tab).
87. Context menu disabled on the canvas.

### Audio
88. **WebAudio-synthesized SFX** (shoot, enemy shoot, explosion, hit, pickup, wave, game-over, victory) — low latency, no file dependency.
89. Distinct **player vs enemy** fire sounds.
90. **Background music** wired up with graceful failure + sensible volume.
91. Audio context **resumed on first gesture** (autoplay-policy compliant).
92. **Mute** toggle, persisted across sessions.

### Robustness & correctness
93. Game **never blocks or breaks on a missing asset** — every draw/sound path has a fallback.
94. Exception-safe **storage** wrapper (works in private-browsing mode).
95. Per-frame **pruning** of bullets/particles/tread-marks (no leaks/unbounded growth).
96. **Caps** on particles and tread marks for stable performance.
97. Removed the fragile `?level=N` **query-string** level passing.
98. Removed the broken **map-selection** click handler.
99. Fixed enemy/player **coordinate and collision** math.
100. Deterministic, **null-safe** update order verified by automated tests.
101. Edge cases covered: pause/resume, boss waves, death→respawn, game-over, victory — all test-verified.

---

## 🛠️ Tech notes

- **Stack:** vanilla ES6 + HTML5 Canvas 2D + WebAudio. No frameworks, no build.
- **Rendering:** ~720p internal resolution, letterboxed responsively to the viewport.
- **Testing:** a headless Node harness (`stubs the browser`) loads the real game
  scripts and drives 1,200+ simulated frames plus targeted edge cases. It runs
  green both with assets present and with all assets missing.

## 🙌 Credits

- **Original "Tank's Alot" prototype:** the TCSS-491 *Computational Worlds* team
  — original art, audio, and concept (preserved in [`legacy/`](legacy/)).
- **Rework:** clean rebuild into a complete, playable game.
