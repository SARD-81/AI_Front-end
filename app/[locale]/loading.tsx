export default function LocaleLoading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      <span className="sr-only">Loading…</span>
    </main>
  );
}
