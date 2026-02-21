import './globals.css';
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'دستیار دانشگاه شهید بهشتی',
  description: 'Frontend-only Persian RTL chat UI clone',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png'
  }
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
