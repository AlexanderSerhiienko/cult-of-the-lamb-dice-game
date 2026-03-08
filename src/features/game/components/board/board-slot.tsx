import type { DieValue } from "@/features/game/core/types";
import { DiceFace } from "@/features/game/components/dice-face";

function getSlotClass(isFilled: boolean, isBoosted: boolean) {
  if (!isFilled) {
    return "border-dashed border-slate-700/80 bg-slate-900/40";
  }

  if (isBoosted) {
    return "border-amber-300/70 bg-amber-300/10 ring-1 ring-amber-300/30";
  }

  return "border-slate-600 bg-slate-800/90";
}

type BoardSlotProps = {
  slotKey: string;
  value: DieValue | undefined;
  isBoosted: boolean;
  isImpact: boolean;
  isRemoved: boolean;
  removedValue: DieValue | undefined;
  onImpactEnd: (slotKey: string) => void;
  onRemovedEnd: (slotKey: string) => void;
};

export function BoardSlot({
  slotKey,
  value,
  isBoosted,
  isImpact,
  isRemoved,
  removedValue,
  onImpactEnd,
  onRemovedEnd,
}: BoardSlotProps) {
  const isFilled = typeof value === "number";
  const slotAnimationClass = isImpact ? "animate-slot-impact" : "";

  return (
    <div
      className={`aspect-square w-full rounded-lg border ${getSlotClass(
        isFilled,
        isBoosted,
      )} ${slotAnimationClass}`}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget || !isImpact) {
          return;
        }
        onImpactEnd(slotKey);
      }}
    >
      <div className="flex h-full items-center justify-center">
        {isFilled ? <DiceFace value={value} size="sm" boosted={isBoosted} /> : null}
        {!isFilled && isRemoved && removedValue ? (
          <div
            className="animate-die-remove"
            onAnimationEnd={(event) => {
              if (event.target !== event.currentTarget) {
                return;
              }
              onRemovedEnd(slotKey);
            }}
          >
            <DiceFace value={removedValue} size="sm" animate={false} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
