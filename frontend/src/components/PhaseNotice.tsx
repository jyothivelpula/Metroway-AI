export function PhaseNotice({ children }: { children: string }) {
  return (
    <p
      className="rounded-xl border border-dashed border-line bg-paper px-3 py-2 text-sm text-muted"
      role="note"
    >
      {children}
    </p>
  );
}
