import { NextResponse } from "next/server";
import { gradePaper, gradeResultToApiReport } from "@/lib/grader";
import { recordPaperGraded } from "@/lib/server/gradeStats";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      joinSoftLineBreaksWordCount?: number | null;
      pdfSubmission?: {
        numPages: number;
        likelyEmbeddedImages: boolean;
        extractionQuality: "high" | "low";
        wordsExtracted: number;
      };
    };
    const text = typeof body.text === "string" ? body.text : "";

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Missing submission text." },
        { status: 400 },
      );
    }

    const result = await gradePaper(text, undefined, {
      pdfSubmission: body.pdfSubmission ?? null,
      joinSoftLineBreaksWordCount: body.joinSoftLineBreaksWordCount ?? null,
    });
    void recordPaperGraded("research");
    return NextResponse.json(gradeResultToApiReport(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Grading failed.";
    console.error("[grade]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
