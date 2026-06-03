/**
 * Rewrite iwa_high and irr_high test papers to hit target scores.
 * Run: npx tsx scripts/rewrite-word-count-test-papers.ts
 */
import fs from "node:fs";
import path from "node:path";
import { prepareSeminarSubmissionMetrics } from "@/lib/seminar/seminarBodyPrep";
import { gradeIwa, gradeIrr } from "@/lib/seminar";

const DIR = path.join(process.cwd(), "data/seminar/word-count-test-papers");

const IWA_HIGH = `Solitary Confinement and the Cognitive Prerequisites of Rehabilitation
AP Seminar
May 1, 2026
Word Count: 2000

Research Question: Should the United States sharply limit the use of prolonged solitary confinement in state and federal prisons?

The United States confines tens of thousands of people in restricted housing each day, yet policymakers still debate whether isolation is a necessary safety tool or a practice that destroys the very capacities rehabilitation requires. Dr. Sharon Shalev of the Mannheim Centre for Criminology documents hippocampal atrophy among people held in prolonged isolation, establishing a neurological mechanism through which memory and spatial cognition deteriorate (Shalev, 2008). This essay argues that states should cap solitary confinement at fifteen days and invest in alternative housing because the medical and behavioral record shows that extended isolation makes lawful rehabilitation structurally impossible.

Federal prison data from 2020 report that approximately 55,000 individuals occupy restricted housing in U.S. state and federal prisons on any given day. The United Nations Special Rapporteur classifies solitary confinement beyond fifteen days as torture, a standard reinforced by the Nelson Mandela Rules adopted in 2015. Both figures anchor the scale of a policy choice that is not marginal: restricted housing is a mainstream practice with measurable population-level reach, and international human-rights law already treats lengthy isolation as beyond what a decent penal system should tolerate.

Shalev's neurological account explains why memory failures persist after release. When the hippocampus shrinks, people lose the ability to organize experience into durable narrative memory, which is precisely what reentry counseling and vocational training assume a person can do. Shalev frames the finding in clinical terms, yet the legal implication is unmistakable: a state that knowingly imposes hippocampal injury cannot honestly claim that its programming prepares people for community life. Shalev's mechanism is correct, but her framing as a medical problem undersells the legal implication: if the state deliberately deploys a mechanism known to destroy the cognitive prerequisites of its own stated goal, it is not merely failing — it is acting against its own institutional mission. I extend Shalev's medical framing toward a policy conclusion she does not argue explicitly — prolonged isolation is incompatible with any institution that promises rehabilitation rather than mere incapacitation. I push back against the implication that clinical vocabulary alone can guide reform, because this paper argues that legislatures must treat neurological injury as a rights violation rather than a side effect. Shalev does not draw that legal conclusion, yet her evidence compels it when read alongside Haney's institutional findings.

Dr. Craig Haney's behavioral research on Pelican Bay prisoners demonstrates how isolation reshapes social interaction (Haney, 2003). Haney (2018) shows that people held in supermax conditions develop hypersensitivity, emotional flatness, and distrust that follow them into general population and, eventually, into communities. In the third major section of this argument, Haney supplies the behavioral mechanism that complements Shalev's structural account: even when brain scans are unavailable, correctional staff can observe the social dysfunction isolation produces. The damage is visible in every hesitant conversation after release. Grassian (2006) adds psychiatric evidence that sensory deprivation produces acute symptoms that deepen when isolation persists, which means that medical, behavioral, and psychiatric records converge on the same policy warning.

The tension between Shalev's neurological account and Haney's behavioral account is not a contradiction — it is a convergence on the same conclusion from two evidentiary directions. Together, they establish something neither establishes alone: the damage is both structural and functional, both inside the skull and visible in every social interaction after release. Evaluative synthesis matters here because policymakers often treat medical and psychological testimony as interchangeable background; these sources are complementary lenses on one harm.

Correctional administrators contend that restricted housing remains essential to manage violent offenders and prevent assaults on staff. While this argument is compelling, the administrators' safety claim assumes that isolation is the only scalable tool when prisons lack mental-health resources. This view has been challenged by Haney's Pelican Bay institutional data, which found that violence rates do not fall simply because difficult prisoners disappear into supermax units; instead, prisons export dysfunction back into general population. Rebutting that claim requires answering the safety argument directly and answering its safety claim with institutional evidence rather than moral abstraction alone.

Extended isolation undermines the cognitive prerequisites of rehabilitation because it destroys the memory systems reentry programs require and the social capacities employers require. Step-down units with daily programming, mental-health staffing, and judicial review before any extension beyond fifteen days would preserve safety without treating human beings as problems to be stored. Furthermore, states that continue supermax warehousing transfer the cost of dysfunction to communities that receive people who can no longer learn, plan, or trust at the moment they need those capacities most.

In answer to the research question, the United States must sharply limit prolonged solitary confinement by adopting a fifteen-day ceiling, funding step-down units with daily programming, and requiring judicial review before any extension. The evidence establishes that unlimited isolation is neurologically and behaviorally incompatible with rehabilitation. Therefore, Congress and state legislatures must treat supermax warehousing as a failed policy rather than a default administrative tool.

Shalev confirms the mechanism in the introduction's neurological frame, Haney confirms the social mechanism in the counterargument section, and both sources together confirm in the conclusion that rehabilitation policy cannot coexist with unlimited isolation. This analysis has shown that the damage is cumulative, measurable, and preventable through shorter isolation limits paired with programming that rebuilds memory and trust rather than assuming they will return on their own.

Correctional systems that promise rehabilitation while operating supermax warehouses impose a contradiction that no training manual can resolve. When policymakers ask whether isolation is necessary, they should ask instead whether a state may deliberately impair the capacities its own statutes claim to restore. The scale of restricted housing documented in 2020 federal data demonstrates that the practice is routine, which means reform would affect mainstream operations rather than marginal exceptions.

International standards already classify lengthy isolation as torture; domestic law should align practice with that recognition by capping duration and funding alternatives. Haney (2018) documents how systems can reduce time-in-cell when policymakers fund step-down housing rather than defaulting to supermax expansion, and Shalev (2008) confirms that shorter limits remain compatible with institutional safety when programming replaces deprivation. Scholars who study psychiatric injury, behavioral collapse, and neurological atrophy do not disagree about direction — they disagree only about which vocabulary best describes the same harm. This paper uses that convergence to argue that policy must change even when political incentives favor containment over care.

Reentry counselors report that memory failures and social withdrawal persist long after release because the brain and the social self were injured together. Employers who hire formerly incarcerated people need workers who can follow multi-step instructions and tolerate supervision; isolation trains the opposite habits. Judicial review before extensions would force institutions to justify continued harm rather than treating isolation as an automatic default.

The Nelson Mandela Rules and domestic professional standards already signal that lengthy isolation is illegitimate; what remains missing is enforcement inside state systems that treat supermax beds as ordinary capacity. A fifteen-day ceiling would not eliminate discipline, but it would force institutions to use programming, mental-health intervention, and step-down housing rather than indefinite sensory deprivation.

If legislators accept Shalev's neurological evidence and Haney's behavioral evidence as complementary rather than competing, they can design policy that protects staff without annihilating the minds rehabilitation requires. The answer to whether the United States should sharply limit prolonged solitary confinement is therefore yes — not because isolation feels cruel, but because it makes the stated mission of corrections impossible to perform in good faith.

Works Cited
Haney, C. (2003). Mental health issues in long-term solitary and "supermax" confinement. Crime & Delinquency, 49(1), 124–156. https://doi.org/10.1177/0011128702250999

Haney, C. (2018). The psychological effects of solitary confinement: A systematic critique. Annual Review of Criminology, 1(1), 365–390. https://doi.org/10.1146/annurev-criminol-032317-092900

Shalev, S. (2008). The psychological effects of solitary confinement: A critical overview. Mannheim Centre for Criminology Monograph. University of Oxford.

Grassian, S. (2006). Psychiatric effects of solitary confinement. Washington University Journal of Law & Policy, 22, 325–383.

Bureau of Justice Statistics. (2020). Use of restrictive housing in U.S. prisons and jails, 2011–12. U.S. Department of Justice. https://bjs.ojp.gov

United Nations General Assembly. (2015). United Nations Standard Minimum Rules for the Treatment of Prisoners (the Nelson Mandela Rules). A/RES/70/175.

Association of State Correctional Administrators & Liman Center. (2016). Aiming to reduce time-in-cell: Reports from correctional systems on changes in disciplinary segregation. Yale Law School.`;

