import { countWords } from "@/lib/grader/text";
import { isGraphSynthesisTopic, topicForPaperIndex, type SyntheticTopic } from "@/lib/synthetic/topics";
import type { SyntheticPaperManifest } from "@/lib/synthetic/types";

const AUTHORS = [
  "Smith, J.", "Jones, A.", "Williams, R.", "Brown, K.", "Davis, L.",
  "Miller, T.", "Wilson, E.", "Moore, C.", "Taylor, P.", "Anderson, H.",
  "Thomas, M.", "Jackson, S.", "White, D.", "Harris, N.", "Martin, L.",
];

function padSection(body: string, minWords: number, topic: SyntheticTopic, seed: number): string {
  let out = body.trim();
  let i = seed;
  while (countWords(out) < minWords) {
    out += `\n\nPrior work on ${topic.description} reports mixed findings (${AUTHORS[i % AUTHORS.length]}, ${2016 + (i % 8)}). `;
    out += `The study design and sample characteristics varied across contexts (${AUTHORS[(i + 2) % AUTHORS.length]}, ${2018 + (i % 5)}).`;
    i++;
  }
  return out;
}

function coverBlock(title: string, wordCount: number): string {
  const rounded = Math.round(wordCount / 100) * 100;
  return [
    title,
    "AP Research",
    "April 2025",
    `Word Count: approximately ${rounded.toLocaleString()}`,
    "",
  ].join("\n");
}

function refsBlock(entries: string[]): string {
  return `References\n\n${entries.join("\n\n")}`;
}

function buildRefs(n: number, topic: SyntheticTopic, websites = 0): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = AUTHORS[i % AUTHORS.length].replace(".", "");
    if (i < websites) {
      out.push(`${topic.slug} Resource (${2022 + i}). Overview of ${topic.description}. https://example.org/${topic.slug}/${i}`);
    } else {
      out.push(`${a} (${2014 + (i % 10)}). Research on ${topic.description}. Journal of Applied Studies, ${8 + i}(${i + 1}), ${100 + i * 4}-${108 + i * 4}. https://doi.org/10.1000/${topic.slug}.${i}`);
    }
  }
  return out;
}

export function paperFileName(score: number, paperNum: number): string {
  return `score${score}-paper-${String(paperNum).padStart(3, "0")}.txt`;
}

export function buildScore1Paper(topic: SyntheticTopic, paperNum: number): { text: string; manifest: SyntheticPaperManifest } {
  const title = `Understanding ${topic.description.split(" and ")[0]}`;
  const intro = padSection(
    `This paper will explore why ${topic.description} is important for society. This is a serious problem that needs attention from educators and policymakers.`,
    220,
    topic,
    paperNum,
  );
  const litParts: string[] = [];
  for (let i = 0; i < 6; i++) {
    litParts.push(
      padSection(
        `${AUTHORS[i % AUTHORS.length]} (${2015 + i}) examined ${topic.description} in one regional sample and reported descriptive trends without connecting findings to other studies.`,
        90,
        topic,
        paperNum + i,
      ),
    );
  }
  const lit = litParts.join("\n\n");
  const conclusion = padSection(
    `In conclusion, the literature shows that ${topic.description} matters. Schools and communities should pay more attention to this issue.`,
    200,
    topic,
    paperNum + 10,
  );
  const body = [
    "Introduction\n\n" + intro,
    "Literature Review\n\n" + lit,
    "Conclusion\n\n" + conclusion,
  ].join("\n\n");
  const refs = refsBlock(buildRefs(3, topic, 2));
  const text = `${coverBlock(title, countWords(body))}${body}\n\n\n${refs}\n`;
  return {
    text,
    manifest: {
      file: paperFileName(1, paperNum),
      expectedAP: 1,
      expectedBand: "Low 1",
      note: "Advocacy only, no RQ, no method/results, isolated lit summaries",
      plannedNonExecution: false,
      lacksStudentData: true,
      futureTenseMethod: false,
      synthesizedGraphsOnly: false,
      expectedCaps: ["no-student-data", "lit-review-only"],
    },
  };
}

