/** Planned / future-tense / described-not-executed method detection (full paper body). */

export const PLANNED_METHOD_PHRASES = [
  /\bthis method would most likely be the main lead finding\b/i,
  /\bthis method would most likely be used\b/i,
  /\bwill most likely be used\b/i,
  /\bthe delphi method will most likely\b/i,
  /\bI want to use the action research method\b/i,
  /\bI want to use the\b/i,
  /\bthe research method chosen for this paper is\b/i,
  /\bthe method of this research paper is\b/i,
  /\ba survey that targets\b/i,
  /\ba survey may be done\b/i,
  /\ba mini opinionated survey may be done\b/i,
  /\bsome data and a mini opinionated survey may be done\b/i,
  /\bthe plan on creating graphs\b/i,
  /\bgraphs based on already-existing data points is to generate\b/i,
  /\bdata will be gathered from\b/i,
  /\bparticipants will be selected\b/i,
  /\bthis study will examine\b/i,
  /\bsurveys will be distributed\b/i,
  /\binterviews will be conducted\b/i,
  /\bwill be conducted with\b/i,
  /\bwill be administered\b/i,
  /\bwill be analyzed\b/i,
  /\bwill be collected\b/i,
  /\bwill be gathered\b/i,
  /\bwill be distributed\b/i,
];

const METHOD_HEDGING = [
  /\bhelps dig into\b/i,
  /\bthis method helps\b/i,
  /\bthis allows\b/i,
  /\bcan help one figure out\b/i,
  /\bwould most likely\b/i,
  /\bthere is hope that\b/i,
  /\bmakes me think about\b/i,
  /\bthis info can then be used\b/i,
  /\bthis would be the main\b/i,
];

const FUTURE_METHOD_VERBS =
  /\b(?:will|would|may|might|can)\s+(?:analyze|conduct|collect|survey|gather|use|employ|implement|administer|distribute|examine|investigate)\b/gi;

const PAST_EXECUTION =
  /\b(?:conducted|collected|administered|were\s+surveyed|I\s+surveyed|we\s+surveyed|participants?\s+were\s+recruited|data\s+were\s+collected)\b/i;

export interface PlannedMethodResult {
  plannedMethodDominant: boolean;
  describedNotExecuted: boolean;
  plannedPhraseHits: number;
}

function countHedging(text: string): number {
  return METHOD_HEDGING.filter((p) => p.test(text)).length;
}

function hasPlannedSurveyWithoutExecution(text: string): boolean {
  if (!/\ba survey that targets\b/i.test(text)) return false;
  return !/\b(?:surveyed|administered|distributed\s+to|responses?\s+were|N\s*=\s*\d+)\b/i.test(
    text,
  );
}

export function detectPlannedMethod(fullText: string, methodSection: string): PlannedMethodResult {
  const body = fullText.trim();
  const method = methodSection.trim();
  const scan = `${body}\n${method}`;

  let plannedPhraseHits = 0;
  for (const p of PLANNED_METHOD_PHRASES) {
    if (p.test(scan)) plannedPhraseHits++;
  }
  if (hasPlannedSurveyWithoutExecution(body)) plannedPhraseHits++;

  const futureHits = (scan.match(FUTURE_METHOD_VERBS) ?? []).length;
  const pastInMethod = PAST_EXECUTION.test(method);
  const futureDominantInMethod =
    method.length > 80 &&
    futureHits >= 2 &&
    !pastInMethod &&
    (method.match(FUTURE_METHOD_VERBS) ?? []).length >= 2;

  const describedNotExecuted = countHedging(scan) >= 3 && !pastInMethod;

  /** Past-tense execution in the method section only — findings may cite secondary "collected" data. */
  const plannedMethodDominant =
    !pastInMethod &&
    (plannedPhraseHits >= 1 ||
      futureDominantInMethod ||
      describedNotExecuted ||
      (futureHits >= 3 && !pastInMethod));

  return {
    plannedMethodDominant,
    describedNotExecuted,
    plannedPhraseHits,
  };
}
