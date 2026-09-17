import { NavLink } from "react-router-dom";
import { Compass, House, Map, Settings, TriangleAlert } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/stations", label: "Stations", icon: Compass, end: false },
  { to: "/metro-map", label: "Map", icon: Map, end: false },
  { to: "/im-lost", label: "Lost", icon: TriangleAlert, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  isActive ? "text-metro" : "text-muted"
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