export function buildScore2Paper(topic: SyntheticTopic, paperNum: number): { text: string; manifest: SyntheticPaperManifest } {
  const title = `A Study of ${topic.description}`;
  const rq = `How does ${topic.description.split(" in ")[0]} affect outcomes in high school students?`;
  let methodBlock: string;
  let expectedCaps: string[];
  if (paperNum <= 7) {
    methodBlock =
      "There will be no actual experiment conducted by the author of this research paper, therefore the participant pool will be zero. All data will be extracted from outside credible sources.";
    expectedCaps = ["no-student-data", "hard-non-execution"];
  } else if (paperNum <= 14) {
    methodBlock =
      "Surveys will be distributed to participants in the coming months. Data will be gathered from a convenience sample. Interviews will be conducted with volunteers if time permits.";
    expectedCaps = ["no-student-data", "future-tense-method"];
  } else {
    methodBlock =
      "I want to use the action research method because it seems most appropriate for this context. The Delphi method will most likely be used as an extension after the initial survey phase.";
    expectedCaps = ["no-student-data", "future-tense-method"];
  }
  const intro = padSection(`Research Question: ${rq}\n\nThis paper addresses ${topic.description}.`, 200, topic, paperNum);
  const lit = padSection(
    `Prior studies report associations (${AUTHORS[0]}, 2017; ${AUTHORS[1]}, 2019). No study has examined this topic in the present population.`,
    350,
    topic,
    paperNum + 1,
  );
  const method = padSection(methodBlock, 200, topic, paperNum + 2);
  const findings = padSection(
    `Findings from prior research indicate a mean difference of 12 percent (p < .05) in one national dataset (${AUTHORS[2]}, 2020). Another study reported 34 percent prevalence (${AUTHORS[3]}, 2018). These statistics are quoted from published sources; no student-collected data were analyzed.`,
    280,
    topic,
    paperNum + 3,
  );
  const conclusion = padSection("This planned synthesis will summarize secondary statistics.", 120, topic, paperNum + 4);
  const body = [
    "Introduction\n\n" + intro,
    "Literature Review\n\n" + lit,
    "Method\n\n" + method,
    "Findings\n\n" + findings,
    "Conclusion\n\n" + conclusion,
  ].join("\n\n");
  const refs = refsBlock(buildRefs(10, topic, 1));
  const text = `${coverBlock(title, countWords(body))}${body}\n\n\n${refs}\n`;
  return {
    text,
    manifest: {
      file: paperFileName(2, paperNum),
      expectedAP: 2,
      expectedBand: "Low 2",
      note: "Future-tense method, secondary findings only",
      plannedNonExecution: true,
      lacksStudentData: true,
      futureTenseMethod: true,
      synthesizedGraphsOnly: false,
      expectedCaps,
    },
  };
}

export function buildScore3Paper(topic: SyntheticTopic, paperNum: number): { text: string; manifest: SyntheticPaperManifest } {
  const title = `Examining ${topic.description}`;
  const rq = `To what extent does ${topic.description.split(" and ")[0]} relate to the named outcome among high school students at one suburban school?`;
  const intro = padSection(`Research Question: ${rq}`, 220, topic, paperNum);
  const lit = padSection(
    `While prior studies have examined related constructs (${AUTHORS[0]}, 2016; ${AUTHORS[1]}, 2018), no study has directly examined ${topic.description} in this population. ${AUTHORS[2]} (2020) reported descriptive trends that partially overlap.`,
    450,
    topic,
    paperNum + 1,
  );
  const method = padSection(
    `Participants included 42 high school students recruited through convenience sampling at one suburban school. The study used a self-report survey administered in March 2024. Procedure steps included consent, survey administration, and debriefing. Pearson correlation was used for analysis. Data were collected over four weeks.`,
    280,
    topic,
    paperNum + 2,
  );
  const results = padSection(
    `Descriptive statistics showed M = 3.4 (SD = 0.8) on the primary scale. Sixty-two percent of participants reported weekly engagement. Table 1 summarizes frequencies. Figure 1 displays the distribution. No inferential tests were conducted.`,
    260,
    topic,
    paperNum + 3,
  );
  const limitations = padSection(
    `Limitations include a small sample size, single-school convenience sampling, and self-report measures.`,
    80,
    topic,
    paperNum + 4,
  );
  const implications = padSection(
    `Future research should examine this topic in larger samples. Schools should consider these findings when designing programs.`,
    80,
    topic,
    paperNum + 5,
  );
  const conclusion = padSection("This study describes associations using descriptive statistics only.", 200, topic, paperNum + 6);
  const body = [
    "Introduction\n\n" + intro,
    "Literature Review\n\n" + lit,
    "Method\n\n" + method,
    "Results\n\n" + results,
    "Limitations\n\n" + limitations,
    "Implications\n\n" + implications,
    "Conclusion\n\n" + conclusion,
  ].join("\n\n");
  const refs = refsBlock(buildRefs(12, topic));
  const text = `${coverBlock(title, countWords(body))}${body}\n\n\n${refs}\n`;
  return {
    text,
    manifest: {
      file: paperFileName(3, paperNum),
      expectedAP: 3,
      expectedBand: "Mid 3",
      note: "Past-tense method, descriptive results only, asserted gap",
      plannedNonExecution: false,
      lacksStudentData: false,
      futureTenseMethod: false,
      synthesizedGraphsOnly: false,
      expectedCaps: ["asserted-gap", "weak-implications"],
    },
  };
}

