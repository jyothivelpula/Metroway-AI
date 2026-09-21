import { Building2, Compass, House, Map, Navigation, Settings, type LucideIcon } from "lucide-react";

export type AppNavItem = {
  to: string;
  label: string;
  short: string;
  end: boolean;
  icon: LucideIcon;
  assist?: boolean;
};

export const APP_NAV: AppNavItem[] = [
  { to: "/", label: "Dashboard", short: "Home", end: true, icon: House },
  { to: "/stations", label: "Stations", short: "Stations", end: false, icon: Building2 },
  { to: "/metro-map", label: "Metro map", short: "Map", end: false, icon: Map },
  { to: "/navigation", label: "Navigate", short: "Navigate", end: false, icon: Navigation },
  { to: "/im-lost", label: "I'm Lost", short: "Lost", end: false, icon: Compass, assist: true },
  { to: "/settings", label: "Settings", short: "Settings", end: false, icon: Settings },
];
