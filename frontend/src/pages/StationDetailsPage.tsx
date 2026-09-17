import { Link, useParams } from "react-router-dom";
import { DEMO_STATIONS } from "../data/demo";
import { LineChip } from "../components/LineChip";
import { PhaseNotice } from "../components/PhaseNotice";

export function StationDetailsPage() {
  const { stationId } = useParams();
  const station = DEMO_STATIONS.find((s) => s.id === stationId);

  if (!station) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-3xl">Station not found</h1>
        <Link to="/stations" className="text-metro">
          Back to directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted">Demo station</p>
      <h1 className="font-display text-4xl">{station.name}</h1>
      <div className="flex flex-wrap gap-2">
        {station.lines.map((line) => (
          <LineChip key={line} line={line} />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {["Platforms", "Gates", "Facilities", "Accessibility"].map((item) => (
          <article key={item} className="rounded-3xl border border-line bg-card p-4 shadow-sm">
            <h2 className="text-lg font-semibold">{item}</h2>
            <p className="mt-2 text-sm text-muted">Not loaded in Phase 1. Verified data is required before this is shown.</p>
          </article>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/navigation?station=${station.id}`}
          className="rounded-full bg-metro px-4 py-2 font-semibold text-white no-underline"
        >
          Start navigation
        </Link>
        <Link to="/stations" className="rounded-full bg-paper px-4 py-2 font-semibold text-ink no-underline">
          All stations
        </Link>
      </div>
      <PhaseNotice>
        Indoor maps for this station are scheduled for Phase 4. Do not treat this screen as a real layout.
      </PhaseNotice>
    </div>
  );
}
