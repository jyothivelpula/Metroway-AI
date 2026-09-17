import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { DEMO_DESTINATIONS, DEMO_STATIONS } from "../data/demo";
import { PhaseNotice } from "../components/PhaseNotice";

export function NavigationPage() {
  const [params] = useSearchParams();
  const intent = params.get("intent");
  const presetStation = params.get("station") ?? "";
  const [stationId, setStationId] = useState(presetStation);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState(intent === "exit" ? "gate-a" : "");
  const [submitted, setSubmitted] = useState(false);

  const destinations = useMemo(() => {
    if (intent === "exit") return DEMO_DESTINATIONS.filter((d) => d.kind === "gate");
    return DEMO_DESTINATIONS;
  }, [intent]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">
        {intent === "exit" ? "Find an exit" : "Start indoor navigation"}
      </h1>
      <p className="max-w-2xl text-muted">
        This screen collects origin and destination. The route engine is Phase 5. No walking path is
        calculated yet.
      </p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-line bg-card p-4 shadow-sm">
        <label className="block">
          <span className="text-sm font-semibold">Station</span>
          <select
            required
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
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
        <label className="block">
          <span className="text-sm font-semibold">I am near</span>
          <select
            required
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
          >
            <option value="">Choose a demo location</option>
            {DEMO_DESTINATIONS.map((place) => (
              <option key={place.id} value={place.id}>
                {place.label}
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
                {place.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="w-full rounded-full bg-metro py-3 font-semibold text-white">
          Prepare route
        </button>
      </form>
      {submitted && (
        <div className="rounded-3xl border border-line bg-card p-4" role="status">
          <h2 className="text-lg font-semibold">Route not calculated</h2>
          <p className="mt-2 text-sm text-muted">
            UI captured your request. Dijkstra / A* routing and step-by-step guidance will be added
            in Phases 5–6 using verified station graphs — not an LLM.
          </p>
        </div>
      )}
      <PhaseNotice>
        Demo locations such as “Platform 1” are placeholders. They are not real station coordinates.
      </PhaseNotice>
    </div>
  );
}
