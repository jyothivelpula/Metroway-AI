import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
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

function nodeColor(type: string) {
  return NODE_FILL[type] ?? "#0b5f78";
}

function isSameSegment(fromId: string, toId: string, a: string | null, b: string | null) {
  if (!a || !b) return false;
  return (fromId === a && toId === b) || (fromId === b && toId === a);
}

export function IndoorStationMap({
  stationId,
  route: externalRoute = null,
  showPlanner = true,
  currentNodeId = null,
  currentFromId = null,
  currentToId = null,
}: {
  stationId: string;
  route?: IndoorRoute | null;
  showPlanner?: boolean;
  currentNodeId?: string | null;
  currentFromId?: string | null;
  currentToId?: string | null;
}) {
  const [payload, setPayload] = useState<IndoorMapPayload | null>(null);
  const [levelId, setLevelId] = useState<string>("");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [startId, setStartId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [route, setRoute] = useState<IndoorRoute | null>(null);
  const [routeError, setRouteError] = useState("");
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    let active = true;
    void getIndoorMap(stationId)
      .then((data) => {
        if (!active) return;
        setPayload(data);
        const first = [...data.levels].sort((a, b) => a.level_order - b.level_order)[0];
        setLevelId(first?.id ?? "");
        setScale(1);
        setOffset({ x: 0, y: 0 });
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

  useEffect(() => {
    if (!payload || !displayRoute?.route_found) return;
    const current = payload.nodes.find((node) => node.id === (currentNodeId || displayRoute.start.node_id));
    const partner =
      payload.nodes.find((node) => node.id === currentToId && node.id !== current?.id) ??
      payload.nodes.find((node) => node.id === currentFromId && node.id !== current?.id);
    if (current) {
      setLevelId(current.level_id);
      if (current.x != null && current.y != null) {
        const mapWidth = payload.map_metadata.find((item) => item.level_id === current.level_id)?.map_width || 100;
        const mapHeight = payload.map_metadata.find((item) => item.level_id === current.level_id)?.map_height || 100;
        const sameLevel = partner && partner.level_id === current.level_id && partner.x != null && partner.y != null;
        const focusX = sameLevel ? (current.x + (partner.x as number)) / 2 : current.x;
        const focusY = sameLevel ? (current.y + (partner.y as number)) / 2 : current.y;
        setOffset({ x: mapWidth / 2 - focusX, y: mapHeight / 2 - focusY });
        setScale(sameLevel ? 1.55 : 1.4);
      }
    }
  }, [displayRoute, payload, currentNodeId, currentFromId, currentToId]);

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

  const meta = payload?.map_metadata.find((item) => item.level_id === levelId);
  const width = meta?.map_width || 100;
  const height = meta?.map_height || 100;
  const routeDestinationId = displayRoute?.route_found ? displayRoute.destination.node_id : null;
  const youId = currentNodeId;
  const navigating = Boolean(youId || (currentFromId && currentToId));

  function onWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const next = event.deltaY < 0 ? scale * 1.1 : scale / 1.1;
    setScale(Math.min(4, Math.max(0.7, next)));
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drag.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - drag.current.x) / rect.width) * width;
    const dy = ((event.clientY - drag.current.y) / rect.height) * height;
    setOffset({ x: drag.current.ox + dx, y: drag.current.oy + dy });
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

  return (
    <article className="rounded-3xl border border-line bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">{showPlanner ? "Indoor map" : "Station floor map"}</h2>
      <p className="mt-1 text-sm text-muted">{payload.station.name}</p>
      {displayRoute?.route_found ? (
        <p className="mt-1 text-sm">
          {displayRoute.start.name}
          <span className="text-muted"> → </span>
          {displayRoute.destination.name}
        </p>
      ) : null}
      <fieldset className="mt-3">
        <legend className="text-sm font-semibold">Level</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {payload.levels.map((level) => (
            <button
              key={level.id}
              type="button"
              onClick={() => {
                setLevelId(level.id);
                setScale(1);
                setOffset({ x: 0, y: 0 });
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                levelId === level.id ? "bg-metro text-white" : "bg-paper text-ink"
              }`}
            >
              {level.name}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rounded-full bg-paper px-4 py-2 text-sm font-semibold" onClick={() => setScale((value) => Math.min(4, value * 1.2))}>
          Zoom in
        </button>
        <button type="button" className="rounded-full bg-paper px-4 py-2 text-sm font-semibold" onClick={() => setScale((value) => Math.max(0.7, value / 1.2))}>
          Zoom out
        </button>
        <button
          type="button"
          className="rounded-full bg-paper px-4 py-2 text-sm font-semibold"
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
        >
          Reset
        </button>
      </div>
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
      {navigating || displayRoute?.route_found ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#0077c8]" />
            You
          </li>
          <li>
            <span className="mr-1 inline-block h-2 w-6 align-middle" style={{ background: "#c45c26" }} />
            Current segment
          </li>
          <li>
            <span className="mr-1 inline-block h-0.5 w-6 align-middle" style={{ background: "#5a6874" }} />
            Completed
          </li>
          <li>
            <span className="mr-1 inline-block h-0.5 w-6 align-middle" style={{ background: "#0b5f78" }} />
            Remaining route
          </li>
          <li>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#d61f26]" />
            Destination
          </li>
        </ul>
      ) : null}
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-paper">
        <svg
          role="img"
          aria-label={`${payload.station.name} station floor map`}
          viewBox={`0 0 ${width} ${height}`}
          className="h-72 w-full touch-none sm:h-96"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <rect width={width} height={height} fill="#f6f1ea" />
          <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
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
                  strokeWidth={edge.connection_type === "WALK" || edge.connection_type === "ENTRANCE" || edge.connection_type === "EXIT" ? 5.5 : 4}
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
                  strokeWidth={1.1}
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
                  stroke={currentSeg ? "#c45c26" : completed ? "#5a6874" : "#0b5f78"}
                  strokeWidth={currentSeg ? 3.6 : 2.4}
                  strokeOpacity={currentSeg ? 1 : completed ? 0.35 : 0.55}
                  strokeLinecap="round"
                  strokeDasharray={currentSeg || completed ? undefined : "2.4 1.6"}
                />
              );
            })}
            {levelNodes.map((node) => {
              const isYou = node.id === youId;
              const isDest = node.id === routeDestinationId;
              const x = node.x ?? 0;
              const y = node.y ?? 0;
              return (
                <g key={node.id}>
                  {isDest ? (
                    <>
                      <circle cx={x} cy={y} r={6.2} fill="none" stroke="#d61f26" strokeWidth={1.1} />
                      <circle cx={x} cy={y} r={3.8} fill="none" stroke="#d61f26" strokeWidth={0.9} />
                    </>
                  ) : null}
                  <circle
                    cx={x}
                    cy={y}
                    r={isYou ? 4.4 : isDest ? 3.2 : routeNodeIds.has(node.id) ? 3 : 2.5}
                    fill={isYou ? "#0077c8" : isDest ? "#d61f26" : nodeColor(node.node_type)}
                    stroke={isYou ? "#ffffff" : "none"}
                    strokeWidth={isYou ? 1.1 : 0}
                  />
                  {isYou ? (
                    <text x={x - 7} y={y - 7} fontSize="3.6" fill="#0077c8" fontWeight="700">
                      YOU
                    </text>
                  ) : isDest ? (
                    <text x={x - 8} y={y - 8} fontSize="3.4" fill="#d61f26" fontWeight="700">
                      DEST
                    </text>
                  ) : null}
                  <text x={x + 3.4} y={y + 1.2} fontSize="3.2" fill="#14202b">
                    {node.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
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
