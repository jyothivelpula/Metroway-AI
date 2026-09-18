import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PhaseNotice } from "../components/PhaseNotice";
import { LineChip } from "../components/LineChip";
import { getNetwork, getStationConnections } from "../services/network";
import { stationKey } from "../services/stations";
import {
  asMetroLines,
  type MetroLine,
  type NetworkLine,
  type NetworkStation,
  type StationNeighborhood,
  type StationSummary,
} from "../types";

const LINE_BAR: Record<string, string> = {
  Red: "bg-red-line",
  Blue: "bg-blue-line",
  Green: "bg-green-line",
  RED: "bg-red-line",
  BLUE: "bg-blue-line",
  GREEN: "bg-green-line",
};

function toSummary(station: NetworkStation, lineName: string): StationSummary {
  return {
    id: station.id,
    station_code: station.station_code,
    station_name: station.name,
    telugu_name: null,
    alternate_name: station.alternate_name,
    station_status: "OPERATIONAL",
    city: "Hyderabad",
    state: "Telangana",
    verification_status: station.verification_status,
    is_interchange: station.is_interchange,
    is_terminal: station.is_terminal,
    lines: [lineName],
  };
}

export function MetroMapPage() {
  const [line, setLine] = useState<"All" | "Red" | "Blue" | "Green">("All");
  const [query, setQuery] = useState("");
  const [networkLines, setNetworkLines] = useState<NetworkLine[]>([]);
  const [selected, setSelected] = useState<NetworkStation | null>(null);
  const [neighbors, setNeighbors] = useState<StationNeighborhood | null>(null);

  useEffect(() => {
    void getNetwork()
      .then((payload) => setNetworkLines(payload.lines))
      .catch(() => setNetworkLines([]));
  }, []);

  useEffect(() => {
    if (!selected) {
      setNeighbors(null);
      return;
    }
    void getStationConnections(selected.alternate_name || selected.station_code)
      .then(setNeighbors)
      .catch(() => setNeighbors(null));
  }, [selected]);

  const visibleLines = useMemo(() => {
    if (line === "All") return networkLines;
    return networkLines.filter(
      (item) => item.display_name === line || item.code === line.toUpperCase(),
    );
  }, [line, networkLines]);

  const interchanges = useMemo(() => {
    const seen = new Map<string, StationSummary>();
    for (const networkLine of networkLines) {
      for (const station of networkLine.stations.filter((item) => item.is_interchange)) {
        const current = seen.get(station.id);
        const summary = toSummary(station, networkLine.display_name);
        if (current) {
          current.lines = Array.from(new Set([...current.lines, ...summary.lines]));
        } else {
          seen.set(station.id, summary);
        }
      }
    }
    return Array.from(seen.values());
  }, [networkLines]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const found: NetworkStation[] = [];
    for (const networkLine of visibleLines) {
      for (const station of networkLine.stations) {
        if (
          station.name.toLowerCase().includes(q) ||
          station.station_code.toLowerCase().includes(q) ||
          (station.alternate_name ?? "").includes(q)
        ) {
          if (!found.some((item) => item.id === station.id)) found.push(station);
        }
      }
    }
    return found.slice(0, 5);
  }, [query, visibleLines]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Hyderabad Metro map</h1>
      <p className="max-w-2xl text-muted">
        Public corridor order for Red, Blue, and Green lines. Distances and indoor maps are not shown here.
      </p>
      <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
        <label htmlFor="network-search" className="text-sm font-semibold">
          Search stations
        </label>
        <input
          id="network-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or code"
          className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
        />
        <fieldset className="mt-3">
          <legend className="text-sm font-semibold">Line</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["All", "Red", "Blue", "Green"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLine(item)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  line === item ? "bg-metro text-white" : "bg-paper text-ink"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>
        {matches.length > 0 && (
          <ul className="mt-3 space-y-2" aria-label="Search results">
            {matches.map((station) => (
              <li key={station.id}>
                <Link
                  to={`/stations/${station.alternate_name || station.station_code}`}
                  className="flex items-center justify-between rounded-2xl bg-paper px-3 py-3 no-underline"
                >
                  <span>
                    <span className="block font-semibold text-ink">{station.name}</span>
                    <span className="text-sm text-muted">{station.station_code}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-3 rounded-3xl border border-line bg-card p-4 shadow-sm">
        {visibleLines.map((networkLine) => (
          <div key={networkLine.id} className="rounded-2xl bg-paper p-4">
            <div className="flex items-center gap-3">
              <span
                className={`h-3 w-16 rounded-full ${LINE_BAR[networkLine.display_name] ?? "bg-metro"}`}
                aria-hidden="true"
              />
              <h2 className="text-lg font-semibold">{networkLine.name}</h2>
            </div>
            <p className="mt-2 text-sm text-muted">
              {networkLine.origin_station} → {networkLine.terminal_station}
            </p>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {networkLine.stations.map((station, index) => (
                <div key={station.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(station)}
                    className="whitespace-nowrap rounded-2xl bg-card px-4 py-3 text-sm font-semibold text-ink"
                  >
                    {station.name}
                    {station.is_interchange ? " · Interchange" : ""}
                    {station.is_terminal ? " · Terminal" : ""}
                  </button>
                  {index < networkLine.stations.length - 1 && (
                    <span
                      className={`h-1 w-8 rounded-full ${LINE_BAR[networkLine.display_name] ?? "bg-metro"}`}
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <article className="rounded-3xl border border-line bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold">{selected.name}</h2>
          <p className="mt-2 text-sm text-muted">
            Sequence {selected.sequence}
            {selected.is_interchange ? " · Interchange" : ""}
            {selected.is_terminal ? " · Terminal" : ""}
          </p>
          {neighbors?.connections.map((item) => (
            <p key={item.line} className="mt-2 text-sm text-muted">
            {item.line === "RED" ? "Red Line" : item.line === "BLUE" ? "Blue Line" : item.line === "GREEN" ? "Green Line" : item.line}: {item.previous_station?.name ?? "Origin"} → {item.next_station?.name ?? "Terminal"}
            </p>
          ))}
          <Link
            to={`/stations/${selected.alternate_name || selected.station_code}`}
            className="mt-4 inline-flex rounded-full bg-metro px-4 py-2 font-semibold text-white no-underline"
          >
            Station details
          </Link>
        </article>
      )}
      <h2 className="font-display text-2xl">Interchange stations</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {interchanges.map((station) => (
          <li key={station.id}>
            <Link
              to={`/stations/${stationKey(station)}`}
              className="flex items-center justify-between rounded-3xl border border-line bg-card px-4 py-4 no-underline shadow-sm"
            >
              <span className="font-semibold">{station.station_name}</span>
              <span className="flex gap-1">
                {asMetroLines(station.lines).map((metroLine: MetroLine) => (
                  <LineChip key={metroLine} line={metroLine} />
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <PhaseNotice>
        Station order follows the public corridor. Intermediate stations not yet in the dataset are omitted.
      </PhaseNotice>
    </div>
  );
}
