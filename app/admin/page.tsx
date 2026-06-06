"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface SchoolRegionStat {
  key: string;
  label: string;
  regionType: "us" | "intl";
  count: number;
}

interface SchoolStats {
  enabled: boolean;
  total: number;
  byRegion: SchoolRegionStat[];
}

interface GradeStats {
  enabled: boolean;
  total: number;
  research: number;
  seminar: number;
  seminarIwa: number;
  seminarIrr: number;
  lastGradedAt: string | null;
  schools: SchoolStats;
}

function RegionBars({
  title,
  rows,
  maxCount,
}: {
  title: string;
  rows: SchoolRegionStat[];
  maxCount: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-xs text-ink-muted">No {title.toLowerCase()} yet.</p>
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {rows.map((row) => {
          const pct = maxCount > 0 ? Math.round((row.count / maxCount) * 100) : 0;
          return (
            <li key={row.key} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-xs">
              <span className="truncate text-ink" title={row.label}>
                {row.label}
              </span>
              <div className="h-2 rounded-full bg-surface-muted">
                <div
                  className="h-2 rounded-full bg-accent/80"
                  style={{ width: `${Math.max(pct, row.count > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="text-right font-medium tabular-nums text-ink">
                {row.count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
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

  const usRegions = useMemo(
    () => stats?.schools.byRegion.filter((r) => r.regionType === "us") ?? [],
    [stats],
  );
  const intlRegions = useMemo(
    () => stats?.schools.byRegion.filter((r) => r.regionType === "intl") ?? [],
    [stats],
  );
  const schoolMax = useMemo(() => {
    const all = stats?.schools.byRegion ?? [];
    return all.reduce((m, r) => Math.max(m, r.count), 0);
  }, [stats]);

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
    <div className="mx-auto min-h-screen max-w-xl px-4 py-12">
      <h1 className="text-xl font-semibold text-ink">AP Grader — usage</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Counts only. No paper text or school names are stored.
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
        <div className="mt-8 space-y-6">
          {!stats?.enabled ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Redis is not connected yet. Add Upstash env vars on Vercel (see
              README), then redeploy.
            </p>
          ) : (
            <>
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

              <section className="rounded-xl border border-border bg-surface-subtle p-4">
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h2 className="text-sm font-semibold text-ink">
                    Students by state / country
                  </h2>
                  <span className="text-xs text-ink-muted">
                    {stats.schools?.enabled
                      ? `${stats.schools.total} saved`
                      : "—"}
                  </span>
                </div>
                <p className="mb-4 text-xs text-ink-muted">
                  One count per device per state or country. School names are not
                  saved.
                </p>

                {stats.schools?.enabled ? (
                  <div className="space-y-5">
                    <RegionBars
                      title="United States"
                      rows={usRegions}
                      maxCount={schoolMax}
                    />
                    {intlRegions.length > 0 && (
                      <RegionBars
                        title="International"
                        rows={intlRegions}
                        maxCount={schoolMax}
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted">
                    School stats use the same Redis connection as grade counts.
                  </p>
                )}
              </section>
            </>
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
