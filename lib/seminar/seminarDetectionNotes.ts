import type { SeminarEvidence, SeminarRowScore } from "@/lib/seminar/seminarTypes";

function row1ScoreBasis(e: SeminarEvidence, score: number): string {
  const q = e.row1IntegrationQuality;
  if (!e.namedSourceInBody) return "No named source integrated in body text.";
  if (e.row1TypeCOnly) return "Type C mentions only — no stated finding or position.";
  if (e.row1BibliographyOnly) return "Source in bibliography only.";
  if (score === 0 && e.row1DefinitionOnly) return "Definition-only use without argumentative function.";
  if (score === 0 && q.functionCount === 0) return "No argumentative integration function detected.";
  if (score === 1)
    return "Marginal integration — single appearance with echo commentary and one function.";
  if (score === 2)
    return "Basic integration — clear function with developing commentary in one section.";
  if (score === 3)
    return "Adequate integration — multi-section use with commentary beyond restatement.";
  if (score === 4)
    return "Strong integration — multiple functions with developing commentary and analytical dialogue.";
  if (score === 5)
    return "Deep integration — structural, multi-functional, analytical dialogue, delete test passed.";
  return "Integration quality assessed from appearances, functions, commentary, and dialogue.";
}

export function buildRow1IntegrationDetectionNote(
  e: SeminarEvidence,
  score: number,
): string {
  const q = e.row1IntegrationQuality;
  const sources = e.namedSourcesFound.length
    ? e.namedSourcesFound.join(", ")
    : "none";
  return [
    "Row 1 — Source Integration Quality",
    `Named sources detected: ${sources}`,
    `Most integrated source: ${q.primaryAuthor ?? "none"}`,
    `  Appearances: ${q.appearanceCount} in ${q.sections.length ? q.sections.join(", ") : "n/a"}`,
    `  Functions detected: ${q.functions.length ? q.functions.join(", ") : "none"}`,
    `  Commentary quality: ${q.commentaryQuality}`,
    `  Analytical dialogue: [agree: ${q.agreesWithSource ? "Y" : "N"}] [extend: ${q.extendsSource ? "Y" : "N"}] [qualify: ${q.qualifiesSource ? "Y" : "N"}] [challenge: ${q.challengesSource ? "Y" : "N"}]`,
    `  Delete test: ${q.passesDeleteTest ? "pass" : "fail"}`,
    `  Integration quality score: ${score}`,
    `Row 1 score: ${score}`,
    `Basis: ${row1ScoreBasis(e, score)}`,
    "Stimulus note: For official AP Seminar prompts, integrate a source from the provided stimulus packet; this engine scores integration quality regardless of source origin.",
  ].join("\n");
}

export function buildIwaDetectionNotes(
  rows: SeminarRowScore[],
  e: SeminarEvidence,
): { row: string; note: string }[] {
  const notes: { row: string; note: string }[] = [];

  const r3 = rows.find((r) => r.id === "row3_perspective");
  if (r3 && e.detectedPerspectives.length > 0) {
    const list = e.detectedPerspectives.slice(0, 4).join("; ");
    notes.push({
      row: r3.name,
      note: `Detected ${e.namedPerspectiveCount} named perspective(s): ${list}.${e.synthesisIsolationCount >= 3 ? " Sources appear mostly in isolation — add synthesis language." : ""}`,
    });
  } else if (r3?.score === 0) {
    notes.push({
      row: r3.name,
      note: "Fewer than two named source perspectives detected. Attribute specific positions to named authors.",
    });
  }

  const r4 = rows.find((r) => r.id === "row4_argument");
  if (r4) {
    notes.push({
      row: r4.name,
      note: `Commentary depth ratio ${e.commentaryDepthRatio.toFixed(2)} (develop/(echo+develop) on citation-adjacent windows; target ≥0.30 for R4=12, alternates: structureScore≥5, echo<0.35, or structure≥80 with depth≥0.4). Thesis detected: ${e.thesisPresent ? "yes" : "no"}.`,
    });
  }

  const r1 = rows.find((r) => r.id === "row1_stimulus");
  if (r1) {
    notes.push({
      row: r1.name,
      note: buildRow1IntegrationDetectionNote(e, r1.score),
    });
  }

  const r5 = rows.find((r) => r.id === "row5_evidence");
  if (r5?.score === 6) {
    notes.push({
      row: r5.name,
      note: `Source count detected: ${e.totalNonStimulusSources} sources (${e.scholarlySourceCount} scholarly/peer-reviewed/government). For the highest evidence score, aim for 8+ sources with at least 5 from peer-reviewed journals, government agencies, or credentialed institutional sources.`,
    });
  }

  if (e.stimulusYearDetected) {
    notes.push({
      row: "Stimulus packet",
      note: `This paper appears to respond to the ${e.stimulusYearDetected} AP Seminar stimulus on ${e.stimulusTopicDetected ?? "the performance task topic"}.`,
    });
  }

  return notes;
}

export function buildIrrDetectionNotes(
  rows: SeminarRowScore[],
  e: SeminarEvidence,
): { row: string; note: string }[] {
  const notes: { row: string; note: string }[] = [];
  const r2 = rows.find((r) => r.id === "row2_argument");
  if (r2) {
    notes.push({
      row: r2.name,
      note: `Methodology/reasoning signals: ${e.irrMethodologySignalCount}. Remember: IRR explains source arguments, not your own claim.`,
    });
  }
  const r3 = rows.find((r) => r.id === "row3_sources");
  if (r3) {
    notes.push({
      row: r3.name,
      note: `Credential mentions: ${e.credentialMentionCount}; bias/limitation signals: ${e.irrBiasEvaluationCount}.`,
    });
  }
  return notes;
}

export function rowDetectionNote(
  rowId: string,
  score: number,
  e: SeminarEvidence,
): string | null {
  switch (rowId) {
    case "row1_stimulus":
      return buildRow1IntegrationDetectionNote(e, score);
    case "row2_context":
      if (!e.rqContextLinked && e.statisticalUrgencyCount > 0) {
        return "Statistics found in the opening but not clearly linked to your research question keywords.";
      }
      return null;
    case "row3_perspective":
      if (e.inconsistentAttribution && score <= 6) {
        return "Mix of named and vague attribution (e.g. 'researchers argue') caps perspective at 6.";
      }
      if (e.synthesisIsolationCount >= 3 && score < 9) {
        return "Sources read as isolated summaries — add evaluative connections for 9 points.";
      }
      return null;
    case "row4_argument":
      if (score === 8) {
        return "Argument present; evidence may outweigh student commentary (need 2+ commentary sentences per evidence point for 12).";
      }
      return null;
    case "row5_evidence":
      if (e.beyondStimulusWellVettedCount < 1) {
        return "No well-vetted sources beyond the stimulus packet detected.";
      }
      return null;
    default:
      return null;
  }
}
