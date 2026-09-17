import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, DoorOpen, MapPinned, Navigation, Search } from "lucide-react";
import { DemoBanner } from "../components/DemoBanner";
import { LineChip } from "../components/LineChip";
import { PhaseNotice } from "../components/PhaseNotice";
import { DEMO_STATIONS } from "../data/demo";
import { pushRecent, readRecent } from "../hooks/recentStations";

const actions = [
  {
    to: "/stations",
    title: "Find station",
    body: "Browse the station directory.",
    icon: Search,
  },
  {
    to: "/navigation",
    title: "Start navigation",
    body: "Choose where you are and where you want to go.",
    icon: Navigation,
  },
  {
    to: "/navigation?intent=exit",
    title: "Find exit",
    body: "Look up an exit gate from inside the station.",
    icon: DoorOpen,
  },
  {
    to: "/metro-map",
    title: "Metro map",
    body: "Open the Hyderabad network map.",
    icon: MapPinned,
  },
];

export function HomePage() {
  const [query, setQuery] = useState("");
  const recentIds = readRecent();
  const recent = DEMO_STATIONS.filter((s) => recentIds.includes(s.id));
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return DEMO_STATIONS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
    ).slice(0, 5);
  }, [query]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl bg-metro-deep text-white shadow-sm">
        <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">Hyderabad Metro</p>
            <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
              Don&apos;t just know your platform.
              <span className="block text-white/85">Know your way.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/80">
              Indoor wayfinding for passengers already inside a station — platforms, gates, lifts,
              and facilities.
            </p>
          </div>
          <Link
            to="/im-lost"
            className="inline-flex items-center justify-between rounded-2xl bg-lost px-4 py-3 font-semibold text-white no-underline"
          >
            I&apos;m Lost
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <DemoBanner />

      <section className="rounded-3xl border border-line bg-card p-4 shadow-sm">
        <label htmlFor="home-search" className="text-sm font-semibold text-ink">
          Where do you want to go?
        </label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-muted" />
          <input
            id="home-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a station, gate, or facility"
            className="w-full rounded-2xl border border-line bg-paper py-3 pl-11 pr-4 text-base"
          />
        </div>
        {matches.length > 0 && (
          <ul className="mt-3 space-y-2" aria-label="Search results">
            {matches.map((station) => (
              <li key={station.id}>
                <Link
                  to={`/stations/${station.id}`}
                  onClick={() => pushRecent(station.id)}
                  className="flex items-center justify-between rounded-2xl bg-paper px-3 py-3 no-underline"
                >
                  <span>
                    <span className="block font-semibold text-ink">{station.name}</span>
                    <span className="text-sm text-muted">{station.code}</span>
                  </span>
                  <span className="flex gap-1">
                    {station.lines.map((line) => (
                      <LineChip key={line} line={line} />
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="mb-3 font-display text-2xl">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((action) => (
            <Link
              key={action.title}
              to={action.to}
              className="rounded-3xl border border-line bg-card p-4 no-underline shadow-sm"
            >
              <action.icon className="h-6 w-6 text-metro" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-semibold text-ink">{action.title}</h3>
              <p className="mt-1 text-sm text-muted">{action.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <article className="rounded-3xl border border-line bg-card p-4 shadow-sm">
          <h2 className="font-display text-2xl">Nearby station</h2>
          <p className="mt-1 text-sm text-muted">Choose a station manually. GPS arrives in Phase 7.</p>
          <Link
            to="/location"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-metro px-4 py-2 font-semibold text-white no-underline"
          >
            Select station
            <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
        <article className="rounded-3xl border border-line bg-card p-4 shadow-sm">
          <h2 className="font-display text-2xl">Saved places</h2>
          <p className="mt-3 text-sm text-muted">No saved places yet. Accounts and saved destinations come later.</p>
        </article>
      </section>

      <section className="rounded-3xl border border-line bg-card p-4 shadow-sm">
        <h2 className="font-display text-2xl">Recent searches</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Search a demo station above and it will appear here on this device.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {recent.map((station) => (
              <li key={station.id}>
                <Link
                  to={`/stations/${station.id}`}
                  className="flex items-center justify-between py-3 no-underline"
                >
                  <span className="font-semibold text-ink">{station.name}</span>
                  <span className="flex gap-1">
                    {station.lines.map((line) => (
                      <LineChip key={line} line={line} />
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PhaseNotice>
        Phase 1 is dashboard and UI only. Indoor routes, QR positioning, and AI are not active yet.
      </PhaseNotice>
    </div>
  );
}
