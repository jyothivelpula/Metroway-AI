import { IndoorStationMap } from "./IndoorStationMap";
import { NavigationCard } from "./NavigationCard";
import { formatMeasuredTime, remainingMeasuredDistance, remainingMeasuredTime, type IndoorNavigationState } from "../navigation/session";

export function IndoorNavigation({
  stationId,
  stationName,
  state,
  onNext,
  onBack,
  onExit,
  onRestart,
}: {
  stationId: string;
  stationName: string;
  state: IndoorNavigationState;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
  onRestart: () => void;
}) {
  const route = state.route;
  if (!route?.route_found) return null;
  const step = route.steps[state.currentStepIndex];
  const remainingDistance = remainingMeasuredDistance(route.steps, state.currentStepIndex);
  const remainingTime = remainingMeasuredTime(route.steps, state.currentStepIndex);
  const levelLabel = step?.level ?? state.currentLevel;

  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-line bg-card p-4 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">Indoor navigation</p>
        <h2 className="mt-1 font-display text-3xl">{stationName || route.station.name}</h2>
        <p className="mt-2 text-lg font-semibold">
          Step {step?.step_index ?? state.currentStepIndex + 1} of {state.totalSteps}
        </p>
        {levelLabel ? <p className="mt-1 text-sm">Current level: {levelLabel}</p> : null}
        <p className="mt-1 text-sm text-muted">
          {remainingDistance != null ? `${remainingDistance} m remaining` : ""}
          {remainingDistance != null && remainingTime != null ? " · " : ""}
          {remainingTime != null ? formatMeasuredTime(remainingTime) : ""}
          {remainingDistance == null && remainingTime == null ? "Distance is shown only when the station graph includes it." : ""}
        </p>
      </header>
      <NavigationCard
        route={route}
        stepIndex={state.currentStepIndex}
        onNext={onNext}
        onBack={onBack}
        onExit={onExit}
        onRestart={onRestart}
      />
      <IndoorStationMap
        stationId={stationId}
        route={route}
        showPlanner={false}
        currentNodeId={state.currentNodeId}
        currentFromId={step?.from_node_id ?? null}
        currentToId={step?.to_node_id ?? null}
      />
    </div>
  );
}
