const KEY = "metroway.recent";

export function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function pushRecent(stationId: string) {
  const next = [stationId, ...readRecent().filter((id) => id !== stationId)].slice(0, 5);
  localStorage.setItem(KEY, JSON.stringify(next));
}
