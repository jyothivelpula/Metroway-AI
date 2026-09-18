import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LineChip } from "../components/LineChip";
import { DemoBanner } from "../components/DemoBanner";
import { PhaseNotice } from "../components/PhaseNotice";
import { pushRecent } from "../hooks/recentStations";
import { getStations, stationKey } from "../services/stations";
import { asMetroLines, type StationSummary } from "../types";

export function StationsPage() {
  const [query, setQuery] = useState("");
  const [line, setLine] = useState<"All" | "Red" | "Blue" | "Green">("All");
  const [stations, setStations] = useState<StationSummary[]>([]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void getStations({ q: query.trim() || undefined, line })
        .then(setStations)
        .catch(() => setStations([]));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query, line]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Station directory</h1>
      <DemoBanner />
      <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
        <label htmlFor="station-search" className="text-sm font-semibold">
          Search stations
        </label>
        <input
          id="station-search"
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
      </div>
      <ul className="space-y-2">
        {stations.map((station) => (
          <li key={station.id}>
            <Link
              to={`/stations/${stationKey(station)}`}
              onClick={() => pushRecent(stationKey(station))}
              className="flex items-center justify-between rounded-3xl border border-line bg-card px-4 py-4 no-underline shadow-sm"
            >
              <span>
                <span className="block text-lg font-semibold">{station.station_name}</span>
                <span className="text-sm text-muted">
                  {station.station_code}
                  {station.is_interchange ? " · Interchange" : ""}
                </span>
              </span>
              <span className="flex gap-1">
                {asMetroLines(station.lines).map((l) => (
                  <LineChip key={l} line={l} />
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <PhaseNotice>
        Station directory for Hyderabad Metro. Indoor layouts are added when verified station data is available.
      </PhaseNotice>
    </div>
  );
}
