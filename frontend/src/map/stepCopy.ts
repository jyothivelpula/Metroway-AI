import type { IndoorRouteStep } from "../types";

const TITLES: Record<string, string> = {
  START: "Start here",
  GO_STRAIGHT: "Walk straight",
  TURN_LEFT: "Turn left",
  TURN_RIGHT: "Turn right",
  SLIGHT_LEFT: "Bear left",
  SLIGHT_RIGHT: "Bear right",
  GO_UP: "Go up",
  GO_DOWN: "Go down",
  TAKE_STAIRS: "Take the stairs",
  TAKE_ESCALATOR: "Take the escalator",
  TAKE_LIFT: "Take the lift",
  ENTER: "Enter",
  EXIT: "Head toward the exit",
  FOLLOW_SIGN: "Follow the signs",
  FOLLOW_PLATFORM_SIGN: "Follow platform signs",
  FOLLOW_LINE_SIGN: "Follow interchange signs",
  ARRIVE: "You have arrived",
};

export function friendlyStepTitle(step: IndoorRouteStep): string {
  if (step.action === "START") {
    return step.to_node ? `Start at ${step.to_node}` : "Start here";
  }
  if (step.action === "ARRIVE") return "You have arrived";
  if (step.action === "GO_UP" && step.level) return `Go to ${step.level.toLowerCase()}`;
  if (step.action === "GO_DOWN" && step.level) return `Go to ${step.level.toLowerCase()}`;
  return TITLES[step.action] ?? step.action.replaceAll("_", " ").toLowerCase();
}

export function friendlyStepDetail(step: IndoorRouteStep): string {
  const text = (step.instruction_text || step.text || "").trim();
  if (text) return text;
  if (step.to_node) return `Continue toward ${step.to_node}.`;
  return "Continue along the route.";
}

export function looksTechnical(label: string): boolean {
  return /^(node|edge|decision)[-_]/i.test(label) || /^[0-9a-f]{8}-/i.test(label);
}
