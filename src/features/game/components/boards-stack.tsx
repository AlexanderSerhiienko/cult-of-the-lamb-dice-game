import { GAME_PHASE } from "@/features/game/core/types";
import type { Board, ColumnIndex, GamePhase } from "@/features/game/core/types";
import { GameBoard } from "@/features/game/components/game-board";

type BoardsStackProps = {
  botBoard: Board;
  playerBoard: Board;
  phase: GamePhase;
  botBoardTitle: string;
  playerBoardTitle: string;
  botAvailableColumns: ColumnIndex[];
  playerAvailableColumns: ColumnIndex[];
  botBoardSelectable?: boolean;
  onSelectColumn: (columnIndex: ColumnIndex) => void;
};

export function BoardsStack({
  botBoard,
  playerBoard,
  phase,
  botBoardTitle,
  playerBoardTitle,
  botAvailableColumns,
  playerAvailableColumns,
  botBoardSelectable = false,
  onSelectColumn,
}: BoardsStackProps) {
  return (
    <main className="mx-auto flex w-fit self-center flex-col gap-4">
      <GameBoard
        title={botBoardTitle}
        board={botBoard}
        isActive={phase === GAME_PHASE.BOT_TURN}
        interactiveColumns={botAvailableColumns}
        onSelectColumn={onSelectColumn}
        canInteract={botBoardSelectable}
      />
      <GameBoard
        title={playerBoardTitle}
        board={playerBoard}
        isActive={phase === GAME_PHASE.PLAYER_TURN}
        isPlayerBoard
        interactiveColumns={playerAvailableColumns}
        onSelectColumn={onSelectColumn}
        canInteract
      />
    </main>
  );
}
