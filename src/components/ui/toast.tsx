"use client";

import { useEffect, useState } from "react";

type ToastProps = {
  eventKey: number;
  message: string;
  durationMs?: number;
  className?: string;
};

export function Toast({ eventKey, message, durationMs = 1400, className = "" }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (eventKey === 0) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      setVisible(true);
    });

    const timeoutId = window.setTimeout(() => {
      setVisible(false);
    }, durationMs);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [durationMs, eventKey]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`fixed right-6 top-20 z-50 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 shadow-lg backdrop-blur ${className}`}
    >
      {message}
    </div>
  );
}
