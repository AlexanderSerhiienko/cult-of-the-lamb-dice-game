type DiePlaceholderProps = {
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "h-14 w-14 rounded-2xl text-sm",
  md: "h-20 w-20 rounded-3xl text-base",
  lg: "h-28 w-28 rounded-3xl text-lg",
};

export function DiePlaceholder({ size = "sm" }: DiePlaceholderProps) {
  return (
    <div
      className={`flex items-center justify-center border border-slate-700 bg-slate-900 font-semibold text-slate-500 ${sizeClass[size]}`}
    >
      -
    </div>
  );
}
