import Link from "next/link";
import { HeaderActionButton } from "@/components/ui/header-action-button";

type GameHeaderActionsProps = {
  onStartGame: () => void;
  onResetGame: () => void;
  onOpenRules: () => void;
  onOpenMatchInfo: () => void;
  isResetDisabled: boolean;
};

export function GameHeaderActions({
  onStartGame,
  onResetGame,
  onOpenRules,
  onOpenMatchInfo,
  isResetDisabled,
}: GameHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/"
        className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
      >
        Back to menu
      </Link>
      <HeaderActionButton onClick={onStartGame}>New game</HeaderActionButton>
      <HeaderActionButton onClick={onResetGame} disabled={isResetDisabled}>
        Reset
      </HeaderActionButton>
      <HeaderActionButton variant="secondary" onClick={onOpenRules}>
        Rules
      </HeaderActionButton>
      <HeaderActionButton variant="secondary" onClick={onOpenMatchInfo}>
        Match info
      </HeaderActionButton>
    </div>
  );
}
