# AGENTS.md

Guidance for AI coding agents (and humans) working in this repo.

## Project

Ashfall: Embers of the Clans, a browser roguelite. It's an npm-workspaces monorepo:

- `packages/engine`: pure TypeScript game rules. **No DOM, React, Node APIs, or network in here.**
- `apps/web`: React 19 + Vite 8 + Tailwind v4 UI that dispatches actions to the engine.

## Rules

1. **Engine purity.** Every random roll goes through the seeded `Rng` (`packages/engine/src/rng.ts`), whose state is stored on `RunState.rng`. Never use `Math.random()` for game outcomes; the only exception is `randomSeed()`, which picks a seed.
2. **State changes go through actions.** Add new player choices as a new `Action` variant in `types.ts`, handle it in `run.ts` `apply()`, and add it to `legalActions()`.
3. **Run state must stay JSON-serializable.** It is saved to localStorage as-is. No classes, functions, Maps, or Sets on `RunState` or `Profile`.
4. **Save format.** If you change the shape of `RunState` or `Profile` incompatibly, bump `version` and handle old saves in `apps/web/src/store.ts` (`loadState`).
5. **Tuning lives in `packages/engine/src/data/`.** Keep numbers there, not in the UI.
6. **Original setting.** Names and lore are our own: Ashborn Clans vs. the Gilded Concord. Do not use names, characters, or items from existing games or franchises.

## Before you push

```bash
npm run check        # lint + typecheck + unit tests + build
npm run test:e2e     # Playwright (needs a Chromium; set PW_CHROMIUM_PATH if preinstalled)
```

When you change combat numbers, run a few hundred bot runs (see `autoplay` in `packages/engine/test/engine.test.ts`) and check win rates per class.

## Branches

`main` is the web game. The original Python lab game and its forks are archived on `deprecated/*` branches. Do not merge them back.
