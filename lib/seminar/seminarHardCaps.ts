import type { SeminarEvidence } from "@/lib/seminar/seminarTypes";

/** Prefilter hard caps (parallel to AP Research methodNotExecutedHard). */
export interface IwaHardCapFlags {
  allZeros: boolean;
  row1DefinitionOnly: boolean;
  row4NoArgument: boolean;
  row5UrlOnly: boolean;
  row6NoBibliography: boolean;
}

export function evaluateIwaHardCaps(e: SeminarEvidence): IwaHardCapFlags {
  const allZeros =
    !e.bibliographyPresent &&
    !e.thesisPresent &&
    e.inTextCitationCount < 12 &&
    !e.bothSidesMode &&
    !e.exploratoryMode;

  return {
    allZeros,
    row1DefinitionOnly:
      (e.row1DefinitionOnly || e.stimulusDefinitionOnly) &&
      !e.integrationFunctionDetected,
    row4NoArgument: e.summaryOnlyMode && !e.thesisPresent,
    row5UrlOnly: e.urlOnlyBibliography,
    row6NoBibliography: !e.bibliographyPresent,
  };
}

export function applyIwaHardCaps(
  scores: number[],
  e: SeminarEvidence,
  caps: IwaHardCapFlags,
): number[] {
  const exploratoryNoThesis =
    !e.thesisPresent && (e.exploratoryMode || e.bothSidesMode);

  if (caps.allZeros) return [0, 0, 0, 0, 0, 0, 0];

  if (exploratoryNoThesis) {
    return [
      Math.min(scores[0]!, 2),
      scores[1]!,
      0,
      0,
      0,
      scores[5]!,
      scores[6]!,
    ];
  }

  const out = [...scores];
  if (caps.row6NoBibliography) out[5] = 0;
  if (e.inTextCitationCount < 2) out[5] = 0;
  if (e.urlOnlyBibliography || (e.beyondStimulusWellVettedCount < 1 && e.totalCredibilityPoints < 4)) {
    out[4] = 0;
  }
  if (caps.row4NoArgument || (!e.thesisPresent && e.exploratoryMode)) {
    out[3] = 0;
  }
  if (caps.row1DefinitionOnly) out[0] = 0;
  if (
    e.namedPerspectiveCount <= 1 &&
    e.namedSourceCount < 2 &&
    e.inTextCitationCount < 6
  ) {
    out[2] = Math.min(out[2]!, 0);
  }
  if (e.bothSidesMode && !e.hasCommittedPosition) {
    out[0] = Math.min(out[0]!, 2);
    out[2] = Math.min(out[2]!, 3);
    out[3] = Math.min(out[3]!, 4);
  }
  return out;
}

export function applyIrrHardCaps(scores: number[], e: SeminarEvidence): number[] {
  const out = [...scores];
  if (!e.bibliographyPresent) out[4] = 0;
  if (e.inTextCitationCount < 2) out[4] = 0;
  return out;
}
