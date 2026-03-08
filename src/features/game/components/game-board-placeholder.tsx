export function GameBoardPlaceholder() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-black/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/60">
          Player board
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square rounded border border-dashed border-black/20"
            />
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-black/10 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/60">
          Bot board
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square rounded border border-dashed border-black/20"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
