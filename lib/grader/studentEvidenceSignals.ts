/**
 * Extended student results / secondary-data / inferential signal detection (live-testing patterns).
 */

const QUASI_EXPERIMENTAL_EXECUTED = [
  /\bdifference-in-differences\s+analysis\s+found\b/i,
  /\bdifference-in-differences\s+model\b/i,
  /\bdifference-in-differences\s+was\s+used\b/i,
  /\bquasi-?experimental\b/i,
  /\bpropensity\s+score\s+matching\s+was\s+conducted\b/i,
  /\bmatching\s+was\s+conducted\s+using\b/i,
  /\bwere\s+matched\s+on\b/i,
  /\bmatched\s+comparison\s+group\b/i,
  /\bfixed\s+effects\s+were\s+included\b/i,
  /\bordinary\s+least\s+squares\s+regression\b/i,
  /\bstandard\s+errors\s+were\s+clustered\b/i,
  /\bregression\s+was\s+estimated\b/i,
  /\bmodel\s+was\s+estimated\b/i,
  /\banalyses?\s+were\s+conducted\b/i,
  /\bdata\s+were\s+analyzed\s+using\b/i,
  /\bdata\s+were\s+obtained\s+from\b/i,
  /\badministrative\s+records\s+were\b/i,
  /\badministrative\s+data\s+were\b/i,
  /\bdata\s+were\s+extracted\s+from\b/i,
  /\bwere\s+obtained\s+from\s+the\s+Missouri\b/i,
  /\bwere\s+obtained\s+from\s+the\s+Department\b/i,
];

const INSTITUTIONAL_DATA_SOURCE =
  /\b(?:Missouri\s+Department\s+of\s+Elementary\s+and\s+Secondary\s+Education|DESE|state\s+department\s+of\s+education|federal\s+database|national\s+survey\s+data|administrative\s+records|administrative\s+data|publicly\s+available\s+data|secondary\s+data\s+analysis|data\s+were\s+obtained\s+from|data\s+were\s+downloaded\s+from|obtained\s+from\s+the)\b/i;

const GOVERNMENT_AGENCY_DATA =
  /\b(?:Department\s+of\s+[A-Z][a-z]+|Bureau\s+of\s+[A-Z][a-z]+|National\s+Center\s+for)\b[^.\n]{0,80}\bdata\b/i;

