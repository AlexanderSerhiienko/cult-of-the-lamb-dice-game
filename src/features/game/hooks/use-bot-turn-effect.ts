"use client";

import { useEffect } from "react";

type UseBotTurnEffectParams = {
  phase: string;
  botMove: () => void;
  delayMs?: number;
};

export function useBotTurnEffect({ phase, botMove, delayMs = 450 }: UseBotTurnEffectParams) {
  useEffect(() => {
    if (phase !== "bot_turn") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      botMove();
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [phase, botMove, delayMs]);
}
