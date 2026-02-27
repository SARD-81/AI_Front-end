'use client';

import {useState} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ThemeProvider, useTheme} from 'next-themes';
import {NextIntlClientProvider, type AbstractIntlMessages} from 'next-intl';
import {Toaster} from 'sonner';


function AppToaster() {
  const {resolvedTheme} = useTheme();

  return (
    <Toaster
      position="top-center"
      richColors={false}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      toastOptions={{
        classNames: {
          toast:
            'border border-border bg-card text-card-foreground shadow-card rounded-xl px-4 py-3',
          title: 'text-sm font-medium',
          description: 'text-sm text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground'
        }
      }}
    />
  );
}

export function AppProviders({
  children,
  locale,
  messages
}: {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Asia/Tehran"
      onError={() => {}}
      getMessageFallback={({namespace, key}) => (namespace ? `${namespace}.${key}` : key)}
    >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          {children}
          <AppToaster />
        </QueryClientProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
