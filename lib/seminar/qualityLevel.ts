import { IWA_QUALITY_BANDS } from "@/lib/seminar/seminarPolicy";
import type { SeminarQualityLevel } from "@/lib/seminar/seminarTypes";

const IWA_MESSAGES: Record<SeminarQualityLevel, string> = {
  High:
    "Your writing demonstrates mastery of the AP Seminar argument criteria. This is characteristic of the highest-scoring IWA submissions.",
  Strong:
    "Your writing demonstrates strong command of most argument criteria with some areas for growth.",
  Developing:
    "Your writing shows developing proficiency. Strengthening your argument structure and evidence analysis will improve your score.",
  Beginning:
    "Your writing is at the beginning stages of academic argument development. Focus on developing a clear thesis and integrating sources purposefully.",
  "Below Minimum":
    "The submission does not yet meet the minimum criteria for the IWA. Review the rubric and consider whether stimulus sources are being integrated into a clear argument.",
};

const IRR_MESSAGES: Record<SeminarQualityLevel, string> = {
  High:
    "Your report demonstrates mastery of AP Seminar IRR criteria, characteristic of the highest-scoring submissions.",
  Strong:
    "Your report shows strong command of most IRR criteria with some areas for growth.",
  Developing:
    "Your report shows developing proficiency. Strengthen source reasoning, evaluation, and perspective synthesis.",
  Beginning:
    "Your report is at early stages of research reporting. Focus on explaining source arguments and connecting perspectives.",
  "Below Minimum":
    "The submission does not yet meet minimum IRR criteria. Review the rubric and ensure systematic use of credible sources.",
};

export function qualityForIwa(
  total: number,
  preflightFailed = false,
): {
  level: SeminarQualityLevel;
  message: string;
} {
  if (preflightFailed) {
    return {
      level: "Below Minimum",
      message: IWA_MESSAGES["Below Minimum"],
    };
  }
  let level: SeminarQualityLevel;
  if (total >= IWA_QUALITY_BANDS.high.min) level = "High";
  else if (total >= IWA_QUALITY_BANDS.strong.min) level = "Strong";
  else if (total >= IWA_QUALITY_BANDS.developing.min) level = "Developing";
  else if (total >= 8) level = "Beginning";
  else level = "Below Minimum";
  return { level, message: IWA_MESSAGES[level] };
}

export function qualityForIrr(
  total: number,
  preflightFailed = false,
): {
  level: SeminarQualityLevel;
  message: string;
} {
  if (preflightFailed) {
    return {
      level: "Below Minimum",
      message: IRR_MESSAGES["Below Minimum"],
    };
  }
  let level: SeminarQualityLevel;
  if (total >= 27) level = "High";
  else if (total >= 20) level = "Strong";
  else if (total >= 11) level = "Developing";
  else if (total >= 5) level = "Beginning";
  else level = "Below Minimum";
  return { level, message: IRR_MESSAGES[level] };
}