export function buildScore4Paper(topic: SyntheticTopic, paperNum: number): { text: string; manifest: SyntheticPaperManifest } {
  const graph = isGraphSynthesisTopic(topic.id);
  const title = graph
    ? `Synthesized Evidence on ${topic.description}`
    : `A Controlled Study of ${topic.description}`;
  const rq = graph
    ? `To what extent do synthesized outcomes across published trials differ for ${topic.description}?`
    : `How does the manipulated independent variable affect ${topic.description} among students aged 15 to 17 at Lincoln High School, measured with the validated Student Engagement Scale (α = .87)?`;
  const intro = padSection(`Research Question: ${rq}`, 250, topic, paperNum);
  const lit = padSection(
    `While Smith (2019) found a positive association, Jones (2021) argues that mechanisms differ by context. Both studies suggest partial overlap but neither examined ${topic.description} with the present operationalization. Williams (2020) and Davis (2022) left moderators unaddressed.`,
    500,
    topic,
    paperNum + 1,
  );
  const method = graph
    ? padSection(
        `I synthesized data from seven published clinical trials and created three original comparison graphs from the synthesized percentages. By creating graphs from these synthesized data points my research will compare treatment arms. Combining percentages from multiple studies to create my own figures was the primary analytic approach.`,
        320,
        topic,
        paperNum + 2,
      )
    : padSection(
        `Forty-eight participants aged 15–17 were recruited using stratified convenience sampling at Lincoln High School. The Student Engagement Scale (α = .84) measured the outcome. IRB approval was obtained. Procedure followed standardized steps across three sessions. A one-way ANOVA tested group differences. Time intervals were two weeks apart. Cohen (1988) supports this design choice.`,
        350,
        topic,
        paperNum + 2,
      );
  const results = graph
    ? padSection(
        `Condition A showed 42 percent improvement versus 28 percent for Condition B, 19 percent for Condition C, and 11 percent for control. Figure 2 compares synthesized rates. These percentages are consistent with Smith (2020) and contrary to Jones (2019) in magnitude.`,
        300,
        topic,
        paperNum + 3,
      )
    : padSection(
        `A one-way ANOVA indicated significant differences, F(2,45) = 6.2, p = .004, partial η² = .22. Post-hoc tests supported the hypothesis. Results are consistent with Smith (2020) and contrary to Jones (2019). Cohen's d = 0.65.`,
        300,
        topic,
        paperNum + 3,
      );
  const limitations = padSection(
    `The correlational design prevents causal conclusions. Selection bias from convenience sampling may limit generalizability.`,
    100,
    topic,
    paperNum + 4,
  );
  const implications = padSection(
    graph
      ? `Pediatric dermatologists treating patients with rare skin conditions should use synthesized graphs when counseling families.`
      : `School counselors designing first-year transition programs should integrate these findings into advisory curricula.`,
    100,
    topic,
    paperNum + 5,
  );
  const conclusion = padSection("This study advances practice with inferential or synthesized comparative evidence.", 120, topic, paperNum + 6);
  const body = [
    "Introduction\n\n" + intro,
    "Literature Review\n\n" + lit,
    "Method\n\n" + method,
    "Results\n\n" + results,
    "Limitations\n\n" + limitations,
    "Implications\n\n" + implications,
    "Conclusion\n\n" + conclusion,
  ].join("\n\n");
  const refs = refsBlock(buildRefs(14, topic));
  const text = `${coverBlock(title, countWords(body))}${body}\n\n\n${refs}\n`;
  return {
    text,
    manifest: {
      file: paperFileName(4, paperNum),
      expectedAP: 4,
      expectedBand: "Low 4",
      note: graph ? "Synthesized graphs from secondary data" : "Full inferential empirical study",
      plannedNonExecution: false,
      lacksStudentData: false,
      futureTenseMethod: false,
      synthesizedGraphsOnly: graph,
      expectedCaps: [],
    },
  };
}

