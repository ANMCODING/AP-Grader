/** Third-party attribution in results — not student-generated evidence. */
const PRIOR_AUTHOR_ATTRIBUTION =
  /\b(?:[A-Z][a-zA-Z]+(?:\s+et\s+al\.?)?)\s+(?:found|showed|demonstrated|reported|noted|argued|conducted|published)\s+that\b/i;

const STUDENT_DATA_SENTENCE =
  /\b(?:I|we)\s+(?:found|conducted|collected|administered|surveyed|interviewed|analyzed|observed)\b/i;

const STUDENT_RESULTS_LANGUAGE =
  /\b(?:participants?\s+(?:reported|completed|scored|described)|results\s+showed|the\s+correlation\s+was|themes?\s+(?:included|emerged|produced|identified)|overarching\s+themes?|representative\s+quote|our\s+data|my\s+data|I\s+found|the\s+survey|survey\s+showed|analysis\s+of\s+the\s+(?:\d+\s+)?interviews?)\b/i;

const QUALITATIVE_RESULTS_SENTENCE =
  /\b(?:theme\s+\d|themes?\s+(?:emerged|produced|identified)|representative\s+quote|(?:\d+\s+of\s+\d+\s+)?participants?\s+(?:described|reported|said))\b/i;

const PARTICIPANT_REF =
  /\b(?:participants?|respondents?|students?|girls?|teenagers?|teenage\s+girls?|N\s*=\s*\d+|\bsaid\b|\breported\b|\bchose\b|\bselected\b|\banswered\b)\b/i;

const DESCRIPTIVE_PERCENT =
  /\b(?:\d+(?:\.\d+)?\s*%|(?:about|approximately|around|roughly|nearly|over|more\s+than|less\s+than)\s+\d+(?:\.\d+)?\s*%)\b/i;

const INFERENTIAL_SENTENCE_PATTERNS: RegExp[] = [
  /\bF\s*\(\s*\d+\s*,\s*\d+\s*\)\s*=/i,
  /\bt\s*\(\s*\d+\s*\)\s*=/i,
  /\bchi-?square\b/i,
  /\bχ²\b/i,
  /\br\s*=\s*[\d.]+/i,
  /\bp\s*(?:<|less\s+than|=)\s*\.?\d+/i,
  /\bpartial\s+eta\s+squared\b/i,
  /\bCohen'?s\s+d\b/i,
  /\bHedges\s*'?g\b/i,
  /\bconfidence\s+interval\b/i,
  /\bbeta\s*=\s*[\d.]+/i,
];

/** G2 — systematic content analysis on a defined corpus counts as student data collection. */
export function detectContentAnalysisExecuted(
  methodSection: string,
  resultsSection: string,
  fullText = "",
): boolean {
  const method = methodSection.trim();
  const results = resultsSection.trim();
  const combined = `${method}\n${results}\n${fullText}`;
  if (!/\bcontent\s+analysis\b/i.test(combined)) return false;

  const hasCodingFramework =
    /\b(?:coding\s+scheme|coding\s+criteria|coding\s+protocol|coding\s+examples?|inter-?coder|unit\s+of\s+analysis|categories\s+coded|coded\s+(?:each|all|for)|systematic\s+analysis\s+of|separated\s+into\s+(?:\d+\s+)?categories)\b/i.test(
      combined,
    );

  const hasDefinedCorpus =
    /\b(?:\d+\s+issues?|all\s+(?:advertisements?|articles?|episodes?)|analyzed\s+(?:all|each)|from\s+\d{4}\s+to\s+\d{4}|between\s+\d{4}\s+and\s+\d{4}|one\s+month\s+out\s+of\s+each\s+year|1950\s+to\s+2019|1950-2019)\b/i.test(
      combined,
    );

  const hasCodedResults =
    /\b(?:chi-?squared?|χ²|coded|coding|percent|proportion|frequency|table\s+\d|null\s+hypothesis)\b/i.test(
      `${results}\n${fullText}`,
    ) &&
    (`${results}\n${fullText}`.length > 80);

  return hasCodingFramework && hasDefinedCorpus && hasCodedResults;
}

