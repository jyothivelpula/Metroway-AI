import { Outlet } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";
import { Header } from "../components/Header";

export function AppLayout() {
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="mx-auto max-w-5xl px-4 pb-24 pt-5 md:pb-10">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
