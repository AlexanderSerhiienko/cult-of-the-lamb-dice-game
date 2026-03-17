"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

const isTestAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH === "1";

export default function TestAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [email, setEmail] = useState("tester@example.com");
  const [name, setName] = useState("Test User");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = searchParams.get("next") || "/";

  if (!isTestAuthEnabled) {
    return (
      <section className="mx-auto max-w-lg rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-semibold text-slate-100">Test auth is disabled</h1>
        <p className="mt-3 text-sm text-slate-400">
          Enable it with <code>NEXT_PUBLIC_ENABLE_TEST_AUTH=1</code> and <code>ENABLE_TEST_AUTH=1</code>.
        </p>
      </section>
    );
  }

  if (status === "authenticated") {
    return (
      <section className="mx-auto max-w-lg rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-xl font-semibold text-slate-100">Already signed in</h1>
        <button
          type="button"
          onClick={() => router.push(nextPath)}
          className="mt-4 rounded-md border border-emerald-500/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100"
        >
          Continue
        </button>
      </section>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn("test-auth", {
      email,
      name,
      callbackUrl: nextPath,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push(result?.url ?? nextPath);
  }

  return (
    <section className="mx-auto max-w-lg rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h1 className="text-xl font-semibold text-slate-100">Test auth</h1>
      <p className="mt-2 text-sm text-slate-400">Use this page only for local browser tests.</p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm text-slate-200">
          <span className="mb-2 block">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
            type="email"
            name="email"
          />
        </label>

        <label className="block text-sm text-slate-200">
          <span className="mb-2 block">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
            type="text"
            name="name"
          />
        </label>

        <button
          type="submit"
          disabled={submitting || !email}
          className="rounded-md border border-emerald-500/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in with test auth"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
