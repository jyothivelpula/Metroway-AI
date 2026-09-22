import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { IndoorNavigation } from "../components/IndoorNavigation";
import { PhaseNotice } from "../components/PhaseNotice";
import { PositionPanel } from "../components/PositionPanel";
import { QrScanner } from "../components/QrScanner";
import { createNavigationState } from "../navigation/session";
import { movementStepIndex, remainingOnSegment, schematicLength } from "../navigation/instructions";
import { easeInOut, lerp, prefersReducedMotion, routeNodeIndex } from "../navigation/simulate";
import { detectOffRoute, neighborNodeIds } from "../positioning/match";
import { parsePositionQr } from "../positioning/parseQr";
import { takePendingPosition } from "../positioning/pending";
import { PositionManager } from "../positioning/PositionManager";
import type { NormalizedPosition } from "../positioning/types";
import { getIndoorMap, postIndoorRoute } from "../services/indoor";
import { resolvePosition } from "../services/position";
import { getStations, matchesStationKey } from "../services/stations";
import type { IndoorMapEdge, IndoorMapNode, IndoorRoute, NavigationMode, StationSummary } from "../types";

const DESTINATION_TYPES = new Set([
  "PLATFORM",
  "CONCOURSE",
  "GATE",
  "EXIT",
  "FACILITY",
  "BUS_STOP",
  "PARKING",
  "TICKET_COUNTER",
  "AFC_GATE",
  "INTERCHANGE",
  "LIFT",
  "ESCALATOR",
  "STAIRS",
]);

const MOVE_MS = 1400;

