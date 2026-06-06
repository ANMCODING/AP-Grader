import type { SchoolProfile } from "@/lib/client/schoolSelection";

const REPORTED_KEY = "ap-grader-school-stats-reported";

/** One count per device per state/country (not per school name change). */
export function reportSchoolSelection(profile: SchoolProfile): void {
  if (profile.skipped || !profile.regionCode || !profile.school.trim()) return;

  const dedupeKey = `${profile.regionType}:${profile.regionCode}`;
  try {
    if (localStorage.getItem(REPORTED_KEY) === dedupeKey) return;
  } catch {
    return;
  }

  void fetch("/api/school-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  })
    .then((res) => {
      if (res.ok) {
        try {
          localStorage.setItem(REPORTED_KEY, dedupeKey);
        } catch {
          /* ignore */
        }
      }
    })
    .catch(() => {
      /* non-blocking */
    });
}
