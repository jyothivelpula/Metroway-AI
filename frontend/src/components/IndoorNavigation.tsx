import { IndoorStationMap } from "./IndoorStationMap";
import { NavigationCard } from "./NavigationCard";
import type { IndoorNavigationState } from "../navigation/session";
import type { ReactNode } from "react";

export function IndoorNavigation({
  stationId,
  stationName,
  state,
  onNext,
  onExit,
  onRestart,
  youName,
  children,
  offRoute,
  onRecalculate,
  recalculating,
  youX,
  youY,
  follow,
  onFollowBreak,
  onRecenter,
  remainingDistance,
  currentFromId,
  currentToId,
}: {
  stationId: string;
  stationName: string;
  state: IndoorNavigationState;
  onNext: () => void;
  onBack?: () => void;
  onExit: () => void;
  onRestart: () => void;
  youName?: string;
  children?: ReactNode;
  offRoute?: boolean;
  onRecalculate?: () => void;
  recalculating?: boolean;
  youX?: number | null;
  youY?: number | null;
  follow?: boolean;
  onFollowBreak?: () => void;
  onRecenter?: () => void;
  remainingDistance?: number | null;
  currentFromId?: string | null;
  currentToId?: string | null;
}) {
  const route = state.route;
  if (!route?.route_found) return null;
  const step = route.steps[state.currentStepIndex];
  const levelLabel = state.currentLevel ?? step?.level;
  const live = state.mode === "LIVE_POSITION";
  const fromId = currentFromId ?? step?.from_node_id ?? null;
  const toId = currentToId ?? step?.to_node_id ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-stretch">
      <div className="h-[480px] lg:h-[620px]">
        <IndoorStationMap
          stationId={stationId}
          route={route}
          showPlanner={false}
          currentNodeId={state.currentNodeId}
          currentFromId={fromId}
          currentToId={toId}
          compact
          youX={youX}
          youY={youY}
          follow={follow}
          onFollowBreak={onFollowBreak}
          onLocate={onRecenter}
        />
      </div>
      <aside className="space-y-3">
        <header className="rounded-3xl border border-line bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted">{stationName || route.station.name}</p>
          {levelLabel ? <p className="mt-1 text-lg font-semibold">{levelLabel} level</p> : null}
          {youName ? <p className="mt-1 text-sm">You: {youName}</p> : null}
          <p className="mt-1 text-sm text-muted">Destination: {route.destination.name}</p>
        </header>
        {offRoute ? (
          <div className="rounded-3xl border border-line bg-card p-4" role="status">
            <h2 className="text-lg font-semibold">You&apos;re off the route.</h2>
            <p className="mt-2 text-sm text-muted">{recalculating ? "Recalculating..." : "Updating your path from here."}</p>
            {onRecalculate ? (
              <button type="button" onClick={onRecalculate} disabled={recalculating} className="mt-3 w-full min-h-11 rounded-full bg-metro py-2 font-semibold text-white">
                {recalculating ? "Recalculating..." : "Recalculate route"}
              </button>
            ) : null}
          </div>
        ) : null}
        <NavigationCard
          route={route}
          stepIndex={state.currentStepIndex}
          live={live}
          remainingDistance={remainingDistance}
          onNext={onNext}
          onExit={onExit}
          onRestart={onRestart}
        />
        {children}
      </aside>
    </div>
  );
}
