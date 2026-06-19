# 🛡️ TanksALot

A fast, polished **top-down tank survival roguelite** for the browser. Drive a
tank, aim with the mouse, dash through danger, draft a new perk every wave, and
fight through escalating enemy armor, gun emplacements, and **phased bosses**.
Build an arsenal, chain combo kills, and climb the high-score board.

A complete, ground-up rework of the original TCSS-491 *"Tank's Alot"* student
prototype — rebuilt into a deep, bug-free, fully playable game that reuses the
project's original art and audio.

**▶ Play online:** https://romankucheryavyy.github.io/TanksALot/

---

## ▶️ Run it

No build step, no dependencies — it runs straight from the file system.

```
# easiest: double-click index.html, or serve it:
python3 -m http.server 8000   # then open http://localhost:8000
```

The game degrades gracefully: if any art/audio file is missing it falls back to
procedural visuals and synthesized sound, so it always runs.

### Controls

| Action | Keys |
| --- | --- |
| Move | `W` `A` `S` `D` / Arrows |
| Aim | Mouse |
| Fire | Left-click / `Space` |
| **Dash** | `Shift` / Right-click |
| Switch weapon | `1`–`5` / Mouse wheel / `Q` |
| Pause | `Esc` / `P` |

### How to play

- **Survive 20 waves.** Each wave is tougher; clear it for a bonus, a heal, and
  a **perk draft** — pick 1 of 3 upgrades to build your tank (reroll with coins).
- **Every 5th wave is a BOSS** with multiple attack phases and a health bar.
  Beat the **wave-20 final boss** to win, then continue in **endless mode**.
- **Build an arsenal:** Cannon (∞), Machine Gun, Shotgun, Rockets, Laser — found
  in weapon crates. Each has its own feel, ammo, and projectile type.
- **Six enemy archetypes:** grunts, fast scouts, tanky heavies, long-range
  artillery, **kamikaze bombers**, and **frontal-shield** tanks (flank them!),
  plus stationary turrets.
- **Use the battlefield:** destructible crates/barrels, exploding barrels, and
  hazards (water slows, **lava burns**, ice). Three themes — Forest, Desert,
  Arctic — each with its own obstacles, hazard, and weather.
- **Grab power-ups & coins**, chain kills for a **combo multiplier** (×4), and
  unlock **9 achievements**.

---

## 🧱 Project structure

```
index.html        Single-page shell: canvas + HUD + all menus
css/style.css     Military-HUD theme, responsive letterboxed layout
js/engine.js      Math/easing, input, asset loader, WebAudio mixer, camera
js/entities.js    Weapons, dash, projectiles/FX, pickups, tanks (player,
                  6 enemy types, phased boss, turret)
js/world.js       Themes, obstacles, hazards, weather, perks, wave composition
js/game.js        States, loop (slow-mo), waves, perk drafts, coins, bosses,
                  kill feed, achievements, settings, HUD + minimap
img/ Sounds/ TileSet/   Original art & audio (reused)
legacy/           The original prototype source, preserved for reference
.github/workflows/pages.yml   Auto-deploys the site to GitHub Pages
```

Plain ES6 + Canvas 2D + WebAudio. No frameworks, no bundler.

---

## ✨ Highlights

This rework replaced ~30 tangled prototype files (half commented-out dead code,
debug-log spam, broken coordinate math, a non-functional menu) with four clean
modules and **200+ improvements** across two passes. The headline additions:

**Combat & progression**
- 5-weapon arsenal with distinct fire patterns, ammo, recoil, and sounds.
- **Dash** ability with i-frames, afterimages, and cooldown.
- Roguelite **perk draft** (18 perks) every wave — damage, fire rate, pierce,
  ricochet, incendiary, twin barrel, vampirism, crits, thorns, extra lives…
- **Crits, ricochet, piercing, splash rockets, burning** status.
- **Coins** currency (rerolls), score, and a **combo multiplier**.

**Enemies & bosses**
- Six AI archetypes with unique behavior (scout/heavy/artillery/bomber/shielded
  /grunt) + turrets, with detection, range-keeping, strafing, separation, and
  line-of-sight firing.
- A **phased boss** (spread shots → radial bursts → summons) with a boss bar,
  enrage banners, and a roar.

**World & feel**
- Three themes (Forest/Desert/Arctic) with **hazards** (slow/burn zones) and
  **weather** (rain/sand/snow).
- Loading screen, **slow-mo** on big kills, **damage vignette**, low-HP pulse,
  screen shake, scorch decals, shell casings, smoke from damaged tanks, dynamic
  music intensity, camera look-ahead + zoom.

**UI/UX**
- Full **settings** (SFX/music sliders, shake & weather toggles, mute), a live
  HUD (HP, lives, weapon+ammo, dash meter, coins, buffs, boss bar, kill feed),
  minimap with hazards, **9 achievements** with toasts, and polished menus.

**Robustness**
- Never breaks on a missing asset; per-frame pruning + caps for stable perf.
- Verified by a **headless test harness** that runs the real game loop for
  1,400+ frames plus targeted checks for weapons, dash, perks, coins, hazards,
  boss phases, the upgrade flow, victory, game-over, and respawn — green with
  assets present *and* absent (24/24 runs).

The full original prototype is preserved under [`legacy/`](legacy/).

---

## 🙌 Credits

- **Original "Tank's Alot" prototype:** the TCSS-491 *Computational Worlds* team
  — original art, audio, and concept (in [`legacy/`](legacy/)).
- **Rework:** clean rebuild into a complete, playable roguelite.
