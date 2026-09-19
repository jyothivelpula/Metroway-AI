import {
  ArrowDown,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Check,
  CornerUpLeft,
  CornerUpRight,
  DoorOpen,
  Layers,
  MoveVertical,
} from "lucide-react";
import type { IndoorRoute, IndoorRouteStep } from "../types";
import { voiceInstruction } from "../navigation/session";
import { formatGuideDistance, shortInstruction } from "../navigation/instructions";
import { friendlyStepDetail } from "../map/stepCopy";

function DirectionIcon({ action }: { action: string }) {
  const className = "mx-auto h-16 w-16";
  if (action === "TURN_LEFT") return <CornerUpLeft className={className} aria-hidden="true" />;
  if (action === "TURN_RIGHT") return <CornerUpRight className={className} aria-hidden="true" />;
  if (action === "SLIGHT_LEFT") return <ArrowUpLeft className={className} aria-hidden="true" />;
  if (action === "SLIGHT_RIGHT") return <ArrowUpRight className={className} aria-hidden="true" />;
  if (action === "GO_DOWN") return <ArrowDown className={className} aria-hidden="true" />;
  if (action === "TAKE_STAIRS") return <Layers className={className} aria-hidden="true" />;
  if (action === "TAKE_ESCALATOR" || action === "GO_UP") return <ArrowUp className={className} aria-hidden="true" />;
  if (action === "TAKE_LIFT") return <MoveVertical className={className} aria-hidden="true" />;
  if (action === "ENTER" || action === "EXIT") return <DoorOpen className={className} aria-hidden="true" />;
  if (action === "ARRIVE") return <Check className={className} aria-hidden="true" />;
  return <ArrowUp className={className} aria-hidden="true" />;
}

export function NavigationCard({
  route,
  stepIndex,
  remainingDistance,
  onNext,
  onExit,
  onRestart,
}: {
  route: IndoorRoute;
  stepIndex: number;
  live?: boolean;
  remainingDistance?: number | null;
  onNext: () => void;
  onBack?: () => void;
  onExit: () => void;
  onRestart: () => void;
}) {
  const steps = route.steps;
  const step = steps[stepIndex];
  const total = steps.length;
  const last = Boolean(step && (step.action === "ARRIVE" || stepIndex >= total - 1));

  if (!step) return null;

  return (
    <article className="rounded-3xl border border-line bg-card p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted">
        Step {step.step_index} of {total}
      </p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">Current</p>
      <div className="mt-2 text-metro">
        <DirectionIcon action={step.action} />
      </div>
      <h2 className="mt-2 text-center font-display text-4xl leading-tight">
        {last ? "You have arrived" : shortInstruction(step)}
      </h2>
      <p className="mt-3 text-center text-base">{last ? route.destination.name : detailText(step)}</p>
      {!last && remainingDistance != null ? (
        <p className="mt-3 text-center font-display text-3xl text-metro-deep">{formatGuideDistance(remainingDistance)}</p>
      ) : null}
      {step.level && !last ? (
        <p className="mt-2 text-center text-sm text-muted">Level: {step.level}</p>
      ) : null}
      <p className="sr-only">{voiceInstruction(step)}</p>
      {last ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onRestart} className="min-h-12 flex-1 rounded-full bg-paper px-4 py-3 font-semibold">
            Start another route
          </button>
          <button type="button" onClick={onExit} className="min-h-12 flex-1 rounded-full bg-metro px-4 py-3 font-semibold text-white">
            Done
          </button>
        </div>
      ) : (
        <button type="button" onClick={onNext} aria-label="Next navigation step" className="mt-4 w-full min-h-12 rounded-full bg-metro px-4 py-3 font-semibold text-white">
          Next
        </button>
      )}
      <button type="button" onClick={onExit} className="mt-2 w-full min-h-11 text-sm font-semibold text-muted">
        Exit navigation
      </button>
    </article>
  );
}

function detailText(step: IndoorRouteStep) {
  if (step.sign_text && (step.action === "FOLLOW_PLATFORM_SIGN" || step.action === "FOLLOW_LINE_SIGN" || step.action === "FOLLOW_SIGN")) {
    return step.instruction_text || `Follow signs toward ${step.sign_text}.`;
  }
  return friendlyStepDetail(step);
}
