import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { MapControls } from "../map/MapControls";
import { getIndoorMap, postIndoorRoute } from "../services/indoor";
import type { IndoorMapEdge, IndoorMapNode, IndoorMapPayload, IndoorRoute } from "../types";

const NODE_FILL: Record<string, string> = {
  ENTRANCE: "#0b5f78",
  EXIT: "#0b5f78",
  GATE: "#083d4e",
  STAIRS: "#c45c26",
  ESCALATOR: "#c45c26",
  LIFT: "#009a44",
  SECURITY: "#14202b",
  TICKET_COUNTER: "#0077c8",
  AFC_GATE: "#0077c8",
  CONCOURSE: "#5a6874",
  PLATFORM_ACCESS: "#d61f26",
  PLATFORM: "#d61f26",
  BUS_STOP: "#0077c8",
  PARKING: "#5a6874",
  FACILITY: "#0b5f78",
  INTERCHANGE: "#d61f26",
  WAYPOINT: "#5a6874",
};

type Camera = { minX: number; minY: number; spanX: number; spanY: number };

function nodeColor(type: string) {
  return NODE_FILL[type] ?? "#0b5f78";
}

function isSameSegment(fromId: string, toId: string, a: string | null, b: string | null) {
  if (!a || !b) return false;
  return (fromId === a && toId === b) || (fromId === b && toId === a);
}

function clampCamera(camera: Camera, width: number, height: number): Camera {
  const spanX = Math.min(width * 1.15, Math.max(width * 0.18, camera.spanX));
  const spanY = spanX * (height / width);
  const minX = Math.min(Math.max(camera.minX, -width * 0.08), width - spanX * 0.2);
  const minY = Math.min(Math.max(camera.minY, -height * 0.08), height - spanY * 0.2);
  return { minX, minY, spanX, spanY };
}

function cameraFromBox(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  width: number,
  height: number,
  pad = 10,
): Camera {
  const boxW = Math.max(maxX - minX + pad * 2, width * 0.28);
  const boxH = Math.max(maxY - minY + pad * 2, height * 0.28);
  const spanX = Math.max(boxW, boxH * (width / height));
  const spanY = spanX * (height / width);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return clampCamera({ minX: cx - spanX / 2, minY: cy - spanY / 2, spanX, spanY }, width, height);
}

function contentCamera(nodes: IndoorMapNode[], width: number, height: number): Camera {
  const placed = nodes.filter((node) => node.x != null && node.y != null);
  if (placed.length === 0) return { minX: 0, minY: 0, spanX: width, spanY: height };
  const xs = placed.map((node) => node.x as number);
  const ys = placed.map((node) => node.y as number);
  return cameraFromBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), width, height);
}

