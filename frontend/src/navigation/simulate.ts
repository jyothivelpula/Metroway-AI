export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) * (2 - 2 * t) / 2;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function routeNodeIndex(routeNodeIds: string[], nodeId: string | null) {
  if (!nodeId) return -1;
  return routeNodeIds.indexOf(nodeId);
}
