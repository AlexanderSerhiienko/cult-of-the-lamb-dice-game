import { scoreColumn } from "@/features/game/core/rules";
import type { Board, ColumnIndex, DieValue } from "@/features/game/core/types";
import { BoardSlot } from "@/features/game/components/board/board-slot";
import { ColumnScoreBadge } from "@/features/game/components/board/column-score-badge";

function getColumnButtonClass(canSelect: boolean) {
  if (canSelect) {
    return "cursor-pointer border-emerald-400/60 bg-emerald-400/10 shadow-sm ring-1 ring-emerald-400/40 hover:-translate-y-0.5 hover:bg-emerald-300/15 hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-300/70 animate-selectable-pulse";
  }

  return "cursor-not-allowed border-slate-700 bg-slate-950/50 opacity-90";
}

type BoardColumnProps = {
  columnIndex: ColumnIndex;
  column: Board[number];
  isPlayerBoard: boolean;
  canSelect: boolean;
  onSelectColumn?: (columnIndex: ColumnIndex) => void;
  impactSlots: Record<string, true>;
  removedSlots: Record<string, true>;
  removedValues: Record<string, DieValue>;
  onImpactEnd: (slotKey: string) => void;
  onRemovedEnd: (slotKey: string) => void;
};

export function BoardColumn({
  columnIndex,
  column,
  isPlayerBoard,
  canSelect,
  onSelectColumn,
  impactSlots,
  removedSlots,
  removedValues,
  onImpactEnd,
  onRemovedEnd,
}: BoardColumnProps) {
  const renderedSlots = isPlayerBoard ? [0, 1, 2] : [2, 1, 0];
  const valueCounts = column.reduce<Record<number, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
  const columnScore = scoreColumn(column);

  return (
    <button
      type="button"
      onClick={() => onSelectColumn?.(columnIndex)}
      disabled={!canSelect}
      className={`flex w-[5.5rem] flex-col gap-2 rounded-lg border p-2 text-left transition focus-visible:outline-none md:w-[6.25rem] ${getColumnButtonClass(canSelect)}`}
    >
      <ColumnScoreBadge key={`${columnIndex}-${columnScore}`} score={columnScore} />
      {renderedSlots.map((slotIndex) => {
        const value = column[slotIndex];
        const isBoosted = typeof value === "number" ? valueCounts[value] > 1 : false;
        const slotKey = `${columnIndex}-${slotIndex}`;

        return (
          <BoardSlot
            key={slotIndex}
            slotKey={slotKey}
            value={value}
            isBoosted={isBoosted}
            isImpact={Boolean(impactSlots[slotKey])}
            isRemoved={Boolean(removedSlots[slotKey])}
            removedValue={removedValues[slotKey]}
            onImpactEnd={onImpactEnd}
            onRemovedEnd={onRemovedEnd}
          />
        );
      })}
    </button>
  );
}
