import { useSettings } from "../hooks/useSettings";
import { PhaseNotice } from "../components/PhaseNotice";

export function SettingsPage() {
  const { settings, update } = useSettings();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Settings</h1>
      <section className="rounded-3xl border border-line bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Language</h2>
        <p className="mt-1 text-sm text-muted">Interface copy stays English in Phase 1. This stores your preference.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              { id: "en", label: "English" },
              { id: "te", label: "Telugu" },
              { id: "hi", label: "Hindi" },
            ] as const
          ).map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => update({ language: lang.id })}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                settings.language === lang.id ? "bg-metro text-white" : "bg-paper"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-3 rounded-3xl border border-line bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Accessibility</h2>
        <Toggle
          label="Larger text"
          checked={settings.largeText}
          onChange={(largeText) => update({ largeText })}
        />
        <Toggle
          label="High contrast"
          checked={settings.highContrast}
          onChange={(highContrast) => update({ highContrast })}
        />
        <Toggle
          label="Prefer lifts (saved for later routing)"
          checked={settings.preferLifts}
          onChange={(preferLifts) => update({ preferLifts })}
        />
        <Toggle
          label="Avoid stairs (saved for later routing)"
          checked={settings.avoidStairs}
          onChange={(avoidStairs) => update({ avoidStairs })}
        />
      </section>
      <section className="rounded-3xl border border-line bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Privacy</h2>
        <p className="mt-2 text-sm text-muted">
          Phase 1 stores settings and recent searches in this browser only. No account, photos, or
          API keys are collected.
        </p>
      </section>
      <PhaseNotice>Voice guidance and multilingual copy are planned for Phase 9.</PhaseNotice>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-4 rounded-2xl bg-paper px-3 py-2">
      <span className="text-sm font-semibold">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5"
      />
    </label>
  );
}
