import "./globals.css";
import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { AppShell } from "@/presentation/components/layout/AppShell";

export const metadata: Metadata = {
  title: "AI Chat Enterprise",
  description: "Front-end only enterprise AI chat",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
