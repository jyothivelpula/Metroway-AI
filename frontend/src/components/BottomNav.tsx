import { NavLink } from "react-router-dom";
import { APP_NAV } from "../navigation/links";

export function BottomNav() {
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-6">
        {APP_NAV.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex min-h-12 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-semibold no-underline ${
                    isActive ? (link.assist ? "text-assist" : "text-metro") : "text-muted"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-4 w-4 ${!isActive && link.assist ? "text-assist" : ""}`}
                      aria-hidden="true"
                    />
                    <span className="max-w-full truncate">{link.short}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
