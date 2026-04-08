import type { ReactNode } from "react";
import AdminAppShell from "@/components/AdminAppShell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminAppShell>{children}</AdminAppShell>;
}