const ORIGINAL_NUMERIC_RESULTS =
  /\b(?:Cohen'?s\s+d\s*=\s*[-+]?\d|d\s*=\s*[-+]?\d\.\d+|95\s*%\s*CI|confidence\s+interval|p\s*=\s*\.|p\s*<\s*\.|p\s*<\s*0\.|F\s*\(|t\s*\(|r\s*=\s*[-+]?\d|beta\s*=\s*|R-?squared|effect\s+size|percentage\s+points?|odds\s+ratio|OR\s*=|hazard\s+ratio|HR\s*=)\b/i;

const INFERENTIAL_SIGNAL_PATTERNS: RegExp[] = [
  /\bCohen'?s\s+d\s*=\s*[-+]?\d/i,
  /\bd\s*=\s*[-+]?\d\.\d+/i,
  /\b95\s*%\s*CI\b/i,
  /\bconfidence\s+interval\b/i,
  /\beffect\s+size\b/i,
  /\bHedges'?s?\s+g\b/i,
  /\bodds\s+ratio\b/i,
  /\bOR\s*=\s*[\d.]+/i,
  /\brisk\s+ratio\b/i,
  /\bRR\s*=\s*[\d.]+/i,
  /\bmean\s+difference\b/i,
  /\bMD\s*=\s*[\d.]+/i,
  /\bstandardized\s+mean\s+difference\b/i,
  /\bhazard\s+ratio\b/i,
  /\bHR\s*=\s*[\d.]+/i,
  /\bpartial\s+eta\s+squared\b/i,
  /\bomega\s+squared\b/i,
  /\bphi\s+coefficient\b/i,
  /\bCramer'?s\s+V\b/i,
  /\bintraclass\s+correlation\b/i,
  /\bICC\s*=\s*[\d.]+/i,
  /\bkappa\s*=\s*[\d.]+/i,
  /\bCohen'?s\s+kappa\b/i,
  /\br\s*=\s*[-+]?\d/i,
  /\bPearson\s+correlation\b/i,
  /\bregression\s+coefficient\b/i,
  /\bF\s*\(\s*\d+/i,
  /\bt\s*\(\s*\d+/i,
  /\bp\s*[<=>]\s*0?\.0?\d/i,
  /\b\d+(?:\.\d+)?\s*%/i,
  /\bM\s*=\s*[\d.]+/i,
  /\bSD\s*=\s*[\d.]+/i,
];

const QUALITATIVE_INTERVIEW_PATTERNS: RegExp[] = [
  /\bone\s+teacher\s+described\b/i,
  /\bone\s+teacher\s+with\b/i,
  /\ba\s+teacher\s+described\b/i,
  /\ba\s+teacher\s+with\s+\d+\s+years\b/i,
  /\bteachers?\s+described\b/i,
  /\bteachers?\s+consistently\s+described\b/i,
  /\bparticipants?\s+described\b/i,
  /\bone\s+participant\s+stated\b/i,
  /\bparticipants?\s+reported\b/i,
  /\brespondents?\s+described\b/i,
  /\binterviewees?\s+described\b/i,
  /\ball\s+\d+\s+teachers\b/i,
  /\b\d+\s+of\s+\d+\s+teachers\b/i,
  /\b\d+\s+of\s+\d+\s+participants\b/i,
  /\binter-?rater\b/i,
  /\binter-?rater\s+reliability\s+was\s+calculated\b/i,
  /\bindependently\s+coded\b/i,
  /\bsecond\s+coder\b/i,
  /\bthemes?\s+emerged\b/i,
  /\bthematic\s+analysis\b/i,
  /\binterviews?\s+were\s+conducted\b/i,
];

export function detectQuasiExperimentalExecuted(fullText: string): boolean {
  return QUASI_EXPERIMENTAL_EXECUTED.some((p) => p.test(fullText));
}

export function countInferentialEvidenceSignals(text: string): number {
  if (!text.trim()) return 0;
  let n = 0;
  for (const p of INFERENTIAL_SIGNAL_PATTERNS) {
    if (p.test(text)) n++;
  }
  const lines = text.split("\n");
  for (const line of lines) {
    if (/^["\u201C]/.test(line.trim())) n++;
  }
  return n;
}

export function countQualitativeInterviewSignals(text: string): number {
  if (!text.trim()) return 0;
  let n = 0;
  for (const p of QUALITATIVE_INTERVIEW_PATTERNS) {
    if (p.test(text)) n++;
  }
  return n;
}

export interface SecondaryDataAnalysisResult {
  detected: boolean;
  signalBonus: number;
}

/** Secondary / administrative data analysis with original statistics (Paper 5 class). */
export function detectSecondaryDataAnalysisExecuted(
  fullText: string,
  resultsAndDiscussion: string,
): SecondaryDataAnalysisResult {
  const combined = `${fullText}\n${resultsAndDiscussion}`;
  const hasSource =
    INSTITUTIONAL_DATA_SOURCE.test(combined) ||
    GOVERNMENT_AGENCY_DATA.test(combined);
  const hasMethod = QUASI_EXPERIMENTAL_EXECUTED.some((p) => p.test(combined));
  const hasNumbers = ORIGINAL_NUMERIC_RESULTS.test(resultsAndDiscussion);
  if (hasSource && hasMethod && hasNumbers) {
    return { detected: true, signalBonus: 4 };
  }
  return { detected: false, signalBonus: 0 };
}

export function hasExecutedStatisticalMethod(fullText: string): boolean {
  return QUASI_EXPERIMENTAL_EXECUTED.some((p) => p.test(fullText));
}

export function hasInstitutionalDataSource(fullText: string): boolean {
  return (
    INSTITUTIONAL_DATA_SOURCE.test(fullText) ||
    GOVERNMENT_AGENCY_DATA.test(fullText)
  );
}
