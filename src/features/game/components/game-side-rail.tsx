import type { DieValue, Player } from "@/features/game/core/types";
import { CurrentDieCard } from "@/features/game/components/current-die-card";
import { ScoreCard } from "@/features/game/components/score-card";

type GameSideRailProps = {
  scoreLabel: string;
  scoreValue: number;
  scoreTone: Player;
  dieLabel: string;
  dieValue: DieValue | null;
  isActiveTurn: boolean;
};

export function GameSideRail({
  scoreLabel,
  scoreValue,
  scoreTone,
  dieLabel,
  dieValue,
  isActiveTurn,
}: GameSideRailProps) {
  return (
    <aside className="flex h-full flex-col items-center justify-center gap-5">
      <ScoreCard label={scoreLabel} value={scoreValue} tone={scoreTone} />
      <CurrentDieCard label={dieLabel} dieValue={dieValue} isActiveTurn={isActiveTurn} />
    </aside>
  );
}
