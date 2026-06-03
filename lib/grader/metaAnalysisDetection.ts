/**
 * Meta-analysis / systematic review student-data and method-element detection.
 */

const ACADEMIC_DATABASES =
  /\b(?:PubMed|MEDLINE|EBSCOhost|Cochrane|PsycINFO|Scopus|Web\s+of\s+Science|IEEE\s+Xplore|EMBASE|ProQuest|CINAHL|Academic\s+Search\s+Complete)\b/gi;

const INCLUSION_EXCLUSION_LANG =
  /\b(?:inclusion\s+criteria|exclusion\s+criteria|studies\s+were\s+included\s+if|studies\s+were\s+excluded\s+if|eligibility\s+criteria|inclusion\s+and\s+exclusion)\b/i;

const SCREENING_LANG =
  /\b(?:were\s+screened|screening\s+process|title\s+and\s+abstract\s+screening|full-?text\s+screening|screening\s+log|duplicates\s+were\s+removed)\b/i;

const FUTURE_TENSE_METHOD =
  /\b(?:will\s+be|will\s+be\s+used|will\s+be\s+conducted|it\s+will\s+be\s+possible|can\s+be\s+done|should\s+be|would\s+be|is\s+used\s+for\s+implementing)\b/i;

const META_RESULTS_PHRASES = [
  /\bfulfilled\s+the\s+inclusion\s+criteria\b/i,
  /\bmet\s+the\s+inclusion\s+criteria\b/i,
  /\bwere\s+included\s+in\s+the\s+meta-?analysis\b/i,
  /\bwere\s+included\s+in\s+this\s+analysis\b/i,
  /\bwere\s+included\s+in\s+this\s+review\b/i,
  /\bstudies\s+were\s+identified\b/i,
  /\barticles\s+were\s+selected\b/i,
  /\bwere\s+extracted\b/i,
  /\bdata\s+were\s+extracted\b/i,
  /\beffect\s+size\b/i,
  /\bpooled\s+effect\b/i,
  /\bweighted\s+mean\b/i,
  /\bheterogeneity\b/i,
  /\bI-?squared\b/i,
  /\bI²\b/i,
  /\bI\^2\b/i,
  /\bAUROC\b/i,
  /\bAUC\b/i,
  /\bforest\s+plot\b/i,
  /\bfunnel\s+plot\b/i,
  /\brandom\s+effects\b/i,
  /\bfixed\s+effects\b/i,
  /\bodds\s+ratio\b/i,
  /\brisk\s+ratio\b/i,
  /\bmean\s+difference\b/i,
  /\bΔAUC\b/i,
  /\bdelta\s+AUC\b/i,
  /\b142,376\b/,
  /\b\d{2,3},\d{3}\b.*\b(?:patients?|participants?|subjects?)\b/i,
  /\b(?:patients?|participants?|subjects?)\b.*\b\d{5,}\b/i,
];

const META_METHOD_ACTIVATION =
  /\b(?:meta-?analysis|systematic\s+review|systematic\s+search|systematic\s+literature)\b/i;

const CONFIRMED_EXECUTION_RESULTS =
  /\b(?:\d{2,3},\d{3}\s+patients?|\d+\s+studies?\s+(?:were\s+)?included|extracted\s+tables?|AUC\s*[=:]\s*0\.\d+|ΔAUC|pooled\s+effect\s+(?:was|of)\s*[\d.]+)\b/i;

export type MetaAnalysisStudentDataResult = {
  exempt: boolean;
  signalBonus: number;
};

function countDatabaseNames(text: string): number {
  const seen = new Set<string>();
  for (const m of text.matchAll(ACADEMIC_DATABASES)) {
    seen.add(m[0].toLowerCase());
  }
  return seen.size;
}

function windowAround(text: string, index: number, radius = 150): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end);
}

