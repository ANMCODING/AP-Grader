import { NextResponse } from "next/server";
import {
  extractPdfFromBuffer,
  PDF_MAX_BYTES,
  PDF_ERRORS,
} from "@/lib/server/pdfExtract";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No PDF file was uploaded." },
        { status: 400 },
      );
    }

    const name =
      file instanceof File && file.name ? file.name.toLowerCase() : "";
    if (!name.endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Please upload a PDF file." },
        { status: 400 },
      );
    }

    if (file.size > PDF_MAX_BYTES) {
      return NextResponse.json({ error: PDF_ERRORS.TOO_LARGE }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractPdfFromBuffer(buffer);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({
      text: result.text,
      wordCount: result.wordCount,
      joinSoftLineBreaksWordCount: result.joinSoftLineBreaksWordCount,
      possibleTwoColumn: result.possibleTwoColumn,
      numPages: result.numPages,
      likelyEmbeddedImages: result.likelyEmbeddedImages,
      extractionQuality: result.extractionQuality,
      pdfSubmission: result.submissionMeta,
    });
  } catch (err) {
    console.error("[extract-pdf]", err);
    return NextResponse.json(
      {
        error:
          "Could not extract text from this PDF. Try pasting your paper directly or uploading a .docx file instead.",
      },
      { status: 500 },
    );
  }
}
