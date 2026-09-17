import { DEMO_NOTICE } from "../data/demo";

export function DemoBanner() {
  return (
    <p className="rounded-xl bg-metro-deep px-3 py-2 text-sm leading-snug text-white" role="status">
      {DEMO_NOTICE}
    </p>
  );
}
