/**
 * Row 1 six-level integration quality scale — synthetic test bodies.
 * Run: npx tsx scripts/test-row1-quality-scale.ts
 */
import { gradeIwa } from "@/lib/seminar/iwaGrader";
import { prepareSeminarSubmissionMetrics } from "@/lib/seminar/seminarBodyPrep";

const MIN_BODY_WORDS = 420;

const FILLER = `This investigation examines digital media and adolescent development through multiple analytical lenses. Scholars have documented shifts in memory, identity, and social behavior linked to platform design. The research question concerns how structural features of social media shape developmental outcomes. Understanding these mechanisms requires empirical findings and theoretical frameworks from psychology and education. The analysis integrates external research to support a sustained argumentative position on policy responses. `;

function padToMinWords(body: string, min = MIN_BODY_WORDS): string {
  let text = body.trim();
  while (prepareSeminarSubmissionMetrics(text).bodyWordCount < min) {
    text += `\n\n${FILLER}`;
  }
  return text;
}

const CASES: { label: string; expected: number; body: string }[] = [
  {
    label: "Test 0 — group nouns only",
    expected: 0,
    body: `Social media is harmful to adolescents. Researchers have found that excessive social media use 
leads to reduced memory accuracy. Studies show that teenagers who spend more than three hours 
daily on social media report lower self-esteem. Experts argue that platforms prioritize engagement 
over user wellbeing. Scientists have documented a link between social media use and identity 
confusion. Evidence suggests that curated content distorts autobiographical memory. Data shows 
that 67% of teenagers report that their feed influences how they remember events. Research 
indicates that the problem is growing. Many scholars agree that regulation is necessary. Policy 
experts contend that platforms must be held accountable. This is a serious problem that requires 
immediate attention. The research is clear. The evidence is overwhelming. Society must act.`,
  },
  {
    label: "Test 1 — single echo citation",
    expected: 1,
    body: `Social media significantly affects how adolescents form their identities and remember their 
experiences. This is a growing crisis that demands attention.

According to Dr. Rachel Simmons of the Adolescent Psychology Institute, adolescents who post 
on Instagram five or more times per week show a 34% reduction in autobiographical memory 
accuracy. This shows that adolescents who post frequently have reduced memory accuracy. 
This demonstrates that social media use reduces how accurately people remember. This confirms 
that heavy Instagram use is associated with worse memory. The research establishes that frequent 
posting harms memory.

Social media platforms must therefore be regulated to protect adolescent development. The 
evidence is clear and the action required is obvious. Regulation is the answer.`,
  },
  {
    label: "Test 2 — basic developing commentary",
    expected: 2,
    body: `Social media significantly distorts how adolescents remember their own lives. This paper argues 
that social media use undermines authentic identity development.

A 2022 study by the Digital Wellness Research Center found that 67% of teenagers aged 13-17 
reported that their social media feed influenced how they remembered past events. This finding 
is significant because it means that the majority of adolescents are experiencing a distortion 
of their personal history. The implication for identity development is specific: if the raw 
material of memory is being filtered before it can be internalized, adolescents are constructing 
a sense of self from unreliable materials. This matters beyond the individual — it affects the 
developmental stage at which identity is formed.

Social media platforms must therefore implement protections for adolescent users. The evidence 
demands action.`,
  },
  {
    label: "Test 3 — Webb two sections",
    expected: 3,
    body: `To what extent does social media use distort adolescent memory and undermine authentic identity 
development? According to Dr. Marcus Webb of the University of Digital Cognition, social media 
highlight reel culture creates false memory consolidation — the brain prioritizes emotionally 
salient curated content over mundane actual experience. This finding establishes the theoretical 
context for this investigation: the mechanism Webb identifies is precisely what makes social media 
distinctive from other media forms. Unlike television or print, social media trains the brain to 
treat performance as more real than experience. Social media use significantly distorts adolescent 
memory formation and prevents the development of an authentic self-concept.

Dr. Webb's research is relevant not only to memory but to the entire architecture of adolescent 
identity. Because the brain is being trained to prioritize curated content, adolescents who are 
in Erikson's identity moratorium — actively exploring possible selves — are doing so with a 
distorted personal archive. The identity they build is not built from what happened; it is built 
from what was shared. This is the deeper implication of Webb's mechanism: it does not just 
distort memory, it distorts the self. Therefore, social media regulation must address the memory 
mechanism Webb identified, not just screen time.`,
  },
  {
    label: "Test 4 — Simmons multi-section strong",
    expected: 4,
    body: `Adolescent identity development depends on an accurate personal memory archive — but social media 
is systematically distorting that archive. Dr. Rachel Simmons of the Adolescent Psychology 
Institute found that adolescents who post on Instagram five or more times per week show a 34% 
reduction in autobiographical memory accuracy compared to low-use peers. This establishes the 
empirical foundation for this paper's thesis: memory distortion is not a side effect of social 
media use — it is a structural feature of how these platforms operate. The question is not whether 
social media distorts memory, but whether society will act on Simmons's documented mechanism. 
Social media use significantly distorts adolescent memory formation and prevents the development 
of an authentic self-concept.

Simmons's finding has a specific implication that Simmons's paper does not draw: the 34% 
reduction is not uniform across all types of memory. If the brain prioritizes emotionally 
salient curated content, the distortion is greatest for experiences that were not curated — 
the mundane, the difficult, the unshared. What social media removes from memory is not random; 
it removes the unperformed self. Adolescents do not just remember less accurately; they 
remember the performed version more vividly than the experienced one. This asymmetric distortion 
is what makes social media's effect on identity distinctively dangerous.

Some argue that Simmons's finding, though significant, does not establish causation. This 
objection has merit — Simmons's study is correlational. However, Simmons's methodology 
controlled for prior memory ability, frequency of other media use, and socioeconomic status. 
The correlation is robust and the proposed mechanism is biologically plausible. The causation 
objection does not undermine the finding; it refines how the finding should be applied.

The conclusion of this paper is grounded in Simmons's evidence: if adolescents' personal 
memory archives are systematically distorted, the developmental consequences extend beyond 
memory into identity. Simmons did not study identity — but the mechanism Simmons identified 
makes identity distortion predictable. Simmons established the mechanism; this paper has 
extended it to its developmental consequence.`,
  },
  {
    label: "Test 5 — Simmons deep integration",
    expected: 5,
    body: `In 2021, Dr. Rachel Simmons of the Adolescent Psychology Institute documented something 
troubling: adolescents who post on Instagram five or more times per week show a 34% reduction 
in autobiographical memory accuracy compared to low-use peers. Simmons's finding is the 
starting point of this investigation, but not its destination. This paper uses Simmons's 
mechanism to argue something Simmons did not argue: that the distortion of autobiographical 
memory is not just a cognitive harm — it is a developmental one that structurally forecloses 
authentic identity formation during the moratorium stage Erikson identified. The distortion 
social media creates is not merely personal; it is civilizational. Social media use significantly 
distorts adolescent memory formation and prevents the development of an authentic self-concept, 
with consequences that extend beyond the individuals affected to the social fabric that depends 
on authentic persons.

Simmons's 34% reduction figure is the empirical core of this argument. But Simmons's paper 
does not ask what the student asks: whose memories are being most distorted, and why? If the 
mechanism is highlight reel curation — posting the best, filtering the worst — then the 
distortion is not random. It targets the unperformed, the imperfect, the authentic. The 
memories most suppressed are precisely the memories most necessary for identity: the difficult 
experience, the failed attempt, the unshared moment. Simmons measured the reduction in accuracy; 
this paper identifies what accuracy was lost. The 34% is not an abstraction — it is the 
systematic disappearance of the unperformed self from the memory archive.

This is where this paper extends beyond Simmons, and it is also where this paper must qualify 
Simmons. Simmons's study is correlational. Simmons controlled for prior memory ability and 
frequency of other media use, which strengthens the finding. But Simmons did not control for 
the content of what was posted. It is possible that some forms of posting — therapeutic 
journaling, documentation of genuine experiences — do not produce the same distortion. This 
paper's argument is more specific than Simmons's: it is highlight reel curation, not posting 
per se, that produces the distortion. Simmons is right about the outcome; this paper adds 
precision about the cause.

Adolescents living under these distortions are also living with a specific identity problem 
that Simmons's research implies but does not name. Some argue that platforms provide community 
and belonging that compensates for whatever memory distortion occurs. This is a serious 
objection and this paper takes it seriously. But Simmons's finding has a specific implication 
for this objection: if the memories distorted are the most authentic, then the identity formed 
through community on these platforms is formed partly from a distorted self-archive. The 
community is real; the self it validates may not be. Simmons's mechanism does not just affect 
memory — it affects what the adolescent brings to the community that is supposed to help.

The conclusion of this argument returns to Simmons for a reason. Simmons documented a 
mechanism. This paper has traced that mechanism through memory, through identity, through 
community, and through development, arriving at a conclusion Simmons could not have 
anticipated but whose foundation Simmons laid: the distortion of adolescent memory by social 
media is a developmental crisis, not a personal one. Simmons gave this paper its empirical 
ground. The argument has built what Simmons's data supports but what Simmons did not build. 
The paper is indebted to Simmons. But the paper is not Simmons.`,
  },
];

function main(): void {
  let failed = 0;
  for (const c of CASES) {
    const result = gradeIwa(padToMinWords(c.body), {
      skipWordCountGates: true,
    });
    const row1 = result.rows.find((r) => r.id === "row1_stimulus");
    const actual = row1?.score ?? -1;
    const ok = actual === c.expected;
    if (!ok) {
      failed++;
      const q = result.evidence.row1IntegrationQuality;
      console.error(
        `FAIL [${c.label}]: expected Row 1=${c.expected}, got ${actual}`,
      );
      console.error(
        `  quality: appearances=${q.appearanceCount} sections=${q.sections.join("|")} functions=${q.functions.join("|")} commentary=${q.commentaryQuality} dialogue=${q.dialogueScore} delete=${q.passesDeleteTest}`,
      );
    } else {
      console.log(`OK [${c.label}]: Row 1=${actual}`);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed}/${CASES.length} failed`);
    process.exit(1);
  }
  console.log(`\nAll ${CASES.length} Row 1 quality-scale tests passed.`);
}

main();
