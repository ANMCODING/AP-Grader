import { NextResponse } from "next/server";
import {
  gradeSeminarPaper,
  seminarGradeToApiReport,
} from "@/lib/seminar";
import type { SeminarTask } from "@/lib/seminar/seminarTypes";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const practiceFromQuery = url.searchParams.get("mode") === "practice";
    const body = (await req.json()) as {
      text?: string;
      task?: SeminarTask;
      practiceMode?: boolean;
    };
    const text = body.text?.trim() ?? "";
    const task = body.task === "irr" ? "irr" : "iwa";
    const practiceMode = practiceFromQuery || body.practiceMode === true;

    if (!text) {
      return NextResponse.json(
        { error: "No text provided." },
        { status: 400 },
      );
    }

    const result = gradeSeminarPaper(text, task, {
      skipWordCountGates: practiceMode,
      practiceMode,
    });
    const report = seminarGradeToApiReport(result);
    return NextResponse.json({
      ...report,
      practiceMode,
      scoringNote: practiceMode
        ? "Practice mode — word count requirements not enforced. Scores may differ from submission scoring."
        : result.scoringNote,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Grading failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
