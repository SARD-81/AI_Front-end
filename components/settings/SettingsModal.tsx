'use client';

import {type Dispatch, type ReactNode, type SetStateAction, useMemo, useState} from 'react';
import {Check, ChevronDown, CircleUserRound, SlidersHorizontal, UserPen} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
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
import {Skeleton} from '@/components/ui/skeleton';
import type {AuthUserDTO} from '@/lib/types/auth';
import {cn} from '@/lib/utils';
import {formatDigitsForLocale} from '@/lib/utils/digits';
import type {AppSettings} from '@/hooks/use-app-settings';

export {useAppSettings} from '@/hooks/use-app-settings';
export type {AppSettings} from '@/hooks/use-app-settings';

function SettingRow({label, children, isRtl}: {label: string; children: ReactNode; isRtl: boolean}) {
  return (
    <div className={cn('my-2 flex items-center justify-between gap-3 rounded-2xl border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] px-4 py-3 shadow-sm last:border-[hsl(var(--surface-subtle))]', isRtl ? 'text-right' : 'text-left')}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function SettingsDropdown({
  value,
  options,
  onChange,
  isRtl
}: {
  value: string;
  options: readonly {value: string; label: string}[];
  onChange: (value: string) => void;
  isRtl: boolean;
}) {
  const selectedLabel = options.find((item) => item.value === value)?.label ?? options[0].label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn('flex h-10 min-w-44 items-center justify-between gap-3 rounded-lg border border-[hsl(var(--field-border))] bg-[hsl(var(--field))] px-3 py-2 text-sm text-[hsl(var(--field-foreground))] shadow-sm hover:bg-[hsl(var(--surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] focus-visible:ring-offset-2 focus-visible:ring-offset-background', isRtl ? 'text-right' : 'text-left')}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRtl ? 'start' : 'end'} className="w-48 border-[hsl(var(--menu-border))] bg-[hsl(var(--menu))] text-[hsl(var(--menu-foreground))] shadow-card">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className="justify-between gap-2 focus:bg-[hsl(var(--menu-hover))] focus:text-[hsl(var(--menu-hover-foreground))]"
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
  user,
  isUserLoading = false
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  user?: AuthUserDTO;
  isUserLoading?: boolean;
}) {
  const [tab, setTab] = useState<'general' | 'account'>('general');
  const t = useTranslations('settings');
  const locale = useLocale();
  const router = useRouter();
  const isRtl = locale === 'fa';

  const appearanceOptions = [
    {value: 'system', label: t('options.appearance.system')},
    {value: 'light', label: t('options.appearance.light')},
    {value: 'dark', label: t('options.appearance.dark')}
  ] as const;

  const accentOptions = [
    {value: 'default', label: t('options.accent.default')},
    {value: 'blue', label: t('options.accent.blue')},
    {value: 'purple', label: t('options.accent.purple')},
    {value: 'green', label: t('options.accent.green')}
  ] as const;

  const languageOptions = [
    {value: 'fa', label: t('options.language.fa')},
    {value: 'en', label: t('options.language.en')}
  ] as const;

  const profile = useMemo(() => {
    const fullName = user?.fullName?.trim();
    const firstLastName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    const display = (value: string) => formatDigitsForLocale(value, locale);

    return {
      name: display(fullName || firstLastName || user?.studentId?.trim() || '—'),
      email: display(user?.email?.trim() || '—'),
      studentId: display(user?.studentId?.trim() || '—'),
      personnelId: display(user?.personnelId?.trim() || '—'),
      faculty: display(user?.faculty?.trim() || '—'),
      major: display(user?.major?.trim() || '—'),
      degreeLevel: display(user?.degreeLevel?.trim() || '—'),
      department: display(user?.department?.trim() || '—'),
      academicRank: display(user?.academicRank?.trim() || '—'),
      jobTitle: display(user?.jobTitle?.trim() || '—'),
      role: user?.role ? t(`account.roles.${user.role}`) : t('account.unknownRole')
    };
  }, [
    locale,
    t,
    user?.academicRank,
    user?.degreeLevel,
    user?.department,
    user?.email,
    user?.faculty,
    user?.firstName,
    user?.fullName,
    user?.jobTitle,
    user?.lastName,
    user?.major,
    user?.personnelId,
    user?.role,
    user?.studentId
  ]);

  const readOnlyDetails = useMemo(() => {
    if (!user?.role) return [];

    const detailsByRole = {
      student: [
        ['studentId', profile.studentId],
        ['faculty', profile.faculty],
        ['major', profile.major],
        ['degreeLevel', profile.degreeLevel]
      ],
      professor: [
        ['personnelId', profile.personnelId],
        ['faculty', profile.faculty],
        ['academicRank', profile.academicRank]
      ],
      staff: [
        ['personnelId', profile.personnelId],
        ['department', profile.department],
        ['jobTitle', profile.jobTitle]
      ],
      admin: []
    } satisfies Record<NonNullable<AuthUserDTO['role']>, [string, string][]>;

    return detailsByRole[user.role] ?? [];
  }, [profile, user?.role]);

  const handleEditProfile = () => {
    onOpenChange(false);
    router.push(`/${locale}/profile`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={isRtl ? 'rtl' : 'ltr'}
        className={cn('h-[90vh] max-h-[620px] w-[96vw] max-w-[920px] gap-0 overflow-hidden rounded-3xl border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] p-0 pe-0 shadow-card sm:h-[620px]', isRtl ? 'text-right' : 'text-left')}
      >
        <DialogTitle className="sr-only">{t('title')}</DialogTitle>
        <div className="flex h-full flex-col sm:flex-row">
          <aside className={cn('w-full shrink-0 border-b border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-elevated))] px-3 py-4 sm:w-64 sm:border-b-0 sm:px-4 sm:py-6', isRtl ? 'sm:border-l' : 'sm:border-r')}>
            <h2 className="mb-4 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('title')}</h2>
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setTab('general')}
                className={cn(
                  'flex h-10 w-full items-center justify-start gap-2 rounded-full px-3 text-sm',
                  tab === 'general' ? 'bg-[hsl(var(--menu-hover))] font-medium text-[hsl(var(--menu-hover-foreground))] shadow-sm' : 'text-muted-foreground hover:bg-[hsl(var(--surface-subtle))] hover:text-foreground'
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t('tabs.general')}
              </button>
              <button
                type="button"
                onClick={() => setTab('account')}
                className={cn(
                  'flex h-10 w-full items-center justify-start gap-2 rounded-full px-3 text-sm',
                  tab === 'account' ? 'bg-[hsl(var(--menu-hover))] font-medium text-[hsl(var(--menu-hover-foreground))] shadow-sm' : 'text-muted-foreground hover:bg-[hsl(var(--surface-subtle))] hover:text-foreground'
                )}
              >
                <CircleUserRound className="h-4 w-4" />
                {t('tabs.account')}
              </button>
            </nav>
          </aside>

          <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background/60 px-6 py-6 sm:px-8 sm:py-7">
            <h3 className="text-xl font-semibold leading-8 sm:text-2xl">{tab === 'general' ? t('tabs.general') : t('tabs.account')}</h3>
            <div className="mt-5 border-b border-border" />

            <div className="mt-2">
              {tab === 'general' ? (
                <>
                  <SettingRow label={t('general.appearance')} isRtl={isRtl}>
                    <SettingsDropdown
                      value={settings.appearance}
                      options={appearanceOptions}
                      onChange={(value) => setSettings((prev) => ({...prev, appearance: value as AppSettings['appearance']}))}
                      isRtl={isRtl}
                    />
                  </SettingRow>
                  <SettingRow label={t('general.accentColor')} isRtl={isRtl}>
                    <SettingsDropdown
                      value={settings.accent}
                      options={accentOptions}
                      onChange={(value) => setSettings((prev) => ({...prev, accent: value as AppSettings['accent']}))}
                      isRtl={isRtl}
                    />
                  </SettingRow>
                  <SettingRow label={t('general.language')} isRtl={isRtl}>
                    <SettingsDropdown
                      value={settings.language}
                      options={languageOptions}
                      onChange={(value) => setSettings((prev) => ({...prev, language: value as AppSettings['language']}))}
                      isRtl={isRtl}
                    />
                  </SettingRow>
                </>
              ) : isUserLoading ? (
                <div className="space-y-4 py-4" aria-label={t('account.loading')}>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <SettingRow label={t('account.fullName')} isRtl={isRtl}>
                    <span className="text-sm font-medium text-foreground">{profile.name}</span>
                  </SettingRow>
                  <SettingRow label={t('account.email')} isRtl={isRtl}>
                    <span className="text-sm font-medium text-foreground">{profile.email}</span>
                  </SettingRow>
                  <SettingRow label={t('account.role')} isRtl={isRtl}>
                    <span className="text-sm font-medium text-foreground">{profile.role}</span>
                  </SettingRow>
                  {readOnlyDetails.map(([field, value]) => (
                    <SettingRow key={field} label={t(`account.${field}`)} isRtl={isRtl}>
                      <span className="text-sm font-medium text-foreground" dir={field === 'studentId' || field === 'personnelId' ? 'ltr' : undefined}>
                        {value}
                      </span>
                    </SettingRow>
                  ))}
                  <div className="mt-6 flex justify-start">
                    <button
                      type="button"
                      onClick={handleEditProfile}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-[hsl(var(--field-border))] bg-[hsl(var(--field))] px-4 text-sm font-medium text-[hsl(var(--field-foreground))] shadow-sm transition-colors hover:bg-[hsl(var(--surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <UserPen className="h-4 w-4" />
                      {t('account.editProfile')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
