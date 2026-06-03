import {
  preparePaperForGrading,
  type PreparePaperResult,
} from "@/lib/grader/cleanDocument";
import {
  MAX_PASTE_CHARACTERS,
  PASTE_TRUNCATION_FLAG,
} from "@/lib/grader/gradingSpec";
import {
  buildSubmissionPipelineDiagnostic,
  type SubmissionPipelineDiagnostic,
} from "@/lib/grader/pipelineDiagnostic";
import {
  extractStatedWordCountWithSource,
  partitionDocument,
  type PaperZones,
} from "@/lib/grader/paperBoundaries";
import { countWords } from "@/lib/grader/text";

/** Result of one-time text prep + boundary partition per grading request. */
export interface DocumentPartition extends PaperZones {
  preparedText: string;
  pipelineFlags: string[];
  /** Immutable word count from raw submission before cleaning (after control-char norm only). */
  originalInputWordCount: number;
  /** Character length of submission before cleaning (for boundary position thresholds). */
  originalInputCharCount: number;
  pipelineDiagnostic: SubmissionPipelineDiagnostic;
}

export interface PrepareGradingInputResult {
  partition: DocumentPartition;
}

/**
 * Single entry for grading: enforce paste limit, clean text, partition once.
 */
export function prepareGradingInput(
  rawText: string,
  options: {
    logCleaningCheckpoints?: boolean;
    /** Word count after PDF joinSoftLineBreaks (paste/DOCX: omit). */
    joinSoftLineBreaksWordCount?: number | null;
  } = {},
): PrepareGradingInputResult {
  const pipelineFlags: string[] = [];
  const originalInputCharCount = rawText.length;
  const originalInputWordCount = countWords(rawText.trim());

  let text = rawText.trim();
  if (text.length > MAX_PASTE_CHARACTERS) {
    text = text.slice(0, MAX_PASTE_CHARACTERS);
    pipelineFlags.push(PASTE_TRUNCATION_FLAG);
  }

  const statedFromRaw = extractStatedWordCountWithSource(text);
  const prep: PreparePaperResult = preparePaperForGrading(text, {
    logCheckpoints: options.logCleaningCheckpoints,
  });

  const zones = partitionDocument(prep.text, {
    originalInputWordCount,
    originalInputCharCount,
    statedWordCountFromRaw: statedFromRaw.count,
    statedWordCountSource: statedFromRaw.source,
  });

  const pipelineDiagnostic = buildSubmissionPipelineDiagnostic(
    originalInputWordCount,
    prep.checkpoints,
    zones,
    {
      joinSoftLineBreaksWordCount: options.joinSoftLineBreaksWordCount ?? null,
      statedWordCountSource: statedFromRaw.source,
      collegeBoardCleanRan: prep.collegeBoardCleanRan,
      coverPageLinesStripped: prep.coverPageStrip.linesStripped,
      coverPageWordsStripped: prep.coverPageStrip.wordsStripped,
    },
  );

  return {
    partition: {
      ...zones,
      preparedText: prep.text,
      pipelineFlags,
      originalInputWordCount,
      originalInputCharCount,
      pipelineDiagnostic,
    },
  };
}
