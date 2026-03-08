import Link from "next/link";

export default function Home() {
  return (
    <section className="mx-auto max-w-2xl space-y-8 rounded-2xl border border-slate-700 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40 md:p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 md:text-4xl">
          Knucklebones
        </h1>
        <p className="text-sm text-slate-300/85 md:text-base">
          Browser-based dice duel inspired by Cult of the Lamb. Choose a mode and start playing.
        </p>
      </div>

      <div className="space-y-3">
        <Link
          href="/game"
          className="flex w-full items-center justify-center rounded-xl bg-violet-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-300"
        >
          New game with bot
        </Link>
        <button
          type="button"
          disabled
          className="flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm font-semibold text-slate-500"
        >
          Settings (coming soon)
        </button>
      </div>
    </section>
  );
}