export function IndoorStationMap({
  stationId,
  route: externalRoute = null,
  showPlanner = true,
  currentNodeId = null,
  currentFromId = null,
  currentToId = null,
  compact = false,
  onLocate,
  youX = null,
  youY = null,
  follow = false,
  onFollowBreak,
}: {
  stationId: string;
  route?: IndoorRoute | null;
  showPlanner?: boolean;
  currentNodeId?: string | null;
  currentFromId?: string | null;
  currentToId?: string | null;
  compact?: boolean;
  onLocate?: () => void;
  youX?: number | null;
  youY?: number | null;
  follow?: boolean;
  onFollowBreak?: () => void;
}) {
  const [payload, setPayload] = useState<IndoorMapPayload | null>(null);
  const [levelId, setLevelId] = useState<string>("");
  const [camera, setCamera] = useState<Camera>({ minX: 0, minY: 0, spanX: 100, spanY: 70 });
  const [startId, setStartId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [route, setRoute] = useState<IndoorRoute | null>(null);
  const [routeError, setRouteError] = useState("");
  const drag = useRef<{ x: number; y: number; minX: number; minY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let active = true;
    void getIndoorMap(stationId)
      .then((data) => {
        if (!active) return;
        setPayload(data);
        const first = [...data.levels].sort((a, b) => a.level_order - b.level_order)[0];
        setLevelId(first?.id ?? "");
        if (showPlanner) {
          const gate = data.nodes.find((node) => node.node_code === "ST-GATE");
          const entrance = data.nodes.find((node) => node.node_code === "ST-ENT");
          const platform = data.nodes.find((node) => node.node_code === "PL-1");
          setStartId((gate ?? entrance ?? data.nodes[0])?.id ?? "");
          setDestinationId((platform ?? data.nodes.at(-1))?.id ?? "");
        }
        setRoute(null);
        setRouteError("");
      })
      .catch(() => {
        if (active) setPayload(null);
      });
    return () => {
      active = false;
    };
  }, [stationId, showPlanner]);

  const meta = payload?.map_metadata.find((item) => item.level_id === levelId);
  const width = meta?.map_width || 100;
  const height = meta?.map_height || 100;

  const levelNodes = useMemo(() => {
    if (!payload) return [];
    return payload.nodes.filter((node) => node.level_id === levelId && node.x != null && node.y != null);
  }, [payload, levelId]);

  const nodeIndex = useMemo(() => {
    const map = new Map<string, IndoorMapNode>();
    for (const node of levelNodes) map.set(node.id, node);
    return map;
  }, [levelNodes]);

  const levelEdges = useMemo(() => {
    if (!payload) return [];
    return payload.edges.filter((edge) => nodeIndex.has(edge.from_node_id) && nodeIndex.has(edge.to_node_id));
  }, [payload, nodeIndex]);

  const displayRoute = externalRoute ?? route;

  function fitImportant() {
    if (!payload) return;
    const ids = new Set<string>();
    if (currentNodeId) ids.add(currentNodeId);
    if (displayRoute?.route_found) {
      for (const node of displayRoute.nodes) {
        const full = payload.nodes.find((item) => item.id === node.node_id);
        if (full?.level_id === levelId) ids.add(node.node_id);
      }
    }
    const points = levelNodes.filter((node) => ids.size === 0 || ids.has(node.id));
    const box = contentCamera(points.length ? points : levelNodes, width, height);
    if (youX != null && youY != null) {
      setCamera(
        cameraFromBox(
          Math.min(box.minX, youX),
          Math.min(box.minY, youY),
          Math.max(box.minX + box.spanX, youX),
          Math.max(box.minY + box.spanY, youY),
          width,
          height,
          8,
        ),
      );
      return;
    }
    setCamera(box);
  }

  useEffect(() => {
    if (!payload) return;
    const first = payload.nodes.filter((node) => node.level_id === levelId && node.x != null);
    setCamera(contentCamera(first, width, height));
  }, [payload, levelId, width, height]);

  useEffect(() => {
    if (!payload || !currentNodeId) return;
    const current = payload.nodes.find((node) => node.id === currentNodeId);
    if (current) setLevelId(current.level_id);
  }, [currentNodeId, payload]);

  useEffect(() => {
    if (!follow || youX == null || youY == null) return;
    setCamera((prev) =>
      clampCamera({ ...prev, minX: youX - prev.spanX / 2, minY: youY - prev.spanY / 2 }, width, height),
    );
  }, [follow, youX, youY, width, height]);

  const routeEdgeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const edge of displayRoute?.edges ?? []) {
      keys.add(`${edge.from_node_id}|${edge.to_node_id}`);
      keys.add(`${edge.to_node_id}|${edge.from_node_id}`);
    }
    return keys;
  }, [displayRoute]);

  const routeNodeIds = useMemo(() => new Set((displayRoute?.nodes ?? []).map((node) => node.node_id)), [displayRoute]);

  async function findRoute() {
    if (!payload || !startId || !destinationId) return;
    setRouteError("");
    try {
      const result = await postIndoorRoute({
        station_id: payload.station.id,
        start_node_id: startId,
        destination_node_id: destinationId,
        accessible_only: accessibleOnly,
      });
      setRoute(result);
      if (!result.route_found) {
        setRouteError(result.reason === "ACCESSIBLE_ROUTE_NOT_AVAILABLE" ? "No accessible route between these points." : "No route between these points.");
      } else {
        const startNode = payload.nodes.find((node) => node.id === startId);
        if (startNode) setLevelId(startNode.level_id);
      }
    } catch (error) {
      setRoute(null);
      setRouteError(error instanceof Error ? error.message : "Could not calculate a route.");
    }
  }

  const routeDestinationId = displayRoute?.route_found ? displayRoute.destination.node_id : null;
  const youId = currentNodeId;
  const youNode = payload?.nodes.find((node) => node.id === youId);
  const onThisLevel = !youNode || youNode.level_id === levelId;
  const markerX = onThisLevel ? (youX ?? youNode?.x ?? null) : null;
  const markerY = onThisLevel ? (youY ?? youNode?.y ?? null) : null;
  const navigating = Boolean(youId || (currentFromId && currentToId) || markerX != null);

  function zoomBy(factor: number, pivotX?: number, pivotY?: number) {
    setCamera((prev) => {
      const px = pivotX ?? prev.minX + prev.spanX / 2;
      const py = pivotY ?? prev.minY + prev.spanY / 2;
      const ratioX = (px - prev.minX) / prev.spanX;
      const ratioY = (py - prev.minY) / prev.spanY;
      const spanX = prev.spanX * factor;
      const spanY = prev.spanY * factor;
      return clampCamera({ minX: px - ratioX * spanX, minY: py - ratioY * spanY, spanX, spanY }, width, height);
    });
  }

  function eventPoint(event: { clientX: number; clientY: number }) {
    const svg = svgRef.current;
    if (!svg) return { x: camera.minX + camera.spanX / 2, y: camera.minY + camera.spanY / 2 };
    const rect = svg.getBoundingClientRect();
    return {
      x: camera.minX + ((event.clientX - rect.left) / rect.width) * camera.spanX,
      y: camera.minY + ((event.clientY - rect.top) / rect.height) * camera.spanY,
    };
  }

  function onWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const point = eventPoint(event);
    zoomBy(event.deltaY < 0 ? 0.82 : 1.22, point.x, point.y);
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    drag.current = { x: event.clientX, y: event.clientY, minX: camera.minX, minY: camera.minY };
    onFollowBreak?.();
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - drag.current.x) / rect.width) * camera.spanX;
    const dy = ((event.clientY - drag.current.y) / rect.height) * camera.spanY;
    setCamera(
      clampCamera(
        { ...camera, minX: drag.current.minX - dx, minY: drag.current.minY - dy },
        width,
        height,
      ),
    );
  }

  function onPointerUp() {
    drag.current = null;
  }

  if (!payload || payload.nodes.length === 0) {
    return (
      <article className="rounded-3xl border border-line bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Station floor map</h2>
        <p className="mt-2 text-sm text-muted">Indoor navigation data is not currently available for this station.</p>
      </article>
    );
  }

  const viewBox = `${camera.minX} ${camera.minY} ${camera.spanX} ${camera.spanY}`;
  const labelSize = Math.max(2.6, width * 0.026);
  const nodeR = Math.max(1.2, width * 0.012);
  const destR = Math.max(1.8, width * 0.018);
  const youR = Math.max(2.4, width * 0.024);
  const lineW = Math.max(1.6, width * 0.018);
  const routeW = Math.max(2.2, width * 0.022);

  return (
    <article className={compact ? "flex h-full min-h-[360px] flex-col" : "rounded-3xl border border-line bg-card p-4 shadow-sm"}>
      {compact ? null : (
        <>
          <h2 className="text-lg font-semibold">{showPlanner ? "Indoor map" : "Station floor map"}</h2>
          <p className="mt-1 text-sm text-muted">{payload.station.name}</p>
          {displayRoute?.route_found ? (
            <p className="mt-1 text-sm">
              {displayRoute.start.name}
              <span className="text-muted"> → </span>
              {displayRoute.destination.name}
            </p>
          ) : null}
        </>
      )}
      <fieldset className={compact ? "mb-2" : "mt-3"}>
        <legend className={compact ? "sr-only" : "text-sm font-semibold"}>Level</legend>
        <div className={`${compact ? "mt-0" : "mt-2"} flex flex-wrap gap-2`}>
          {payload.levels.map((level) => (
            <button
              key={level.id}
              type="button"
              onClick={() => setLevelId(level.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                levelId === level.id ? "bg-metro text-white" : "bg-paper text-ink"
              }`}
            >
              {level.name}
            </button>
          ))}
        </div>
      </fieldset>
      {showPlanner ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Start</span>
              <select
                value={startId}
                onChange={(e) => setStartId(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
              >
                {payload.nodes.map((node) => {
                  const level = payload.levels.find((item) => item.id === node.level_id);
                  return (
                    <option key={`start-${node.id}`} value={node.id}>
                      {node.name}
                      {level ? ` · ${level.name}` : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Destination</span>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
              >
                {payload.nodes.map((node) => {
                  const level = payload.levels.find((item) => item.id === node.level_id);
                  return (
                    <option key={`dest-${node.id}`} value={node.id}>
                      {node.name}
                      {level ? ` · ${level.name}` : ""}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={accessibleOnly} onChange={(e) => setAccessibleOnly(e.target.checked)} />
            Accessible route
          </label>
          <button type="button" onClick={() => void findRoute()} className="mt-3 rounded-full bg-metro px-4 py-2 font-semibold text-white">
            Find route
          </button>
          {routeError ? <p className="mt-2 text-sm text-muted">{routeError}</p> : null}
        </>
      ) : null}
      <div className={compact ? "relative mt-0 min-h-0 flex-1 overflow-hidden rounded-3xl border border-line bg-paper" : "relative mt-3 overflow-hidden rounded-2xl border border-line bg-paper"}>
        <svg
          ref={svgRef}
          role="img"
          aria-label={`${payload.station.name} station floor map`}
          viewBox={viewBox}
          className={`w-full touch-none ${compact ? "h-full min-h-[360px]" : "h-72 sm:h-96"}`}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <rect x={camera.minX - camera.spanX} y={camera.minY - camera.spanY} width={camera.spanX * 3} height={camera.spanY * 3} fill="#f6f1ea" />
          {levelEdges.map((edge: IndoorMapEdge) => {
            const from = nodeIndex.get(edge.from_node_id);
            const to = nodeIndex.get(edge.to_node_id);
            if (!from || !to || from.x == null || from.y == null || to.x == null || to.y == null) return null;
            return (
              <line
                key={`floor-${edge.id}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#e4d8c8"
                strokeWidth={lineW}
                strokeLinecap="round"
              />
            );
          })}
          {levelEdges.map((edge: IndoorMapEdge) => {
            const from = nodeIndex.get(edge.from_node_id);
            const to = nodeIndex.get(edge.to_node_id);
            if (!from || !to || from.x == null || from.y == null || to.x == null || to.y == null) return null;
            const onRoute = routeEdgeKeys.has(`${edge.from_node_id}|${edge.to_node_id}`);
            if (onRoute) return null;
            return (
              <line
                key={edge.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#cbbca8"
                strokeWidth={Math.max(0.8, width * 0.008)}
                strokeDasharray={edge.connection_type === "WALK" ? undefined : "3 2"}
              />
            );
          })}
          {(displayRoute?.nodes ?? []).map((node, index, list) => {
            const next = list[index + 1];
            if (!next || !payload) return null;
            const from = payload.nodes.find((item) => item.id === node.node_id);
            const to = payload.nodes.find((item) => item.id === next.node_id);
            if (!from || !to || from.level_id !== levelId || to.level_id !== levelId) return null;
            if (from.x == null || from.y == null || to.x == null || to.y == null) return null;
            const currentSeg = isSameSegment(from.id, to.id, currentFromId, currentToId);
            const currentRouteIndex = currentNodeId ? list.findIndex((item) => item.node_id === currentNodeId) : -1;
            const completed = !currentSeg && currentRouteIndex >= 0 && Math.max(index, index + 1) <= currentRouteIndex;
            return (
              <line
                key={`route-${node.node_id}-${next.node_id}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={currentSeg ? "#0b5f78" : completed ? "#9aa6b0" : "#0b5f78"}
                strokeWidth={currentSeg ? routeW * 1.15 : routeW}
                strokeOpacity={currentSeg ? 1 : completed ? 0.45 : 0.9}
                strokeLinecap="round"
              />
            );
          })}
          {levelNodes.map((node) => {
            const isDest = node.id === routeDestinationId;
            const x = node.x ?? 0;
            const y = node.y ?? 0;
            const r = isDest ? destR : nodeR;
            const showLabel = compact ? isDest : camera.spanX < width * 0.7;
            return (
              <g key={node.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={Math.max(r, 1.1)}
                  fill={isDest ? "#b42318" : nodeColor(node.node_type)}
                  opacity={routeNodeIds.has(node.id) || isDest ? 1 : 0.45}
                />
                {showLabel ? (
                  <text x={x + destR * 1.4} y={y + destR * 2.2} fontSize={labelSize} fill={isDest ? "#b42318" : "#14202b"} fontWeight={isDest ? 700 : 500}>
                    {isDest ? "Destination" : node.name}
                  </text>
                ) : null}
              </g>
            );
          })}
          {markerX != null && markerY != null ? (
            <g>
              <circle cx={markerX} cy={markerY} r={youR * 2.1} fill="#0077c8" fillOpacity={0.16} />
              <circle
                cx={markerX}
                cy={markerY}
                r={youR}
                fill="#0077c8"
                stroke="#ffffff"
                strokeWidth={youR * 0.28}
              />
              <circle cx={markerX} cy={markerY} r={youR * 0.32} fill="#ffffff" />
              <text
                x={markerX}
                y={markerY - youR * 2.1}
                textAnchor="middle"
                fontSize={labelSize}
                fill="#0077c8"
                fontWeight={700}
              >
                You
              </text>
            </g>
          ) : null}
        </svg>
        <MapControls
          onZoomIn={() => {
            onFollowBreak?.();
            zoomBy(0.8, markerX ?? undefined, markerY ?? undefined);
          }}
          onZoomOut={() => {
            onFollowBreak?.();
            zoomBy(1.25, markerX ?? undefined, markerY ?? undefined);
          }}
          locateLabel="Recenter"
          onLocate={() => {
            onLocate?.();
            if (youX != null && youY != null) {
              setCamera((prev) => clampCamera({ ...prev, minX: youX - prev.spanX / 2, minY: youY - prev.spanY / 2 }, width, height));
            }
          }}
          onFit={fitImportant}
        />
      </div>
      {!compact && (navigating || displayRoute?.route_found) ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#0077c8]" />
            You
          </li>
          <li>
            <span className="mr-1 inline-block h-0.5 w-6 align-middle" style={{ background: "#0b5f78" }} />
            Route
          </li>
          <li>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#b42318]" />
            Destination
          </li>
        </ul>
      ) : null}
      {showPlanner && displayRoute?.route_found ? (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Route</h3>
          <p className="mt-1 text-sm text-muted">
            {displayRoute.start.name} → {displayRoute.destination.name}
            {displayRoute.estimated_time_sec != null ? ` · ${displayRoute.estimated_time_sec} sec` : ""}
            {displayRoute.total_distance_m != null ? ` · ${displayRoute.total_distance_m} m` : ""}
            {` · ${displayRoute.steps.length} steps`}
          </p>
        </div>
      ) : null}
    </article>
  );
}
