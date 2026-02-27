import {getTranslations} from 'next-intl/server';

export default async function SettingsPage() {
  const t = await getTranslations('settings');

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <section className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">{t('demoPageDescription')}</p>
        {/* TODO(BACKEND): load and save user settings via settings API. */}
      </section>
    </main>
  );
}
