import { Redis } from "@upstash/redis";
import type { SchoolRegionType } from "@/lib/client/schoolSelection";
import { INTERNATIONAL_REGIONS, US_STATES } from "@/lib/schools/regions";

const REGION_HASH = "apgrader:schools:regions";
const TOTAL_KEY = "apgrader:schools:total";

function resolveRedisCredentials(): { url: string; token: string } | null {
  const candidates: [string | undefined, string | undefined][] = [
    [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN],
    [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN],
    [process.env.STORAGE_KV_REST_API_URL, process.env.STORAGE_KV_REST_API_TOKEN],
    [process.env.STORAGE_REST_API_URL, process.env.STORAGE_REST_API_TOKEN],
  ];
  for (const [url, token] of candidates) {
    if (url?.trim() && token?.trim()) {
      return { url: url.trim(), token: token.trim() };
    }
  }
  return null;
}

function getRedis(): Redis | null {
  const creds = resolveRedisCredentials();
  if (!creds) return null;
  return new Redis(creds);
}

export function isSchoolStatsEnabled(): boolean {
  return getRedis() !== null;
}

function regionKey(regionType: SchoolRegionType, regionCode: string): string {
  return regionType === "us" ? `US-${regionCode}` : `INTL-${regionCode}`;
}

function regionLabel(
  regionType: SchoolRegionType,
  regionCode: string,
): string | null {
  const list = regionType === "us" ? US_STATES : INTERNATIONAL_REGIONS;
  return list.find((r) => r.code === regionCode)?.name ?? null;
}

export async function recordSchoolSelection(
  regionType: SchoolRegionType,
  regionCode: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const code = regionCode.trim().toUpperCase();
  if (!code || code === "SKIP") return;
  if (!regionLabel(regionType, code)) return;

  const key = regionKey(regionType, code);

  try {
    const pipe = redis.pipeline();
    pipe.hincrby(REGION_HASH, key, 1);
    pipe.incr(TOTAL_KEY);
    await pipe.exec();
  } catch (err) {
    console.error("[schoolStats] record failed", err);
  }
}

export type SchoolRegionStat = {
  key: string;
  label: string;
  regionType: SchoolRegionType;
  count: number;
};

export type SchoolStatsSnapshot = {
  enabled: boolean;
  total: number;
  byRegion: SchoolRegionStat[];
};

export async function getSchoolStats(): Promise<SchoolStatsSnapshot> {
  const redis = getRedis();
  if (!redis) {
    return { enabled: false, total: 0, byRegion: [] };
  }

  const [total, raw] = await Promise.all([
    redis.get<number>(TOTAL_KEY),
    redis.hgetall<Record<string, number>>(REGION_HASH),
  ]);

  const byRegion: SchoolRegionStat[] = [];
  for (const [key, count] of Object.entries(raw ?? {})) {
    const n = Number(count);
    if (!n) continue;
    const us = key.startsWith("US-");
    const regionType: SchoolRegionType = us ? "us" : "intl";
    const regionCode = key.slice(us ? 3 : 5);
    const label =
      regionLabel(regionType, regionCode) ??
      (us ? regionCode : regionCode);
    byRegion.push({ key, label, regionType, count: n });
  }

  byRegion.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    enabled: true,
    total: total ?? 0,
    byRegion,
  };
}
