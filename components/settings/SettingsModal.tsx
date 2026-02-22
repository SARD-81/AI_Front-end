'use client';

import {type Dispatch, type ReactNode, type SetStateAction, useEffect, useMemo, useState} from 'react';
import {Check, ChevronDown, CircleUserRound, SlidersHorizontal} from 'lucide-react';
import {useTheme} from 'next-themes';
import {usePathname, useRouter} from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {cn} from '@/lib/utils';

export type AppSettings = {
  appearance: 'system' | 'light' | 'dark';
  accent: 'default' | 'blue' | 'purple' | 'green';
  language: 'auto' | 'fa' | 'en';
};

const SETTINGS_KEY = 'app_settings';
const DEFAULT_SETTINGS: AppSettings = {appearance: 'system', accent: 'default', language: 'auto'};

const appearanceOptions = [
  {value: 'system', label: 'سیستم'},
  {value: 'light', label: 'روشن'},
  {value: 'dark', label: 'تیره'}
] as const;

const accentOptions = [
  {value: 'default', label: 'پیش‌فرض'},
  {value: 'blue', label: 'آبی'},
  {value: 'purple', label: 'بنفش'},
  {value: 'green', label: 'سبز'}
] as const;

const languageOptions = [
  {value: 'auto', label: 'تشخیص خودکار'},
  {value: 'fa', label: 'فارسی'},
  {value: 'en', label: 'English'}
] as const;

function safeParseSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return {...DEFAULT_SETTINGS, ...JSON.parse(raw)} as AppSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function resolveLocale(language: AppSettings['language']) {
  if (language === 'fa' || language === 'en') return language;
  const browser = navigator.language.toLowerCase();
  return browser.startsWith('en') ? 'en' : 'fa';
}

function replaceLocaleInPath(pathname: string, nextLocale: 'fa' | 'en') {
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
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const next = safeParseSettings();
    setSettings(next);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setTheme(settings.appearance);
    document.documentElement.dataset.accent = settings.accent;

    const targetLocale = resolveLocale(settings.language);
    const nextPath = replaceLocaleInPath(pathname, targetLocale);
    if (nextPath !== pathname) {
      router.replace(nextPath);
    }

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [hydrated, pathname, router, setTheme, settings]);

  return {settings, setSettings, settingsKey: SETTINGS_KEY};
}

function SettingRow({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="flex flex-row-reverse items-center justify-between gap-3 border-b border-border py-4 text-right last:border-none">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function SettingsDropdown({
  value,
  options,
  onChange
}: {
  value: string;
  options: readonly {value: string; label: string}[];
  onChange: (value: string) => void;
}) {
  const selectedLabel = options.find((item) => item.value === value)?.label ?? options[0].label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-10 min-w-44 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm text-right"
        >
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{selectedLabel}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className="justify-between"
          >
            <Check className={cn('h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
            <span>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SettingsModal({
  open,
  onOpenChange,
  settings,
  setSettings,
  user
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  user?: {name?: string | null; email?: string | null};
}) {
  const [tab, setTab] = useState<'general' | 'account'>('general');

  const profile = useMemo(
    () => ({
      name: user?.name?.trim() || 'کاربر مهمان',
      email: user?.email?.trim() || '—'
    }),
    [user?.email, user?.name]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="h-[90vh] max-h-[600px] w-[96vw] max-w-[900px] overflow-hidden rounded-3xl border p-0 text-right sm:h-[600px]"
      >
        <DialogTitle className="sr-only">تنظیمات</DialogTitle>
        <div className="flex h-full flex-col sm:flex-row-reverse">
          <aside className="w-full border-b border-border bg-muted/30 p-3 sm:w-60 sm:border-b-0 sm:border-l sm:p-4">
            <h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground">تنظیمات</h2>
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setTab('general')}
                className={cn(
                  'flex h-10 w-full items-center justify-start gap-2 rounded-full px-3 text-sm',
                  tab === 'general' ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground'
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                عمومی
              </button>
              <button
                type="button"
                onClick={() => setTab('account')}
                className={cn(
                  'flex h-10 w-full items-center justify-start gap-2 rounded-full px-3 text-sm',
                  tab === 'account' ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground'
                )}
              >
                <CircleUserRound className="h-4 w-4" />
                حساب
              </button>
            </nav>
          </aside>

          <section className="flex-1 p-6 sm:p-8">
            <h3 className="text-2xl font-semibold">{tab === 'general' ? 'عمومی' : 'حساب'}</h3>
            <div className="mt-4 border-b border-border" />

            <div className="mt-2">
              {tab === 'general' ? (
                <>
                  <SettingRow label="ظاهر">
                    <SettingsDropdown
                      value={settings.appearance}
                      options={appearanceOptions}
                      onChange={(value) => setSettings((prev) => ({...prev, appearance: value as AppSettings['appearance']}))}
                    />
                  </SettingRow>
                  <SettingRow label="رنگ تاکیدی">
                    <SettingsDropdown
                      value={settings.accent}
                      options={accentOptions}
                      onChange={(value) => setSettings((prev) => ({...prev, accent: value as AppSettings['accent']}))}
                    />
                  </SettingRow>
                  <SettingRow label="زبان">
                    <SettingsDropdown
                      value={settings.language}
                      options={languageOptions}
                      onChange={(value) => setSettings((prev) => ({...prev, language: value as AppSettings['language']}))}
                    />
                  </SettingRow>
                </>
              ) : (
                <>
                  <SettingRow label="نام">
                    <span className="text-sm text-muted-foreground">{profile.name}</span>
                  </SettingRow>
                  <SettingRow label="ایمیل">
                    <span className="text-sm text-muted-foreground">{profile.email}</span>
                  </SettingRow>
                </>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
