import { useEffect, useRef, useState } from "react";

export function SignCapture({
  onCapture,
  onError,
}: {
  onCapture: (file: File, previewUrl: string) => void;
  onError: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function stop() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLive(false);
    setReady(false);
  }

  async function startCamera() {
    onError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      onError("Camera access isn’t available. Upload a photo of the sign instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setLive(true);
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play().then(() => setReady(true));
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/NotAllowedError|Permission|denied/i.test(message)) {
        onError("Camera access isn’t available. Upload a photo of the sign instead.");
      } else {
        onError("Camera access isn’t available. Upload a photo of the sign instead.");
      }
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onError("The camera snapshot could not be captured.");
      return;
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          onError("The camera snapshot could not be captured.");
          return;
        }
        const file = new File([blob], "station-sign.jpg", { type: "image/jpeg" });
        if (file.size > 5_242_880) {
          onError("That photo is too large. Use an image under 5 MB.");
          return;
        }
        stop();
        onCapture(file, URL.createObjectURL(file));
      },
      "image/jpeg",
      0.9,
    );
  }

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      onError("Please upload a JPEG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 5_242_880) {
      onError("That photo is too large. Use an image under 5 MB.");
      return;
    }
    stop();
    onCapture(file, URL.createObjectURL(file));
  }

  return (
    <div className="space-y-3">
      {live ? (
        <div className="relative overflow-hidden rounded-2xl bg-ink">
          <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted autoPlay />
          <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />
          <p className="absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-white">Keep the sign inside the frame.</p>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        {live ? (
          <>
            <button type="button" className="mw-btn-primary sm:w-auto" onClick={capture} disabled={!ready}>
              Capture
            </button>
            <button type="button" className="mw-btn-secondary sm:w-auto" onClick={stop}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="mw-btn-primary sm:w-auto" onClick={() => void startCamera()}>
            Open camera
          </button>
        )}
        <label className="mw-btn-secondary cursor-pointer sm:w-auto">
          Upload photo
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} />
        </label>
      </div>
    </div>
  );
}