/** Correlation study with named method, sample, and reported coefficients. */
export function detectCorrelationStudyExecuted(
  methodSection: string,
  resultsSection: string,
  fullText = "",
): boolean {
  const region = `${methodSection}\n${resultsSection}\n${fullText}`;
  const namesMethod =
    /\b(?:Pearson\s+correlation|correlation\s+analysis|correlation\s+coefficient|correlational\s+(?:study|research|design|approach)|correlation\s+study)\b/i.test(
      region,
    );
  const hasSample = /\b(?:n\s*=\s*\d+|sample\s+(?:of|size)\s*\d+|participants?\s+were|survey\s+was)\b/i.test(
      region,
  );
  const resultsRegion = `${resultsSection}\n${fullText}`;
  const hasCoefficients =
    /\b(?:r\s*=\s*[\d.]+|Pearson'?s?\s+r|correlation\s+coefficient\s+(?:of|was|=)|statistically\s+significant\s+correlation)\b/i.test(
      resultsRegion,
    ) ||
    (/\bcorrelation\b/i.test(resultsRegion) &&
      /\b(?:significant|positive|negative|weak|strong|inverse)\b/i.test(resultsRegion) &&
      /\d/.test(resultsRegion));

  return namesMethod && hasSample && hasCoefficients;
}

/** G4 — honest engagement with unexpected / contradictory findings. */
export function detectContradictoryFindingHandled(
  resultsSection: string,
  discussionSection: string,
): boolean {
  const results = resultsSection.trim();
  const combined = `${results}\n${discussionSection}`;
  const contradictionInResults =
    /\b(?:contrary\s+to\s+(?:the\s+)?hypothesis|contrary\s+to\s+expectations?|unexpectedly|surprisingly|this\s+contradicts|this\s+challenges|against\s+our\s+prediction|null\s+hypothesis\s+was\s+rejected\s+in\s+unexpected)\b/i.test(
      results,
    );
  const analyticalEngagement =
    /\b(?:this\s+(?:suggests|indicates|may\s+be\s+because)|one\s+explanation|possible\s+reason|although\s+unexpected|despite\s+this|nevertheless|however,?\s+this)\b/i.test(
      combined,
    );
  return contradictionInResults && analyticalEngagement;
}

export function methodShowsDataCollection(methodSection: string): boolean {
  if (!methodSection.trim()) return false;
  if (/\bconducted\s+a\s+(?:review|literature\s+review)\b/i.test(methodSection)) {
    return false;
  }
  return (
    /\b(?:I|we)\s+(?:conducted|collected|administered|surveyed|interviewed|gathered|distributed|recruited)\b/i.test(
      methodSection,
    ) ||
    /\b(?:data\s+were\s+collected|participants?\s+(?:were|completed)|participants?\s+were\s+(?:interviewed|surveyed|recruited|selected)|interviews?\s+were\s+conducted|semi-structured\s+interviews?|n\s*=\s*\d+|sample\s+(?:of|size)\s+\d+)\b/i.test(
      methodSection,
    ) ||
    /\bparticipants?\s+completed\b/i.test(methodSection) ||
    /\b(?:simulation|simulated|virtual\s+experiment|computer-?based\s+simulation)\b/i.test(
      methodSection,
    ) ||
    /\b(?:google\s+form|survey\s+was\s+(?:created|distributed)|anonymous\s+survey)\b/i.test(
      methodSection,
    ) ||
    /\b(?:quasi-?experimental|self-paced\s+reading|mixed\s+methods?|qualitative\s+design|word\s+processing\s+speed|reading\s+comprehension\s+(?:test|assessment))\b/i.test(
      methodSection,
    ) ||
    (/quasi-?experimental/i.test(methodSection) &&
      /participants/i.test(methodSection) &&
      /(?:sampling|recruited|survey|assessment|comprehension|processing)/i.test(
        methodSection,
      ))
  );
}

