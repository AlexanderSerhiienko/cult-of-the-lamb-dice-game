import type { DieValue } from "@/features/game/core/types";
import { SectionCard } from "@/components/ui/section-card";
import { DiceFace } from "@/features/game/components/dice-face";
import { DiePlaceholder } from "@/features/game/components/die-placeholder";

type CurrentDieCardProps = {
  label: string;
  dieValue: DieValue | null;
  isActiveTurn: boolean;
};

export function CurrentDieCard({ label, dieValue, isActiveTurn }: CurrentDieCardProps) {
  return (
    <SectionCard className={isActiveTurn ? "animate-turn-pulse" : ""}>
      <p className="text-center text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="mt-4 flex min-h-14 items-center justify-center">
        {dieValue ? (
          <DiceFace value={dieValue} size="sm" highlighted={isActiveTurn} />
        ) : (
          <DiePlaceholder />
        )}
      </div>
    </SectionCard>
  );
}
