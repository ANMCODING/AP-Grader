/** Hard non-execution — Method must be Low 1; cannot be raised. */
export const METHOD_NOT_EXECUTED_HARD = [
  /\bdata\s+collection\s+was\s+not\s+completed\b/i,
  /\bdata\s+collection\s+was\s+not\s+conducted\b/i,
  /\bwas\s+unable\s+to\s+collect(?:\s+data)?\b/i,
  /\bnot\s+able\s+to\s+collect(?:\s+my\s+own)?\s+data\b/i,
  /\bno\s+analysis\s+(?:of\s+the\s+primary\s+research\s+question\s+)?was\s+conducted\b/i,
  /\bthe\s+study\s+was\s+not\s+completed\b/i,
  /\bthe\s+study\s+was\s+not\s+carried\s+out\b/i,
  /\bthe\s+method\s+was\s+not\s+performed\b/i,
  /\bwas\s+regrettably\s+not\s+performed\b/i,
  /\bnot\s+completed\s+during\s+the\s+research\s+period\b/i,
  /\bcollection\s+did\s+not\s+occur\b/i,
  /\bno\s+data\s+were\s+collected\b/i,
  /\bno\s+participants?\s+were\s+recruited\b/i,
  /\bsurveys?\s+were\s+not\s+returned\s+in\s+sufficient\s+numbers\b/i,
  /\bthere will be no actual experiment conducted\b/i,
  /\bno actual experiment conducted by the author\b/i,
  /\bno actual experiment conducted\b/i,
  /\bthe participant pool will be zero\b/i,
  /\bparticipant pool will be zero\b/i,
  /\bno experiment will be conducted\b/i,
  /\bno experiment was conducted\b/i,
  /\bno data will be collected\b/i,
  /\bno data was collected by the author\b/i,
  /\bno participants will be recruited\b/i,
  /\bno participants were recruited\b/i,
  /\ball data will be extracted from outside\b/i,
  /\ball data was extracted from outside\b/i,
  /\ball data mentioned in this research paper will have been extracted\b/i,
  /\bwill have been extracted from outside credible sources\b/i,
  /\bthe budget for this research paper being frivolity\b/i,
  /\bthere will be no participants\b/i,
  /\bthe number of participants is zero\b/i,
  /\bparticipant count is zero\b/i,
  /\bthis paper will not conduct\b/i,
  /\bthis study will not conduct\b/i,
  /\bno original data will be\b/i,
  /\bno original data was\b/i,
  /\bdata collection will not take place\b/i,
  /\bdata collection did not take place\b/i,
  /\bI will not be conducting\b/i,
  /\bI did not conduct any experiment\b/i,
  /\bI did not conduct any research\b/i,
  /\bno research will be conducted by\b/i,
  /\bno survey will be conducted\b/i,
  /\bno survey was conducted by the author\b/i,
  /\bnot able to complete data collection\b/i,
  /\bdue to time constraints this semester I was not able to complete data collection\b/i,
  /\binstead of reporting original data this paper will summarize\b/i,
];

/** Partial / failed execution — Method capped at Low 2; overall capped at High 3. */
export const METHOD_PARTIAL_EXECUTION = [
  /\bdata\s+collection\s+was\s+limited\b/i,
  /\bonly\s+partial\s+data\s+was\s+collected\b/i,
  /\bfewer\s+participants\s+than\s+planned\b/i,
  /\bresponse\s+rate\s+was\s+insufficient\b/i,
  /\binterviewed\s+3\s+people\s+informally\b/i,
  /\bsample\s+was\s+not\s+representative\s+of\s+the\s+target\s+population\b/i,
  /\bdata\s+collected\s+was\s+not\s+representative\b/i,
  /\bformal\s+data\s+analysis\s+was\s+not\s+conducted\b/i,
  /\bwe\s+were\s+unable\s+to\s+complete\b/i,
  /\bthis\s+portion\s+of\s+the\s+study\s+was\s+not\s+conducted\b/i,
  /\bparticipants\s+were\s+unavailable\b/i,
  /\bdata\s+collection\s+ended\s+early\b/i,
  /\bfewer\s+sessions\s+than\s+planned\b/i,
  /\bthe\s+sample\s+was\s+smaller\s+than\s+intended\s+due\s+to\b/i,
  /\bIRB\s+approval\s+was\s+not\s+obtained\s+in\s+time\b/i,
  /\bonly\s+one\s+participants?\b/i,
  /\bonly\s+two\s+participants?\b/i,
  /\bonly\s+three\s+participants?\b/i,
  /\bonly\s+four\s+participants?\b/i,
  /\bonly\s+(?:five|six|seven|eight|nine)\s+participants?\b/i,
  /\bonly\s+[1-9]\s+participants?\b/i,
  /\bonly\s+one\s+students?\b/i,
  /\bonly\s+two\s+students?\b/i,
  /\bonly\s+three\s+students?\b/i,
  /\bonly\s+four\s+students?\b/i,
  /\bonly\s+(?:five|six|seven|eight|nine)\s+students?\b/i,
  /\bonly\s+[1-9]\s+students?\b/i,
  /\bfar\s+fewer\s+participants\s+than\s+planned\b/i,
  /\bfar\s+fewer\s+than\s+the\s+target\b/i,
  /\bfewer\s+than\s+expected\s+participants\b/i,
  /\bparticipation\s+was\s+lower\s+than\s+anticipated\b/i,
  /\brecruitment\s+was\s+unsuccessful\b/i,
  /\brecruitment\s+failed\b/i,
  /\bcould\s+not\s+recruit\b/i,
  /\bunable\s+to\s+recruit\s+sufficient\b/i,
  /\binsufficient\s+participants\b/i,
  /\bno\s+statistical\s+analysis\s+was\s+possible\b/i,
  /\bstatistical\s+analysis\s+was\s+not\s+possible\b/i,
  /\btoo\s+few\s+participants\s+for\b/i,
  /\bsample\s+was\s+too\s+small\s+for\s+analysis\b/i,
  /\bsample\s+size\s+prevented\b/i,
  /\bn\s*=\s*1\b/i,
  /\bn\s*=\s*2\b/i,
  /\bn\s*=\s*3\b/i,
  /\bn\s*=\s*4\b/i,
  /\bwith\s+only\s+two\b/i,
  /\bwith\s+only\s+three\b/i,
  /\bboth\s+participants\b/i,
  /\bthe\s+two\s+participants\b/i,
  /\bfinal\s+sample\s+of\s+two\b/i,
  /\bfinal\s+sample\s+of\s+three\b/i,
  /\bfinal\s+sample\s+of\s+only\b/i,
  /\bended\s+up\s+with\s+only\b/i,
  /\breceived\s+only\b/i,
  /\bresulted\s+in\s+only\b/i,
  /\bsample\s+size\s+of\s+two\b/i,
  /\bsample\s+size\s+of\s+only\s+two\b/i,
];

