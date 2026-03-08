import type { DieValue } from "@/features/game/core/types";

type DiceFaceProps = {
  value: DieValue;
  size?: "sm" | "md" | "lg";
  highlighted?: boolean;
  boosted?: boolean;
  animate?: boolean;
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

function getToneClass(highlighted: boolean, boosted: boolean) {
  if (highlighted) {
    return "border-emerald-400/70 bg-emerald-200/95";
  }

  if (boosted) {
    return "border-amber-300/90 bg-amber-100";
  }

  return "border-slate-300 bg-slate-100";
}

function getAnimationClass(params: { animate: boolean; boosted: boolean; highlighted: boolean }) {
  const { animate, boosted, highlighted } = params;
  const classes: string[] = [];

  if (animate) {
    classes.push("animate-roll-reveal");
  }

  if (boosted && !highlighted) {
    classes.push("animate-boosted-shimmer");
  }

  return classes.join(" ");
}

export function DiceFace({
  value,
  size = "md",
  highlighted = false,
  boosted = false,
  animate = true,
}: DiceFaceProps) {
  const toneClass = getToneClass(highlighted, boosted);
  const animationClass = getAnimationClass({ animate, boosted, highlighted });

  return (
    <div
      className={`relative border shadow-sm ${sizeClass[size]} ${toneClass} ${animationClass}`}
      aria-label={`Dice ${value}`}
    >
      {pipByValue[value].map((pip) => (
        <span
          key={pip}
          className={`absolute h-2.5 w-2.5 rounded-full bg-slate-900 ${pipPositionClass[pip]}`}
        />
      ))}
    </div>
  );
}
