export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 py-10 text-sm text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" aria-hidden="true" />
      Loading…
    </div>
  );
}