export function NavigationPage() {
  const [params] = useSearchParams();
  const intent = params.get("intent");
  const presetStation = params.get("station") ?? "";
  const [stationId, setStationId] = useState(presetStation);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [stations, setStations] = useState<StationSummary[]>([]);
  const [nodes, setNodes] = useState<IndoorMapNode[]>([]);
  const [edges, setEdges] = useState<IndoorMapEdge[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<IndoorRoute | null>(null);
  const [error, setError] = useState("");
  const [navigating, setNavigating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [mode, setMode] = useState<NavigationMode>("LIVE_POSITION");
  const [position, setPosition] = useState<NormalizedPosition | null>(null);
  const [positionError, setPositionError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [youXY, setYouXY] = useState<{ x: number; y: number } | null>(null);
  const [follow, setFollow] = useState(true);
  const [autoMove, setAutoMove] = useState(false);
  const [moving, setMoving] = useState(false);
  const [travelFromId, setTravelFromId] = useState<string | null>(null);
  const [travelToId, setTravelToId] = useState<string | null>(null);
  const [segmentProgress, setSegmentProgress] = useState(1);
  const managerRef = useRef(new PositionManager());
  const pendingRef = useRef<ReturnType<typeof takePendingPosition>>(null);
  const seedNodeRef = useRef<string | null>(null);
  const recalcOnceRef = useRef(false);
  const animRef = useRef<number | null>(null);
  const autoRef = useRef(false);
  const positionRef = useRef<NormalizedPosition | null>(null);
  const nodesRef = useRef<IndoorMapNode[]>([]);
  const routeRef = useRef<IndoorRoute | null>(null);

  autoRef.current = autoMove;
  positionRef.current = position;
  nodesRef.current = nodes;
  routeRef.current = route;

  useEffect(() => {
    const pending = takePendingPosition();
    pendingRef.current = pending;
    if (pending?.stationCode && !presetStation) setStationId(pending.stationCode);
  }, [presetStation]);

  useEffect(() => {
    void getStations()
      .then((rows) => {
        setStations(rows);
        if (!presetStation) return;
        const match = rows.find((station) => matchesStationKey(station, presetStation));
        if (match) setStationId(match.alternate_name || match.station_code);
      })
      .catch(() => setStations([]));
  }, [presetStation]);

  useEffect(() => {
    if (!stationId) {
      setNodes([]);
      setEdges([]);
      setOrigin("");
      setDestination("");
      setRoute(null);
      setNavigating(false);
      setStepIndex(0);
      setPosition(null);
      setMapReady(false);
      return;
    }
    let active = true;
    setMapReady(false);
    void getIndoorMap(stationId)
      .then((payload) => {
        if (!active) return;
        setNodes(payload.nodes);
        setEdges(payload.edges);
        setMapReady(true);
        const pending = pendingRef.current;
        const pendingNode = pending?.nodeId
          ? payload.nodes.find((node) => node.id === pending.nodeId)
          : undefined;
        const entrance = payload.nodes.find((node) => node.node_type === "ENTRANCE");
        const concourse = payload.nodes.find((node) => node.node_type === "CONCOURSE");
        setOrigin(pendingNode?.id ?? entrance?.id ?? payload.nodes[0]?.id ?? "");
        setDestination(concourse?.id ?? payload.nodes.at(-1)?.id ?? "");
        setRoute(null);
        setError("");
        setNavigating(false);
        setStepIndex(0);
        setPosition(null);
        setPositionError("");
        setMode("LIVE_POSITION");
      })
      .catch(() => {
        if (!active) return;
        setNodes([]);
        setEdges([]);
        setMapReady(true);
        setOrigin("");
        setDestination("");
        setRoute(null);
        setNavigating(false);
        setStepIndex(0);
        setPosition(null);
      });
    return () => {
      active = false;
    };
  }, [stationId]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!navigating) {
      manager.stop();
      setScanning(false);
      setAutoMove(false);
      cancelAnim();
      return;
    }
    manager.start();
    const unsubscribe = manager.subscribe(setPosition);
    const seedId = seedNodeRef.current;
    seedNodeRef.current = null;
    const node = nodes.find((item) => item.id === seedId);
    if (node) {
      applyNode(node, pendingRef.current?.source ?? "SIMULATION_POSITION");
      if (node.x != null && node.y != null) setYouXY({ x: node.x, y: node.y });
      setTravelFromId(node.id);
      setTravelToId(node.id);
      setSegmentProgress(1);
    }
    pendingRef.current = null;
    setFollow(true);
    return () => {
      unsubscribe();
      manager.stop();
      setScanning(false);
    };
  }, [navigating]);

  const destinations = useMemo(() => {
    if (intent === "exit") return nodes.filter((node) => node.node_type === "GATE" || node.node_type === "EXIT");
    const filtered = nodes.filter((node) => DESTINATION_TYPES.has(node.node_type));
    return filtered.length > 0 ? filtered : nodes;
  }, [intent, nodes]);

  const stationName = stations.find((station) => matchesStationKey(station, stationId))?.station_name ?? "";
  const routeNodeIds = route?.nodes.map((node) => node.node_id) ?? [];
  const neighbors = useMemo(() => neighborNodeIds(routeNodeIds, edges), [routeNodeIds, edges]);
  const userNodeId = position?.nodeId ?? null;
  const offRoute = Boolean(
    navigating && route?.route_found && userNodeId && detectOffRoute(userNodeId, routeNodeIds, route.destination.node_id, neighbors),
  );
  const arrived = Boolean(navigating && route?.route_found && userNodeId === route.destination.node_id);

  const navigationState = createNavigationState(navigating ? route : null, stepIndex, mode, {
    currentUserNodeId: userNodeId,
    positionSource: position?.source ?? null,
    offRoute,
    positionUpdatedAt: position?.timestamp ?? null,
    currentLevel: nodes.find((node) => node.id === userNodeId)?.level_id
      ? route?.nodes.find((node) => node.node_id === userNodeId)?.level ?? route?.steps[stepIndex]?.level ?? null
      : route?.steps[stepIndex]?.level ?? null,
  });

  useEffect(() => {
    if (!navigating || !route?.route_found) return;
    const idx = movementStepIndex(route, travelFromId, travelToId);
    if (idx !== stepIndex) setStepIndex(idx);
  }, [navigating, route, travelFromId, travelToId, stepIndex]);

  useEffect(() => {
    if (!offRoute) {
      recalcOnceRef.current = false;
      return;
    }
    if (!navigating || !userNodeId || !destination || recalcOnceRef.current) return;
    recalcOnceRef.current = true;
    void recalculate();
  }, [offRoute, navigating, userNodeId, destination]);

  useEffect(() => {
    if (arrived) setAutoMove(false);
  }, [arrived]);

  function cancelAnim() {
    if (animRef.current != null) {
      window.cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    setMoving(false);
  }

  function applyNode(node: IndoorMapNode, source: NormalizedPosition["source"]) {
    managerRef.current.start();
    managerRef.current.apply({
      source,
      stationId: node.station_id,
      levelId: node.level_id,
      levelCode: null,
      nodeId: node.id,
      nodeName: node.name,
      latitude: null,
      longitude: null,
      accuracy: null,
      confidence: "HIGH",
      markerId: null,
    });
    setPositionError("");
    setMode("LIVE_POSITION");
    setTravelFromId(node.id);
    setTravelToId(node.id);
    setSegmentProgress(1);
  }

  function animateTo(from: IndoorMapNode, to: IndoorMapNode, source: NormalizedPosition["source"], then?: () => void) {
    cancelAnim();
    setTravelFromId(from.id);
    setTravelToId(to.id);
    if (from.x == null || from.y == null || to.x == null || to.y == null || from.level_id !== to.level_id || prefersReducedMotion()) {
      if (to.x != null && to.y != null) setYouXY({ x: to.x, y: to.y });
      setSegmentProgress(1);
      applyNode(to, source);
      then?.();
      return;
    }
    setMoving(true);
    setSegmentProgress(0);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / MOVE_MS);
      const e = easeInOut(t);
      setYouXY({ x: lerp(from.x as number, to.x as number, e), y: lerp(from.y as number, to.y as number, e) });
      setSegmentProgress(e);
      if (t < 1) {
        animRef.current = window.requestAnimationFrame(tick);
        return;
      }
      animRef.current = null;
      setMoving(false);
      setSegmentProgress(1);
      applyNode(to, source);
      then?.();
    };
    animRef.current = window.requestAnimationFrame(tick);
  }

  function currentRouteIndex() {
    const current = routeRef.current;
    const nodeId = positionRef.current?.nodeId ?? null;
    if (!current?.route_found) return -1;
    return routeNodeIndex(
      current.nodes.map((item) => item.node_id),
      nodeId,
    );
  }

  function nodeById(id: string | null) {
    if (!id) return undefined;
    return nodesRef.current.find((item) => item.id === id);
  }

  function moveBy(delta: number) {
    const current = routeRef.current;
    if (!current?.route_found || moving) return;
    const index = currentRouteIndex();
    const nextIndex = Math.min(Math.max((index < 0 ? 0 : index) + delta, 0), current.nodes.length - 1);
    if (nextIndex === index) return;
    const from = nodeById(current.nodes[index < 0 ? 0 : index]?.node_id) ?? nodeById(positionRef.current?.nodeId ?? null);
    const to = nodeById(current.nodes[nextIndex].node_id);
    if (!to) return;
    if (!from) {
      if (to.x != null && to.y != null) setYouXY({ x: to.x, y: to.y });
      applyNode(to, "SIMULATION_POSITION");
      return;
    }
    animateTo(from, to, "SIMULATION_POSITION", () => {
      if (autoRef.current && nextIndex < current.nodes.length - 1) {
        window.setTimeout(() => moveBy(1), 450);
      }
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!stationId || !origin || !destination) {
      setError("Select your starting point and destination.");
      return;
    }
    if (mapReady && nodes.length === 0) {
      setError("Indoor navigation data is not currently available for this station.");
      return;
    }
    setLoading(true);
    setError("");
    setNavigating(false);
    try {
      const result = await postIndoorRoute({
        station_id: stationId,
        start_node_id: origin,
        destination_node_id: destination,
        accessible_only: accessibleOnly,
      });
      setRoute(result);
      if (!result.route_found) {
        setError("No route is currently available between these locations.");
        setNavigating(false);
        setStepIndex(0);
      } else {
        setNavigating(false);
        setStepIndex(0);
        setMode("LIVE_POSITION");
        setPosition(null);
        setPositionError("");
      }
    } catch {
      setRoute(null);
      setNavigating(false);
      setError("Unable to calculate the route right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function exitNavigation() {
    cancelAnim();
    managerRef.current.stop();
    setScanning(false);
    setNavigating(false);
    setPosition(null);
    setYouXY(null);
    setAutoMove(false);
    setMode("LIVE_POSITION");
  }

  function startNavigation() {
    if (!route?.route_found) return;
    const pendingNode = pendingRef.current?.nodeId;
    seedNodeRef.current = pendingNode && nodes.some((node) => node.id === pendingNode) ? pendingNode : origin;
    setNavigating(true);
    setMode("LIVE_POSITION");
    setStepIndex(0);
    setPositionError("");
    setFollow(true);
    setAutoMove(false);
  }

  function applyManual(nodeId: string) {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    cancelAnim();
    setAutoMove(false);
    if (node.x != null && node.y != null) setYouXY({ x: node.x, y: node.y });
    applyNode(node, "MANUAL_POSITION");
  }

  async function handleQrText(text: string) {
    setScanning(false);
    const parsed = parsePositionQr(text);
    if ("error" in parsed) {
      setPositionError(parsed.error);
      return;
    }
    try {
      const resolved = await resolvePosition({ payload: parsed.payload });
      if (!resolved.valid || !resolved.nodeId) {
        setPositionError("Invalid position marker.");
        return;
      }
      cancelAnim();
      setAutoMove(false);
      const node = nodes.find((item) => item.id === resolved.nodeId);
      if (node?.x != null && node.y != null) setYouXY({ x: node.x, y: node.y });
      if (node) {
        setTravelFromId(node.id);
        setTravelToId(node.id);
        setSegmentProgress(1);
      }
      managerRef.current.apply({
        source: "QR_POSITION",
        stationId: resolved.stationId,
        levelId: resolved.levelId,
        levelCode: resolved.levelCode,
        nodeId: resolved.nodeId,
        nodeName: resolved.nodeName,
        latitude: null,
        longitude: null,
        accuracy: null,
        confidence: "HIGH",
        markerId: resolved.markerId,
      });
      if (route && resolved.stationId && resolved.stationId !== route.station.id) {
        setPositionError("Your current location differs from the planned route.");
      } else {
        setPositionError("");
      }
      setMode("LIVE_POSITION");
      if (resolved.nodeId && destination) {
        const ids = route?.nodes.map((item) => item.node_id) ?? [];
        if (detectOffRoute(resolved.nodeId, ids, route?.destination.node_id, neighborNodeIds(ids, edges))) {
          void recalculateFrom(resolved.nodeId);
        }
      }
    } catch {
      setPositionError("Invalid position marker.");
    }
  }

  async function recalculateFrom(startNodeId: string) {
    setRecalculating(true);
    try {
      const result = await postIndoorRoute({
        station_id: stationId,
        start_node_id: startNodeId,
        destination_node_id: destination,
        accessible_only: accessibleOnly,
      });
      setRoute(result);
      if (!result.route_found) {
        setPositionError("No route is currently available between these locations.");
      } else {
        setStepIndex(0);
        setPositionError("");
      }
    } catch {
      setPositionError("Unable to recalculate the route right now.");
    } finally {
      setRecalculating(false);
    }
  }

  async function recalculate() {
    if (!userNodeId || !destination) return;
    await recalculateFrom(userNodeId);
  }

  const youName = position?.nodeName || nodes.find((node) => node.id === navigationState.currentNodeId)?.name || "";
  const routeIndex = currentRouteIndex();
  const guidanceFromId = travelFromId ?? userNodeId;
  const nextRouteId =
    route && guidanceFromId && travelFromId === travelToId
      ? route.nodes[Math.min(route.nodes.findIndex((item) => item.node_id === guidanceFromId) + 1, route.nodes.length - 1)]?.node_id ?? null
      : travelToId;
  const guidanceToId = travelFromId && travelToId && travelFromId !== travelToId ? travelToId : nextRouteId;
  const fromNode = nodeById(guidanceFromId);
  const toNode = nodeById(guidanceToId);
  const currentStep = route?.steps[navigationState.currentStepIndex];
  const remainingDistance = remainingOnSegment(
    schematicLength(fromNode ?? {}, toNode ?? {}),
    travelFromId && travelToId && travelFromId !== travelToId ? segmentProgress : 0,
    currentStep?.distance_m ?? null,
  );

  return (
    <div className="space-y-4">
      {!navigating && !route?.route_found ? (
        <>
          <h1 className="font-display text-4xl">{intent === "exit" ? "Find an exit" : "Start indoor navigation"}</h1>
          <p className="max-w-2xl text-muted">Select your starting point and destination.</p>
          <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-line bg-card p-4 shadow-sm">
            <label className="block">
              <span className="text-sm font-semibold">Station</span>
              <select
                required
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
              >
                <option value="">Select a station</option>
                {stations.map((station) => (
                  <option key={station.id} value={station.alternate_name || station.station_code}>
                    {station.station_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">I am near</span>
              <select required value={origin} onChange={(e) => setOrigin(e.target.value)} className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3">
                <option value="">Choose a location</option>
                {nodes.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">I want to go to</span>
              <select required value={destination} onChange={(e) => setDestination(e.target.value)} className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3">
                <option value="">Choose a destination</option>
                {destinations.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={accessibleOnly} onChange={(e) => setAccessibleOnly(e.target.checked)} />
              Accessible route
            </label>
            <button type="submit" disabled={loading} className="w-full min-h-12 rounded-full bg-metro py-3 font-semibold text-white">
              {loading ? "Calculating route..." : "Prepare route"}
            </button>
          </form>
        </>
      ) : null}
      {!navigating && route?.route_found ? (
        <section className="space-y-4 rounded-3xl border border-line bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted">Route ready</p>
          <h1 className="font-display text-4xl">Indoor navigation</h1>
          <p className="text-lg">
            {route.start.name} → {route.destination.name}
          </p>
          <p className="text-sm text-muted">{route.steps.length} steps · {stationName || route.station.name}</p>
          <button type="button" onClick={startNavigation} className="w-full min-h-12 rounded-full bg-metro py-3 font-semibold text-white">
            Start navigation
          </button>
          <button
            type="button"
            onClick={() => {
              setRoute(null);
              setError("");
            }}
            className="w-full min-h-12 rounded-full bg-paper py-3 font-semibold"
          >
            Change start or destination
          </button>
        </section>
      ) : null}
      {mapReady && stationId && nodes.length === 0 ? (
        <div className="rounded-3xl border border-line bg-card p-4" role="status">
          <h2 className="text-lg font-semibold">Indoor map unavailable</h2>
          <p className="mt-2 text-sm text-muted">Indoor navigation data is not currently available for this station.</p>
        </div>
      ) : null}
      {error && !navigating && !route?.route_found ? (
        <div className="rounded-3xl border border-line bg-card p-4" role="status">
          <h2 className="text-lg font-semibold">{route && !route.route_found ? "No route available" : "Unable to calculate"}</h2>
          <p className="mt-2 text-sm text-muted">{error}</p>
        </div>
      ) : null}
      {navigating && navigationState.active ? (
        <IndoorNavigation
          stationId={stationId}
          stationName={stationName}
          state={navigationState}
          onNext={() => moveBy(1)}
          onExit={exitNavigation}
          onRestart={() => {
            cancelAnim();
            setAutoMove(false);
            setStepIndex(0);
            const start = nodeById(route?.start.node_id ?? origin);
            if (start) {
              if (start.x != null && start.y != null) setYouXY({ x: start.x, y: start.y });
              applyNode(start, "SIMULATION_POSITION");
            }
          }}
          youName={youName}
          offRoute={offRoute}
          onRecalculate={() => void recalculate()}
          recalculating={recalculating}
          youX={youXY?.x ?? null}
          youY={youXY?.y ?? null}
          follow={follow}
          onFollowBreak={() => setFollow(false)}
          onRecenter={() => setFollow(true)}
          remainingDistance={arrived ? null : remainingDistance}
          currentFromId={guidanceFromId}
          currentToId={guidanceToId}
        >
          <PositionPanel
            position={position}
            nodes={nodes}
            currentName={youName}
            error={positionError}
            autoMove={autoMove}
            canMoveNext={!arrived && !moving && routeIndex >= 0 && routeIndex < routeNodeIds.length - 1}
            canMovePrev={!arrived && !moving && routeIndex > 0}
            arrived={arrived}
            onScan={() => {
              setPositionError("");
              setScanning(true);
            }}
            onManual={applyManual}
            onMoveNext={() => moveBy(1)}
            onMovePrev={() => moveBy(-1)}
            onToggleAuto={() => {
              setAutoMove((value) => {
                const next = !value;
                if (next) window.setTimeout(() => moveBy(1), 50);
                return next;
              });
            }}
          />
        </IndoorNavigation>
      ) : null}
      {scanning ? (
        <QrScanner
          onResult={(text) => void handleQrText(text)}
          onClose={() => setScanning(false)}
          onError={(message) => {
            setScanning(false);
            setPositionError(message);
          }}
        />
      ) : null}
      <PhaseNotice>
        Indoor position comes from station markers, your chosen location, or live movement along the route. GPS is not used as an indoor position.
      </PhaseNotice>
    </div>
  );
}
