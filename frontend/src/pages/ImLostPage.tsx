import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, QrCode, MapPin } from "lucide-react";
import { PhaseNotice } from "../components/PhaseNotice";
import { QrScanner } from "../components/QrScanner";
import { parsePositionQr } from "../positioning/parseQr";
import { savePendingPosition } from "../positioning/pending";
import { resolvePosition } from "../services/position";

export function ImLostPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");

  async function handleQrText(text: string) {
    setScanning(false);
    const parsed = parsePositionQr(text);
    if ("error" in parsed) {
      setMessage(parsed.error);
      return;
    }
    try {
      const resolved = await resolvePosition({ payload: parsed.payload });
      if (!resolved.valid || !resolved.nodeId) {
        setMessage("Invalid position marker.");
        return;
      }
      savePendingPosition({
        stationId: resolved.stationId,
        stationCode: resolved.stationCode,
        nodeId: resolved.nodeId,
        nodeName: resolved.nodeName || "Current location",
        levelId: resolved.levelId,
        levelCode: resolved.levelCode,
        source: "QR_POSITION",
        markerId: resolved.markerId,
      });
      navigate(`/navigation?station=${encodeURIComponent(resolved.stationCode || resolved.stationId || "")}`);
    } catch {
      setMessage("Invalid position marker.");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">I&apos;m Lost</h1>
      <p className="max-w-2xl text-muted">
        Scan a MetroWay position QR or choose a location, then continue in indoor navigation. Photo-based
        sign recognition and AI lost assistance are planned for Phase 8.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-3xl border border-line bg-card p-4 shadow-sm">
          <Camera className="h-6 w-6 text-lost" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">Photo of a sign</h2>
          <p className="mt-2 text-sm text-muted">Vision and OCR will read station signs in Phase 8.</p>
        </article>
        <article className="rounded-3xl border border-line bg-card p-4 shadow-sm">
          <QrCode className="h-6 w-6 text-lost" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">Scan a QR marker</h2>
          <p className="mt-2 text-sm text-muted">Uses the same Phase 7 QR positioning as live navigation.</p>
        </article>
        <article className="rounded-3xl border border-line bg-card p-4 shadow-sm">
          <MapPin className="h-6 w-6 text-lost" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">Choose manually</h2>
          <p className="mt-2 text-sm text-muted">Pick a station, then set your indoor position on the Navigate screen.</p>
        </article>
      </div>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled className="rounded-full bg-lost px-4 py-2 font-semibold text-white opacity-60">
          Open camera (Phase 8)
        </button>
        <button
          type="button"
          onClick={() => {
            setMessage("");
            setScanning(true);
          }}
          className="rounded-full bg-metro px-4 py-2 font-semibold text-white"
        >
          Scan a QR marker
        </button>
        <Link to="/navigation" className="rounded-full bg-paper px-4 py-2 font-semibold text-ink no-underline">
          Open navigation
        </Link>
        <Link to="/location" className="rounded-full bg-paper px-4 py-2 font-semibold text-ink no-underline">
          Select location manually
        </Link>
      </div>
      {scanning ? (
        <QrScanner
          onResult={(text) => void handleQrText(text)}
          onClose={() => setScanning(false)}
          onError={(error) => {
            setScanning(false);
            setMessage(error);
          }}
        />
      ) : null}
      <PhaseNotice>
        QR positioning is available during live navigation. Photo-based sign recognition and AI lost assistance are
        planned for Phase 8.
      </PhaseNotice>
    </div>
  );
}
