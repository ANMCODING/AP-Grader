/**
 * Functional region detection for AP Seminar IWA and IRR (heading + content fingerprint).
 */

import { citationsInSentence } from "@/lib/grader/citations";
import { countWords } from "@/lib/grader/text";

export type IwaRegionRole =
  | "introduction"
  | "perspectiveBody"
  | "argumentBody"
  | "counterclaim"
  | "conclusion"
  | "bibliography"
  | "unknown";

export type IrrRegionRole =
  | "introduction"
  | "thematicBody"
  | "sourceEvaluation"
  | "conclusion"
  | "bibliography"
  | "unknown";

export interface SeminarRegionBlock {
  heading: string;
  body: string;
  start: number;
  end: number;
  role: IwaRegionRole | IrrRegionRole;
}

export interface IwaFunctionalRegions {
  introduction: string;
  perspectiveBody: string;
  argumentBody: string;
  counterclaim: string;
  conclusion: string;
  blocks: SeminarRegionBlock[];
  regionsLocatedByHeading: boolean;
  citationDensityByRegion: Record<string, number>;
}

export interface IrrFunctionalRegions {
  introduction: string;
  thematicBodies: string[];
  sourceEvaluation: string;
  conclusion: string;
  blocks: SeminarRegionBlock[];
  regionsLocatedByHeading: boolean;
  citationDensityByRegion: Record<string, number>;
}

const IWA_HEADING_ALIASES: { role: IwaRegionRole; patterns: RegExp[] }[] = [
  {
    role: "introduction",
    patterns: [
      /^introduction$/i,
      /^context$/i,
      /^background$/i,
      /^opening$/i,
      /^overview$/i,
    ],
  },
  {
    role: "conclusion",
    patterns: [
      /^conclusion$/i,
      /^closing$/i,
      /^final thoughts$/i,
      /^in conclusion$/i,
    ],
  },
  {
    role: "counterclaim",
    patterns: [
      /^counter(?:claim|argument)?$/i,
      /^rebuttal$/i,
      /^alternative (?:view|perspective)$/i,
      /^objections?$/i,
    ],
  },
  {
    role: "perspectiveBody",
    patterns: [
      /^perspectives?$/i,
      /^multiple perspectives$/i,
      /^literature$/i,
      /^sources$/i,
      /^analysis of sources$/i,
    ],
  },
];

const IRR_HEADING_ALIASES: { role: IrrRegionRole; patterns: RegExp[] }[] = [
  {
    role: "introduction",
    patterns: [/^introduction$/i, /^context$/i, /^overview$/i],
  },
  {
    role: "conclusion",
    patterns: [/^conclusion$/i, /^synthesis$/i, /^summary$/i],
  },
  {
    role: "thematicBody",
    patterns: [
      /^organizational\b/i,
      /^social\b/i,
      /^individual\b/i,
      /^economic\b/i,
      /^political\b/i,
      /^cultural\b/i,
      /^environmental\b/i,
      /^factor\b/i,
      /^theme\b/i,
      /^lens\b/i,
    ],
  },
  {
    role: "sourceEvaluation",
    patterns: [
      /^source evaluation$/i,
      /^evaluating sources$/i,
      /^credibility$/i,
    ],
  },
];

