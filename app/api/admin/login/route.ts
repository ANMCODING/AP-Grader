import { NextResponse } from "next/server";
import {
  adminSessionToken,
  isAdminSecretConfigured,
  verifyAdminSecret,
} from "@/lib/server/gradeStats";

const COOKIE_NAME = "ap_grader_admin";

export async function POST(req: Request) {
  if (!isAdminSecretConfigured()) {
    return NextResponse.json(
      { error: "Admin stats are not configured on this deployment." },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { secret?: string };
  const secret = body.secret?.trim() ?? "";
  if (!verifyAdminSecret(secret)) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const token = adminSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Admin not configured." }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
