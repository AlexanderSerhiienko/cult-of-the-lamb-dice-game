import { SectionCard } from "@/components/ui/section-card";
import { PLAYER } from "@/features/game/core/types";
import type { Player } from "@/features/game/core/types";

type ScoreCardProps = {
  label: string;
  value: number;
  tone: Player;
};

const valueToneClass = {
  [PLAYER.PLAYER]: "text-emerald-300",
  [PLAYER.BOT]: "text-violet-300",
};

export function ScoreCard({ label, value, tone }: ScoreCardProps) {
  return (
    <SectionCard className="text-center">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p key={`${label}-${value}`} className={`mt-3 text-6xl font-black animate-score-pop ${valueToneClass[tone]}`}>
        {value}
      </p>
    </SectionCard>
  );
}
