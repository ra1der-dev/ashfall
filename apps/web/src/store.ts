import {
  applyAction,
  buyUpgrade,
  isRunOver,
  newProfile,
  newRun,
  settleRun,
  unlockClass,
  type Action,
  type ClassId,
  type NewRunOptions,
  type Profile,
  type RunState,
} from "@ashfall/engine";

export interface AppState {
  profile: Profile;
  run: RunState | null;
}

export type AppAction =
  | { type: "game"; action: Action }
  | { type: "startRun"; options: NewRunOptions }
  | { type: "returnToCamp" }
  | { type: "buyUpgrade"; id: string }
  | { type: "unlockClass"; classId: ClassId }
  | { type: "resetProfile" };

const STORAGE_KEY = "ashfall:save:v1";

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed?.profile?.version === 1) {
        const run = parsed.run?.version === 1 ? parsed.run : null;
        return { profile: parsed.profile, run };
      }
    }
  } catch {
    // Storage blocked or save damaged: start fresh rather than crash.
  }
  return { profile: newProfile(), run: null };
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or quota: the game still works, it just won't persist.
  }
}

function finish(run: RunState): RunState {
  return isRunOver(run) ? run : applyAction(run, { type: "abandon" });
}

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "game":
      if (!state.run) return state;
      return { ...state, run: applyAction(state.run, action.action) };
    case "startRun": {
      // Starting over abandons any run in progress, but its embers are still banked.
      const profile = state.run ? settleRun(state.profile, finish(state.run)) : state.profile;
      return { profile, run: newRun(profile, action.options) };
    }
    case "returnToCamp":
      if (!state.run) return state;
      // A finished run banks its embers. Leaving mid-run counts as abandoning it.
      return { profile: settleRun(state.profile, finish(state.run)), run: null };
    case "buyUpgrade":
      return { ...state, profile: buyUpgrade(state.profile, action.id) };
    case "unlockClass":
      return { ...state, profile: unlockClass(state.profile, action.classId) };
    case "resetProfile":
      return { profile: newProfile(), run: null };
  }
}
