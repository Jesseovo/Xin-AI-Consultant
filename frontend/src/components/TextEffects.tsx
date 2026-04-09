"use client";

import { animate, motion, useInView } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const easePremium: [number, number, number, number] = [0.25, 0.4, 0.25, 1];

export function AnimatedTitle({
  text,
  className,
  as: Tag = "h1",
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  const words = text.split(" ").filter(Boolean);
  const segments = text.includes(" ") ? words : text.match(/.{1,4}/g) || [text];

  return (
    <Tag className={className}>
      <span className="inline-flex flex-wrap justify-center gap-x-1 sm:gap-x-1.5 gap-y-1">
        {segments.map((segment, i) => (
          <motion.span
            key={`${segment}-${i}`}
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: easePremium }}
            className="inline-block"
          >
            {segment}
          </motion.span>
        ))}
      </span>
    </Tag>
  );
}

export function TypewriterText({
  text,
  speed = 30,
  className,
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    if (!text) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);

  const typing = shown.length < text.length;

  return (
    <span className={className}>
      {shown}
      {typing && (
        <span
          className="inline-block w-0.5 h-[1em] ml-0.5 align-[-0.15em] bg-[--text-secondary] opacity-50 animate-pulse rounded-sm"
          aria-hidden
        />
      )}
    </span>
  );
}

export function FadeInSection({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-48px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.55, delay, ease: easePremium }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function GradientText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`bg-gradient-to-r from-amber-700 via-yellow-700 to-orange-600 bg-clip-text text-transparent dark:from-amber-400 dark:via-yellow-400 dark:to-orange-400 ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export function BreathingText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split("").map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          className="inline-block"
          style={{ whiteSpace: char === " " ? "pre" : undefined }}
          animate={{
            y: [0, -3, 0],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.06,
          }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

export function FloatingCard({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: easePremium }}
      className={className}
    >
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{
          duration: 5 + delay * 0.25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function CountUp({ end, duration = 2, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, end, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [end, duration]);

  return (
    <span className="tabular-nums">
      {display.toLocaleString("zh-CN")}
      {suffix}
    </span>
  );
}

export function TextReveal({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-12%" });

  const lines = useMemo(() => {
    const raw = text.split(/\n/).filter((l) => l.length > 0);
    return raw.length > 0 ? raw : [text];
  }, [text]);

  return (
    <div ref={ref} className={className}>
      {lines.map((line, i) => (
        <div key={i} className="overflow-hidden">
          <motion.span
            className="block text-[--text-primary]"
            initial={{ opacity: 0, y: "100%", filter: "blur(6px)" }}
            animate={
              isInView
                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, y: "100%", filter: "blur(6px)" }
            }
            transition={{ duration: 0.65, delay: i * 0.12, ease: easePremium }}
          >
            {line}
          </motion.span>
        </div>
      ))}
    </div>
  );
}
