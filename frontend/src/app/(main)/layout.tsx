import type { ReactNode } from "react";
import MainAppShell from "@/components/MainAppShell";
import MainPageTransition from "@/components/MainPageTransition";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <MainAppShell>
      <MainPageTransition>{children}</MainPageTransition>
    </MainAppShell>
  );
}