/** Planned sample larger than achieved — pairs with partial signals in method/results. */
export const PLANNED_LARGER_SAMPLE = [
  /\btarget\s+sample\b/i,
  /\bplanned\s+to\s+recruit\b/i,
  /\boriginally\s+planned\b/i,
  /\bintended\s+to\s+recruit\b/i,
  /\bintended\s+to\b/i,
  /\baimed\s+to\s+recruit\b/i,
  /\bhoped\s+to\s+recruit\b/i,
  /\bnot\s+reached\b/i,
  /\btarget\s+sample\s+of\b/i,
];

const NO_STATISTICAL_ANALYSIS = [
  /\bno\s+statistical\s+analysis\s+was\s+(?:possible|conducted|meaningful)\b/i,
  /\bstatistical\s+analysis\s+was\s+not\s+(?:possible|conducted|meaningful)\b/i,
  /\bformal\s+data\s+analysis\s+was\s+not\s+conducted\b/i,
  /\bno\s+statistical\s+analysis\s+was\s+possible\b/i,
  /\bstatistical\s+analysis\s+was\s+not\s+possible\b/i,
];

const TINY_SAMPLE_INDICATORS = [
  /\bonly\s+(?:one|two)\s+(?:participants?|students?)\b/i,
  /\bonly\s+[12]\s+(?:participants?|students?)\b/i,
  /\b(?:final\s+)?sample\s+of\s+(?:only\s+)?(?:one|two)\b/i,
  /\bwith\s+only\s+(?:one|two)\b/i,
  /\bboth\s+participants\b/i,
  /\bboth\s+students\b/i,
  /\bthe\s+two\s+participants\b/i,
  /\bn\s*=\s*[12]\b/i,
  /\bsample\s+size\s+of\s+(?:only\s+)?two\b/i,
  /\bfinal\s+sample\s+of\s+only\s+two\b/i,
];

export interface MethodExecutionResult {
  notExecutedHard: boolean;
  partialExecution: boolean;
  functionallyUnexecuted: boolean;
}

function detectFunctionallyUnexecutedStudy(text: string): boolean {
  const tiny = TINY_SAMPLE_INDICATORS.some((p) => p.test(text));
  const noStats = NO_STATISTICAL_ANALYSIS.some((p) => p.test(text));
  return tiny && noStats;
}

function detectPartialWithPlannedLargerSample(methodResultsText: string): boolean {
  if (!methodResultsText.trim()) return false;
  const hasPlanned = PLANNED_LARGER_SAMPLE.some((p) => p.test(methodResultsText));
  if (!hasPlanned) return false;
  return METHOD_PARTIAL_EXECUTION.some((p) => p.test(methodResultsText));
}

export function detectMethodExecution(
  fullText: string,
  options?: {
    /** @deprecated Hard detection always scans full body. */
    excludeRegions?: string[];
    methodAndResultsText?: string;
  },
): MethodExecutionResult {
  const scanText = fullText;
  const methodResultsText = options?.methodAndResultsText?.trim() ?? "";
  const functionallyUnexecuted = detectFunctionallyUnexecutedStudy(scanText);

  const notExecutedHard =
    METHOD_NOT_EXECUTED_HARD.some((p) => p.test(scanText)) ||
    METHOD_NOT_EXECUTED_HARD.some((p) => p.test(methodResultsText)) ||
    functionallyUnexecuted;

  const partialInBody =
    !notExecutedHard &&
    METHOD_PARTIAL_EXECUTION.some((p) => p.test(scanText));

  const partialInMethodResults =
    !notExecutedHard &&
    methodResultsText.length > 0 &&
    (detectPartialWithPlannedLargerSample(methodResultsText) ||
      /\bdue\s+to\s+time\s+constraints\b/i.test(methodResultsText));

  const partialExecution =
    !notExecutedHard && (partialInBody || partialInMethodResults);

  return { notExecutedHard, partialExecution, functionallyUnexecuted };
}

/** Strong empirical execution — do not treat limitation disclaimers as partial execution. */
export function shouldSuppressPartialExecutionCap(
  ev: {
    methodPartialExecution: boolean;
    methodNotExecutedHard: boolean;
    studentResultsSignals: number;
    methodElements: number;
    highScoringPaperDetected: boolean;
  },
  hasStudentGeneratedData = false,
): boolean {
  if (!ev.methodPartialExecution || ev.methodNotExecutedHard) return false;
  if (hasStudentGeneratedData && ev.studentResultsSignals >= 5) return true;
  if (ev.highScoringPaperDetected) return true;
  return ev.studentResultsSignals >= 5 && ev.methodElements >= 4;
}