export function buildScore5Paper(topic: SyntheticTopic, paperNum: number): { text: string; manifest: SyntheticPaperManifest } {
  const title = `Advanced Inquiry into ${topic.description}`;
  const rq = `To what extent does the experimental manipulation affect ${topic.description} among students aged 16–18 at Lincoln High School, using the validated Composite Outcome Scale (α = .91) and weekly behavioral logs?`;
  const intro = padSection(`Research Question: ${rq}`, 280, topic, paperNum);
  const lit = padSection(
    `Cognitive psychology traditions emphasize individual mechanisms (Smith, 2014; Jones, 2016), while sociological frameworks foreground institutional context (Williams, 2018; Davis, 2020). While Smith found X, Jones argues Y; both suggest Z but neither examined W with mixed methods. Taylor (2019), Anderson (2021), and Moore (2022) collectively missed interaction effects in this population.`,
    550,
    topic,
    paperNum + 1,
  );
  const method = padSection(
    `Sixty participants were randomly assigned to treatment and control conditions with stratification by grade. The Composite Outcome Scale (α = .89) and behavioral logs were used. IRB approval was obtained. Procedure included pilot testing, training, three waves, and manipulation checks. Independent-samples t-tests and ANCOVA were conducted. Inter-rater reliability was κ = .82. Power analysis targeted d = 0.5. Blinding was single-blind. Randomization followed a computer algorithm. Garcia (2017) defends this design.`,
    400,
    topic,
    paperNum + 2,
  );
  const results = padSection(
    `The treatment group improved significantly, t(58) = 3.8, p < .001, d = 0.95. ANCOVA confirmed the effect, F(1,57) = 12.4, p < .001, η² = .18. A participant stated, "the program changed how I study each week." Post-hoc Tukey tests showed subgroup differences. Regression confirmed β = .42, p < .01, R² = .38.`,
    350,
    topic,
    paperNum + 3,
  );
  const limitations = padSection(
    `Internal validity may be threatened by selection effects. External validity is limited to one suburban school. Construct validity of self-report measures remains debatable. Statistical conclusion validity depends on assumption checks.`,
    120,
    topic,
    paperNum + 4,
  );
  const implications = padSection(
    `Members of the National Association of School Psychologists should integrate these findings into transition programming tied to the demonstrated gap in the literature.`,
    100,
    topic,
    paperNum + 5,
  );
  const conclusion = padSection("This mixed-methods quantitative study answers the RQ with multiple inferential tests and qualitative illustration.", 130, topic, paperNum + 6);
  const body = [
    "Introduction\n\n" + intro,
    "Literature Review\n\n" + lit,
    "Method\n\n" + method,
    "Results\n\n" + results,
    "Limitations\n\n" + limitations,
    "Implications\n\n" + implications,
    "Conclusion\n\n" + conclusion,
  ].join("\n\n");
  const refs = refsBlock(buildRefs(16, topic));
  const text = `${coverBlock(title, countWords(body))}${body}\n\n\n${refs}\n`;
  return {
    text,
    manifest: {
      file: paperFileName(5, paperNum),
      expectedAP: 5,
      expectedBand: "High 5",
      note: "Cross-tradition synthesis, defended method, multiple inferential stats",
      plannedNonExecution: false,
      lacksStudentData: false,
      futureTenseMethod: false,
      synthesizedGraphsOnly: false,
      expectedCaps: [],
    },
  };
}

export function buildPaper(score: number, paperNum: number): { text: string; manifest: SyntheticPaperManifest } {
  const topic = topicForPaperIndex(paperNum);
  switch (score) {
    case 1:
      return buildScore1Paper(topic, paperNum);
    case 2:
      return buildScore2Paper(topic, paperNum);
    case 3:
      return buildScore3Paper(topic, paperNum);
    case 4:
      return buildScore4Paper(topic, paperNum);
    case 5:
      return buildScore5Paper(topic, paperNum);
    default:
      throw new Error(`Invalid score ${score}`);
  }
}
