'use client';

import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useMemo,
  useState
} from 'react';
import {
  Check,
  ChevronDown,
  CircleUserRound,
  SlidersHorizontal,
  UserPen
} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
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

function SettingRow({
  label,
  children,
  isRtl
}: {
  label: string;
  children: ReactNode;
  isRtl: boolean;
}) {
  return (
    <div
      className={cn(
        'my-2 flex min-w-0 flex-col items-stretch gap-2.5 rounded-xl border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-2xl sm:px-4',
        isRtl ? 'text-right' : 'text-left'
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <div className="min-w-0 w-full sm:w-auto sm:max-w-[65%]">{children}</div>
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
  const selectedLabel =
    options.find((item) => item.value === value)?.label ?? options[0].label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-[hsl(var(--field-border))] bg-[hsl(var(--field))] px-3 py-2 text-sm text-[hsl(var(--field-foreground))] shadow-sm hover:bg-[hsl(var(--surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-44 sm:min-w-44',
            isRtl ? 'text-right' : 'text-left'
          )}
        >
          <span className="min-w-0 truncate">{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isRtl ? 'start' : 'end'}
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-44 max-w-[calc(100vw-2rem)] border-[hsl(var(--menu-border))] bg-[hsl(var(--menu))] text-[hsl(var(--menu-foreground))] shadow-card"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className="justify-between gap-2 focus:bg-[hsl(var(--menu-hover))] focus:text-[hsl(var(--menu-hover-foreground))]"
          >
            <Check
              className={cn(
                'h-4 w-4 shrink-0',
                value === option.value ? 'opacity-100' : 'opacity-0'
              )}
            />
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
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
  isUserLoading = false,
  onNavigate
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  user?: AuthUserDTO;
  isUserLoading?: boolean;
  onNavigate?: () => void;
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
    const firstLastName =
      `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    const display = (value: string) => formatDigitsForLocale(value, locale);

    return {
      name: display(
        fullName || firstLastName || user?.studentId?.trim() || '—'
      ),
      email: display(user?.email?.trim() || '—'),
      studentId: display(user?.studentId?.trim() || '—'),
      personnelId: display(user?.personnelId?.trim() || '—'),
      faculty: display(user?.faculty?.trim() || '—'),
      major: display(user?.major?.trim() || '—'),
      degreeLevel: display(user?.degreeLevel?.trim() || '—'),
      department: display(user?.department?.trim() || '—'),
      academicRank: display(user?.academicRank?.trim() || '—'),
      jobTitle: display(user?.jobTitle?.trim() || '—'),
      role: user?.role
        ? t(`account.roles.${user.role}`)
        : t('account.unknownRole')
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
    onNavigate?.();
  };

  const tabButtonClass = (active: boolean) =>
    cn(
      'flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-sm transition-colors md:justify-start md:rounded-full',
      active
        ? 'bg-[hsl(var(--menu-hover))] font-medium text-[hsl(var(--menu-hover-foreground))] shadow-sm'
        : 'text-muted-foreground hover:bg-[hsl(var(--surface-subtle))] hover:text-foreground'
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={isRtl ? 'rtl' : 'ltr'}
        className={cn(
          'h-[calc(100dvh-1rem)] max-h-[620px] w-[calc(100vw-1rem)] max-w-[920px] gap-0 overflow-hidden rounded-2xl border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] p-0 pe-0 shadow-card sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:rounded-3xl',
          isRtl ? 'text-right' : 'text-left'
        )}
      >
        <DialogTitle className="sr-only">{t('title')}</DialogTitle>

        <div className="flex h-full min-h-0 flex-col md:flex-row">
          <aside
            className={cn(
              'w-full shrink-0 border-b border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-elevated))] px-3 pb-3 pt-4 md:w-60 md:border-b-0 md:px-4 md:py-6',
              isRtl ? 'md:border-l' : 'md:border-r'
            )}
          >
            <h2 className="mb-2 px-2 pe-12 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:mb-4 md:px-3 md:pe-3">
              {t('title')}
            </h2>
            <nav className="grid grid-cols-2 gap-2 md:block md:space-y-1">
              <button
                type="button"
                onClick={() => setTab('general')}
                className={tabButtonClass(tab === 'general')}
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" />
                <span className="truncate">{t('tabs.general')}</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('account')}
                className={tabButtonClass(tab === 'account')}
              >
                <CircleUserRound className="h-4 w-4 shrink-0" />
                <span className="truncate">{t('tabs.account')}</span>
              </button>
            </nav>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-background/60 px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-7">
            <h3 className="pe-8 text-lg font-semibold leading-7 sm:text-xl sm:leading-8 md:pe-0 md:text-2xl">
              {tab === 'general' ? t('tabs.general') : t('tabs.account')}
            </h3>
            <div className="mt-3 border-b border-border sm:mt-4 md:mt-5" />

            <div className="mt-1 sm:mt-2">
              {tab === 'general' ? (
                <>
                  <SettingRow label={t('general.appearance')} isRtl={isRtl}>
                    <SettingsDropdown
                      value={settings.appearance}
                      options={appearanceOptions}
                      onChange={(value) =>
                        setSettings((prev) => ({
                          ...prev,
                          appearance: value as AppSettings['appearance']
                        }))
                      }
                      isRtl={isRtl}
                    />
                  </SettingRow>
                  <SettingRow label={t('general.accentColor')} isRtl={isRtl}>
                    <SettingsDropdown
                      value={settings.accent}
                      options={accentOptions}
                      onChange={(value) =>
                        setSettings((prev) => ({
                          ...prev,
                          accent: value as AppSettings['accent']
                        }))
                      }
                      isRtl={isRtl}
                    />
                  </SettingRow>
                  <SettingRow label={t('general.language')} isRtl={isRtl}>
                    <SettingsDropdown
                      value={settings.language}
                      options={languageOptions}
                      onChange={(value) =>
                        setSettings((prev) => ({
                          ...prev,
                          language: value as AppSettings['language']
                        }))
                      }
                      isRtl={isRtl}
                    />
                  </SettingRow>
                </>
              ) : isUserLoading ? (
                <div
                  className="space-y-3 py-3 sm:space-y-4 sm:py-4"
                  aria-label={t('account.loading')}
                >
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <>
                  <SettingRow label={t('account.fullName')} isRtl={isRtl}>
                    <span className="block break-words text-sm font-medium text-foreground">
                      {profile.name}
                    </span>
                  </SettingRow>
                  <SettingRow label={t('account.email')} isRtl={isRtl}>
                    <span className="block break-all text-sm font-medium text-foreground">
                      {profile.email}
                    </span>
                  </SettingRow>
                  <SettingRow label={t('account.role')} isRtl={isRtl}>
                    <span className="block break-words text-sm font-medium text-foreground">
                      {profile.role}
                    </span>
                  </SettingRow>
                  {readOnlyDetails.map(([field, value]) => (
                    <SettingRow
                      key={field}
                      label={t(`account.${field}`)}
                      isRtl={isRtl}
                    >
                      <span
                        className="block break-words text-sm font-medium text-foreground"
                        dir={
                          field === 'studentId' || field === 'personnelId'
                            ? 'ltr'
                            : undefined
                        }
                      >
                        {value}
                      </span>
                    </SettingRow>
                  ))}
                  <div className="mt-5 flex justify-start sm:mt-6">
                    <button
                      type="button"
                      onClick={handleEditProfile}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[hsl(var(--field-border))] bg-[hsl(var(--field))] px-4 text-sm font-medium text-[hsl(var(--field-foreground))] shadow-sm transition-colors hover:bg-[hsl(var(--surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
                    >
                      <UserPen className="h-4 w-4 shrink-0" />
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
