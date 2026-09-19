import type { IndoorRoute } from "../types";
import type { RouteMatch } from "./types";

export function matchPositionToRoute(
  currentNodeId: string | null | undefined,
  routeNodeIds: string[],
  destinationNodeId?: string | null,
  neighborNodeIds?: string[],
): RouteMatch {
  if (!currentNodeId) return "UNKNOWN";
  if (destinationNodeId && currentNodeId === destinationNodeId) return "DESTINATION";
  if (routeNodeIds.includes(currentNodeId)) return "ON_ROUTE";
  if (neighborNodeIds?.includes(currentNodeId)) return "NEAR_ROUTE";
  return "OFF_ROUTE";
}

export function detectOffRoute(
  currentNodeId: string | null | undefined,
  routeNodeIds: string[],
  destinationNodeId?: string | null,
  neighborNodeIds?: string[],
): boolean {
  const match = matchPositionToRoute(currentNodeId, routeNodeIds, destinationNodeId, neighborNodeIds);
  return match === "OFF_ROUTE";
}

export function stepIndexForPosition(route: IndoorRoute, nodeId: string | null, currentStepIndex: number): number {
  if (!route.route_found || !nodeId || route.steps.length === 0) return currentStepIndex;
  if (nodeId === route.destination.node_id) return route.steps.length - 1;
  const nodeIds = route.nodes.map((node) => node.node_id);
  const index = nodeIds.indexOf(nodeId);
  if (index < 0) return currentStepIndex;
  if (index === 0) return 0;
  return Math.min(index + 1, route.steps.length - 1);
}

export function neighborNodeIds(routeNodeIds: string[], edges: { from_node_id: string; to_node_id: string }[]): string[] {
  const route = new Set(routeNodeIds);
  const neighbors = new Set<string>();
  for (const edge of edges) {
    if (route.has(edge.from_node_id) && !route.has(edge.to_node_id)) neighbors.add(edge.to_node_id);
    if (route.has(edge.to_node_id) && !route.has(edge.from_node_id)) neighbors.add(edge.from_node_id);
  }
  return [...neighbors];
}
