export default function SettingsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">تنظیمات</h1>
      <section className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">این صفحه به‌صورت نمایشی اضافه شده است.</p>
        {/* TODO(BACKEND): load and save user settings via settings API. */}
      </section>
    </main>
  );
}
