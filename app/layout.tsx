import './globals.css';
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Persian AI',
  description: 'Frontend-only Persian RTL chat UI clone'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
