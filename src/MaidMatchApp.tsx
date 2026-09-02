import { useEffect, useReducer, useRef, useState } from "react";
import type { Action, AppState } from "./store";
import { makeSeedState, reducer } from "./store";
import { canAccess } from "./lib/roles";
import type { NavKey } from "./lib/roles";
import type { Platform } from "./lib/stages";
import { Shell } from "./components/Shell";
import { EmptyState } from "./components/primitives";
import Dashboard from "./screens/Dashboard";
import TeamWork from "./screens/TeamWork";
import Reception from "./screens/Reception";
import Retraction from "./screens/Retraction";
import MediaProduction from "./screens/MediaProduction";
import Publishing from "./screens/Publishing";
import UsersScreen from "./screens/UsersScreen";
import RolesScreen from "./screens/RolesScreen";
import SystemConfig from "./screens/SystemConfig";

const STAGE_ROUTE_GATE: Record<string, NavKey> = {
  PendingRetraction: "retraction",
  MovedToOffboard: "retraction",
  RetractedToCC: "retraction",
  RetractedToMaidMatch: "retraction",
  PendingShooting: "media",
  PendingEditing: "media",
  ProductionDone: "media",
  AvailablePendingPublishing: "publishing",
  AvailablePublished: "publishing",
  UnderTrial: "publishing",
  Hired: "publishing",
  Cancelled: "publishing",
};

const PUBLISH_SCHEDULE: { platform: Platform; delay: number }[] = [
  { platform: "maidmatch", delay: 3000 },
  { platform: "peekaboo", delay: 6000 },
  { platform: "yaya", delay: 9000 },
];

function renderScreen(route: string, state: AppState, dispatch: (a: Action) => void) {
  switch (route) {
    case "teamwork":
      return <TeamWork state={state} dispatch={dispatch} route={route} />;
    case "reception":
      return <Reception state={state} dispatch={dispatch} route={route} />;
    case "PendingRetraction":
    case "MovedToOffboard":
    case "RetractedToCC":
    case "RetractedToMaidMatch":
      return <Retraction state={state} dispatch={dispatch} route={route} />;
    case "PendingShooting":
    case "PendingEditing":
    case "ProductionDone":
      return <MediaProduction state={state} dispatch={dispatch} route={route} />;
    case "AvailablePendingPublishing":
    case "AvailablePublished":
    case "UnderTrial":
    case "Hired":
    case "Cancelled":
      return <Publishing state={state} dispatch={dispatch} route={route} />;
    case "users":
      return <UsersScreen state={state} dispatch={dispatch} route={route} />;
    case "roles":
      return <RolesScreen state={state} dispatch={dispatch} route={route} />;
    case "config":
      return <SystemConfig state={state} dispatch={dispatch} route={route} />;
    case "dashboard":
    default:
      return <Dashboard state={state} dispatch={dispatch} route={route} />;
  }
}

export default function MaidMatchApp() {
  const [state, dispatch] = useReducer(reducer, undefined, makeSeedState);
  const [route, setRoute] = useState<string>("dashboard");

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const id = setInterval(() => {
      const current = stateRef.current;
      const now = Date.now();
      for (const task of current.tasks) {
        if (task.type !== "publishing" || task.status !== "open") continue;
        const elapsed = now - task.createdAt;
        const publishState = task.metadata?.publishState;
        for (const { platform, delay } of PUBLISH_SCHEDULE) {
          if (elapsed >= delay && !publishState?.[platform]) {
            dispatch({ type: "FLAG_PLATFORM", housemaidId: task.housemaidId, platform, now });
          }
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const gateKey = STAGE_ROUTE_GATE[route];
  const allowed = !gateKey || canAccess(state.currentRole, gateKey);

  return (
    <Shell state={state} route={route} onNavigate={setRoute} onDispatch={dispatch}>
      {allowed ? (
        renderScreen(route, state, dispatch)
      ) : (
        <EmptyState title="You don't have access" hint="Your current role cannot view this screen." />
      )}
    </Shell>
  );
}
