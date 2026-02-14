import './globals.css';
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'AI Persian Clone',
  description: 'Frontend-only Persian RTL chat UI clone'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return children;
}