/** PRISMA claimed without minimum execution evidence → treat as lit-review-only method. */
export function detectPrismaWithoutExecution(methodSection: string): boolean {
  if (!/\bPRISMA\b/i.test(methodSection)) return false;
  let signals = 0;
  if (
    /\b(?:inclusion|exclusion)\s+criteria\b/i.test(methodSection) ||
    /\bincluded\s+studies\b/i.test(methodSection)
  ) {
    signals++;
  }
  if (
    /\b(?:PubMed|Google Scholar|PsycINFO|JSTOR|Web of Science|Scopus|ERIC)\b/i.test(
      methodSection,
    )
  ) {
    signals++;
  }
  if (
    /\b(?:search\s+terms?|keywords?|search\s+strategy|database\s+search)\b/i.test(
      methodSection,
    )
  ) {
    signals++;
  }
  return signals < 2;
}

/** Literature synthesis presented as original quantitative data (FIX 4). */
export function detectUnverifiableLiteratureSynthesisMethod(
  methodSection: string,
): boolean {
  const m = methodSection.trim();
  if (m.length < 80) return false;

  const literaturePerspective =
    /\b(?:this\s+review\s+approaches?\s+with\s+a\s+literature\s+perspective|literature\s+perspective|lit-?review|literature\s+review\s+approach)\b/i.test(
      m,
    );
  const synthesizingSecondaryData =
    /\b(?:gather(?:ing)?|collect(?:ing)?)\s+data\s+from\s+other\s+sources\b/i.test(m) ||
    /\bsynthesiz(?:ing|e)\s+data\s+from\s+other\s+sources\b/i.test(m) ||
    /\bcreate\s+(?:specific\s+)?data\s+from\s+other\b/i.test(m) ||
    /\bcombining\s+percentages\b/i.test(m) ||
    /\bpercentages\s+from\s+other\s+(?:data|sources)\b/i.test(m) ||
    /\bdata\s+created\s+from\s+other\b/i.test(m);
  const noPrimaryInstrument =
    !/\b(?:survey|questionnaire|interview|experiment|simulation|simulated|virtual\s+experiment|instrument|IRB|participants?\s+were\s+(?:recruited|surveyed|selected)|google\s+form)\b/i.test(
      m,
    );

  return (literaturePerspective || synthesizingSecondaryData) && noPrimaryInstrument;
}

/** Simulation with multi-day measurements, groups, and statistical tests (FIX 5). */
export function detectSimulationEmpiricalResults(
  resultsRegion: string,
  methodSection: string,
): boolean {
  const region = `${resultsRegion}\n${methodSection}`.trim();
  if (region.length < 100) return false;

  const hasSimulationMethod =
    /\b(?:simulation|simulated|virtual\s+experiment|computer-?based\s+simulation|simulation-?based)\b/i.test(
      region,
    );
  const hasNumericalOverTime =
    /\b(?:day\s+\d+|over\s+(?:the\s+)?course\s+of\s+\d+\s+days?|\d+\s+days?|14\s+days?)\b/i.test(
      region,
    ) &&
    /\b(?:cm|height|health|percentage|%|plant\s+growth|experimental\s+group)\b/i.test(
      region,
    );
  const hasGroups =
    /\b(?:experimental\s+group|control\s+group|trial|concentration|seven\s+different|multiple\s+groups)\b/i.test(
      region,
    );
  const hasStats =
    /\b(?:t-?test|p-?value|p\s*[<=>]|p-values?|ANOVA|statistically\s+significant)\b/i.test(
      region,
    );

  return hasSimulationMethod && hasNumericalOverTime && hasGroups && hasStats;
}

