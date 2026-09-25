'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BrainCircuit,
  Files,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PanelRight,
  Settings,
  UserCircle2,
  X
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UniversityLogo } from '@/components/branding/UniversityLogo';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { PasswordChangeDialog } from '@/components/auth/PasswordChangeDialog';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useMediaQuery } from '@/hooks/use-media-query';
import { getMe, logout } from '@/lib/services/auth-service';
import { cn } from '@/lib/utils';
import { formatDigitsForLocale } from '@/lib/utils/digits';

const SERVICE_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, comingSoon: true },
  { id: 'chat', icon: MessageSquare, comingSoon: false },
  { id: 'documents', icon: Files, comingSoon: true },
  { id: 'memory', icon: BrainCircuit, comingSoon: true }
] as const;

export function ServicesRail({
  locale,
  collapsed,
  mobileOpen,
  onClose,
  onToggleCollapsed
}: {
  locale: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  onToggleCollapsed: () => void;
}) {
  const t = useTranslations('app');
  const account = useTranslations('auth.passwordChange');
  const isMobile = useMediaQuery('(max-width: 767px)');
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const isRtl = locale === 'fa';
  const profileQuery = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: getMe,
    staleTime: 60_000,
    retry: false
  });
  const { settings, setSettings } = useAppSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const user = profileQuery.data?.user;
  const fullName = user?.fullName?.trim();
  const firstLastName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const profileName = formatDigitsForLocale(
    fullName || firstLastName || user?.studentId || t('sidebar.guestUser'),
    locale
  );
  const rawProfileSubtitle =
    user?.email ||
    user?.studentId ||
    user?.personnelId ||
    (fullName || firstLastName ? '' : t('sidebar.demoVersion'));
  const profileSubtitle = formatDigitsForLocale(rawProfileSubtitle, locale);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Continue local logout cleanup even if the backend request fails.
    } finally {
      queryClient.clear();
      router.replace(`/${locale}/auth?mode=login`);
      onClose();
    }
  };

  return (
    <>
      <aside
        id="services-panel"
        aria-label={t('services.label')}
        aria-hidden={isMobile && !mobileOpen}
        ref={(node) => {
          if (!node) return;
          if (isMobile && !mobileOpen) node.setAttribute('inert', '');
          else node.removeAttribute('inert');
        }}
        className={cn(
          'soha-sidebar flex min-h-0 flex-col text-white transition-transform duration-200 motion-reduce:transition-none',
          'fixed inset-y-0 right-0 z-40 w-[min(88vw,18.5rem)] border-s border-[#0d607c] pt-[env(safe-area-inset-top)] shadow-2xl',
          'md:static md:z-0 md:h-full md:w-[4.5rem] md:translate-x-0 md:pt-0 md:shadow-none',
          !collapsed && 'xl:w-[15.75rem]',
          mobileOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full md:pointer-events-auto'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2 border-b border-white/15 px-3 py-3',
              collapsed && 'md:flex-col md:px-2 xl:flex-row'
          )}
        >
          <Link
            href={`/${locale}`}
            aria-label={t('sidebar.home')}
            className={cn(
              'flex min-h-12 min-w-0 items-center rounded-2xl text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ce4eb]',
              'w-12 justify-center md:w-12 xl:w-auto xl:flex-1 xl:justify-start xl:gap-2 xl:px-1',
              collapsed && 'xl:w-12 xl:justify-center xl:px-0'
            )}
          >
            <UniversityLogo
              alt={t('sidebar.logoAlt')}
              inverse
              className="h-10 w-10"
            />
            <span className={cn('min-w-0 text-start max-md:block md:hidden', !collapsed && 'xl:block')}>
                <span className="block font-display-fa text-xl leading-7">
                  {t('chatHeader.productName')}
                </span>
                <span className="line-clamp-2 text-[11px] leading-4 text-[#b7dbe4]">
                  {t('chatHeader.subtitle')}
                </span>
            </span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('services.close')}
            className="h-11 w-11 shrink-0 text-white hover:bg-white/15 md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? t('services.expand') : t('services.collapse')}
            title={collapsed ? t('services.expand') : t('services.collapse')}
            className="hidden h-10 w-10 shrink-0 text-[#b7dbe4] hover:bg-white/10 hover:text-white xl:inline-flex"
          >
            <PanelRight className="h-5 w-5" />
          </Button>
        </div>

        <nav
          className="soha-sidebar-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-3"
          aria-label={t('services.label')}
        >
          {SERVICE_ITEMS.map((item) => {
            const Icon = item.icon;
            const label = t(`services.items.${item.id}`);
            const isChat = item.id === 'chat';
            const isCurrentChat = isChat && pathname?.includes('/chat');

            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.comingSoon ? `${label} — ${t('services.comingSoon')}` : label}
                aria-current={isCurrentChat ? 'page' : undefined}
                aria-disabled={item.comingSoon ? true : undefined}
                title={item.comingSoon ? t('services.comingSoon') : label}
                onClick={
                  isChat
                    ? () => {
                        onClose();
                        if (pathname?.includes('/chat')) return;
                        router.push(`/${locale}/chat`);
                      }
                    : undefined
                }
                className={cn(
                  'group relative flex min-h-11 items-center rounded-xl border text-start text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ce4eb]',
                  'justify-center md:justify-center max-md:justify-start max-md:gap-3 max-md:px-3',
                  !collapsed && 'xl:justify-start xl:gap-3 xl:px-3',
                  isCurrentChat
                    ? 'border-white/25 bg-white/15 font-semibold text-white'
                    : 'border-transparent text-[#e7f4f8]',
                  !item.comingSoon && !isCurrentChat && 'hover:border-white/15 hover:bg-white/10 active:bg-white/15',
                  item.comingSoon &&
                    'cursor-not-allowed text-[#b7dbe4] hover:border-transparent hover:bg-transparent active:bg-transparent'
                )}
              >
                <Icon className="h-[1.15rem] w-[1.15rem] shrink-0" aria-hidden="true" />
                <span className={cn('truncate max-md:inline md:hidden', !collapsed && 'xl:inline')}>
                  {label}
                </span>
                {item.comingSoon ? (
                  <span
                    role="tooltip"
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#06131b] px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100',
                      isRtl ? 'right-[calc(100%+0.5rem)]' : 'left-[calc(100%+0.5rem)]'
                    )}
                  >
                    {t('services.comingSoon')}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div
          className={cn(
            'mt-auto border-t border-white/15 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]',
            'md:flex md:justify-center',
            !collapsed && 'xl:block'
          )}
        >
          <DropdownMenu dir={isRtl ? 'rtl' : 'ltr'}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'min-h-12 w-full justify-start gap-2 rounded-xl border border-white/15 bg-white/[0.07] text-white hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-[#8ce4eb]',
                  'md:h-12 md:w-12 md:justify-center md:p-0',
                  !collapsed && 'xl:h-auto xl:w-full xl:justify-start xl:p-2'
                )}
                aria-label={t('sidebar.profile')}
                title={t('sidebar.profile')}
              >
                <UserCircle2 className="h-5 w-5 shrink-0" />
                <span className={cn('min-w-0 flex-1 text-start max-md:block md:hidden', !collapsed && 'xl:block')}>
                    <span className="block truncate text-sm font-medium">
                      {profileName}
                    </span>
                    {profileSubtitle ? (
                      <span className="block truncate text-xs text-[#b6dbe4]">
                        {profileSubtitle}
                      </span>
                    ) : null}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side={isRtl ? 'left' : 'right'}
              className={cn('w-64', isRtl ? 'text-right' : 'text-left')}
            >
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <Settings className="me-2 h-4 w-4" />
                {t('sidebar.settings')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                {account('action')}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}/profile`}>{t('sidebar.editProfile')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-danger-text focus:bg-danger-surface focus:text-danger-text"
                onClick={() => setLogoutConfirmOpen(true)}
              >
                <LogOut className="me-2 h-4 w-4" />
                {t('sidebar.logoutNow')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        setSettings={setSettings}
        user={user}
        isUserLoading={profileQuery.isLoading}
        onNavigate={onClose}
      />

      <PasswordChangeDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        locale={locale}
      />

      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="max-w-sm" dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogTitle>{t('sidebar.logoutConfirmTitle')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('sidebar.logoutConfirmDescription')}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogoutConfirmOpen(false)}
            >
              {t('sidebar.cancelLogout')}
            </Button>
            <Button type="button" variant="destructive" onClick={handleLogout}>
              {t('sidebar.confirmLogout')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
