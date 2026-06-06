import { NextResponse } from "next/server";
import type { SchoolProfile } from "@/lib/client/schoolSelection";
import { recordSchoolSelection } from "@/lib/server/schoolStats";

export async function POST(req: Request) {
  let body: Partial<SchoolProfile>;
  try {
    body = (await req.json()) as Partial<SchoolProfile>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { regionType, regionCode, school, skipped } = body;
  if (
    skipped ||
    (regionType !== "us" && regionType !== "intl") ||
    typeof regionCode !== "string" ||
    typeof school !== "string" ||
    !school.trim()
  ) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  await recordSchoolSelection(regionType, regionCode);
  return NextResponse.json({ ok: true, recorded: true });
}
