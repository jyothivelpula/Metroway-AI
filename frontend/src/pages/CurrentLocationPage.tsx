import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { DEMO_STATIONS } from "../data/demo";
import { PhaseNotice } from "../components/PhaseNotice";
import { pushRecent } from "../hooks/recentStations";

export function CurrentLocationPage() {
  const [stationId, setStationId] = useState("");
  const [saved, setSaved] = useState(false);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!stationId) return;
    pushRecent(stationId);
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Current location</h1>
      <p className="max-w-2xl text-muted">
        GPS is useful for finding a nearby outdoor station later. For now, pick a station by hand.
      </p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-line bg-card p-4 shadow-sm">
        <label className="block">
          <span className="text-sm font-semibold">I am at this station</span>
          <select
            required
            value={stationId}
            onChange={(e) => {
              setStationId(e.target.value);
              setSaved(false);
            }}
            className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
          >
            <option value="">Select a demo station</option>
            {DEMO_STATIONS.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="w-full rounded-full bg-metro py-3 font-semibold text-white">
          Save on this device
        </button>
      </form>
      {saved && (
        <p className="rounded-2xl bg-card px-4 py-3" role="status">
          Saved.{" "}
          <Link className="font-semibold text-metro" to={`/navigation?station=${stationId}`}>
            Continue to navigation
          </Link>
        </p>
      )}
      <PhaseNotice>QR markers and indoor positioning are planned for Phase 7.</PhaseNotice>
    </div>
  );
}
