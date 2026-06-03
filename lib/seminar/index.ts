import { gradeIwa, iwaGradeToApiReport } from "@/lib/seminar/iwaGrader";
import { gradeIrr, irrGradeToApiReport } from "@/lib/seminar/irrGrader";
import type {
  IwaGradeOptions,
  SeminarGradeResult,
  SeminarTask,
} from "@/lib/seminar/seminarTypes";

export { gradeIwa, iwaGradeToApiReport } from "@/lib/seminar/iwaGrader";
export { gradeIrr, irrGradeToApiReport } from "@/lib/seminar/irrGrader";
export {
  SEMINAR_GRADER_VERSION,
  SEMINAR_DISCLAIMER,
} from "@/lib/seminar/seminarTypes";
export type {
  IwaGradeOptions,
  SeminarGradeResult,
  SeminarTask,
} from "@/lib/seminar/seminarTypes";

export function gradeSeminarPaper(
  text: string,
  task: SeminarTask,
  options?: IwaGradeOptions,
): SeminarGradeResult {
  return task === "iwa" ? gradeIwa(text, options) : gradeIrr(text, options);
}

export function seminarGradeToApiReport(result: SeminarGradeResult) {
  return result.task === "iwa"
    ? iwaGradeToApiReport(result)
    : irrGradeToApiReport(result);
}
