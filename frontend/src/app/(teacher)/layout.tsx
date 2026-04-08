import type { ReactNode } from "react";
import TeacherAppShell from "@/components/TeacherAppShell";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return <TeacherAppShell>{children}</TeacherAppShell>;
}
