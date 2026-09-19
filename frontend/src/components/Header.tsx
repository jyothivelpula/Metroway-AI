import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/stations", label: "Stations", end: false },
  { to: "/metro-map", label: "Metro map", end: false },
  { to: "/navigation", label: "Navigate", end: false },
  { to: "/im-lost", label: "I'm Lost", end: false },
  { to: "/settings", label: "Settings", end: false },
];

export function Header() {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-3 no-underline">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-metro text-sm font-bold tracking-tight text-white">
            MW
          </span>
          <span>
            <span className="block font-display text-lg leading-none text-ink">MetroWay AI</span>
            <span className="block text-xs text-muted">Know your way inside the station</span>
          </span>
        </NavLink>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Desktop">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-full px-3 py-2 text-sm font-semibold no-underline ${
                  isActive ? "bg-metro text-white" : "text-muted hover:bg-paper"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
