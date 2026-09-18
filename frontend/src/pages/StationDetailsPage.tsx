import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LineChip } from "../components/LineChip";
import { IndoorStationMap } from "../components/IndoorStationMap";
import { PhaseNotice } from "../components/PhaseNotice";
import {
  getFacilities,
  getGates,
  getIndoorComponents,
  getLevels,
  getPlatforms,
  getStation,
  stationKey,
} from "../services/stations";
import {
  asMetroLines,
  type FacilityRecord,
  type GateRecord,
  type IndoorComponentRecord,
  type LevelRecord,
  type PlatformRecord,
  type StationDetail,
} from "../types";

function Card({ title, children }: { title: string; children: string }) {
  return (
    <article className="rounded-3xl border border-line bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </article>
  );
}

function joinLines(items: string[]) {
  return items.length > 0 ? items.join(" · ") : "Not available yet.";
}

export function StationDetailsPage() {
  const { stationId } = useParams();
  const [station, setStation] = useState<StationDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [platforms, setPlatforms] = useState<PlatformRecord[]>([]);
  const [gates, setGates] = useState<GateRecord[]>([]);
  const [levels, setLevels] = useState<LevelRecord[]>([]);
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [indoor, setIndoor] = useState<IndoorComponentRecord[]>([]);

  useEffect(() => {
    if (!stationId) return;
    let active = true;
    setMissing(false);
    void getStation(stationId)
      .then(async (detail) => {
        if (!active) return;
        setStation(detail);
        const key = stationKey(detail);
        const [p, g, l, f, i] = await Promise.all([
          getPlatforms(key),
          getGates(key),
          getLevels(key),
          getFacilities(key),
          getIndoorComponents(key),
        ]);
        if (!active) return;
        setPlatforms(p);
        setGates(g);
        setLevels(l);
        setFacilities(f);
        setIndoor(i);
      })
      .catch(() => {
        if (active) {
          setStation(null);
          setMissing(true);
        }
      });
    return () => {
      active = false;
    };
  }, [stationId]);

  if (missing) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-3xl">Station not found</h1>
        <Link to="/stations" className="text-metro">
          Back to directory
        </Link>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">Hyderabad Metro</p>
        <h1 className="font-display text-4xl">&nbsp;</h1>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted">Hyderabad Metro</p>
      <h1 className="font-display text-4xl">{station.station_name}</h1>
      <div className="flex flex-wrap gap-2">
        {asMetroLines(station.lines).map((line) => (
          <LineChip key={line} line={line} />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card title="Basic Information">
          {joinLines([station.station_code, station.city, station.state].filter(Boolean))}
        </Card>
        <Card title="Location">
          {joinLines(
            [station.city, station.state, station.pincode].filter((value): value is string => Boolean(value)),
          )}
        </Card>
        <Card title="Platforms">{joinLines(platforms.map((item) => item.platform_number))}</Card>
        <Card title="Gates">{joinLines(gates.map((item) => item.gate_name ?? item.gate_code))}</Card>
        <Card title="Station Levels">{joinLines(levels.map((item) => item.level_name))}</Card>
        <Card title="Facilities">{joinLines(facilities.map((item) => item.facility_name))}</Card>
        <Card title="Accessibility">Not available yet.</Card>
        <Card title="Bus Connections">Not available yet.</Card>
        <Card title="Nearby Destinations">Not available yet.</Card>
        <Card title="Indoor Components">{joinLines(indoor.map((item) => item.name))}</Card>
      </div>
      <IndoorStationMap stationId={stationKey(station)} />
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/navigation?station=${stationKey(station)}`}
          className="rounded-full bg-metro px-4 py-2 font-semibold text-white no-underline"
        >
          Start navigation
        </Link>
        <Link to="/stations" className="rounded-full bg-paper px-4 py-2 font-semibold text-ink no-underline">
          All stations
        </Link>
      </div>
      <PhaseNotice>
        Indoor map positions are schematic and for application testing. They are not a verified station survey.
      </PhaseNotice>
    </div>
  );
}
