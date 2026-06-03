import { createHmac, timingSafeEqual } from "crypto";
import { Redis } from "@upstash/redis";

const ADMIN_SESSION_SALT = "ap-grader-admin-v1";
const KEYS = {
  total: "apgrader:grades:total",
  research: "apgrader:grades:research",
  seminar: "apgrader:grades:seminar",
  seminarIwa: "apgrader:grades:seminar:iwa",
  seminarIrr: "apgrader:grades:seminar:irr",
  lastGradedAt: "apgrader:grades:lastAt",
} as const;

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

export function isGradeStatsEnabled(): boolean {
  return getRedis() !== null;
}

export function isAdminSecretConfigured(): boolean {
  return Boolean(process.env.GRADER_ADMIN_SECRET?.trim());
}

export function adminSessionToken(): string | null {
  const secret = process.env.GRADER_ADMIN_SECRET?.trim();
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(ADMIN_SESSION_SALT)
    .digest("hex");
}

export function verifyAdminSecret(candidate: string): boolean {
  const secret = process.env.GRADER_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(candidate);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyAdminSessionCookie(cookieValue: string | undefined): boolean {
  const expected = adminSessionToken();
  if (!expected || !cookieValue) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(cookieValue);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function recordPaperGraded(
  course: "research" | "seminar",
  seminarTask?: "iwa" | "irr",
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const pipe = redis.pipeline();
    pipe.incr(KEYS.total);
    if (course === "research") {
      pipe.incr(KEYS.research);
    } else {
      pipe.incr(KEYS.seminar);
      if (seminarTask === "irr") pipe.incr(KEYS.seminarIrr);
      else pipe.incr(KEYS.seminarIwa);
    }
    pipe.set(KEYS.lastGradedAt, new Date().toISOString());
    await pipe.exec();
  } catch (err) {
    console.error("[gradeStats] record failed", err);
  }
}

export interface GradeStatsSnapshot {
  enabled: boolean;
  total: number;
  research: number;
  seminar: number;
  seminarIwa: number;
  seminarIrr: number;
  lastGradedAt: string | null;
}

export async function getGradeStats(): Promise<GradeStatsSnapshot> {
  const redis = getRedis();
  if (!redis) {
    return {
      enabled: false,
      total: 0,
      research: 0,
      seminar: 0,
      seminarIwa: 0,
      seminarIrr: 0,
      lastGradedAt: null,
    };
  }

  const [total, research, seminar, seminarIwa, seminarIrr, lastGradedAt] =
    await Promise.all([
      redis.get<number>(KEYS.total),
      redis.get<number>(KEYS.research),
      redis.get<number>(KEYS.seminar),
      redis.get<number>(KEYS.seminarIwa),
      redis.get<number>(KEYS.seminarIrr),
      redis.get<string>(KEYS.lastGradedAt),
    ]);

  return {
    enabled: true,
    total: total ?? 0,
    research: research ?? 0,
    seminar: seminar ?? 0,
    seminarIwa: seminarIwa ?? 0,
    seminarIrr: seminarIrr ?? 0,
    lastGradedAt: lastGradedAt ?? null,
  };
}
