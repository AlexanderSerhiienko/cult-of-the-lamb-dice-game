import { GAME_PHASE } from "@/features/game/core/types";
import type { Board, ColumnIndex, GamePhase } from "@/features/game/core/types";
import { GameBoard } from "@/features/game/components/game-board";

type BoardsStackProps = {
  upperBoard: Board;
  lowerBoard: Board;
  phase: GamePhase;
  upperBoardTitle: string;
  lowerBoardTitle: string;
  upperAvailableColumns: ColumnIndex[];
  lowerAvailableColumns: ColumnIndex[];
  upperBoardSelectable?: boolean;
  onSelectColumn: (columnIndex: ColumnIndex) => void;
};

export function BoardsStack({
  upperBoard,
  lowerBoard,
  phase,
  upperBoardTitle,
  lowerBoardTitle,
  upperAvailableColumns,
  lowerAvailableColumns,
  upperBoardSelectable = false,
  onSelectColumn,
}: BoardsStackProps) {
  return (
    <main className="mx-auto flex w-fit self-center flex-col gap-4">
      <GameBoard
        title={upperBoardTitle}
        board={upperBoard}
        isActive={phase === GAME_PHASE.BOT_TURN}
        interactiveColumns={upperAvailableColumns}
        onSelectColumn={onSelectColumn}
        canInteract={upperBoardSelectable}
      />
      <GameBoard
        title={lowerBoardTitle}
        board={lowerBoard}
        isActive={phase === GAME_PHASE.PLAYER_TURN}
        isPlayerBoard
        interactiveColumns={lowerAvailableColumns}
        onSelectColumn={onSelectColumn}
        canInteract
      />
    </main>
  );
}
