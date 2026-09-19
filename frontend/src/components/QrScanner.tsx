import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export function QrScanner({
  onResult,
  onClose,
  onError,
}: {
  onResult: (text: string) => void;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  useEffect(() => {
    const scanner = new Html5Qrcode("metroway-qr-reader");
    let cancelled = false;
    let running = true;
    void scanner
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (text) => {
          if (!running) return;
          running = false;
          void scanner
            .stop()
            .catch(() => undefined)
            .finally(() => {
              scanner.clear();
              onResultRef.current(text);
            });
        },
        () => undefined,
      )
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "";
        if (/NotAllowedError|Permission|denied/i.test(message)) {
          onErrorRef.current("Camera access is required to scan a MetroWay position QR code.");
        } else {
          onErrorRef.current("Scan the QR code using a mobile device or choose your position manually.");
        }
      });
    return () => {
      cancelled = true;
      running = false;
      void scanner
        .stop()
        .catch(() => undefined)
        .finally(() => scanner.clear());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Scan position</h2>
        <p className="mt-1 text-sm text-muted">Point the camera at a MetroWay position QR code.</p>
        <div id="metroway-qr-reader" className="mt-3 min-h-48 overflow-hidden rounded-2xl bg-paper" />
        <button type="button" onClick={onClose} className="mt-3 w-full min-h-12 rounded-full bg-paper py-3 font-semibold">
          Close
        </button>
      </div>
    </div>
  );
}
