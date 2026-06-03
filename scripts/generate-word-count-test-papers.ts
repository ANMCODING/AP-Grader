/**
 * Generate six AP Seminar word-count test papers (txt + PDF).
 * Run: npx tsx scripts/generate-word-count-test-papers.ts
 */
import fs from "node:fs";
import path from "node:path";
import { prepareSeminarSubmissionMetrics } from "@/lib/seminar/seminarBodyPrep";

const OUT_TXT = path.join(process.cwd(), "data/seminar/word-count-test-papers");
const OUT_PDF = path.join(OUT_TXT, "pdfs");
const MNT_OUT = "/mnt/user-data/outputs";

function bodyWords(body: string): number {
  return body.split(/\s+/).filter(Boolean).length;
}

function fullDocBodyWords(text: string): number {
  return prepareSeminarSubmissionMetrics(text).bodyWordCount;
}

function toParagraphs(body: string): string {
  return body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}

function padBody(
  body: string,
  target: number,
  filler = "This paragraph extends the report body so bibliographic headings are not misclassified as cover-page metadata when they appear after the first thirty lines of the submission.",
): string {
  let out = toParagraphs(body);
  while (bodyWords(out) < target) {
    out += "\n\n" + filler;
  }
  const words = out.split(/\s+/).filter(Boolean);
  if (words.length > target) {
    const trimmed = words.slice(0, target).join(" ");
    out = toParagraphs(trimmed.match(/.{1,380}(\s|$)/g)?.join("\n\n") ?? trimmed);
  }
  return out;
}

/** Headings like Works Cited in the first 30 lines are stripped as faux author lines. */
function ensureBibliographyAfterLine30(header: string, body: string): string {
  let b = body;
  const filler =
    "Additional context supports the research question by connecting institutional practice to measurable outcomes discussed in the sources cited below.";
  while (`${header}\n\n${b}`.split("\n").length < 32) {
    b = `${filler}\n\n${b}`;
  }
  return b;
}

function wrapIrr(title: string, body: string, refs: string): string {
  return `${title}\nAP Seminar\nMay 1, 2026\n\n${body}\n\nReferences\n${refs}`;
}

const IWA_HIGH_BODY = `
Research Question: Should the United States sharply limit the use of prolonged solitary confinement in state and federal prisons?

The United States confines tens of thousands of people in restricted housing each day, yet policymakers still debate whether isolation is a necessary safety tool or a practice that destroys the very capacities rehabilitation requires. Dr. Sharon Shalev of the Mannheim Centre for Criminology documents hippocampal atrophy among people held in prolonged isolation, establishing a neurological mechanism through which memory and spatial cognition deteriorate (Shalev, 2008). This investigation argues that states should cap solitary confinement at fifteen days and invest in alternative housing because the medical and behavioral record shows that extended isolation makes lawful rehabilitation structurally impossible.

According to the Bureau of Justice Statistics (2020), approximately 55,000 individuals occupy restricted housing in U.S. state and federal prisons on any given day. The United Nations Special Rapporteur classifies solitary confinement beyond fifteen days as torture. Both figures anchor the scale of a policy choice that is not marginal: restricted housing is a mainstream practice with measurable population-level reach, and international human-rights law already treats lengthy isolation as beyond what a decent penal system should tolerate.

Shalev's neurological account explains why memory failures persist after release. When the hippocampus shrinks, people lose the ability to organize experience into durable narrative memory, which is precisely what reentry counseling and vocational training assume a person can do. Shalev frames the finding in clinical terms, yet the legal implication is unmistakable: a state that knowingly imposes hippocampal injury cannot honestly claim that its programming prepares people for community life. I extend Shalev's medical framing toward a policy conclusion she does not state explicitly—prolonged isolation is incompatible with any institution that promises rehabilitation rather than mere incapacitation.

Dr. Craig Haney's behavioral research on Pelican Bay prisoners demonstrates how isolation reshapes social interaction (Haney, 2003). Haney (2018) shows that people held in supermax conditions develop hypersensitivity, emotional flatness, and distrust that follow them into general population and, eventually, into communities. In the third major section of this argument, Haney supplies the behavioral mechanism that complements Shalev's structural account: even when brain scans are unavailable, correctional staff can observe the social dysfunction isolation produces. The damage is visible in every hesitant conversation after release.

The tension between Shalev's neurological account and Haney's behavioral account is not a contradiction — it is a convergence on the same conclusion from two evidentiary directions. Together, they establish something neither establishes alone: the damage is both structural and functional, both inside the skull and visible in every social interaction after release. Evaluative synthesis matters here because policymakers often treat medical and psychological testimony as interchangeable background; these sources are complementary lenses on one harm.

The Association of State Correctional Administrators (ASCA) contends that restricted housing remains essential to manage violent offenders and prevent assaults on staff. ASCA's safety argument assumes that isolation is the only scalable tool when prisons lack mental-health resources. Haney's Pelican Bay institutional data undermines that claim by showing that violence rates do not fall simply because difficult prisoners disappear into supermax units; instead, prisons export dysfunction back into general population. Rebutting ASCA requires naming the organization directly and answering its safety claim with institutional evidence rather than moral abstraction alone.

In conclusion, the United States should adopt a fifteen-day ceiling on solitary confinement, expand step-down units with daily programming, and require judicial review before any extension. Answering the research question affirmatively follows from Shalev's hippocampal evidence, Haney's behavioral record, and the policy failure of treating isolation as a low-cost default. Shalev confirms the mechanism in the introduction's neurological frame, Haney confirms the social mechanism in the counterargument section, and both sources together confirm in the conclusion that rehabilitation policy cannot coexist with unlimited isolation.
`.trim();