/** 1 for executed phrasing; 0.5 when the match sits in future-tense planning language. */
function weightedElementMatch(methodText: string, pattern: RegExp): number {
  const m = methodText.match(pattern);
  if (m?.index === undefined) return 0;
  return FUTURE_TENSE_METHOD.test(windowAround(methodText, m.index)) ? 0.5 : 1;
}

function addWeighted(count: number, weight: number): number {
  return count + weight;
}

function hasConfirmedExecutionResults(resultsText: string): boolean {
  return CONFIRMED_EXECUTION_RESULTS.test(resultsText);
}

function detectPatternA(text: string): boolean {
  const databases = countDatabaseNames(text) >= 2;
  const inclusion = INCLUSION_EXCLUSION_LANG.test(text);
  const screening = SCREENING_LANG.test(text);
  const groups = [databases, inclusion, screening].filter(Boolean).length;
  return groups >= 2;
}

function detectPatternB(resultsText: string): boolean {
  const windows: string[] = [];
  const authorYear = /\b[A-Z][a-z]+(?:\s+et\s+al\.)?\s*,?\s*\d{4}\b/g;
  let m: RegExpExecArray | null;
  while ((m = authorYear.exec(resultsText)) !== null) {
    const start = Math.max(0, m.index - 400);
    const end = Math.min(resultsText.length, m.index + 400);
    windows.push(resultsText.slice(start, end));
  }
  if (windows.length < 3) return false;

  let tabularHits = 0;
  for (const w of windows) {
    const hasNumbers = (w.match(/\b\d+(?:\.\d+)?\b/g) ?? []).length >= 2;
    const tabular =
      /\t/.test(w) ||
      /\|/.test(w) ||
      /\b\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?/.test(w);
    if (hasNumbers && tabular) tabularHits++;
  }
  return tabularHits >= 3;
}

function detectPatternC(resultsText: string): boolean {
  const hits = META_RESULTS_PHRASES.filter((p) => p.test(resultsText)).length;
  return hits >= 3;
}

export function detectMetaAnalysisStudentData(
  paperBody: string,
  resultsSection: string,
): MetaAnalysisStudentDataResult {
  const combined = `${paperBody}\n${resultsSection}`;
  let signalBonus = 0;
  let exempt = false;

  if (detectPatternA(combined)) {
    exempt = true;
    signalBonus += 3;
  }
  if (detectPatternB(resultsSection)) {
    exempt = true;
    signalBonus += 2;
  }
  if (detectPatternC(resultsSection)) {
    exempt = true;
    signalBonus += 2;
  }

  return { exempt, signalBonus };
}

export function isMetaAnalysisMethod(methodText: string): boolean {
  return META_METHOD_ACTIVATION.test(methodText);
}

