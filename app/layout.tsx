import './globals.css';
import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'DeepSeek Persian Clone',
  description: 'Frontend-only Persian RTL chat UI clone'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return children;
}
