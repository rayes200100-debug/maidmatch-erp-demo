import { useEffect, useReducer, useState } from "react";
import type { Action, AppState } from "./store";
import { makeSeedState, reducer, maidById } from "./store";
import { canAccess } from "./lib/roles";
import type { NavKey } from "./lib/roles";
import type { TaskType } from "./lib/stages";
import { fetchCcLiveInDueToday } from "./lib/ccLiveIn";
import { Shell } from "./components/Shell";
import { EmptyState } from "./components/primitives";
import { TaskWorkspace } from "./components/TaskWorkspace";
import Dashboard from "./screens/Dashboard";
import TeamWork from "./screens/TeamWork";
import Reception from "./screens/Reception";
import Directory from "./screens/Directory";
import Retraction from "./screens/Retraction";
import MediaProduction from "./screens/MediaProduction";
import Publishing from "./screens/Publishing";
import UsersScreen from "./screens/UsersScreen";
import SystemConfig from "./screens/SystemConfig";
import MaidProfilePage from "./screens/MaidProfilePage";

const STAGE_ROUTE_GATE: Record<string, NavKey> = {
  PendingRetraction: "retraction",
  DocumentsCollection: "documents",
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

const TASK_TYPE_GATE: Record<TaskType, NavKey> = {
  retraction: "retraction",
  documents: "documents",
  shooting: "media",
  editing: "media",
  publishing: "publishing",
  available: "publishing",
  trial: "publishing",
};

function hashToRoute(hash: string): string {
  const h = hash.replace(/^#\/?/, "").replace(/\/+$/, "");
  return h || "dashboard";
}

function renderScreen(route: string, state: AppState, dispatch: (a: Action) => void, onNavigate: (key: string) => void) {
  switch (route) {
    case "teamwork":
      return <TeamWork state={state} dispatch={dispatch} route={route} onNavigate={onNavigate} />;
    case "reception":
      return <Reception state={state} dispatch={dispatch} route={route} />;
    case "directory":
      return <Directory state={state} dispatch={dispatch} route={route} onNavigate={onNavigate} />;
    case "PendingRetraction":
    case "DocumentsCollection":
    case "MovedToOffboard":
    case "RetractedToCC":
    case "RetractedToMaidMatch":
      return <Retraction state={state} dispatch={dispatch} route={route} onNavigate={onNavigate} />;
    case "PendingShooting":
    case "PendingEditing":
    case "ProductionDone":
      return <MediaProduction state={state} dispatch={dispatch} route={route} onNavigate={onNavigate} />;
    case "AvailablePendingPublishing":
    case "AvailablePublished":
    case "UnderTrial":
    case "Hired":
    case "Cancelled":
      return <Publishing state={state} dispatch={dispatch} route={route} onNavigate={onNavigate} />;
    case "users":
      return <UsersScreen state={state} dispatch={dispatch} route={route} />;
    case "config":
      return <SystemConfig state={state} dispatch={dispatch} route={route} />;
    case "dashboard":
    default:
      return <Dashboard state={state} dispatch={dispatch} route={route} onNavigate={onNavigate} />;
  }
}

function renderRoute(route: string, state: AppState, dispatch: (a: Action) => void, onNavigate: (key: string) => void) {
  if (route.startsWith("task/")) {
    const taskId = route.slice("task/".length);
    const task = state.tasks.find((t) => t.id === taskId);
    const maid = task ? maidById(state, task.housemaidId) : undefined;
    if (task && maid) {
      return <TaskWorkspace task={task} maid={maid} state={state} dispatch={dispatch} onNavigate={onNavigate} />;
    }
    return <EmptyState title="Task not found" hint="This task doesn't exist." />;
  }
  if (route.startsWith("maid/")) {
    const maid = state.housemaids.find((h) => h.id === route.slice("maid/".length));
    if (maid) return <MaidProfilePage maid={maid} state={state} dispatch={dispatch} onNavigate={onNavigate} />;
    return <EmptyState title="Profile not found" hint="This housemaid doesn't exist." />;
  }
  return renderScreen(route, state, dispatch, onNavigate);
}

export default function MaidMatchApp() {
  const [state, dispatch] = useReducer(reducer, undefined, makeSeedState);
  const [route, setRoute] = useState<string>(() => hashToRoute(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(hashToRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (key: string) => {
    const hash = `#/${key}`;
    if (window.location.hash === hash) return;
    window.location.hash = hash;
  };

  // Publishing system job: posts each pending platform, records failures, and hands
  // a fully-green profile to Available & Published. Prototype runs every 60s for demo.
  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: "RUN_PUBLISH_JOB", now: Date.now() });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // CC live-in "hourly" refresh. Production calls maids.cc once an hour; the prototype
  // uses a 60s interval so the refresh is observable without waiting (see SPEC D-4).
  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: "REFRESH_CC_LIVE_IN", now: Date.now(), entries: fetchCcLiveInDueToday() });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Document-collection 30-minute poll: checks the maids.cc ERP for the two collected
  // papers and auto-flags them "collected" when uploaded. Prototype uses 45s for demo.
  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: "CHECK_DOCUMENTS", now: Date.now() });
    }, 45_000);
    return () => clearInterval(id);
  }, []);

  const gateKey = route.startsWith("task/")
    ? (() => {
        const task = state.tasks.find((t) => t.id === route.slice(5));
        return task ? TASK_TYPE_GATE[task.type] : undefined;
      })()
    : route.startsWith("maid/")
      ? "directory"
      : STAGE_ROUTE_GATE[route];

  const allowed = !gateKey || canAccess(state.currentRole, gateKey);

  return (
    <Shell state={state} route={route} onNavigate={navigate} onDispatch={dispatch}>
      {allowed ? (
        renderRoute(route, state, dispatch, navigate)
      ) : (
        <EmptyState title="You don't have access" hint="Your current role cannot view this screen." />
      )}
    </Shell>
  );
}
