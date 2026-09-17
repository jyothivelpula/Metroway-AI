export type MetroLine = "Red" | "Blue" | "Green";

export type DemoStation = {
  id: string;
  name: string;
  code: string;
  lines: MetroLine[];
  interchange: boolean;
};

export type DemoPlace = {
  id: string;
  label: string;
  kind: "platform" | "gate" | "facility" | "entrance";
};

export type AppSettings = {
  language: "en" | "te" | "hi";
  largeText: boolean;
  highContrast: boolean;
  preferLifts: boolean;
  avoidStairs: boolean;
};
