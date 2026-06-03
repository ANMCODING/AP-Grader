import { NextResponse } from "next/server";
import { countWords } from "@/lib/grader/text";
import { extractPdfFromBuffer } from "@/lib/server/pdfExtract";

const DOC_ID_PATTERN = /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/;
const PLAIN_TEXT_FALLBACK_WORD_THRESHOLD = 500;

function extractDocumentId(url: string): string | null {
  const match = url.match(DOC_ID_PATTERN);
  return match?.[1] ?? null;
}

function looksLikeLoginPage(html: string): boolean {
  const lower = html.slice(0, 2000).toLowerCase();
  return (
    lower.includes("<!doctype html") ||
    lower.includes("<html") ||
    lower.includes("sign in") ||
    lower.includes("accounts.google.com")
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim() ?? "";
    const docId = extractDocumentId(url);

    if (!docId) {
      return NextResponse.json(
        {
          error:
            "Invalid Google Docs link. Use a link like https://docs.google.com/document/d/…/edit",
        },
        { status: 400 },
      );
    }

    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    const res = await fetch(exportUrl, {
      redirect: "follow",
      headers: { "User-Agent": "AP-Research-Grader/1.0" },
    });

    let text = await res.text();
    let possibleTwoColumn = false;

    if (!res.ok || looksLikeLoginPage(text) || text.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            "Document is not publicly viewable. In Google Docs go to Share, change access to Anyone with the link, then try again.",
        },
        { status: 403 },
      );
    }

    let wordCount = countWords(text);
    let pdfSubmission: {
      numPages: number;
      likelyEmbeddedImages: boolean;
      extractionQuality: "high" | "low";
      wordsExtracted: number;
    } | null = null;

    if (wordCount < PLAIN_TEXT_FALLBACK_WORD_THRESHOLD) {
      const pdfExportUrl = `https://docs.google.com/document/d/${docId}/export?format=pdf`;
      const pdfRes = await fetch(pdfExportUrl, {
        redirect: "follow",
        headers: { "User-Agent": "AP-Research-Grader/1.0" },
      });

      if (pdfRes.ok) {
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
        const pdfResult = await extractPdfFromBuffer(pdfBuffer);
        if (pdfResult.ok && pdfResult.wordCount > wordCount) {
          text = pdfResult.text;
          wordCount = pdfResult.wordCount;
          possibleTwoColumn = pdfResult.possibleTwoColumn;
          pdfSubmission = pdfResult.submissionMeta;
        }
      }
    }

    return NextResponse.json({
      text,
      wordCount,
      possibleTwoColumn,
      pdfSubmission,
    });
  } catch (err) {
    console.error("[google-docs]", err);
    return NextResponse.json(
      {
        error:
          "Document is not publicly viewable. In Google Docs go to Share, change access to Anyone with the link, then try again.",
      },
      { status: 403 },
    );
  }
}
