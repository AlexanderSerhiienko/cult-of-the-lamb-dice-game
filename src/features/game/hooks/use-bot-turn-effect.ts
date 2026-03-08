"use client";

import { useEffect } from "react";
import { GAME_PHASE } from "@/features/game/core/types";
import type { GamePhase } from "@/features/game/core/types";

type UseBotTurnEffectParams = {
  phase: GamePhase;
  botMove: () => void;
  delayMs?: number;
};

export function useBotTurnEffect({ phase, botMove, delayMs = 450 }: UseBotTurnEffectParams) {
  useEffect(() => {
    if (phase !== GAME_PHASE.BOT_TURN) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      botMove();
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [phase, botMove, delayMs]);
}
