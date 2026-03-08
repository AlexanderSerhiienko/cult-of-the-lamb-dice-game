import type { GamePhase, GameStatus } from "@/features/game/core/types";

type MatchInfoContentProps = {
  status: GameStatus;
  phase: GamePhase;
  inputState: "locked" | "available";
};

export function MatchInfoContent({ status, phase, inputState }: MatchInfoContentProps) {
  return (
    <div className="mt-4 space-y-2 text-sm text-slate-300">
      <p>
        Status: <span className="font-semibold text-slate-100">{status}</span>
      </p>
      <p>
        Phase: <span className="font-semibold text-slate-100">{phase}</span>
      </p>
      <p>
        Input: <span className="font-semibold text-slate-100">{inputState}</span>
      </p>
    </div>
  );
}