export function countMetaAnalysisMethodElements(
  methodText: string,
  resultsText = "",
): number {
  if (!META_METHOD_ACTIVATION.test(methodText)) return 0;

  let total = 0;
  if (countDatabaseNames(methodText) >= 2) {
    total = addWeighted(total, 1);
  }
  if (/\bboolean\b/i.test(methodText) && /\b(?:AND|OR|NOT)\b/.test(methodText)) {
    total = addWeighted(total, weightedElementMatch(methodText, /\bboolean\b/i));
  }
  const inclusionBullets =
    (methodText.match(/(?:^|\n)\s*(?:\d+\.|[-•])\s+.+/g) ?? []).filter((l) =>
      /includ/i.test(l),
    ).length;
  if (
    inclusionBullets >= 2 ||
    (/\binclusion\s+criteria\b/i.test(methodText) &&
      (methodText.match(/\b(?:were|must|should|had\s+to)\b/gi) ?? []).length >= 2)
  ) {
    total = addWeighted(
      total,
      weightedElementMatch(methodText, /\binclusion\s+criteria\b/i) || 1,
    );
  }
  const exclusionBullets =
    (methodText.match(/(?:^|\n)\s*(?:\d+\.|[-•])\s+.+/g) ?? []).filter((l) =>
      /exclud/i.test(l),
    ).length;
  if (
    exclusionBullets >= 2 ||
    (/\bexclusion\s+criteria\b/i.test(methodText) &&
      (methodText.match(/\b(?:excluded|excluding|were\s+not)\b/gi) ?? []).length >= 2)
  ) {
    total = addWeighted(
      total,
      weightedElementMatch(methodText, /\bexclusion\s+criteria\b/i) || 1,
    );
  }
  if (
    /\b(?:title\s+and\s+abstract|full-?text|two-?stage|multi-?stage)\s+screening\b/i.test(
      methodText,
    ) ||
    (SCREENING_LANG.test(methodText) &&
      /\b(?:screened|screening)\b/i.test(methodText))
  ) {
    total = addWeighted(
      total,
      weightedElementMatch(
        methodText,
        /\b(?:title\s+and\s+abstract|full-?text|two-?stage|multi-?stage)\s+screening\b/i,
      ) || weightedElementMatch(methodText, SCREENING_LANG),
    );
  }
  if (
    /\b(?:excel|spreadsheet|coding\s+form|standardized\s+form|data\s+extraction)\b/i.test(
      methodText,
    ) ||
    /\bdata\s+(?:were|was)\s+extracted\b/i.test(methodText)
  ) {
    total = addWeighted(
      total,
      weightedElementMatch(methodText, /\bdata\s+(?:were|was)\s+extracted\b/i) ||
        weightedElementMatch(
          methodText,
          /\b(?:excel|spreadsheet|coding\s+form|standardized\s+form|data\s+extraction)\b/i,
        ),
    );
  }
  if (
    /\b(?:random\s+effects|fixed\s+effects|pooled\s+effect|weighted\s+mean|inverse\s+variance)\b/i.test(
      methodText,
    )
  ) {
    total = addWeighted(
      total,
      weightedElementMatch(
        methodText,
        /\b(?:random\s+effects|fixed\s+effects|pooled\s+effect|weighted\s+mean|inverse\s+variance)\b/i,
      ),
    );
  }
  if (
    /\b(?:I-?squared|I²|Q\s+statistic|Cochran'?s\s+Q|tau-?squared)\b/i.test(
      methodText,
    )
  ) {
    total = addWeighted(
      total,
      weightedElementMatch(
        methodText,
        /\b(?:I-?squared|I²|Q\s+statistic|Cochran'?s\s+Q|tau-?squared)\b/i,
      ),
    );
  }
  if (
    /\b(?:sensitivity\s+analysis|leave-?one-?out|subgroup\s+analysis)\b/i.test(
      methodText,
    )
  ) {
    total = addWeighted(
      total,
      weightedElementMatch(
        methodText,
        /\b(?:sensitivity\s+analysis|leave-?one-?out|subgroup\s+analysis)\b/i,
      ),
    );
  }
  if (
    /\b(?:publication\s+bias|funnel\s+plot|Egger'?s|Begg'?s)\b/i.test(
      methodText,
    )
  ) {
    total = addWeighted(
      total,
      weightedElementMatch(
        methodText,
        /\b(?:publication\s+bias|funnel\s+plot|Egger'?s|Begg'?s)\b/i,
      ),
    );
  }
  if (
    /\b(?:no\s+human\s+subjects|not\s+require\s+IRB|exempt\s+from\s+IRB|secondary\s+data)\b/i.test(
      methodText,
    )
  ) {
    total = addWeighted(total, 1);
  }
  if (/\b(?:replicab|reproducib|replication)\b/i.test(methodText)) {
    total = addWeighted(total, weightedElementMatch(methodText, /\breplicab/i));
  }

  if (hasConfirmedExecutionResults(resultsText)) {
    total = addWeighted(total, 1);
  }

  const rounded = Math.floor(total);
  if (rounded >= 6 && FUTURE_TENSE_METHOD.test(methodText)) {
    return Math.min(rounded, 5);
  }
  return rounded;
}
