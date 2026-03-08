import { GAME_PHASE } from "@/features/game/core/types";
import type { Board, ColumnIndex, GamePhase } from "@/features/game/core/types";
import { GameBoard } from "@/features/game/components/game-board";

type BoardsStackProps = {
  botBoard: Board;
  playerBoard: Board;
  phase: GamePhase;
  playerAvailableColumns: ColumnIndex[];
  onSelectColumn: (columnIndex: ColumnIndex) => void;
};

export function BoardsStack({
  botBoard,
  playerBoard,
  phase,
  playerAvailableColumns,
  onSelectColumn,
}: BoardsStackProps) {
  return (
    <main className="mx-auto flex w-fit self-center flex-col gap-4">
      <GameBoard title="Bot board" board={botBoard} isActive={phase === GAME_PHASE.BOT_TURN} />
      <GameBoard
        title="Player board"
        board={playerBoard}
        isActive={phase === GAME_PHASE.PLAYER_TURN}
        isPlayerBoard
        interactiveColumns={playerAvailableColumns}
        onSelectColumn={onSelectColumn}
      />
    </main>
  );
}
