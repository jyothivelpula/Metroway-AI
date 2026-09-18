import { DATA_NOTICE } from "../data/demo";

export function DemoBanner() {
  return (
    <p className="rounded-xl bg-metro-deep px-3 py-2 text-sm leading-snug text-white" role="status">
      {DATA_NOTICE}
    </p>
  );
}
