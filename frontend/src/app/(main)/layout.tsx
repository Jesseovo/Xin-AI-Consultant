import MainAppShell from "@/components/MainAppShell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <MainAppShell>{children}</MainAppShell>;
}