const IWA_MID_BODY = `
Research Question: How does fast fashion contribute to environmental harm, and what responsibility do consumers bear?

Fast fashion has transformed clothing from a durable good into a disposable stream of polyester and cotton waste. This essay argues that consumers share responsibility for environmental damage because corporate supply chains respond to demand signals, even though brands obscure their production footprints.

The United Nations Environment Programme reports that the fashion industry produces approximately 10 percent of global carbon emissions. The Ellen MacArthur Foundation estimates that a truckload of textiles is landfilled or incinerated every second. These statistics belong in any serious discussion of the research question because they establish that the harm is measurable and accelerating.

Siegle documents how retailers compress production cycles so that styles move from sketch to shelf in weeks. Bedat emphasizes labor conditions and local pollution near manufacturing zones. Siegle explains that companies rely on synthetic fibers and overseas factories; Bedat explains similar patterns with different emphasis on worker health. Both authors show that speed increases waste, and both authors show that consumers face low prices that hide environmental costs. The similarities and differences are clear, yet the essay does not move beyond description to evaluate which framework better explains consumer complicity.

Some argue that individual behavior is not the problem because only regulation can change multinational supply chains. This counterargument appears without a named institution, and the response mostly repeats that consumers should still buy less. The conclusion restates the thesis that fast fashion harms the environment and that consumers matter, but it does not resolve the tension between structural regulation and personal choice. Commentary throughout tends to echo the sources rather than derive new implications, which limits how fully the argument develops. There are a lot of reasons people keep shopping, and the problem is kind of overwhelming, but it is still really significant for climate policy.
`.trim();

const IWA_LOW_BODY = `
Research Question: Is social media good or bad for society?

Social media is something everyone uses these days, and basically everyone has an opinion about it. This essay will explore both sides of the question so readers can decide for themselves. Both perspectives have valid points, and at the end of the day people need to make their own choices.

Researchers say that social media helps people stay connected. Experts argue that platforms let friends talk across distances. Studies show that groups can organize events quickly. On the other side, researchers say that social media hurts attention spans. Experts argue that bullying happens online. Studies show that people feel worse after scrolling for a long time.

Some people think the benefits outweigh the harms because connection is really important in modern life. Other people think the harms outweigh the benefits because mental health stuff matters a lot. A lot of students use phones during class, which is kind of a problem for schools. Pretty significant changes have happened since apps became popular.

The first perspective emphasizes community and access to information. The second perspective emphasizes anxiety and misinformation. Both perspectives have valid points, and neither side is completely wrong. This essay will explore both sides without picking one winner because the topic is complicated.

In conclusion, social media has good and bad effects. Readers can decide for themselves what to think. The topic remains important, and more research will probably continue. At the end of the day, society will keep using these platforms regardless of any single essay's conclusion.
`.trim();

