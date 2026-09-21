import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Accessibility,
  ArrowRight,
  Building2,
  Compass,
  DoorOpen,
  Footprints,
  LocateFixed,
  MapPinned,
  QrCode,
  Route,
  Search,
  TrainFront,
} from "lucide-react";
import { LineChip } from "../components/LineChip";
import { DATA_NOTICE } from "../data/demo";
import { pushRecent, readRecent } from "../hooks/recentStations";
import { getStations, matchesStationKey, searchStations, stationKey } from "../services/stations";
import { asMetroLines, type StationSummary } from "../types";
import { Banner, Card, Field, Input, SectionHeading } from "../ui";

const actions = [
  {
    to: "/navigation?intent=exit",
    title: "Nearest exit",
    body: "Find an exit gate from inside the station.",
    icon: DoorOpen,
  },
  {
    to: "/location",
    title: "Set my location",
    body: "Choose the station you are in now.",
    icon: LocateFixed,
  },
  {
    to: "/metro-map",
    title: "Metro map",
    body: "View the Hyderabad network and lines.",
    icon: MapPinned,
  },
  {
    to: "/stations",
    title: "Station directory",
    body: "Browse stations and recent searches on this device.",
    icon: Building2,
  },
];

const steps = [
  {
    n: "1",
    title: "Choose your station",
    body: "Pick the Hyderabad Metro station you are in, or about to enter.",
  },
  {
    n: "2",
    title: "Choose where you are",
    body: "Mark a nearby landmark, scan a QR point, or set your start by hand.",
  },
  {
    n: "3",
    title: "Follow the route",
    body: "Walk the indoor path to a gate, lift, concourse, platform, or exit.",
  },
];

const capabilities = [
  { title: "Indoor route guidance", icon: Route, body: "Paths inside the station, not just the line map." },
  { title: "QR positioning", icon: QrCode, body: "Scan a station QR to pin your current spot." },
  { title: "Accessible routes", icon: Accessibility, body: "Prefer lifts and step-free indoor paths when available." },
  { title: "Turn-by-turn directions", icon: Footprints, body: "Follow each indoor step from start to destination." },
];

export function HomePage() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<StationSummary[]>([]);
  const [stations, setStations] = useState<StationSummary[]>([]);

  useEffect(() => {
    void getStations()
      .then(setStations)
      .catch(() => setStations([]));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setMatches([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void searchStations(q)
        .then((results) => setMatches(results.slice(0, 5)))
        .catch(() => setMatches([]));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query]);

  const recentIds = readRecent();
  const recent = recentIds
    .map((id) => stations.find((station) => matchesStationKey(station, id)))
    .filter((station): station is StationSummary => Boolean(station));

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.25rem] bg-metro-deep text-white shadow-[var(--shadow-card)]">
        <img
          src="/hero-indoor-platform.png"
          alt=""
          className="mw-hero-photo pointer-events-none absolute inset-0 h-full w-full object-cover object-[62%_42%]"
        />
        <div className="mw-hero-overlay pointer-events-none absolute inset-0" />
        <div className="relative max-w-[22rem] px-5 py-5 sm:max-w-sm sm:px-7 sm:py-6">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
            <TrainFront className="h-3.5 w-3.5" aria-hidden="true" />
            Hyderabad Metro
          </p>
          <h1 className="mt-2 font-display text-[1.55rem] leading-snug text-white sm:text-[2rem]">
            <span className="block text-pretty">You know where you&apos;re going.</span>
            <span className="mt-0.5 block text-white/90">We&apos;ll show you the way.</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/85">
            Indoor wayfinding inside Hyderabad Metro stations — from where you are to gates, lifts,
            concourse, platforms, and exits.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              to="/navigation"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-metro px-5 py-[0.65rem] text-sm font-semibold text-white no-underline shadow-sm sm:w-auto"
            >
              Start Navigation
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/im-lost"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-assist px-5 py-[0.65rem] text-sm font-semibold text-white no-underline shadow-sm sm:w-auto"
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              I&apos;m Lost
            </Link>
          </div>
        </div>
      </section>

      <Card>
        <Field label="Where do you want to go?" htmlFor="home-search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-muted" aria-hidden="true" />
            <Input
              id="home-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a station, gate, or facility"
              className="mw-input-on-card mw-input-with-icon"
              autoComplete="off"
            />
          </div>
        </Field>
        {matches.length > 0 ? (
          <ul className="mt-3 space-y-2" aria-label="Search results">
            {matches.map((station) => (
              <li key={station.id}>
                <Link
                  to={`/stations/${stationKey(station)}`}
                  onClick={() => pushRecent(stationKey(station))}
                  className="flex items-center justify-between rounded-xl bg-paper px-3 py-3 no-underline"
                >
                  <span>
                    <span className="block font-semibold text-ink">{station.station_name}</span>
                    <span className="text-sm text-muted">{station.station_code}</span>
                  </span>
                  <span className="flex gap-1">
                    {asMetroLines(station.lines).map((line) => (
                      <LineChip key={line} line={line} />
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {recent.length > 0 ? (
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recent on this device</p>
            <ul className="mt-2 divide-y divide-line">
              {recent.map((station) => (
                <li key={station.id}>
                  <Link
                    to={`/stations/${stationKey(station)}`}
                    className="flex items-center justify-between py-2.5 no-underline"
                  >
                    <span className="font-semibold text-ink">{station.station_name}</span>
                    <span className="flex gap-1">
                      {asMetroLines(station.lines).map((line) => (
                        <LineChip key={line} line={line} />
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <section aria-labelledby="quick-actions">
        <SectionHeading>Quick actions</SectionHeading>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.to}
                className="mw-card flex min-h-0 items-start gap-3 p-4 no-underline"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-metro-light text-metro">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-ink">{action.title}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-muted">{action.body}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <Card>
        <SectionHeading description="Indoor wayfinding for people already in a Hyderabad Metro station.">
          How MetroWay works
        </SectionHeading>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {steps.map((step) => (
            <li key={step.n} className="rounded-xl bg-paper px-3 py-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-metro text-xs font-bold text-white">
                {step.n}
              </span>
              <h3 className="mt-2 text-sm font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-sm leading-snug text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Card>

      <section>
        <SectionHeading>What you can do</SectionHeading>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {capabilities.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex gap-3 rounded-[1.25rem] border border-line bg-card px-4 py-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-metro" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Banner tone="info" title="About indoor details">
        {DATA_NOTICE}
      </Banner>
    </div>
  );
}
