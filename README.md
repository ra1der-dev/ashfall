# Ashfall: Embers of the Clans

A turn-based roguelite dungeon crawler for the browser.

The Gilded Concord drove the Ashborn Clans into the deep places. Pick a champion, fight through three procedurally generated floors, and break the High Marshal. Each run earns **embers**, win or lose. Spend them at the War Camp on permanent upgrades and new classes.

## How it plays

- **Runs:** three floors. Each floor is a branching map of rooms ending in a boss. You choose your path.
- **Rooms:** ⚔️ fights, 💀 elites, 🪙 merchants, 🔥 campfires (heal or train), 🎁 treasure, ✨ shrines (pick a permanent boon), and a 👑 boss.
- **Combat:** multi-round and d20-based. You see what the enemy **intends** to do next, then choose Attack, Defend, one of two class abilities (with cooldowns), drink a Potion, or Flee. Statuses: burn, bleed, stun, shield, evade. Natural 20s crit. Bosses enrage at low HP.
- **Classes:**
  - **Brute** (free): gets stronger as it loses HP.
  - **Ashcaller** (20 embers): fire and healing.
  - **Skirmisher** (30 embers): crits and dodging.
- **Loot:** five tiers: Scrap, Forged, Tempered, Runed, Mythic. Higher tiers roll affixes like _of Embers_ (crits burn) or _Keen_ (+crit range). Mythics are named, unique items.
- **War Camp:** six permanent upgrades, run history, and a **Daily run** that gives everyone the same seeded dungeon for the day.

Progress saves automatically in your browser (localStorage).

## Quick start

Requires Node 20+ (see `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command                                                 | What it does                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                                           | Vite dev server with hot reload                                     |
| `npm test`                                              | Engine unit tests (Vitest), including 120 full bot-played runs      |
| `npm run test:e2e`                                      | Playwright smoke test (desktop + mobile) against a production build |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint, `tsc -b`, Prettier                                          |
| `npm run check`                                         | Lint + typecheck + test + build, the same checks CI runs            |
| `npm run build`                                         | Static build into `apps/web/dist`                                   |

For Playwright, run `npx playwright install chromium` once, or set `PW_CHROMIUM_PATH` to a Chromium you already have.

## Architecture

```
packages/engine   Pure TypeScript game rules: no DOM, no React, no network
  src/data/       Monsters, classes, items, boons, camp upgrades (edit these to tune the game)
  src/combat.ts   Turn resolution, statuses, enemy intents
  src/run.ts      Run state machine: newRun(), applyAction(), legalActions()
  src/map.ts      Floor generation
  src/camp.ts     Meta-progression (embers, unlocks, upgrades)
apps/web          React 19 + Vite + Tailwind v4 UI
  src/store.ts    Reducer wrapping the engine, plus localStorage persistence
```

The key design rule: **the engine is a pure function `(state, action) → newState`**, driven by a seeded RNG whose state lives inside the run. That means:

- **Deterministic:** the same seed plus the same actions always gives the same result. Bugs reproduce exactly, and daily runs are fair.
- **Testable:** the tests have a bot play hundreds of complete runs.
- **Server-ready:** a future API can import the same package and replay a submitted run to verify a leaderboard score.

The UI never changes game state directly. It dispatches actions. Illegal actions are ignored (`applyAction`) or throw (`applyActionStrict`, used in tests).

## CI/CD

- `.github/workflows/ci.yml`: on every PR and push to `main`, runs format check, lint, typecheck, unit tests, build, then the Playwright smoke test.
- `.github/workflows/deploy.yml`: on push to `main`, builds and deploys to **GitHub Pages**. One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

## Roadmap

- [ ] **Pixel-art portraits and sprites** (planned as a fork or follow-up project on top of this engine)
- [ ] Sound and juicier hit feedback (screen shake, floating damage numbers)
- [ ] More content: monsters, elites, a 4th class, more mythics and boons, events with choices
- [ ] Crafting: break junk down into materials at camp
- [ ] Phase 2 server (Node + Hono/Fastify + SQLite/Drizzle): daily-run leaderboard with server-side replay verification, cloud saves
- [ ] Achievements and run history

## History

This project started as a Python text adventure for a class lab. That version is preserved on the `deprecated/python-main` branch. Other old branches: `deprecated/jays-fork`, `deprecated/ascii-fight`.
