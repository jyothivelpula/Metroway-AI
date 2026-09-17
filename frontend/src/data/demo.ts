import type { DemoPlace, DemoStation } from "../types";

/** Public Hyderabad Metro station names for UI only. Not indoor layouts. */
export const DEMO_NOTICE =
  "DEMO UI: station names are public network labels. Indoor maps, gates, and routes are not included in Phase 1.";

export const DEMO_STATIONS: DemoStation[] = [
  { id: "ameerpet", name: "Ameerpet", code: "AMP", lines: ["Red", "Blue"], interchange: true },
  { id: "mgbs", name: "M.G. Bus Station", code: "MGB", lines: ["Green", "Red"], interchange: true },
  { id: "parade", name: "Parade Ground", code: "PDG", lines: ["Blue", "Green"], interchange: true },
  { id: "hitec", name: "HITEC City", code: "HIT", lines: ["Blue"], interchange: false },
  { id: "raidurg", name: "Raidurg", code: "RDG", lines: ["Blue"], interchange: false },
  { id: "lb-nagar", name: "LB Nagar", code: "LBN", lines: ["Red"], interchange: false },
  { id: "nagole", name: "Nagole", code: "NGL", lines: ["Red"], interchange: false },
  { id: "miyapur", name: "Miyapur", code: "MYP", lines: ["Red"], interchange: false },
];

export const DEMO_DESTINATIONS: DemoPlace[] = [
  { id: "platform-1", label: "Platform 1", kind: "platform" },
  { id: "platform-2", label: "Platform 2", kind: "platform" },
  { id: "gate-a", label: "Exit Gate A", kind: "gate" },
  { id: "lift", label: "Lift / Elevator", kind: "facility" },
  { id: "ticket", label: "Ticket hall", kind: "entrance" },
  { id: "restroom", label: "Washroom", kind: "facility" },
];
