import type { GradingCourse } from "@/lib/types";

/**
 * Static guidance shown on the submission form only (not on score reports).
 */
export function SubmissionAccuracyTip({
  course = "research",
}: {
  course?: GradingCourse;
}) {
  if (course === "seminar") {
    return (
      <aside
        className="mt-4 rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3.5 text-[13px] leading-relaxed text-ink-muted"
        aria-label="Tip for getting the most accurate score"
      >
        <p className="font-medium text-ink">Tip: Getting the most accurate score</p>
        <p className="mt-2">
          For AP Seminar, paste your full essay including your bibliography or works
          cited. The engine scores each rubric row independently. Since AP Seminar
          essays are shorter than AP Research papers, PDF upload and copy-paste should
          give very similar results.
        </p>
      </aside>
    );
  }

  return (
    <aside
      className="mt-4 rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3.5 text-[13px] leading-relaxed text-ink-muted"
      aria-label="Tip for getting the most accurate score"
    >
      <p className="font-medium text-ink">Tip: Getting the most accurate score</p>
      <p className="mt-2">
        For the best results try submitting your paper two ways — first as a PDF
        upload, then as a copy-paste. If the scores differ, the higher one is usually
        more reliable. PDF uploads work best for papers with standard formatting.
        Copy-paste works best for papers with embedded figures or tables since it
        captures more of the surrounding text.
      </p>
      <p className="mt-2">
        If your paper relies heavily on figures or tables: The engine cannot read
        image content inside PDFs. If your key findings are only shown in graphs or
        tables and not described in your prose, your Argument and Evidence score may
        be underestimated. To get a more accurate score make sure your paper includes
        either the title and a brief description of what each figure shows, or write
        out your key numbers directly in the text — for example instead of only
        showing a bar chart also write a sentence like &quot;The treatment group averaged
        31.4 points compared to 24.7 for the control group.&quot; As long as your figures
        are referenced and described in the surrounding text the engine can account
        for them.
      </p>
    </aside>
  );
}
