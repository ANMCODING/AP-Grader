"use client";

import { useCallback, useEffect, useState } from "react";

interface GradeStats {
  enabled: boolean;
  total: number;
  research: number;
  seminar: number;
  seminarIwa: number;
  seminarIrr: number;
  lastGradedAt: string | null;
}

export default function AdminStatsPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<GradeStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats");
      const data = (await res.json()) as GradeStats & { error?: string };
      if (!res.ok) {
        setAuthed(false);
        throw new Error(data.error ?? "Could not load stats.");
      }
      setStats(data);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Login failed.");
      }
      setSecret("");
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setStats(null);
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-12">
      <h1 className="text-xl font-semibold text-ink">AP Grader — usage</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Counts only. No paper text is stored.
      </p>

      {!authed ? (
        <form onSubmit={handleLogin} className="mt-8 space-y-3">
          <label className="block text-sm font-medium text-ink">
            Admin password
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={loading || !secret.trim()}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Checking…" : "View stats"}
          </button>
        </form>
      ) : (
        <div className="mt-8 space-y-4">
          {!stats?.enabled ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Redis is not connected yet. Add Upstash env vars on Vercel (see
              README), then redeploy.
            </p>
          ) : (
            <dl className="space-y-3 rounded-xl border border-border bg-surface-subtle p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Total papers graded</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {stats.total.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">AP Research</dt>
                <dd className="font-medium tabular-nums">{stats.research}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">AP Seminar (all)</dt>
                <dd className="font-medium tabular-nums">{stats.seminar}</dd>
              </div>
              <div className="flex justify-between gap-4 pl-3">
                <dt className="text-ink-muted">— IWA</dt>
                <dd className="tabular-nums">{stats.seminarIwa}</dd>
              </div>
              <div className="flex justify-between gap-4 pl-3">
                <dt className="text-ink-muted">— IRR</dt>
                <dd className="tabular-nums">{stats.seminarIrr}</dd>
              </div>
              {stats.lastGradedAt && (
                <div className="border-t border-border pt-3 text-xs text-ink-muted">
                  Last graded:{" "}
                  {new Date(stats.lastGradedAt).toLocaleString()}
                </div>
              )}
            </dl>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadStats()}
              disabled={loading}
              className="rounded-lg border border-border px-3 py-1.5 text-sm"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-muted"
            >
              Log out
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