const IRR_HIGH = `Effects of Solitary Confinement on Juvenile Neurological Development
AP Seminar
May 1, 2026

Research Question: How does solitary confinement during adolescence affect neurological development in the United States?

This investigation examines whether juvenile isolation in U.S. facilities alters developing brains during a critical window. The Annie E. Casey Foundation (2021) reports that more than 3,000 juveniles experience isolation on a typical day, a figure that ties directly to the research question because it establishes that the practice is neither rare nor experimental.

Jensen (2015), a developmental neuroscientist published in Cerebrum, establishes that prefrontal circuitry remains plastic into the mid-twenties, which means that punitive environments can leave durable traces during adolescence. Jensen found that adolescent synaptic pruning accelerates risk processing because the prefrontal cortex is still constructing regulatory pathways, suggesting that isolation during adolescence may produce more severe impairment than equivalent harm to adult prisoners. Perry (2009), a trauma psychiatrist published in the Journal of Loss and Trauma, found that stress hormones spike during isolation because sensory deprivation removes social inputs that normally regulate threat response, indicating that the mechanism operates through biological stress pathways rather than through punishment alone.

Jensen establishes the developmental vulnerability; Perry establishes the mechanism through which isolation exploits that vulnerability. Together they produce a finding this report can now state explicitly: solitary confinement during adolescence does not merely punish — it shapes the developing brain during a critical window in ways that impair the very capacities rehabilitation depends on. The analysis reviewed here moves beyond summary because each claim explains why the pattern matters for policy rather than restating what a single author said.

Haney (2003) documents behavioral dysfunction among adults held in supermax conditions, and Steinberg (2008), published in Developmental Review, explains why adolescents are uniquely susceptible to peer influence and regulatory failure. The U.S. Department of Justice (2016) guidelines acknowledge special protections for juveniles, yet the Casey Foundation statistic shows that isolation remains routine. Most evidence is observational rather than experimental, which limits causal inference; this limitation is important because policymakers must weigh converging observational studies rather than demanding a randomized trial that ethics would forbid.

Jensen's framework and Perry's framework represent different disciplinary approaches to the same phenomenon — developmental neuroscience and trauma psychiatry respectively — and their convergence across different methodological traditions strengthens the finding beyond what either alone could establish. Reading Jensen alongside Perry, this investigation finds that biological vulnerability and trauma mechanism together suggest that juvenile isolation is neurologically contraindicated except during immediate safety emergencies measured in minutes, not days.

Perspective evaluation requires explicit synthesis across disciplines. Developmental neuroscience and trauma psychiatry converge: Jensen explains why the brain is vulnerable, Perry explains how isolation becomes neurobiological injury, and Haney demonstrates what behavioral dysfunction looks like after release. Multi-disciplinary convergence is not decorative; it answers the research question with mechanisms rather than slogans. The tension between developmental and trauma frameworks cannot be attributed to a single cause because both operate simultaneously during adolescence.

This investigation used a systematic review of longitudinal and clinical studies to compare mechanisms across sources. Steinberg found that adolescents process peer cues differently because regulatory circuits are incomplete, which means that isolation removes the very social inputs required to finish constructing self-control. Perry's trauma model overturning the assumption that isolation is merely unpleasant implies that the state is shaping stress systems during a sensitive period. Haney's institutional evidence works by documenting how behavioral collapse follows release even when neurological scans are unavailable to clinicians in court.

The answer to this investigation's research question is specific: solitary confinement substantially impairs juvenile neurological development through Jensen's identified developmental vulnerability and Perry's documented trauma mechanism, with effects that are more severe and less reversible than equivalent harm to adult prisoners because they occur during the active construction of prefrontal cortical circuits. The policy implication is direct: any duration of solitary confinement beyond an immediate safety emergency is neurologically contraindicated for juvenile populations. Therefore, state juvenile systems must ban multi-day isolation and fund step-down units with education, family contact, and trauma-informed care.

This investigation concludes that juvenile solitary confinement should be banned except during immediate safety crises lasting minutes, not days. The evidence reviewed here supports step-down models with education and family contact. The analysis reveals that neurological development and rehabilitation policy point in the same direction: isolation is incompatible with the stated goals of juvenile corrections. In response to the research question, policymakers should treat adolescent brains as under construction rather than as finished organs that can withstand the same conditions as adult populations.

Facilities that isolate juveniles for discipline rather than immediate safety transfer developmental risk to communities that will receive young people whose regulatory circuits were shaped in deprivation. Clinicians who treat trauma report that stress systems trained in isolation remain hyper-reactive long after release, which means that education and therapy must repair biological patterns, not merely change attitudes. Jensen's synaptic pruning account and Perry's hormone account therefore converge on the same operational conclusion even though they use different disciplinary vocabularies.

Correctional administrators sometimes argue that isolation protects staff and other youths from violence, yet Steinberg's research on peer influence suggests that prolonged deprivation worsens impulsive behavior once youths return to general population. The Department of Justice (2016) standards acknowledge heightened vulnerability, but acknowledgment without enforcement leaves thousands of juveniles in isolation daily according to the Casey Foundation (2021). This report argues that enforcement requires statutory ceilings measured in hours for emergencies and days only when courts approve extensions with documented safety records.

Trauma psychiatrists and developmental neuroscientists rarely publish in the same journals, yet their findings here are mutually reinforcing rather than contradictory. Together, these perspectives suggest that juvenile isolation is not a marginal practice affecting a few exceptional cases but a structural intervention that alters brain development at scale. Future research should continue longitudinal tracking, but the converging evidence is already sufficient to justify immediate policy change.

When legislators ask whether isolation is ever necessary, they should distinguish immediate separation to stop violence from multi-day sensory deprivation that removes education, family contact, and therapeutic programming. The former may be unavoidable; the latter reshapes developing brains during the window when rehabilitation programs assume learning is still possible. This distinction is not semantic — it is the difference between safety management and developmental injury.

Reading Haney alongside Jensen clarifies that behavioral collapse after release is not merely a social problem but a predictable consequence of environments that removed inputs required to finish building self-regulation. Perry's trauma mechanism explains why those consequences persist as biological stress patterns rather than as attitudes youths could simply choose to change. The combined weight of these perspectives therefore supports banning multi-day juvenile isolation as a default disciplinary tool.

References
Annie E. Casey Foundation. (2021). Maltreatment of youth in U.S. juvenile corrections facilities. https://www.aecf.org

Jensen, F. (2015). The teenage brain: A neuroscientist's survival guide. HarperCollins.

Jensen, F. (2011). Brain development in adolescence. Cerebrum, 2011(4), 12.

Perry, B. D. (2009). Examining child maltreatment through a neurodevelopmental lens. Journal of Loss and Trauma, 14(4), 240–255. https://doi.org/10.1080/15325020903004341

Haney, C. (2003). Mental health issues in long-term solitary confinement. Crime & Delinquency, 49(1), 124–156. https://doi.org/10.1177/0011128702250999

Steinberg, L. (2008). A social neuroscience perspective on adolescent risk-taking. Developmental Review, 28(1), 78–106. https://doi.org/10.1016/j.dr.2007.08.002

U.S. Department of Justice. (2016). Report on restrictive housing. Office of Justice Programs.`;

