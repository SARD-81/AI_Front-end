"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Vazirmatn } from "next/font/google";
import { Toaster } from "@/presentation/components/common/Toaster";
import { useUIStore } from "@/store/ui.store";

const vazirmatn = Vazirmatn({ subsets: ["arabic"] });
const queryClient = new QueryClient();

async function initMsw() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return;
  const { worker } = await import("@/infrastructure/mock/msw/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.settings.theme);

  useEffect(() => {
    initMsw();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <div dir="rtl" className={`${vazirmatn.className} min-h-screen bg-zinc-950 text-zinc-100`}>
        {children}
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}
