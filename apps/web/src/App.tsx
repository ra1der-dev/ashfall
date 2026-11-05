import type { Action } from "@ashfall/engine";
import { useCallback, useEffect, useReducer, useState } from "react";
import { CampScreen } from "./screens/CampScreen";
import { RunScreen } from "./screens/RunScreen";
import { loadState, reducer, saveState } from "./store";

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  // A saved run resumes straight into the dungeon; the camp is one click away.
  const [inRun, setInRun] = useState(state.run !== null);

  useEffect(() => saveState(state), [state]);

  const act = useCallback((action: Action) => dispatch({ type: "game", action }), []);

  if (state.run && inRun) {
    return (
      <RunScreen
        run={state.run}
        act={act}
        onCamp={() => {
          dispatch({ type: "returnToCamp" });
          setInRun(false);
        }}
      />
    );
  }

  return (
    <CampScreen
      profile={state.profile}
      run={state.run}
      dispatch={(action) => {
        dispatch(action);
        if (action.type === "startRun") setInRun(true);
      }}
      onResume={() => setInRun(true)}
    />
  );
}
