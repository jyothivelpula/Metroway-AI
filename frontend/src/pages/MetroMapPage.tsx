import { Link } from "react-router-dom";
import { PhaseNotice } from "../components/PhaseNotice";
import { DEMO_STATIONS } from "../data/demo";
import { LineChip } from "../components/LineChip";

const corridors = [
  { name: "Red Line", className: "bg-red-line", from: "Miyapur", to: "LB Nagar" },
  { name: "Blue Line", className: "bg-blue-line", from: "Nagole", to: "Raidurg" },
  { name: "Green Line", className: "bg-green-line", from: "JBS Parade Ground", to: "M.G. Bus Station" },
];

export function MetroMapPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Hyderabad Metro map</h1>
      <p className="max-w-2xl text-muted">
        This is a Phase 1 schematic for navigation through the app. The interactive network map is
        planned for Phase 3.
      </p>
      <div className="space-y-3 rounded-3xl border border-line bg-card p-4 shadow-sm">
        {corridors.map((line) => (
          <div key={line.name} className="rounded-2xl bg-paper p-4">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-16 rounded-full ${line.className}`} aria-hidden="true" />
              <h2 className="text-lg font-semibold">{line.name}</h2>
            </div>
            <p className="mt-2 text-sm text-muted">
              {line.from} → {line.to}
            </p>
          </div>
        ))}
      </div>
      <h2 className="font-display text-2xl">Select a demo station</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {DEMO_STATIONS.filter((s) => s.interchange).map((station) => (
          <li key={station.id}>
            <Link
              to={`/stations/${station.id}`}
              className="flex items-center justify-between rounded-3xl border border-line bg-card px-4 py-4 no-underline shadow-sm"
            >
              <span className="font-semibold">{station.name}</span>
              <span className="flex gap-1">
                {station.lines.map((line) => (
                  <LineChip key={line} line={line} />
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <PhaseNotice>
        Line endpoints shown here are public corridor labels only. Station-by-station map data is not implemented yet.
      </PhaseNotice>
    </div>
  );
}
