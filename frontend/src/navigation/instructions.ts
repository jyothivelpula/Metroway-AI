import type { IndoorMapNode, IndoorRoute, IndoorRouteStep } from "../types";

export const NAV_ACTIONS = [
  "GO_STRAIGHT",
  "TURN_LEFT",
  "TURN_RIGHT",
  "SLIGHT_LEFT",
  "SLIGHT_RIGHT",
  "TAKE_STAIRS",
  "TAKE_ESCALATOR",
  "TAKE_LIFT",
  "GO_UP",
  "GO_DOWN",
  "FOLLOW_SIGN",
  "FOLLOW_PLATFORM_SIGN",
  "FOLLOW_LINE_SIGN",
  "ENTER",
  "EXIT",
  "WAIT",
  "ARRIVE",
  "START",
] as const;

export type NavAction = (typeof NAV_ACTIONS)[number];

export const ARRIVAL_THRESHOLD = 2;

export const SHORT_INSTRUCTION: Record<string, string> = {
  START: "Start here",
  GO_STRAIGHT: "Go straight",
  TURN_LEFT: "Turn left",
  TURN_RIGHT: "Turn right",
  SLIGHT_LEFT: "Slight left",
  SLIGHT_RIGHT: "Slight right",
  TAKE_STAIRS: "Take stairs",
  TAKE_ESCALATOR: "Take escalator",
  TAKE_LIFT: "Take lift",
  GO_UP: "Go upstairs",
  GO_DOWN: "Go downstairs",
  FOLLOW_SIGN: "Follow signs",
  FOLLOW_PLATFORM_SIGN: "Follow platform signs",
  FOLLOW_LINE_SIGN: "Follow line signs",
  ENTER: "Enter station area",
  EXIT: "Exit station",
  WAIT: "Wait",
  ARRIVE: "You have arrived",
};

export function shortInstruction(step: IndoorRouteStep | undefined): string {
  if (!step) return "";
  if (step.short_instruction) return step.short_instruction;
  return SHORT_INSTRUCTION[step.action] ?? step.action.replaceAll("_", " ");
}

export function formatGuideDistance(value: number): string {
  const rounded = Math.max(0, Math.round(value));
  return `${rounded} m`;
}

export function schematicLength(from: { x?: number | null; y?: number | null }, to: { x?: number | null; y?: number | null }): number | null {
  if (from.x == null || from.y == null || to.x == null || to.y == null) return null;
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function remainingOnSegment(length: number | null, progress: number, measured: number | null): number | null {
  const base = measured ?? length;
  if (base == null) return null;
  const remaining = base * (1 - Math.min(1, Math.max(0, progress)));
  if (remaining <= ARRIVAL_THRESHOLD) return 0;
  return remaining;
}

export function movementStepIndex(route: IndoorRoute, fromId: string | null, toId: string | null): number {
  const steps = route.steps;
  if (!steps.length) return 0;
  if (toId && toId === route.destination.node_id && fromId === toId) {
    return steps.length - 1;
  }
  if (fromId && toId && fromId !== toId) {
    const match = steps.findIndex((step) => step.from_node_id === fromId && step.to_node_id === toId);
    if (match >= 0) return match;
  }
  if (fromId && fromId === toId) {
    const nodeIds = route.nodes.map((node) => node.node_id);
    const index = nodeIds.indexOf(fromId);
    if (index < 0) return 0;
    if (index >= nodeIds.length - 1) return steps.length - 1;
    const nextId = nodeIds[index + 1];
    const match = steps.findIndex((step) => step.from_node_id === fromId && step.to_node_id === nextId);
    if (match >= 0) return match;
  }
  return 0;
}

export function nextStepAfter(route: IndoorRoute, stepIndex: number): IndoorRouteStep | undefined {
  return route.steps[stepIndex + 1];
}

export function nodeByRouteId(nodes: IndoorMapNode[], id: string | null) {
  if (!id) return undefined;
  return nodes.find((node) => node.id === id);
}
