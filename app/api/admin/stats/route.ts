import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getGradeStats,
  isAdminSecretConfigured,
  verifyAdminSessionCookie,
} from "@/lib/server/gradeStats";

const COOKIE_NAME = "ap_grader_admin";

export async function GET() {
  if (!isAdminSecretConfigured()) {
    return NextResponse.json(
      { error: "Admin stats are not configured." },
      { status: 503 },
    );
  }

  const jar = await cookies();
  const session = jar.get(COOKIE_NAME)?.value;
  if (!verifyAdminSessionCookie(session)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const stats = await getGradeStats();
  return NextResponse.json(stats);
}
