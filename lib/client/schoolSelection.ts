export type SchoolRegionType = "us" | "intl";

export type SchoolProfile = {
  regionType: SchoolRegionType;
  regionCode: string;
  regionLabel: string;
  school: string;
  skipped?: boolean;
};

const STORAGE_KEY = "ap-grader-school-profile";

export function getSavedSchoolProfile(): SchoolProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SchoolProfile;
    if (!parsed?.regionLabel) return null;
    // Skip was removed — treat old skip entries as unset so the form shows again.
    if (parsed.skipped) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveSchoolProfile(profile: SchoolProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearSchoolProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function schoolRegionKey(
  regionType: SchoolRegionType,
  regionCode: string,
): string {
  return regionType === "us" ? `US-${regionCode}` : `INTL-${regionCode}`;
}
