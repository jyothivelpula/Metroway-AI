import type { IndoorRoute, IndoorRouteStep, NavigationMode } from "../types";

export type RouteStatus = "ON_ROUTE" | "OFF_ROUTE" | "UNKNOWN";

export type IndoorNavigationState = {
  active: boolean;
  mode: NavigationMode;
  currentStepIndex: number;
  totalSteps: number;
  route: IndoorRoute | null;
  currentNodeId: string | null;
  destinationNodeId: string | null;
  currentLevel: string | null;
  completed: boolean;
};

export function isUserOnRoute(currentNodeId: string | null | undefined, routeNodeIds: string[]): RouteStatus {
  if (!currentNodeId) return "UNKNOWN";
  return routeNodeIds.includes(currentNodeId) ? "ON_ROUTE" : "OFF_ROUTE";
}

export function checkUserOnRoute(routeNodeIds: string[], currentNodeId: string | null | undefined): RouteStatus {
  return isUserOnRoute(currentNodeId, routeNodeIds);
}

export function getCurrentNavigationNode(state: IndoorNavigationState, liveNodeId?: string | null): string | null {
  if (state.mode === "LIVE_POSITION" && liveNodeId) return liveNodeId;
  return state.currentNodeId;
}

export function currentNodeFromStep(step: IndoorRouteStep | undefined): string | null {
  return step?.to_node_id ?? step?.from_node_id ?? null;
}

export function createNavigationState(
  route: IndoorRoute | null,
  currentStepIndex = 0,
  mode: NavigationMode = "MANUAL_STEP",
): IndoorNavigationState {
  if (!route?.route_found) {
    return {
      active: false,
      mode,
      currentStepIndex: 0,
      totalSteps: 0,
      route: null,
      currentNodeId: null,
      destinationNodeId: null,
      currentLevel: null,
      completed: false,
    };
  }
  const total = route.steps.length;
  const index = Math.min(Math.max(currentStepIndex, 0), Math.max(total - 1, 0));
  const step = route.steps[index];
  return {
    active: true,
    mode,
    currentStepIndex: index,
    totalSteps: total,
    route,
    currentNodeId: currentNodeFromStep(step),
    destinationNodeId: route.destination.node_id,
    currentLevel: step?.level ?? route.nodes[0]?.level ?? null,
    completed: Boolean(step && (step.action === "ARRIVE" || index >= total - 1)),
  };
}

export function voiceInstruction(step: IndoorRouteStep | undefined): string {
  if (!step) return "";
  if (step.voice_instruction) return step.voice_instruction;
  return (step.instruction_text || step.text || "").replace(" m.", " meters.").replace(" m ", " meters ");
}

export function remainingMeasuredDistance(steps: IndoorRouteStep[], fromIndex: number): number | null {
  const movement = steps.slice(fromIndex).filter((step) => step.action !== "START" && step.action !== "ARRIVE");
  if (movement.length === 0 || movement.some((step) => step.distance_m == null)) return null;
  return movement.reduce((sum, step) => sum + (step.distance_m ?? 0), 0);
}

export function remainingMeasuredTime(steps: IndoorRouteStep[], fromIndex: number): number | null {
  const movement = steps.slice(fromIndex).filter((step) => step.action !== "START" && step.action !== "ARRIVE");
  if (movement.length === 0 || movement.some((step) => step.estimated_time_sec == null)) return null;
  return movement.reduce((sum, step) => sum + (step.estimated_time_sec ?? 0), 0);
}

export function formatMeasuredTime(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}
