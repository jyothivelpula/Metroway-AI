import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, Compass, MapPin, MessageSquareText, QrCode } from "lucide-react";
import { QrScanner } from "../components/QrScanner";
import { SignCapture } from "../components/SignCapture";
import { savePendingPosition } from "../positioning/pending";
import { parsePositionQr } from "../positioning/parseQr";
import { analyzeLostImage, compressImage, describeLost, matchLost, type LostResult } from "../services/imLost";
import { resolvePosition } from "../services/position";
import { Banner, Card, PageHeading } from "../ui";

type Screen = "IDLE" | "SCANNING" | "IMAGE_CAPTURED" | "ANALYZING" | "DESCRIBE" | "RESULT" | "ERROR";

const CONFIDENCE: Record<LostResult["confidence"], string> = {
  HIGH: "High confidence",
  MEDIUM: "Medium confidence",
  LOW: "Low confidence",
  UNKNOWN: "Unknown",
};

export function ImLostPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("IDLE");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<LostResult | null>(null);
  const [stationHint, setStationHint] = useState<string | undefined>();
  const [qrOpen, setQrOpen] = useState(false);

  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
  }

  function applyResult(payload: LostResult) {
    setResult(payload);
    if (payload.station_id) setStationHint(payload.station_id);
    setScreen("RESULT");
  }

  async function handleQr(text: string) {
    setQrOpen(false);
    const parsed = parsePositionQr(text);
    if ("error" in parsed) {
      setMessage(parsed.error);
      setScreen("ERROR");
      return;
    }
    try {
      const resolved = await resolvePosition({ payload: parsed.payload });
      if (!resolved.valid || !resolved.nodeId) {
        setMessage("That QR marker is not a verified MetroWay position.");
        setScreen("ERROR");
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
      setMessage("That QR marker could not be used. Choose your location instead.");
      setScreen("ERROR");
    }
  }

  async function analyze() {
    if (!file) return;
    setScreen("ANALYZING");
    setMessage("");
    try {
      const compressed = await compressImage(file);
      applyResult(await analyzeLostImage(compressed, stationHint));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That photo could not be used.");
      setScreen("ERROR");
    }
  }

  async function submitDescription() {
    const text = description.trim();
    if (!text) {
      setMessage("Describe a nearby sign, platform, lift, or ticket counter.");
      setScreen("ERROR");
      return;
    }
    setScreen("ANALYZING");
    try {
      applyResult(await describeLost(text, stationHint));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not use that description.");
      setScreen("ERROR");
    }
  }

  function continueNav(payload: LostResult) {
    if (!payload.node || !payload.station) return;
    savePendingPosition({
      stationId: payload.station.id,
      stationCode: payload.station.alternate_name || payload.station.station_code,
      nodeId: payload.node.id,
      nodeName: payload.node.name,
      levelId: payload.node.level_id,
      levelCode: payload.node.level_code,
      source: "VISION_POSITION",
      markerId: null,
    });
    navigate(`/navigation?station=${encodeURIComponent(payload.station.alternate_name || payload.station.station_code)}`);
  }

  async function pickCandidate(candidate: Record<string, string>) {
    setScreen("ANALYZING");
    try {
      if (candidate.kind === "node" && candidate.id) {
        applyResult(await matchLost({ nodeId: candidate.id }));
        return;
      }
      const hint = candidate.alternate_name || candidate.station_code || candidate.id;
      setStationHint(hint);
      const text = description.trim() || result?.recognized_text || "platform lift ticket concourse";
      applyResult(await describeLost(text, hint));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That option could not be used.");
      setScreen("ERROR");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeading kicker="Help inside the station" description="Let’s figure out where you are. MetroWay only uses verified station data — it will not invent gates or distances.">
        I&apos;m Lost
      </PageHeading>

      {screen === "IDLE" ? (
        <>
          <p className="text-lg font-semibold text-ink">Not sure where you are?</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <button type="button" className="mw-card p-4 text-left" onClick={() => { clearImage(); setMessage(""); setScreen("SCANNING"); }}>
              <Camera className="h-5 w-5 text-lost" aria-hidden="true" />
              <span className="mt-3 block text-base font-semibold">Scan a station sign</span>
              <span className="mt-1 block text-sm text-muted">Photograph or upload a nearby sign.</span>
            </button>
            <Link to="/location" className="mw-card p-4 no-underline">
              <MapPin className="h-5 w-5 text-metro" aria-hidden="true" />
              <span className="mt-3 block text-base font-semibold text-ink">Choose my location</span>
              <span className="mt-1 block text-sm text-muted">Pick your station, then set your indoor spot.</span>
            </Link>
            <button type="button" className="mw-card p-4 text-left" onClick={() => { setMessage(""); setScreen("DESCRIBE"); }}>
              <MessageSquareText className="h-5 w-5 text-metro" aria-hidden="true" />
              <span className="mt-3 block text-base font-semibold">Tell us what you see</span>
              <span className="mt-1 block text-sm text-muted">Describe a platform, lift, gate, or nearby sign.</span>
            </button>
          </div>
          <Card>
            <div className="flex gap-3">
              <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-metro" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">Have a MetroWay QR?</h2>
                <p className="mt-1 text-sm text-muted">That uses the existing indoor position marker — the most precise option.</p>
                <button type="button" className="mw-btn-secondary mt-3 sm:w-auto" onClick={() => setQrOpen(true)}>
                  Scan QR marker
                </button>
              </div>
            </div>
          </Card>
        </>
      ) : null}

      {screen === "SCANNING" || screen === "IMAGE_CAPTURED" ? (
        <Card>
          <h2 className="text-lg font-semibold">Scan station sign</h2>
          <p className="mt-1 text-sm text-muted">Keep the wording in frame. Upload works on desktop if the camera is unavailable.</p>
          {preview ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <img src={preview} alt="Captured station sign" className="max-h-72 w-full rounded-xl object-cover" />
              <div className="flex flex-col justify-end gap-2">
                <button type="button" className="mw-btn-primary sm:w-auto" onClick={() => void analyze()}>
                  Analyze
                </button>
                <button type="button" className="mw-btn-secondary sm:w-auto" onClick={() => { clearImage(); setScreen("SCANNING"); }}>
                  Retake
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <SignCapture
                onCapture={(next, url) => {
                  setFile(next);
                  setPreview(url);
                  setScreen("IMAGE_CAPTURED");
                }}
                onError={setMessage}
              />
            </div>
          )}
          <button type="button" className="mt-4 text-sm font-semibold text-metro" onClick={() => { clearImage(); setScreen("IDLE"); }}>
            Back
          </button>
        </Card>
      ) : null}

      {screen === "DESCRIBE" ? (
        <Card>
          <h2 className="text-lg font-semibold">Tell us what you see</h2>
          <p className="mt-1 text-sm text-muted">Example: “I can see Platform 2 and a lift.”</p>
          <textarea
            className="mw-input mt-3 min-h-28"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Platform, lift, ticket counter, exit, or a name on a sign"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" className="mw-btn-primary sm:w-auto" onClick={() => void submitDescription()}>
              Find my location
            </button>
            <button type="button" className="mw-btn-secondary sm:w-auto" onClick={() => setScreen("IDLE")}>
              Back
            </button>
          </div>
        </Card>
      ) : null}

      {screen === "ANALYZING" ? (
        <Card>
          <p className="font-semibold text-ink">Reading the station sign…</p>
          <p className="mt-2 text-sm text-muted">Matching what we can see against verified MetroWay station data.</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-paper">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-metro" />
          </div>
        </Card>
      ) : null}

      {screen === "RESULT" && result ? (
        <Card>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              {preview ? <img src={preview} alt="" className="mb-4 max-h-56 w-full rounded-xl object-cover" /> : null}
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-metro">{CONFIDENCE[result.confidence]}</p>
              <h2 className="mt-2 font-display text-2xl">{result.title}</h2>
              {result.summary ? <p className="mt-2 text-lg font-semibold">{result.summary}</p> : null}
              <p className="mt-2 text-sm leading-relaxed text-muted">{result.assistant || result.explanation}</p>
              <p className="mt-3 text-sm font-semibold">{result.next_action.instruction}</p>
            </div>
            <div>
              {result.clarification_options.length > 0 || result.candidates.length > 0 ? (
                <ul className="space-y-2">
                  {result.candidates.map((candidate) => (
                    <li key={candidate.label || candidate.id}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full rounded-xl bg-paper px-3 py-2 text-left text-sm font-semibold"
                        onClick={() => void pickCandidate(candidate)}
                      >
                        {candidate.label || candidate.station_name || candidate.name}
                      </button>
                    </li>
                  ))}
                  {result.candidates.length === 0
                    ? result.clarification_options.map((option) => (
                        <li key={option}>
                          <button
                            type="button"
                            className="flex min-h-11 w-full rounded-xl bg-paper px-3 py-2 text-left text-sm font-semibold"
                            onClick={() => {
                              setDescription((value) => `${value} ${option}`.trim());
                              setScreen("DESCRIBE");
                            }}
                          >
                            {option}
                          </button>
                        </li>
                      ))
                    : null}
                </ul>
              ) : null}
              <div className="mt-4 flex flex-col gap-2">
                {result.can_continue && result.node ? (
                  <button type="button" className="mw-btn-primary sm:w-auto" onClick={() => continueNav(result)}>
                    <Compass className="h-4 w-4" aria-hidden="true" />
                    Continue navigation
                  </button>
                ) : null}
                <button
                  type="button"
                  className="mw-btn-secondary sm:w-auto"
                  onClick={() => {
                    setResult(null);
                    clearImage();
                    setScreen("SCANNING");
                  }}
                >
                  Try another photo
                </button>
                <Link to="/location" className="mw-btn-secondary no-underline sm:w-auto">
                  Choose location manually
                </Link>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {screen === "ERROR" || message ? (
        <Banner tone="warning" title="Let’s try another way">
          {message || "Something went wrong. Upload a clearer photo, describe what you see, or choose your location."}
        </Banner>
      ) : null}

      {qrOpen ? (
        <QrScanner onResult={(text) => void handleQr(text)} onClose={() => setQrOpen(false)} onError={(error) => { setQrOpen(false); setMessage(error); setScreen("ERROR"); }} />
      ) : null}
    </div>
  );
}