export function detectRigorousSimulationMethod(
  methodSection: string,
  resultsRegion: string,
): boolean {
  const region = `${methodSection}\n${resultsRegion}`;
  return (
    /\b(?:simulation|simulated|virtual\s+experiment)\b/i.test(region) &&
    /\b(?:control\s+group|experimental\s+group|trial|replicate|replication)\b/i.test(
      region,
    ) &&
    /\b(?:day\s+\d+|over\s+\d+\s+days?)\b/i.test(region)
  );
}

function isPriorAuthorAttributionSentence(sentence: string): boolean {
  if (PRIOR_AUTHOR_ATTRIBUTION.test(sentence)) return true;
  return false;
}

function descriptiveSurveyResultSignal(sentence: string): number {
  if (!DESCRIPTIVE_PERCENT.test(sentence)) return 0;
  if (!PARTICIPANT_REF.test(sentence)) return 0;
  if (isPriorAuthorAttributionSentence(sentence)) return 0;
  if (
    /\b(?:Smith|Jones|prior|previous|existing|study|research|found)\b/i.test(sentence) &&
    !STUDENT_DATA_SENTENCE.test(sentence)
  ) {
    return 0;
  }
  return 2;
}

/** Expand results region with leading discussion when results block is short. */
export function expandResultsBodyForSignals(
  resultsBody: string,
  discussionBody: string,
): string {
  if (resultsBody.trim().length >= 400 || discussionBody.trim().length <= 800) {
    return resultsBody;
  }
  const paras = discussionBody.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paras.length === 0) return resultsBody;
  const take = Math.max(1, Math.ceil(paras.length * 0.4));
  return `${resultsBody}\n\n${paras.slice(0, take).join("\n\n")}`.trim();
}

/** Fallback inferential signal count from full body when results region is thin. */
export function countInferentialFallbackSignals(paperBody: string): number {
  let n = 0;
  const sents = paperBody.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 15);
  for (const sentence of sents) {
    if (INFERENTIAL_SENTENCE_PATTERNS.some((p) => p.test(sentence))) {
      n += 2;
    }
  }
  return n;
}