const IRR_HIGH_BODY = `
Research Question: How does solitary confinement during adolescence affect neurological development in the United States?

This investigation examines whether juvenile isolation in U.S. facilities alters developing brains during a critical window. The Annie E. Casey Foundation (2021) reports that more than 3,000 juveniles experience isolation on a typical day, a figure that ties directly to the research question because it establishes that the practice is neither rare nor experimental.

This report situates juvenile isolation inside developmental neuroscience. Jensen's work on the adolescent brain establishes that prefrontal circuitry remains plastic into the mid-twenties, which means punitive environments can leave durable traces. Perry's trauma research establishes that stress hormones and sensory deprivation reshape neural pathways when experience should be building social cognition. Jensen establishes the developmental vulnerability; Perry establishes the mechanism through which isolation exploits that vulnerability. Together they produce a finding this report can now state explicitly: solitary confinement during adolescence does not merely punish — it shapes the developing brain during a critical window in ways that impair the very capacities rehabilitation depends on.

The analysis reviewed here moves beyond summary. Jensen (2015) and Jensen (2011) supply developmental claims about synaptic pruning and risk processing, while Perry (2009) links trauma psychiatry to institutional practice. Haney (2003) documents behavioral dysfunction among adults held in supermax conditions, and Steinberg (2008) explains why adolescents are uniquely susceptible to peer influence and regulatory failure. U.S. Department of Justice (2016) guidelines acknowledge special protections for juveniles, yet the Casey Foundation statistic shows that isolation remains routine.

Perspective evaluation requires explicit synthesis across disciplines. Developmental neuroscience and trauma psychiatry converge: Jensen explains why the brain is vulnerable, Perry explains how isolation becomes neurobiological injury, and Haney demonstrates what behavioral dysfunction looks like after release. Multi-disciplinary convergence is not decorative; it answers the research question with mechanisms rather than slogans.

Limitations must be acknowledged. Most evidence is observational rather than experimental, which limits causal inference. This report cannot ethically randomize adolescents into isolation, so policymakers must weigh converging observational studies and institutional records.

This investigation concludes that juvenile solitary confinement should be banned except during immediate safety crises lasting minutes, not days. The evidence reviewed here supports step-down models with education and family contact. The analysis reveals that neurological development and rehabilitation policy point in the same direction: isolation is incompatible with the stated goals of juvenile corrections.
`.trim();

const IRR_MID_BODY = `
Research Question: How does recreational screen time affect academic performance among high school students?

This report investigates whether recreational screen use lowers grades. Common Sense Media (2021) reports that teens average more than seven hours of daily entertainment screen time, which suggests the behavior is widespread enough to influence school outcomes.

Twenge (2019) links smartphone adoption to sleep loss and declining grades across large survey cohorts. Przybylski (2019) finds smaller effects when studies control for confounds and uses preregistered designs. Twenge describes correlation patterns; Przybylski describes experimental and quasi-experimental designs with more cautious claims. The body of this report compares the authors: Twenge emphasizes magnitude, Przybylski emphasizes uncertainty, and both agree that heavy use correlates with sleep disruption.

Twenge and Przybylski appear in the same section with comparison language. The report notes that Twenge's samples are broader while Przybylski's methods are tighter, yet the analysis stays close to what each source already says rather than deriving a new framework for principals.

This investigation reviewed survey and experimental evidence. The analysis suggests that screen time may displace homework time, but the report does not test causality directly. Credibility is implied through journal names rather than stated limitations.

In conclusion, the relationship is complex and more research is needed. The report summarizes competing findings without specifying which evidence administrators should trust.
`.trim();

const IRR_LOW_BODY = `
Research Question: What are the causes and effects of climate change?

This report summarizes what scientists say about climate change. NASA explains that carbon dioxide traps heat in the atmosphere. The report describes NASA's account in one section.

The IPCC explains that global temperatures are rising and that weather patterns shift. The report describes the IPCC account in a separate section without comparing the two organizations.

Causes include fossil fuels, deforestation, and industrial emissions. Effects include sea-level rise, stronger storms, and harm to agriculture. Solutions include renewable energy, conservation, and international agreements. Each sentence reports what a source says rather than analyzing mechanisms.

In conclusion, climate change is a serious problem that requires everyone to work together. The topic is really bad for vulnerable communities and kind of a problem for everyone else because a lot of stuff will change.
`.trim();

