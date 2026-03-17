import type { Board, ColumnIndex } from "@/features/game/core/types";
import { BoardColumn } from "@/features/game/components/board/board-column";
import { useBoardSlotAnimations } from "@/features/game/hooks/use-board-slot-animations";

function getBoardPanelClass(isActive: boolean) {
  if (isActive) {
    return "border-violet-400/40 bg-slate-900/80 shadow-lg shadow-violet-900/10";
  }

  return "border-slate-700/70 bg-slate-900/70";
}

type GameBoardProps = {
  title: string;
  board: Board;
  isActive: boolean;
  isPlayerBoard?: boolean;
  canInteract?: boolean;
  interactiveColumns?: ColumnIndex[];
  onSelectColumn?: (columnIndex: ColumnIndex) => void;
};

export function GameBoard({
  title,
  board,
  isActive,
  isPlayerBoard = false,
  canInteract = false,
  interactiveColumns = [],
  onSelectColumn,
}: GameBoardProps) {
  const { impactSlots, removedSlots, removedValues, clearImpactSlot, clearRemovedSlot } =
    useBoardSlotAnimations(board);

  return (
    <section className={`mx-auto w-fit rounded-xl border p-4 ${getBoardPanelClass(isActive)}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold uppercase tracking-[0.18em] text-slate-300">
          {title}
        </h2>
      </div>

      <div className="mx-auto grid w-fit grid-cols-3 gap-2">
        {board.map((column: Board[number], index: number) => {
          const columnIndex = index as ColumnIndex;
          const canSelect =
            canInteract &&
            interactiveColumns.includes(columnIndex) &&
            typeof onSelectColumn === "function";

          return (
            <BoardColumn
              key={columnIndex}
              columnIndex={columnIndex}
              boardTitle={title}
              column={column}
              isPlayerBoard={isPlayerBoard}
              canSelect={canSelect}
              onSelectColumn={onSelectColumn}
              impactSlots={impactSlots}
              removedSlots={removedSlots}
              removedValues={removedValues}
              onImpactEnd={clearImpactSlot}
              onRemovedEnd={clearRemovedSlot}
            />
          );
        })}
      </div>
    </section>
  );
}