export function countStudentResultsSignals(resultsBody: string): number {
  if (!resultsBody.trim()) return 0;

  let n = 0;
  const sents = resultsBody.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 15);

  for (const sentence of sents) {
    if (isPriorAuthorAttributionSentence(sentence)) {
      n = Math.max(0, n - 1);
      continue;
    }
    if (
      /\b(?:Smith|Jones|prior|previous|existing)\s+(?:study|research|found)\b/i.test(sentence) &&
      !STUDENT_DATA_SENTENCE.test(sentence)
    ) {
      continue;
    }

    let sentenceScore = descriptiveSurveyResultSignal(sentence);
    if (/\b\d+(?:\.\d+)?%/.test(sentence)) sentenceScore += sentenceScore > 0 ? 0 : 1;
    if (/\btable\s+\d|figure\s+\d/i.test(sentence)) sentenceScore++;
    if (STUDENT_RESULTS_LANGUAGE.test(sentence)) sentenceScore += 2;
    if (/\bF\s*\(\s*\d+\s*,\s*\d+\s*\)\s*=/i.test(sentence)) sentenceScore += 2;
    if (/\bt\s*\(\s*\d+\s*\)\s*=/i.test(sentence)) sentenceScore += 2;
    if (/\bchi-?square\b/i.test(sentence) || /\bχ²\b/.test(sentence)) sentenceScore += 2;
    if (/\br\s*=\s*[\d.]+/i.test(sentence)) sentenceScore += 2;
    if (
      /\b(?:Pearson\s+correlation|correlation\s+coefficient)\b/i.test(sentence) &&
      /\d/.test(sentence)
    ) {
      sentenceScore += 2;
    }
    if (/\b(?:p\s*[<=>]|p\s+less\s+than|p-values?)/i.test(sentence)) sentenceScore++;
    if (/\b(?:eta\s+squared|Cohen'?s\s+d|partial\s+eta)/i.test(sentence))
      sentenceScore += 1.5;
    if (/\b(?:theme|coded|coding)\b/i.test(sentence) && STUDENT_DATA_SENTENCE.test(sentence))
      sentenceScore += 2;
    if (QUALITATIVE_RESULTS_SENTENCE.test(sentence)) sentenceScore += 2;
    if (/\bN\s*=\s*\d+/i.test(sentence) && DESCRIPTIVE_PERCENT.test(sentence))
      sentenceScore += 2;

    if (sentenceScore > 0) n += sentenceScore;
  }

  return Math.max(0, Math.round(n));
}

export function detectLiteratureReviewOnlyMethod(
  methodSection: string,
  fullText: string,
): boolean {
  const region = methodSection.trim() || fullText;
  const litReviewMethod =
    /\b(?:conducted\s+a\s+(?:review|literature\s+review)|did\s+a\s+systematic\s+review|systematic\s+review\s+of|literature\s+review\s+was\s+sufficient|decided\s+that\s+a\s+literature\s+review|searched\s+(?:databases|Google Scholar|PsycINFO)|database\s+search|reviewed\s+existing\s+research|only\s+a\s+literature\s+review|this\s+paper\s+will\s+explore|this\s+paper\s+discusses|this\s+paper\s+reviews)\b/i.test(
      region,
    );
  const noCollection =
    !methodShowsDataCollection(region) &&
    !/\b(?:experiment|surveyed\s+\d+|interviewed\s+\d+|participants?\s+were)\b/i.test(region);
  return litReviewMethod && noCollection;
}

export function detectHypotheticalResults(fullText: string): boolean {
  return /\b(?:hypothetical\s+(?:projected\s+)?results|would\s+show|if\s+conducted|projected\s+results)\b/i.test(
    fullText,
  );
}

export function detectFabricatedDataAdmission(fullText: string): boolean {
  return /\b(?:I\s+fabricated|made\s+up\s+the\s+data|data\s+was\s+invented|invented\s+the\s+data)\b/i.test(
    fullText,
  );
}

function isChicagoFootnoteFalsePositive(
  paperBody: string,
  matchIndex: number,
): boolean {
  const punct = paperBody[matchIndex];
  const before = paperBody.slice(Math.max(0, matchIndex - 16), matchIndex);
  const after = paperBody.slice(matchIndex + 1, matchIndex + 8);

  if (punct === "." && /^\s*\d/.test(after)) {
    if (/[=<>]\s*$/.test(before)) return true;
    if (/\bthan\s$/i.test(before)) return true;
    if (/\b(?:r|p|β|beta|R²?)\s*=\s*$/i.test(before)) return true;
    if (/\d\s*$/.test(before)) return true;
  }

  if (punct === ")") {
    const open = paperBody.lastIndexOf("(", matchIndex);
    if (open >= 0 && open >= matchIndex - 40) {
      const inner = paperBody.slice(open + 1, matchIndex);
      if (/^[A-Za-z]\s*,\s*\d/.test(inner) || /^[A-Za-z]{1,6}\s*\(/.test(inner)) {
        return true;
      }
    }
  }

  const lineStart = paperBody.lastIndexOf("\n", matchIndex) + 1;
  const linePrefix = paperBody.slice(lineStart, matchIndex + 6);
  if (/^\s*\d+\.\s+[A-Z]/.test(linePrefix)) return true;

  return false;
}

/** Chicago-style footnote markers after sentence punctuation. */
export function detectChicagoFootnoteStyle(paperBody: string): boolean {
  const re = /[.!?)"'”]\s*([1-9]|[1-4]\d|50)\b/g;
  let count = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(paperBody)) !== null) {
    if (isChicagoFootnoteFalsePositive(paperBody, match.index)) continue;
    count++;
    if (count >= 5) return true;
  }
  return false;
}
