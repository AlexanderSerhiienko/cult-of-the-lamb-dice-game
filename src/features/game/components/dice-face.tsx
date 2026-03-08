import type { DieValue } from "@/features/game/core/types";

type DiceFaceProps = {
  value: DieValue;
  size?: "sm" | "md" | "lg";
  highlighted?: boolean;
  boosted?: boolean;
};

const pipByValue: Record<DieValue, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

const pipPositionClass: Record<number, string> = {
  1: "left-[16%] top-[16%]",
  2: "left-1/2 top-[16%] -translate-x-1/2",
  3: "right-[16%] top-[16%]",
  4: "left-[16%] top-1/2 -translate-y-1/2",
  5: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
  6: "right-[16%] top-1/2 -translate-y-1/2",
  7: "left-[16%] bottom-[16%]",
  8: "left-1/2 bottom-[16%] -translate-x-1/2",
  9: "right-[16%] bottom-[16%]",
};

const sizeClass = {
  sm: "h-14 w-14 rounded-2xl",
  md: "h-20 w-20 rounded-3xl",
  lg: "h-28 w-28 rounded-3xl",
};

export function DiceFace({ value, size = "md", highlighted = false, boosted = false }: DiceFaceProps) {
  const toneClass = highlighted
    ? "border-emerald-400/70 bg-emerald-200/95"
    : boosted
      ? "border-amber-300/90 bg-amber-100"
      : "border-slate-300 bg-slate-100";

  return (
    <div className={`relative border shadow-sm ${sizeClass[size]} ${toneClass}`} aria-label={`Dice ${value}`}>
      {pipByValue[value].map((pip) => (
        <span
          key={pip}
          className={`absolute h-2.5 w-2.5 rounded-full bg-slate-900 ${pipPositionClass[pip]}`}
        />
      ))}
    </div>
  );
}
