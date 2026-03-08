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
