import type { NormalizedPosition, PositionSource } from "./types";

const GPS_STALE_MS = 60_000;

function nowIso() {
  return new Date().toISOString();
}

export class PositionManager {
  private listeners = new Set<(position: NormalizedPosition) => void>();
  private current: NormalizedPosition | null = null;
  private gpsWatch: number | null = null;
  private staleTimer: number | null = null;
  private running = false;

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
    this.stopGps();
    this.current = null;
    if (this.staleTimer != null) {
      window.clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
  }

  getCurrentPosition() {
    return this.current;
  }

  getSource() {
    return this.current?.source ?? null;
  }

  subscribe(callback: (position: NormalizedPosition) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  apply(partial: Omit<NormalizedPosition, "timestamp" | "stale"> & { timestamp?: string }) {
    if (!this.running) return;
    const next: NormalizedPosition = {
      ...partial,
      timestamp: partial.timestamp ?? nowIso(),
      stale: false,
    };
    const previous = this.current;
    if (
      previous &&
      previous.nodeId &&
      next.nodeId === previous.nodeId &&
      next.source === previous.source
    ) {
      this.current = { ...previous, timestamp: next.timestamp, stale: false, latitude: next.latitude ?? previous.latitude, longitude: next.longitude ?? previous.longitude, accuracy: next.accuracy ?? previous.accuracy };
      this.emit();
      return;
    }
    if (next.source === "GPS_POSITION" && previous?.nodeId && previous.source !== "GPS_POSITION") {
      this.current = {
        ...previous,
        latitude: next.latitude,
        longitude: next.longitude,
        accuracy: next.accuracy,
        timestamp: next.timestamp,
        stale: false,
      };
      this.emit();
      return;
    }
    this.current = next;
    this.emit();
  }

  startGps(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS is not supported in this browser."));
        return;
      }
      this.stopGps();
      this.gpsWatch = navigator.geolocation.watchPosition(
        (result) => {
          this.apply({
            source: "GPS_POSITION",
            stationId: this.current?.stationId ?? null,
            levelId: null,
            levelCode: null,
            nodeId: null,
            nodeName: null,
            latitude: result.coords.latitude,
            longitude: result.coords.longitude,
            accuracy: result.coords.accuracy,
            confidence: result.coords.accuracy != null && result.coords.accuracy <= 50 ? "MEDIUM" : "LOW",
            markerId: null,
          });
          resolve();
        },
        (error) => {
          reject(new Error(gpsErrorMessage(error)));
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 12_000 },
      );
      if (this.staleTimer == null) {
        this.staleTimer = window.setInterval(() => this.markStaleIfNeeded(), 5_000);
      }
    });
  }

  stopGps() {
    if (this.gpsWatch != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.gpsWatch);
      this.gpsWatch = null;
    }
  }

  private markStaleIfNeeded() {
    if (!this.current || this.current.source !== "GPS_POSITION") return;
    const age = Date.now() - new Date(this.current.timestamp).getTime();
    if (age > GPS_STALE_MS && !this.current.stale) {
      this.current = { ...this.current, stale: true };
      this.emit();
    }
  }

  private emit() {
    if (!this.current) return;
    for (const listener of this.listeners) listener(this.current);
  }
}

export function emptyPosition(source: PositionSource = "MANUAL_POSITION"): NormalizedPosition {
  return {
    source,
    stationId: null,
    levelId: null,
    levelCode: null,
    nodeId: null,
    nodeName: null,
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: nowIso(),
    confidence: "LOW",
    stale: false,
    markerId: null,
  };
}

function gpsErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return "Location permission is required for GPS. You can scan a QR code or choose your position instead.";
  if (error.code === error.POSITION_UNAVAILABLE) return "GPS position is currently unavailable.";
  if (error.code === error.TIMEOUT) return "GPS timed out.";
  return "GPS position is currently unavailable.";
}
