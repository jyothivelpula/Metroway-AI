import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { IndoorNavigation } from "../components/IndoorNavigation";
import { IndoorStationMap } from "../components/IndoorStationMap";
import { PhaseNotice } from "../components/PhaseNotice";
import { checkUserOnRoute, createNavigationState } from "../navigation/session";
import { getIndoorMap, postIndoorRoute } from "../services/indoor";
import { getStations, matchesStationKey } from "../services/stations";
import type { IndoorMapNode, IndoorRoute, StationSummary } from "../types";

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
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<IndoorRoute | null>(null);
  const [error, setError] = useState("");
  const [navigating, setNavigating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

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
      setOrigin("");
      setDestination("");
      setRoute(null);
      setNavigating(false);
      setStepIndex(0);
      setMapReady(false);
      return;
    }
    let active = true;
    setMapReady(false);
    void getIndoorMap(stationId)
      .then((payload) => {
        if (!active) return;
        setNodes(payload.nodes);
        setMapReady(true);
        const entrance = payload.nodes.find((node) => node.node_type === "ENTRANCE");
        const concourse = payload.nodes.find((node) => node.node_type === "CONCOURSE");
        setOrigin(entrance?.id ?? payload.nodes[0]?.id ?? "");
        setDestination(concourse?.id ?? payload.nodes.at(-1)?.id ?? "");
        setRoute(null);
        setError("");
        setNavigating(false);
        setStepIndex(0);
      })
      .catch(() => {
        if (!active) return;
        setNodes([]);
        setMapReady(true);
        setOrigin("");
        setDestination("");
        setRoute(null);
        setNavigating(false);
        setStepIndex(0);
      });
    return () => {
      active = false;
    };
  }, [stationId]);

  const destinations = useMemo(() => {
    if (intent === "exit") return nodes.filter((node) => node.node_type === "GATE" || node.node_type === "EXIT");
    const filtered = nodes.filter((node) => DESTINATION_TYPES.has(node.node_type));
    return filtered.length > 0 ? filtered : nodes;
  }, [intent, nodes]);

  const stationName = stations.find((station) => matchesStationKey(station, stationId))?.station_name ?? "";
  const navigationState = createNavigationState(navigating ? route : null, stepIndex, "MANUAL_STEP");
  const routeStatus = checkUserOnRoute(
    route?.nodes.map((node) => node.node_id) ?? [],
    navigationState.currentNodeId,
  );

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
        setNavigating(true);
        setStepIndex(0);
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
    setNavigating(false);
    setStepIndex(0);
  }

  return (
    <div className="space-y-4">
      {!navigating ? (
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
              <select
                required
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
              >
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
              <select
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
              >
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
      {mapReady && stationId && nodes.length === 0 ? (
        <div className="rounded-3xl border border-line bg-card p-4" role="status">
          <h2 className="text-lg font-semibold">Indoor map unavailable</h2>
          <p className="mt-2 text-sm text-muted">Indoor navigation data is not currently available for this station.</p>
        </div>
      ) : null}
      {error && !navigating ? (
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
          onNext={() => setStepIndex((value) => Math.min(navigationState.totalSteps - 1, value + 1))}
          onBack={() => setStepIndex((value) => Math.max(0, value - 1))}
          onExit={exitNavigation}
          onRestart={() => setStepIndex(0)}
        />
      ) : stationId ? (
        <IndoorStationMap stationId={stationId} route={route} showPlanner={false} />
      ) : null}
      {navigating && route?.route_found ? (
        <details className="rounded-3xl border border-line bg-card p-4">
          <summary className="cursor-pointer font-semibold">Route details</summary>
          <ol className="mt-3 space-y-1 text-sm">
            {route.nodes.map((node) => (
              <li key={node.node_id}>{node.name}</li>
            ))}
          </ol>
          <p className="mt-2 text-sm text-muted">
            {route.start.name} → {route.destination.name}
            {route.total_distance_m != null ? ` · ${route.total_distance_m} m` : ""}
            {route.estimated_time_sec != null ? ` · ${route.estimated_time_sec} sec` : ""}
            {` · ${route.steps.length} steps`}
            {routeStatus === "OFF_ROUTE" ? " · Off route" : ""}
          </p>
        </details>
      ) : null}
      <PhaseNotice>
        Indoor maps are schematic for routing tests. They are not a verified station survey. Next advances the instruction;
        the app is not tracking your live position.
      </PhaseNotice>
    </div>
  );
}
