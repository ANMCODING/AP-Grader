import {
  countDistinctPatternHits as countDistinctPatternHitsRaw,
  countPatternHits as countPatternHitsRaw,
} from "@/lib/seminar/seminarPatternScan";

export type PatternScanCache = {
  distinct: (text: string, patterns: RegExp[], maxPatterns?: number) => number;
  hits: (text: string, patterns: RegExp[]) => number;
};

let activeCache: PatternScanCache | null = null;

export function getActivePatternScanCache(): PatternScanCache | null {
  return activeCache;
}

export function runWithPatternScanCache<T>(fn: () => T): T {
  const cache = createPatternScanCache();
  const prev = activeCache;
  activeCache = cache;
  try {
    return fn();
  } finally {
    activeCache = prev;
  }
}

export function createPatternScanCache(): PatternScanCache {
  const distinctByPatterns = new WeakMap<RegExp[], Map<string, number>>();
  const hitsByPatterns = new WeakMap<RegExp[], Map<string, number>>();

  return {
    distinct(text, patterns, maxPatterns = patterns.length) {
      let bucket = distinctByPatterns.get(patterns);
      if (!bucket) {
        bucket = new Map();
        distinctByPatterns.set(patterns, bucket);
      }
      const key = `${maxPatterns}\0${text}`;
      const hit = bucket.get(key);
      if (hit !== undefined) return hit;
      const n = countDistinctPatternHitsRaw(text, patterns, maxPatterns);
      bucket.set(key, n);
      return n;
    },
    hits(text, patterns) {
      let bucket = hitsByPatterns.get(patterns);
      if (!bucket) {
        bucket = new Map();
        hitsByPatterns.set(patterns, bucket);
      }
      const hit = bucket.get(text);
      if (hit !== undefined) return hit;
      const n = countPatternHitsRaw(text, patterns);
      bucket.set(text, n);
      return n;
    },
  };
}