function trimToBand(text: string, min: number, max: number): string {
  let t = text;
  let body = prepareSeminarSubmissionMetrics(t).bodyWordCount;
  const pad =
    "Correctional policy must align practice with converging neurological and behavioral evidence when legislators evaluate isolation duration. ";
  while (body < min) {
    const idx = t.indexOf("\n\nWorks Cited") > 0 ? t.indexOf("\n\nWorks Cited") : t.indexOf("\n\nReferences");
    const insert = `\n\n${pad}`;
    t = t.slice(0, idx) + insert + t.slice(idx);
    body = prepareSeminarSubmissionMetrics(t).bodyWordCount;
  }
  while (body > max) {
    const parts = t.split(/\n\n/);
    if (parts.length < 8) break;
    parts.splice(-3, 1);
    t = parts.join("\n\n");
    body = prepareSeminarSubmissionMetrics(t).bodyWordCount;
  }
  return t;
}

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
    for (const chunk of line.match(/.{1,95}/g) ?? [line]) {
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
    draw(t, /^(Works Cited|References|Sources)$/i.test(t));
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(await doc.save()));
}

async function main(): Promise<void> {
  let iwa = trimToBand(IWA_HIGH, 1800, 2200);
  let irr = trimToBand(IRR_HIGH, 1080, 1320);
  fs.writeFileSync(path.join(DIR, "iwa_high_scoring.txt"), iwa, "utf8");
  fs.writeFileSync(path.join(DIR, "irr_high_scoring.txt"), irr, "utf8");
  await writePdf(path.join(DIR, "pdfs", "iwa_high_scoring.pdf"), iwa);
  await writePdf(path.join(DIR, "pdfs", "irr_high_scoring.pdf"), irr);

  const iwaR = gradeIwa(iwa);
  const irrR = gradeIrr(irr);
  console.log(
    "iwa_high:",
    prepareSeminarSubmissionMetrics(iwa).bodyWordCount,
    "words, total",
    iwaR.total,
    iwaR.rows.map((r) => r.score).join("+"),
  );
  console.log(
    "irr_high:",
    prepareSeminarSubmissionMetrics(irr).bodyWordCount,
    "words, total",
    irrR.total,
    irrR.rows.map((r) => r.score).join("+"),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
