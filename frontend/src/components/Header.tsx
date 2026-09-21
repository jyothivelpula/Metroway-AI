import { useEffect, useId, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { APP_NAV } from "../navigation/links";

function navClass(isActive: boolean, assist?: boolean) {
  if (isActive && assist) return "bg-assist text-white";
  if (isActive) return "bg-metro text-white";
  return "text-muted hover:bg-paper hover:text-ink";
}

export function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
        <NavLink to="/" className="flex min-h-0 items-center gap-2.5 no-underline">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-metro text-xs font-bold tracking-tight text-white">
            MW
          </span>
          <span className="min-w-0">
            <span className="block font-display text-base leading-tight text-ink sm:text-lg">MetroWay AI</span>
            <span className="block truncate text-[11px] leading-tight text-muted sm:text-xs">
              Know your way inside the station
            </span>
          </span>
        </NavLink>

        <nav className="mw-desktop-nav" aria-label="Primary">
          {APP_NAV.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `inline-flex min-h-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold no-underline ${navClass(isActive, link.assist)}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-3.5 w-3.5 ${!isActive && link.assist ? "text-assist" : ""}`}
                      aria-hidden="true"
                    />
                    {link.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <button
          type="button"
          className="mw-mobile-menu-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <nav id={menuId} className="mw-mobile-nav border-t border-line bg-card" aria-label="Mobile">
          <ul className="mx-auto max-w-5xl px-3 py-2">
            {APP_NAV.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `mb-1 flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold no-underline ${navClass(isActive, link.assist)}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`h-4 w-4 ${!isActive && link.assist ? "text-assist" : ""}`}
                          aria-hidden="true"
                        />
                        {link.label}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
