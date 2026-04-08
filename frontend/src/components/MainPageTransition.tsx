"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const ease: [number, number, number, number] = [0.25, 0.4, 0.25, 1];

export default function MainPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease }}
        className="flex-1 min-h-0 flex flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
