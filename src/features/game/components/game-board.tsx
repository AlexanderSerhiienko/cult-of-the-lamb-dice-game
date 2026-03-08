import type { Board, ColumnIndex } from "@/features/game/core/types";
import { DiceFace } from "@/features/game/components/dice-face";

type GameBoardProps = {
  title: string;
  board: Board;
  isActive: boolean;
  isPlayerBoard?: boolean;
  interactiveColumns?: ColumnIndex[];
  onSelectColumn?: (columnIndex: ColumnIndex) => void;
};

export function GameBoard({
  title,
  board,
  isActive,
  isPlayerBoard = false,
  interactiveColumns = [],
  onSelectColumn,
}: GameBoardProps) {
  return (
    <section
      className={`mx-auto w-fit rounded-xl border p-4 ${
        isActive
          ? "border-violet-400/40 bg-slate-900/80 shadow-lg shadow-violet-900/10"
          : "border-slate-700/70 bg-slate-900/70"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold uppercase tracking-[0.18em] text-slate-300">
          {title}
        </h2>
      </div>

      <div className="mx-auto grid w-fit grid-cols-3 gap-2">
        {board.map((column: Board[number], index: number) => {
          const columnIndex = index as ColumnIndex;
          const renderedSlots = isPlayerBoard ? [0, 1, 2] : [2, 1, 0];
          const canSelect =
            Boolean(isPlayerBoard) &&
            interactiveColumns.includes(columnIndex) &&
            typeof onSelectColumn === "function";
          const valueCounts = column.reduce<Record<number, number>>((acc, value) => {
            acc[value] = (acc[value] ?? 0) + 1;
            return acc;
          }, {});

          return (
            <button
              key={columnIndex}
              type="button"
              onClick={() => onSelectColumn?.(columnIndex)}
              disabled={!canSelect}
              className={`flex w-[5.5rem] flex-col gap-2 rounded-lg border p-2 text-left transition focus-visible:outline-none md:w-[6.25rem] ${
                canSelect
                  ? "cursor-pointer border-emerald-400/60 bg-emerald-400/10 shadow-sm ring-1 ring-emerald-400/40 hover:-translate-y-0.5 hover:bg-emerald-300/15 hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-300/70"
                  : "cursor-not-allowed border-slate-700 bg-slate-950/50 opacity-90"
              }`}
            >
              {renderedSlots.map((slotIndex) => {
                const value = column[slotIndex];
                const isBoosted = typeof value === "number" ? valueCounts[value] > 1 : false;

                return (
                  <div
                    key={slotIndex}
                    className={`aspect-square w-full rounded-lg border ${
                      typeof value === "number"
                        ? isBoosted
                          ? "border-amber-300/70 bg-amber-300/10 ring-1 ring-amber-300/30"
                          : "border-slate-600 bg-slate-800/90"
                        : "border-dashed border-slate-700/80 bg-slate-900/40"
                    }`}
                  >
                    <div className="flex h-full items-center justify-center">
                      {typeof value === "number" ? (
                        <DiceFace value={value} size="sm" boosted={isBoosted} />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </button>
          );
        })}
      </div>
    </section>
  );
}
