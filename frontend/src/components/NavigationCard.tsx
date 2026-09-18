import {
  ArrowDown,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  DoorOpen,
  Flag,
  Layers,
  MoveVertical,
} from "lucide-react";
import type { IndoorRoute, IndoorRouteStep } from "../types";
import { remainingMeasuredDistance, remainingMeasuredTime, voiceInstruction } from "../navigation/session";

const TITLES: Record<string, string> = {
  START: "START HERE",
  GO_STRAIGHT: "WALK STRAIGHT",
  TURN_LEFT: "TURN LEFT",
  TURN_RIGHT: "TURN RIGHT",
  SLIGHT_LEFT: "BEAR LEFT",
  SLIGHT_RIGHT: "BEAR RIGHT",
  GO_UP: "GO UP",
  GO_DOWN: "GO DOWN",
  TAKE_STAIRS: "TAKE STAIRS",
  TAKE_ESCALATOR: "TAKE ESCALATOR",
  TAKE_LIFT: "TAKE LIFT",
  ENTER: "ENTER",
  EXIT: "EXIT",
  FOLLOW_SIGN: "FOLLOW SIGN",
  FOLLOW_PLATFORM_SIGN: "PLATFORM ACCESS",
  FOLLOW_LINE_SIGN: "INTERCHANGE",
  ARRIVE: "YOU HAVE ARRIVED",
};

function titleFor(step: IndoorRouteStep) {
  if (step.action === "START") return `START AT ${(step.to_node ?? "START").toUpperCase()}`;
  if (step.action === "ARRIVE") return "YOU HAVE ARRIVED";
  return TITLES[step.action] ?? step.action.replaceAll("_", " ");
}

function DirectionIcon({ action }: { action: string }) {
  const className = "mx-auto h-12 w-12";
  if (action === "TURN_LEFT") return <CornerUpLeft className={className} aria-hidden="true" />;
  if (action === "TURN_RIGHT") return <CornerUpRight className={className} aria-hidden="true" />;
  if (action === "SLIGHT_LEFT") return <ArrowUpLeft className={className} aria-hidden="true" />;
  if (action === "SLIGHT_RIGHT") return <ArrowUpRight className={className} aria-hidden="true" />;
  if (action === "GO_DOWN") return <ArrowDown className={className} aria-hidden="true" />;
  if (action === "TAKE_STAIRS") return <Layers className={className} aria-hidden="true" />;
  if (action === "TAKE_ESCALATOR" || action === "TAKE_LIFT") return <MoveVertical className={className} aria-hidden="true" />;
  if (action === "ENTER" || action === "EXIT") return <DoorOpen className={className} aria-hidden="true" />;
  if (action === "ARRIVE" || action === "START") return <Flag className={className} aria-hidden="true" />;
  return <ArrowUp className={className} aria-hidden="true" />;
}

export function NavigationCard({
  route,
  stepIndex,
  onNext,
  onBack,
  onExit,
  onRestart,
}: {
  route: IndoorRoute;
  stepIndex: number;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
  onRestart: () => void;
}) {
  const steps = route.steps;
  const step = steps[stepIndex];
  const total = steps.length;
  const last = stepIndex >= total - 1;
  const remainingDistance = remainingMeasuredDistance(steps, stepIndex);
  const remainingTime = remainingMeasuredTime(steps, stepIndex);

  if (!step) return null;

  return (
    <article className="rounded-3xl border border-line bg-card p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted">
        Step {step.step_index} of {total}
      </p>
      <div className="mt-4 text-metro">
        <DirectionIcon action={step.action} />
      </div>
      <h2 className="mt-2 text-center font-display text-3xl sm:text-4xl">{titleFor(step)}</h2>
      <p className="mt-3 text-center text-lg sm:text-xl">{step.instruction_text || step.text}</p>
      {step.action === "ARRIVE" ? (
        <p className="mt-2 text-center text-lg font-semibold">{route.destination.name}</p>
      ) : null}
      {step.to_node && step.action !== "START" && step.action !== "ARRIVE" ? (
        <p className="mt-2 text-center text-base text-muted">Toward {step.to_node}</p>
      ) : null}
      {step.landmark ? <p className="mt-2 text-center text-sm">{step.landmark}</p> : null}
      {step.sign_text ? <p className="mt-2 text-center text-sm">{step.sign_text}</p> : null}
      <p className="sr-only">{voiceInstruction(step)}</p>
      {last ? (
        <p className="mt-3 text-center text-sm text-muted">
          You have reached your destination.
          {route.total_distance_m != null ? ` · ${route.total_distance_m} m` : ""}
          {route.estimated_time_sec != null ? ` · ${route.estimated_time_sec} sec` : ""}
          {` · ${total} steps`}
        </p>
      ) : (
        <p className="mt-3 text-center text-sm text-muted">
          {step.from_node ?? route.start.name}
          {step.to_node ? ` → ${step.to_node}` : ""}
          {remainingDistance != null ? ` · ${remainingDistance} m remaining` : ""}
          {remainingTime != null ? ` · ${remainingTime} sec remaining` : ""}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={stepIndex === 0}
          className="min-h-14 min-w-24 flex-1 rounded-full bg-paper px-4 py-3 text-lg font-semibold disabled:opacity-40"
        >
          Back
        </button>
        {last ? (
          <>
            <button type="button" onClick={onRestart} className="min-h-14 flex-1 rounded-full bg-paper px-4 py-3 text-lg font-semibold">
              Start again
            </button>
            <button type="button" onClick={onExit} className="min-h-14 flex-1 rounded-full bg-metro px-4 py-3 text-lg font-semibold text-white">
              Finish
            </button>
          </>
        ) : (
          <button type="button" onClick={onNext} className="min-h-14 flex-1 rounded-full bg-metro px-4 py-3 text-lg font-semibold text-white">
            Next
          </button>
        )}
      </div>
      <button type="button" onClick={onExit} className="mt-3 w-full min-h-11 text-sm font-semibold text-muted">
        Exit navigation
      </button>
    </article>
  );
}
