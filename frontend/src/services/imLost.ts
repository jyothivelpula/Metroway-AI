export type LostStatus =
  | "MATCH_FOUND"
  | "PARTIAL_MATCH"
  | "LOW_CONFIDENCE"
  | "NO_MATCH"
  | "NEEDS_MANUAL_LOCATION";

export type LostConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type LostResult = {
  status: LostStatus;
  confidence: LostConfidence;
  title: string;
  summary: string | null;
  explanation: string;
  assistant?: string;
  recognized_text: string | null;
  interpretation: Record<string, unknown> | null;
  station: { id: string; station_code: string; station_name: string; alternate_name?: string | null } | null;
  station_id: string | null;
  level_id: string | null;
  node_id: string | null;
  node: {
    id: string;
    name: string;
    node_type: string;
    level_id: string;
    level_code: string | null;
    level_name: string | null;
    station_code: string;
    station_name: string;
  } | null;
  candidates: Array<Record<string, string>>;
  clarification_options: string[];
  next_action: { type: string; instruction: string };
  can_continue: boolean;
  ocr_available?: boolean;
  ocr?: { raw_text: string; confidence: number; detected_terms: string[]; engine: string | null };
};

const API = "/api";

function fail(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (detail && typeof detail === "object" && detail !== null && "message" in detail) {
      return String((detail as { message: string }).message);
    }
  }
  return fallback;
}

export async function ocrLostImage(file: File) {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${API}/im-lost/ocr`, { method: "POST", body });
  const data = await response.json();
  if (!response.ok) throw new Error(fail(data, "That photo could not be used."));
  return data as { raw_text: string; confidence: number; detected_terms: string[]; error: string | null };
}

export async function analyzeLostImage(file: File, stationId?: string) {
  const body = new FormData();
  body.append("file", file);
  if (stationId) body.append("station_id", stationId);
  const response = await fetch(`${API}/im-lost/analyze`, { method: "POST", body });
  const data = await response.json();
  if (!response.ok) throw new Error(fail(data, "That photo could not be used."));
  return data as LostResult;
}

export async function describeLost(message: string, stationId?: string) {
  const response = await fetch(`${API}/im-lost/describe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, stationId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(fail(data, "We could not use that description."));
  return data as LostResult;
}

export async function matchLost(body: { text?: string; stationId?: string; nodeId?: string }) {
  const response = await fetch(`${API}/im-lost/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(fail(data, "We could not match that information."));
  return data as LostResult;
}

export function compressImage(file: File, maxEdge = 1280): Promise<File> {
  if (file.size < 350_000) return Promise.resolve(file);
  return new Promise((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.82,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    image.src = url;
  });
}