function splitBlocks(bodyText: string): { heading: string; body: string; start: number; end: number }[] {
  const lines = bodyText.split("\n");
  const blocks: { heading: string; body: string; start: number; end: number }[] = [];
  let currentHeading = "";
  let chunk: string[] = [];
  let charPos = 0;
  let blockStart = 0;

  const flush = (endPos: number) => {
    if (chunk.length > 0 || currentHeading) {
      blocks.push({
        heading: currentHeading,
        body: chunk.join("\n").trim(),
        start: blockStart,
        end: endPos,
      });
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const isHeading =
      trimmed.length > 0 &&
      trimmed.length < 80 &&
      /^[A-Z][A-Za-z0-9\s,'\-:()]+$/.test(trimmed) &&
      !/[.!?]$/.test(trimmed) &&
      countWords(trimmed) <= 12;

    if (isHeading && chunk.length > 0) {
      flush(charPos);
      currentHeading = trimmed;
      chunk = [];
      blockStart = charPos;
    } else if (isHeading && chunk.length === 0) {
      currentHeading = trimmed;
      blockStart = charPos;
    } else {
      chunk.push(line);
    }
    charPos += line.length + 1;
  }
  flush(charPos);
  return blocks;
}

function classifyIwaHeading(heading: string): IwaRegionRole {
  const h = heading.trim();
  for (const { role, patterns } of IWA_HEADING_ALIASES) {
    if (patterns.some((p) => p.test(h))) return role;
  }
  return "unknown";
}

function classifyIrrHeading(heading: string): IrrRegionRole {
  const h = heading.trim();
  for (const { role, patterns } of IRR_HEADING_ALIASES) {
    if (patterns.some((p) => p.test(h))) return role;
  }
  return "unknown";
}

function citationDensityPer150Words(text: string): number {
  const words = countWords(text);
  if (words < 50) return 0;
  const cites = citationsInSentence(text).length;
  return (cites / words) * 150;
}

function fingerprintIwaRegion(body: string, position: "start" | "middle" | "end"): IwaRegionRole {
  const density = citationDensityPer150Words(body);
  const hasSynthesis = /\b(?:tension between|taken together|while .+ argues)\b/i.test(body);
  const hasThesis =
    /\b(?:I argue|this (?:paper|essay) argues|therefore,|must be|should be)\b/i.test(body);
  const hasRqAnswer = /\b(?:in conclusion|ultimately|to answer|research question)\b/i.test(body);

  if (position === "end" && (hasRqAnswer || density < 0.8)) return "conclusion";
  if (position === "start" && density < 1.2) return "introduction";
  if (hasSynthesis && density >= 1.5) return "perspectiveBody";
  if (hasThesis && density >= 1) return "argumentBody";
  if (/\b(?:however|one might object|counter)\b/i.test(body)) return "counterclaim";
  if (density >= 2) return "perspectiveBody";
  return "argumentBody";
}

function fingerprintIrrRegion(body: string, position: "start" | "middle" | "end"): IrrRegionRole {
  const density = citationDensityPer150Words(body);
  const hasMethodology =
    /\b(?:surveyed|systematic review|analyzed|conducted|examined|based on \d+)\b/i.test(body);
  const hasCredibility =
    /\b(?:peer-?reviewed|bias|credib|limitation|professor|Ph\.?D)\b/i.test(body);
  const hasPreview =
    /\bthis (?:report|investigation) (?:examines|explores|analyzes)\b/i.test(body);

  if (position === "start" && (hasPreview || density < 1.5)) return "introduction";
  if (position === "end" && density < 2) return "conclusion";
  if (hasCredibility && !hasMethodology) return "sourceEvaluation";
  if (hasMethodology || density >= 2.5) return "thematicBody";
  return "thematicBody";
}

export function identifyIwaRegions(bodyText: string): IwaFunctionalRegions {
  const rawBlocks = splitBlocks(bodyText);
  let regionsLocatedByHeading = rawBlocks.some(
    (b) => b.heading && classifyIwaHeading(b.heading) !== "unknown",
  );

  const mapped = rawBlocks.map((b, i, arr) => {
    const pos = i === 0 ? "start" : i === arr.length - 1 ? "end" : "middle";
    const fromHeading = b.heading ? classifyIwaHeading(b.heading) : "unknown";
    const role: IwaRegionRole =
      fromHeading !== "unknown" ? fromHeading : fingerprintIwaRegion(b.body, pos);
    return { ...b, role };
  });

  if (mapped.length <= 1 && bodyText.length > 400) {
    regionsLocatedByHeading = false;
    const introEnd = Math.min(countWords(bodyText) * 4, 1200);
    const conclStart = Math.max(bodyText.length - 1500, introEnd);
    return {
      introduction: bodyText.slice(0, introEnd),
      perspectiveBody: bodyText.slice(introEnd, Math.floor(bodyText.length * 0.65)),
      argumentBody: bodyText.slice(introEnd, Math.floor(bodyText.length * 0.75)),
      counterclaim: "",
      conclusion: bodyText.slice(conclStart),
      blocks: [],
      regionsLocatedByHeading: false,
      citationDensityByRegion: {
        introduction: citationDensityPer150Words(bodyText.slice(0, introEnd)),
        body: citationDensityPer150Words(bodyText.slice(introEnd, conclStart)),
        conclusion: citationDensityPer150Words(bodyText.slice(conclStart)),
      },
    };
  }

  const pick = (role: IwaRegionRole) =>
    mapped
      .filter((b) => b.role === role)
      .map((b) => b.body)
      .join("\n\n");

  const unknownBodies = mapped.filter((b) => b.role === "unknown").map((b) => b.body);
  const argumentBody =
    pick("argumentBody") || unknownBodies.join("\n\n") || bodyText.slice(400);

  return {
    introduction: pick("introduction") || bodyText.slice(0, 1200),
    perspectiveBody: pick("perspectiveBody") || bodyText,
    argumentBody,
    counterclaim: pick("counterclaim"),
    conclusion: pick("conclusion") || bodyText.slice(-1500),
    blocks: mapped.map((b) => ({
      heading: b.heading,
      body: b.body,
      start: b.start,
      end: b.end,
      role: b.role,
    })),
    regionsLocatedByHeading,
    citationDensityByRegion: Object.fromEntries(
      mapped.map((b) => [b.role, citationDensityPer150Words(b.body)]),
    ),
  };
}

export function identifyIrrRegions(bodyText: string): IrrFunctionalRegions {
  const rawBlocks = splitBlocks(bodyText);
  const regionsLocatedByHeading = rawBlocks.some(
    (b) => b.heading && classifyIrrHeading(b.heading) !== "unknown",
  );

  const mapped = rawBlocks.map((b, i, arr) => {
    const pos = i === 0 ? "start" : i === arr.length - 1 ? "end" : "middle";
    const fromHeading = b.heading ? classifyIrrHeading(b.heading) : "unknown";
    const role: IrrRegionRole =
      fromHeading !== "unknown" ? fromHeading : fingerprintIrrRegion(b.body, pos);
    return { ...b, role };
  });

  const pick = (role: IrrRegionRole) =>
    mapped
      .filter((b) => b.role === role)
      .map((b) => b.body);

  return {
    introduction: pick("introduction").join("\n\n") || bodyText.slice(0, 900),
    thematicBodies:
      pick("thematicBody").length > 0
        ? pick("thematicBody")
        : [bodyText.slice(900, Math.max(900, bodyText.length - 1200))],
    sourceEvaluation: pick("sourceEvaluation").join("\n\n"),
    conclusion: pick("conclusion").join("\n\n") || bodyText.slice(-1200),
    blocks: mapped.map((b) => ({
      heading: b.heading,
      body: b.body,
      start: b.start,
      end: b.end,
      role: b.role,
    })),
    regionsLocatedByHeading,
    citationDensityByRegion: Object.fromEntries(
      mapped.map((b) => [b.role, citationDensityPer150Words(b.body)]),
    ),
  };
}
