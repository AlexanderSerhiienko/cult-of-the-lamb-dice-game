type ColumnScoreBadgeProps = {
  score: number;
};

export function ColumnScoreBadge({ score }: ColumnScoreBadgeProps) {
  return (
    <span
      className={`animate-score-pop text-center text-xs font-semibold ${
        score > 0 ? "text-slate-200" : "text-slate-500"
      }`}
    >
      {score}
    </span>
  );
}
