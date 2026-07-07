'use client';

import {useEffect, useState} from 'react';
import {useTheme} from 'next-themes';
import {useLocale} from 'next-intl';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';

export type AppSettings = {
  appearance: 'system' | 'light' | 'dark';
  accent: 'default' | 'blue' | 'purple' | 'green';
  language: 'fa' | 'en';
};

const SETTINGS_KEY = 'app_settings';
const DEFAULT_SETTINGS: AppSettings = {appearance: 'system', accent: 'default', language: 'fa'};

function safeParseSettings(currentLocale: AppSettings['language']) {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {...DEFAULT_SETTINGS, language: currentLocale};

    const parsed = JSON.parse(raw) as Partial<AppSettings> & {language?: string};
    const language = parsed.language === 'en' || parsed.language === 'fa' ? parsed.language : 'fa';

    return {...DEFAULT_SETTINGS, ...parsed, language} as AppSettings;
  } catch {
    return {...DEFAULT_SETTINGS, language: currentLocale};
  }
}

function replaceLocaleInPath(pathname: string, nextLocale: AppSettings['language']) {
  const segments = pathname.split('/');
  if (segments[1] === 'fa' || segments[1] === 'en') {
    segments[1] = nextLocale;
    return segments.join('/');
  }
  return `/${nextLocale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

export function useAppSettings() {
  const {setTheme} = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale() as AppSettings['language'];
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const next = safeParseSettings(locale);
    setSettings({...next, language: locale});
    setHydrated(true);
  }, [locale]);

  useEffect(() => {
    if (!hydrated) return;
    setTheme(settings.appearance);
    document.documentElement.dataset.accent = settings.accent;

    const nextPath = replaceLocaleInPath(pathname, settings.language);
    const query = searchParams.toString();
    const nextHref = query ? `${nextPath}?${query}` : nextPath;
    const currentHref = query ? `${pathname}?${query}` : pathname;
    if (nextHref !== currentHref) {
      router.replace(nextHref);
    }

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [hydrated, pathname, router, searchParams, setTheme, settings]);

  return {settings, setSettings, settingsKey: SETTINGS_KEY};
}