const PAPERS: {
  file: string;
  build: () => string;
  targetMin: number;
  targetMax: number;
}[] = [
  {
    file: "iwa_high_scoring.txt",
    build: () => {
      const header =
        "Solitary Confinement and the Cognitive Prerequisites of Rehabilitation\nAP Seminar\nMay 1, 2026\nWord Count: 2000";
      const body = ensureBibliographyAfterLine30(
        header,
        padBody(IWA_HIGH_BODY, 1920),
      );
      const bib = `
Haney, C. (2003). Mental health issues in long-term solitary and "supermax" confinement. Crime & Delinquency, 49(1), 124–156. https://doi.org/10.1177/0011128702250999

Haney, C. (2018). The psychological effects of solitary confinement: A systematic critique. Annual Review of Criminology, 1(1), 365–390. https://doi.org/10.1146/annurev-criminol-032317-092900

Shalev, S. (2008). The psychological effects of solitary confinement: A critical overview. Mannheim Centre for Criminology Monograph. University of Oxford.

Grassian, S. (2006). Psychiatric effects of solitary confinement. Washington University Journal of Law & Policy, 22, 325–383.

Bureau of Justice Statistics. (2020). Use of restrictive housing in U.S. prisons and jails, 2011–12. U.S. Department of Justice. https://bjs.ojp.gov

United Nations General Assembly. (2015). United Nations Standard Minimum Rules for the Treatment of Prisoners (the Nelson Mandela Rules). A/RES/70/175.

Association of State Correctional Administrators & Liman Center. (2016). Aiming to reduce time-in-cell: Reports from correctional systems on changes in disciplinary segregation. Yale Law School.
`.trim();
      return `${header}\n\n${body}\n\nWorks Cited\n${bib}`;
    },
    targetMin: 1900,
    targetMax: 2050,
  },
  {
    file: "iwa_mid_scoring.txt",
    build: () => {
      const header = "Fast Fashion and Environmental Harm\nAP Seminar\nMay 1, 2026";
      const body = ensureBibliographyAfterLine30(
        header,
        padBody(IWA_MID_BODY, 1360),
      );
      const bib = `
Siegle, L. (2020). To die for: Is fashion wearing out the world? HarperCollins.

Bedat, M. (2021). Unraveled: The life and death of a garment. Portfolio.

Joyner, A. (2022). Polyester production and microplastic pathways. Nature Reviews Earth & Environment, 3(4), 245–260. https://doi.org/10.1038/s43017-022-00280-1

United Nations Environment Programme. (2019). Fashion and sustainability. UNEP.

Ellen MacArthur Foundation. (2017). A new textiles economy: Redesigning fashion's future.
`.trim();
      return `${header}\n\n${body}\n\nWorks Cited\n${bib}`;
    },
    targetMin: 1350,
    targetMax: 1450,
  },
  {
    file: "iwa_low_scoring.txt",
    build: () => {
      const header = "Social Media: Good or Bad?\nAP Seminar\nMay 1, 2026";
      const body = ensureBibliographyAfterLine30(
        header,
        padBody(IWA_LOW_BODY, 1000),
      );
      const bib = `
Sources
https://www.pewresearch.org/internet/social-media/
https://www.hsph.harvard.edu/news/social-media/
https://www.apa.org/topics/social-media-internet/health
https://www.commonsensemedia.org/research
https://www.bbc.com/future/article/social-media-health
`.trim();
      return `${header}\n\n${body}\n\n${bib}`;
    },
    targetMin: 950,
    targetMax: 1050,
  },
  {
    file: "irr_high_scoring.txt",
    build: () => {
      const header =
        "Effects of Solitary Confinement on Juvenile Neurological Development\nAP Seminar\nMay 1, 2026";
      const body = ensureBibliographyAfterLine30(
        header,
        padBody(IRR_HIGH_BODY, 1215),
      );
      const bib = `
Annie E. Casey Foundation. (2021). Maltreatment of youth in U.S. juvenile corrections facilities. https://www.aecf.org

Jensen, F. (2015). The teenage brain: A neuroscientist's survival guide. HarperCollins.

Jensen, F. (2011). Brain development in adolescence. Cerebrum, 2011(4), 12.

Perry, B. D. (2009). Examining child maltreatment through a neurodevelopmental lens. Journal of Loss and Trauma, 14(4), 240–255. https://doi.org/10.1080/15325020903004341

Haney, C. (2003). Mental health issues in long-term solitary confinement. Crime & Delinquency, 49(1), 124–156. https://doi.org/10.1177/0011128702250999

Steinberg, L. (2008). A social neuroscience perspective on adolescent risk-taking. Developmental Review, 28(1), 78–106. https://doi.org/10.1016/j.dr.2007.08.002

U.S. Department of Justice. (2016). Report on restrictive housing. Office of Justice Programs.
`.trim();
      return `${header}\n\n${body}\n\nReferences\n${bib}`;
    },
    targetMin: 1150,
    targetMax: 1280,
  },
  {
    file: "irr_mid_scoring.txt",
    build: () => {
      const header =
        "Screen Time and Academic Performance Among High School Students\nAP Seminar\nMay 1, 2026";
      const body = ensureBibliographyAfterLine30(
        header,
        padBody(IRR_MID_BODY, 920),
      );
      const bib = `
Common Sense Media. (2021). The Common Sense census: Media use by tweens and teens.

Twenge, J. M. (2019). More time on technology, less happiness? Psychiatric Quarterly, 90(3), 385–398. https://doi.org/10.1007/s11126-019-09634-4

Przybylski, A. K. (2019). Digital screen time limits and young children's psychological well-being. Psychological Science, 30(1), 120–128. https://doi.org/10.1177/0956797619887884

American Academy of Pediatrics. (2016). Media use in school-aged children and adolescents. Pediatrics.

Rideout, V. (2015). The common sense census: Media use by tweens and teens. Common Sense Media.
`.trim();
      return `${header}\n\n${body}\n\nReferences\n${bib}`;
    },
    targetMin: 880,
    targetMax: 960,
  },
  {
    file: "irr_low_scoring.txt",
    build: () => {
      const header = "Climate Change: Causes, Effects, and Solutions\nAP Seminar\nMay 1, 2026";
      const body = ensureBibliographyAfterLine30(
        header,
        padBody(IRR_LOW_BODY, 730),
      );
      const bib = `
Sources
https://climate.nasa.gov
https://www.ipcc.ch/report/ar6/
https://www.epa.gov/climatechange
https://unfccc.int/process-and-meetings/the-paris-agreement
`.trim();
      return `${header}\n\n${body}\n\n${bib}`;
    },
    targetMin: 680,
    targetMax: 780,
  },
];

