import { HeaderActionButton } from "@/components/ui/header-action-button";

type GameHeaderActionsProps = {
  onStartGame: () => void;
  onResetGame: () => void;
  isResetDisabled: boolean;
};

export function GameHeaderActions({
  onStartGame,
  onResetGame,
  isResetDisabled,
}: GameHeaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <HeaderActionButton onClick={onStartGame}>New game</HeaderActionButton>
      <HeaderActionButton variant="secondary" onClick={onResetGame} disabled={isResetDisabled}>
        Reset
      </HeaderActionButton>
    </div>
  );
}
