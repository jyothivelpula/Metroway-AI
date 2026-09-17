import { Link } from "react-router-dom";
import { Camera, QrCode, MapPin } from "lucide-react";
import { PhaseNotice } from "../components/PhaseNotice";

const steps = [
  {
    icon: Camera,
    title: "Photo of a sign",
    body: "Vision and OCR will read station signs in Phase 8.",
  },
  {
    icon: QrCode,
    title: "Scan a QR marker",
    body: "QR codes will map to known navigation nodes in Phase 7.",
  },
  {
    icon: MapPin,
    title: "Choose manually",
    body: "You can always pick a station and nearby landmark by hand.",
  },
];

export function ImLostPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">I&apos;m Lost</h1>
      <p className="max-w-2xl text-muted">
        AI will help estimate where you are. The physical walking route will still come from the
        verified navigation engine — not from the model.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <article key={step.title} className="rounded-3xl border border-line bg-card p-4 shadow-sm">
            <step.icon className="h-6 w-6 text-lost" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm text-muted">{step.body}</p>
          </article>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled
          className="rounded-full bg-lost px-4 py-2 font-semibold text-white opacity-60"
        >
          Open camera (Phase 8)
        </button>
        <Link
          to="/location"
          className="rounded-full bg-metro px-4 py-2 font-semibold text-white no-underline"
        >
          Select location manually
        </Link>
      </div>
      <PhaseNotice>
        Camera, OCR, and conversational assistance are not implemented in Phase 1.
      </PhaseNotice>
    </div>
  );
}