async function writePdf(filePath: string, text: string): Promise<void> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const pageSize: [number, number] = [612, 792];
  const margin = 56;
  const lineH = 22;
  let page = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  const draw = (line: string, isBold = false) => {
    if (y < margin + lineH) {
      page = doc.addPage(pageSize);
      y = pageSize[1] - margin;
    }
    const chunks = line.match(/.{1,95}/g) ?? [line];
    for (const chunk of chunks) {
      page.drawText(chunk, {
        x: margin,
        y,
        size: isBold ? 13 : 12,
        font: isBold ? bold : font,
        color: rgb(0, 0, 0),
      });
      y -= lineH;
    }
  };

  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) {
      y -= 8;
      continue;
    }
    const heading = /^(Works Cited|References|Sources)$/i.test(t);
    draw(t, heading);
  }
  fs.writeFileSync(filePath, Buffer.from(await doc.save()));
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_TXT, { recursive: true });
  fs.mkdirSync(OUT_PDF, { recursive: true });
  if (!fs.existsSync(MNT_OUT)) {
    try {
      fs.mkdirSync(MNT_OUT, { recursive: true });
    } catch {
      /* optional mount */
    }
  }

  console.log("Generating word-count test papers...\n");
  for (const p of PAPERS) {
    const text = p.build();
    const txtPath = path.join(OUT_TXT, p.file);
    fs.writeFileSync(txtPath, text, "utf8");
    const bodyCount = fullDocBodyWords(text);
    const pdfName = p.file.replace(".txt", ".pdf");
    const pdfPath = path.join(OUT_PDF, pdfName);
    await writePdf(pdfPath, text);
    if (fs.existsSync(MNT_OUT)) {
      fs.copyFileSync(pdfPath, path.join(MNT_OUT, pdfName));
      fs.copyFileSync(txtPath, path.join(MNT_OUT, p.file));
    }
    const ok = bodyCount >= p.targetMin && bodyCount <= p.targetMax;
    console.log(
      `${p.file}: body=${bodyCount} target=${p.targetMin}-${p.targetMax} ${ok ? "OK" : "REGENERATE"}`,
    );
  }
  console.log(`\nWrote txt to ${OUT_TXT}`);
  console.log(`Wrote pdf to ${OUT_PDF}`);
  if (fs.existsSync(MNT_OUT)) console.log(`Copied to ${MNT_OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
