import type { Board, ColumnIndex } from "@/features/game/core/types";
import { GameBoard } from "@/features/game/components/game-board";

type BoardsStackProps = {
  botBoard: Board;
  playerBoard: Board;
  phase: string;
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
      <GameBoard title="Bot board" board={botBoard} isActive={phase === "bot_turn"} />
      <GameBoard
        title="Player board"
        board={playerBoard}
        isActive={phase === "player_turn"}
        isPlayerBoard
        interactiveColumns={playerAvailableColumns}
        onSelectColumn={onSelectColumn}
      />
    </main>
  );
}
