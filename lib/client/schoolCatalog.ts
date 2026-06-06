import { schoolRegionKey, type SchoolRegionType } from "@/lib/client/schoolSelection";

type SchoolCatalog = Record<string, string[]>;

let cache: SchoolCatalog | null = null;

export async function loadSchoolCatalog(): Promise<SchoolCatalog> {
  if (cache) return cache;
  const res = await fetch("/schools/catalog.json");
  if (!res.ok) throw new Error("Could not load school list.");
  cache = (await res.json()) as SchoolCatalog;
  return cache;
}

export async function schoolsForRegion(
  regionType: SchoolRegionType,
  regionCode: string,
): Promise<string[]> {
  const catalog = await loadSchoolCatalog();
  const key = schoolRegionKey(regionType, regionCode);
  return catalog[key] ?? [];
}
