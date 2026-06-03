# GRADING_SPEC — Locked AP Research Practice Grader Rules

**Status:** LOCKED. Code changes must comply with this document.  
**Version:** 2.0.0-spec (see `lib/grader/gradingSpec.ts` for runtime constants)  
**Authority:** College Board official sample papers and the 2025 AP Research rubric win over this document when they conflict. This document wins over individual teacher judgment or product-owner preference.

---

## META — How to Answer and Change Rules

- All answers live in this single document.
- When answers conflict, the **latest approved message** overrides earlier written specs.
- **Final authority on disputed scores:** College Board samples only.
- **Primary rubric:** 2025 AP Research; 2023–2024 samples used for calibration only.
- Constants are mirrored in `lib/grader/gradingSpec.ts`; behavior is implemented in `lib/grader/*`.

---

## SECTION A — Product, Audience, and Trust

| ID | Rule |
|----|------|
| A1 | Primary users: students and teachers equally. Parents/admins secondary. |
| A2 | **Formative practice only.** Never summative course grades. Never predict official AP score for credentialing. |
| A3 | Required disclaimer on every report (exact text in `PRACTICE_DISCLAIMER`). |
| A4 | Students may use before submitting to teacher — primary use case. |
| A5 | Not for grade disputes; disclaimer must state practice-only. |
| A6 | Teachers eventually get richer report (evidence, rules fired, confidence). **Now:** same report for both. |
| A7 | Export: PDF first, then print-friendly; CSV for teachers (future). |
| A8 | Save history per user for one academic year; then anonymize/aggregate. |
| A9 | FERPA: do not persist full paper text beyond grading session. Scores + metadata only. |
| A10 | Strip student names from logs; cover-page names → `[STUDENT]`. |
| A11 | Anonymous no-logging toggle. Default: logged for registered, anonymous for visitors. |
| A12 | School/district deployment + public website. |
| A13 | No age gate; educational-purpose acknowledgment checkbox on first use. |
| A14 | Rate limit: 20 submissions/IP/day (unregistered); higher for school accounts. |
| A15 | Max paste: 100,000 characters. |
| A16 | Timeout: 60s local, 90s with Claude; show retry on timeout. |
| A17 | Offline local-only not required now; architecture should allow future local-only. |
| A18 | AP trademark disclaimer required (`AP_TRADEMARK_DISCLAIMER`). |
| A19 | Plagiarism detection: out of scope forever. AI-generated detection: future teacher-only flag, never score modifier. |
| A20 | Language: "estimated AP score" not "course grade." |
| A21–A25 | Teacher expected band delta, roster CSV, revision compare, share link: future; design for A21/A23. **No class leaderboard (A24).** |
| A26 | **Now:** `aria-label` on every progress bar with category + score. |
| A27 | Mobile-first paste experience priority. |
| A28 | Non-English: flag low confidence; do not reject. |
| A29 | Bilingual Spanish quotes in English body: grade normally; translanguaging is a strength. |

---

## SECTION B — Submission Input and Parsing

| ID | Rule |
|----|------|
| B1 | Paste only for now; PDF upload roadmap after local engine stable. |
| B2 | Preserve heading structure from DOCX paste when possible; else functional regions. |
| B3 | OCR from photos: out of scope. |
| B4 | Strip `TEST PAPER N — Expected score` lines before grading. |
| B5 | Strip `Word Count: X` from body; extract stated count for comparison. |
| B6 | Strip cover metadata (AP Research, date, names, school) before analysis. |
| B7 | `cleanCollegeBoardFormatting` dedup **only** for College Board samples — never student papers. |
| B8 | Never deduplicate repeated "Introduction" headings. |
| B9–B10 | Strip lone page numbers and running headers (`Smith / 1`). |
| B11 | Skip table of contents (dot leaders) — not body. |
| B12 | Keep hyperlink URL text for bibliography detection. |
| B13–B16 | Footnotes, Chicago, IEEE, MLA narrative — count per style rules; flag MLA undercount confidence. |
| B17–B18 | `(Author, n.d.)` counts; `Smith 2020a` / `2020b` = two sources. |
| B19 | Block quotes >100 words excluded from average sentence length. |
| B20–B21 | Bullet method steps count; numbered limitation lists count. |
| B22–B24 | ALL CAPS, `1. Introduction`, `I. Introduction` → headings (normalize before match). |
| B25–B26 | Lost underline/bold → content-based functional detection. |
| B27 | Two-column garbled paste → lower confidence flag. |
| B28–B32 | Normalize smart quotes, zero-width, em-dash, χ²/LaTeX before regex (`textNormalize.ts`). |
| B33–B36 | Code blocks, interview transcripts, survey instruments, IRB letters → appendix rules. |
| B37–B39 | Teacher rubric pasted, `[teacher note]`, track changes — strip/exclude. |
| B40 | Multiple papers separated by `---` → reject one-at-a-time message. |

---

## SECTION C — Validation Gate

| ID | Rule |
|----|------|
| C1 | **500 words** meaningful threshold on body only. |
| C2 | **450–499:** warn + reduced confidence. **&lt;450:** hard reject. |
| C3 | Hyphenated words = one word. |
| C4 | References never count toward body word count. |
| C5 | 55% real-word ratio gibberish gate — keep. |
| C6 | Minimum 3 sentences — keep. |
| C7 | Expanded academic keyword list in validator. |
| C8 | Do not reject for zero `?` if goal/objective statements exist. |
| C9 | Do not reject for no verb &gt;3 chars. |
| C10–C11 | Poetry/creative and qualitative-only papers accepted. |
| C12 | No minimum citation count to pass validation. |
| C13 | Flag body &gt;5,500 words; never hard reject for length. |
| C14–C15 | Stated vs actual word count discrepancy → flag only, not cheating accusation. |
| C16 | Empty references + many in-text cites → flag missing bibliography. |
| C17 | References only → reject. |
| C18 | Abstract only (&lt;500 body words) → reject with abstract message. |

---

## SECTION D — Paper Boundaries

| ID | Rule |
|----|------|
| D1 | Body = everything before earliest bibliography heading **after 50%** of document. |
| D2 | Bibliography in first 20% = lit-review section, not references boundary. |
| D3 | Two bibliographies → use **last** as references zone. |
| D4 | Works Cited per chapter → last occurrence; flag unusual structure. |
| D5 | Footnote bibliography after 50% with full entries counts as references. |
| D6 | Tail 30% APA heuristic for inline references — keep. |
| D7–D15 | Appendix detection, survey instruments not results, half-point appendix credits (when implemented). |
| D16–D18 | Abstract blocks, DOI-only, bare URLs — fractional bibliography credit. |
| D19 | Syllabus in references → flag non-paper content. |
| D20 | In-text cites in references zone never count as in-text. |
| D21 | Body word count flag: `Paper body word count: [N] words (excluding references and appendices)...` |
| D22 | Referenced but empty appendix → credit + underestimate flag. |
| D23 | `unusualDocumentStructure` → confidence only, no score impact. |

---

## SECTION E — Functional Region Detection

| ID | Rule |
|----|------|
| E1 | Max heading length **200** characters. |
| E2–E28 | Heading aliases (Problem Statement, RQ1:, Delimitations, Data, Findings and Analysis, etc.) — see `functionalRegions.ts`. |
| E25 | Reflection sections — skip, not scored. |
| E29–E30 | Thematic headings before method: lit review only if citations present. |
| E31 | 60% citation density for unheaded lit review. |
| E32 | Embedded lit in intro: first **400 chars or 3 sentences** = intro; rest citation-dense = lit. |
| E33 | Lit/method split phrases include `in this study`, `participants were recruited`, etc. |
| E34–E36 | Map method/results by **content**, not document order. |
| E37–E38 | Limitations at sentence level; bullets in last 40% of body. |
| E39 | Abstract never scored. |
| E40 | Conclusion fallback: last **3,000** characters. |
| E41–E43 | Skip Acknowledgments, Dedication, Epigraph for conclusion. |
| E44 | Multiple Introductions: first = intro; later map by content. |
| E45–E51 | Method subsections (Participants, Materials, Validity, etc.) merge into method. |
| E52 | Threats to Validity → limitations. |
| E53 | Future Research → implications or limitations by content. |
| E54 | Functional mapping **always wins** over legacy `extractSection`. |
| E55 | Debug region map for teachers (future). |
| E56 | Wrong region map must **not** prevent scoring content found elsewhere. |

---

## SECTION F — Research Question and Focus

| ID | Rule |
|----|------|
| F1 | Statement of purpose without `?` can count as RQ. |
| F2 | RQ in footnote counts; abstract/caption do not. |
| F5 | Multiple RQs: score **best** one, no average penalty. |
| F6 | Intro vs conclusion drift → score intro RQ; drift penalty −1 Focus tier. |
| F7 | Drift threshold: keyword match ratio **&lt;0.25** = drift. |
| F8 | `highlySpecificFocus` population must be **named** (species, place, institution, age-range demo, product) — not generic "high school students." |
| F9 | Biology papers require scientific species name for highly specific population. |
| F10 | Lactuca path without explicit `?` allowed if four elements present. |
| F11 | Broad "mental health" without mechanism → Focus Low 2. |
| F12 | "To what extent" → mild boost, not automatic high score. |
| F13 | Hypothesis only → Focus cap Mid 3. |
| F14 | "This paper explores" no RQ → Low 2 not Low 1. |
| F15 | Action research cap Mid 3 even if well executed. |
| F16 | Advocacy "schools must" → Low 2. |
| F18 | Narrative inquiry needs stated focus or Low 1. |
| F19 | Title as question is never the RQ. |
| F20–F23 | Rhetorical RQs, sub-questions, null hypothesis, objective bullets — rules in `focusRules.ts`. |
| F24–F25 | Consistency: results at half weight; **not** lit review keywords. |
| F26–F27 | Highly specific four-element path can reach 5 without explicit RQ; else Low 1 floor. |
| F28 | Product-effectiveness RQs valid. |

---

## SECTION G — Scholarly Grounding

| ID | Rule |
|----|------|
| G1–G4 | Unique in-text counting, et al. = one source, multi-cite sentences. |
| G5–G6 | Undercount bump vs citation stuffing cap interactions. |
| G7 | Sparse parenthetical in lit (&lt;1/150 words) → cap Mid 3. |
| G8 | Humanities disciplines list — theoretical framework synthesis path. |
| G9–G12 | Demonstrated vs asserted gap; "more research needed" always asserted. |
| G13 | Cross-section synthesis alone cannot reach Scholarly 5. |
| G14–G15 | Three-strike isolation → Low 2; two strikes + cross-section → cap Mid 3. |
| G16–G21 | CRT ceiling High 4; PRISMA; annotated bib cap; news 0.25; websites/textbooks caps. |
| G22–G27 | Self-citation flag; citation circles; block quotes; foreign sources flag. |
| G28–G30 | Empty gap section; late gap note only; implicit gap max Mid 3. |
| G31–G33 | Isolation openers count; humanities gap radius **200** words; "however" multi-cite = synthesis. |
| G34 | Cannot verify fake citation years — grade as cited. |
| G35–G36 | Citation style vs density separation; narrative cite floor → Mid 3. |
| G37 | Lit-review-only method → Scholarly cap Mid 2; overall cap Mid 2. |

---

## SECTION H — Method and Replicability

| ID | Rule |
|----|------|
| H1 | **9 base elements:** sample, materials, procedure, named analysis, time, method citation, ethics, DV/IV, data recording. |
| H2–H10 | Sampling criteria, reliability, validity threats, power analysis, randomization, blinding, control, pilot — extras add to count. |
| H11 | 0 elements → Low 1; 2 elements → Low 2. |
| H12 | 7+ elements can reach High 4 / Low 5. |
| H13 | Future tense dominant (2+ "will collect"): default → Method Low 1, overall max 2; **proposal mode** (teacher toggle, future) → cap Low 2. |
| H14 | Mixed past/future → partial execution: Method max Low 2, overall max High 3. |
| H15–H21 | Google Form, simulation, computational model, secondary data, content analysis, systematic review, meta-analysis rules. |
| H22 | Case study n=1 ceiling Mid 3. |
| H23 | Action research cycles can reach Mid 4. |
| H24–H27 | Missing n= penalizes sample element only; convenience/snowball neutral; n=3 interviews legitimate. |
| H28 | Informal classmate interviews → partial execution. |
| H29 | Harlequin-style lit synthesis → Method Low 2, Argument Low 2. |
| H30 | Verifiable synthesis requires traceable data points (PRISMA criteria). |
| H31 | Explicit no data → Method Low 1, overall max Mid 2. |
| H32–H34 | Hard/soft non-execution phrases; hard fires first. |
| H35 | **One** `detectMethodDefended` function shared by evidence and calibration. |
| H36 | No method defense → overall max High 3 (all disciplines). |
| H37–H39 | Human subjects / animal / deception ethics caps and flags. |
| H40 | Procedural sequence cap only when sequence clearly expected. |
| H41 | 3+ distinct inferential methods → +1 band bump. |
| H42 | Method not penalized for section order vs results. |
| H43 | Method only in appendix → not credited. |
| H44–H47 | Lab manual copy, collaboration, teacher participant flag, dual methodology — score normally with flags as specified. |

---

## SECTION I — Argument and Evidence

| ID | Rule |
|----|------|
| I1–I3 | Survey % weight 2; 10+ signals can reach 5; one signal floor Low 2. |
| I4 | Prior-author sentence filter: accept some false negatives. |
| I5 | Descriptive-only cap band 3; rich qualitative themes exempt to 4. |
| I6–I7 | Themed interviews → 4; n=3 quotes max Mid 3. |
| I8–I10 | Non-significant cap Mid 2 (sophisticated discussion → High 2 within cap); p=.06 non-sig; mixed lifts cap. |
| I11 | Planned component not executed phrases. |
| I12 | Simulation floor Mid 3; ceiling High 4/Low 5 when six conditions met. |
| I13–I14 | Figure ref without numbers max Mid 4; stats prose without numbers max Mid 3. |
| I15–I17 | Missing limitations −1 tier; one-sentence weak limitations −1; strong limitations +1. |
| I18–I21 | Weak vs strong implications rules. |
| I22 | Results/conclusion contradiction → confidence flag only. |
| I23 | Cherry-picking: out of scope. |
| I24–I31 | Null results, effect size, markdown tables, prior-author ratio cap, hypothetical results Low 1. |
| I32–I34 | Fabrication / "made up for example" in results → hard non-execution. |
| I35 | `strongEmpiricalOverride` stays **false**. |
| I36–I37 | Appendix-only stats; `hasDataSignals` formula — keep. |
| I38 | Visual bonuses: decorative +0.5, analyzed +1.0, stats near figure +1.5. |
| I39 | No results region → Argument Low 1 even if discussion has data. |

---

## SECTION J — Communication and Citation

| ID | Rule |
|----|------|
| J1 | Communication = citation consistency/count, not prose quality. |
| J2–J4 | &lt;3 cites Low 1; 8 → band 4; 16+ consistent → band 5. |
| J5–J6 | Mixed APA+numbered −2 bands; sparse body parenthetical −1 tier. |
| J7 | No heading penalty when functional regions found. |
| J8–J9 | Sentence length penalties with quote/list exemptions. |
| J10–J12 | No bibliography −1 band; stuffing affects Scholarly; incomplete bib −1 tier. |
| J13–J14 | Alphabetical order / hanging indent — no penalty. |
| J15 | Missing DOI −1 Communication **tier** (not full band). |
| J16–J18 | Broken refs flag only; over-citation caps Scholarly not Communication. |
| J19–J22 | First person, contractions, spelling, APA 6/7 — no version penalty; consistency only. |

---

## SECTION K — Overall Score Tiers and Display

| ID | Rule |
|----|------|
| K1 | Weights: Method **30%**, Argument **30%**, Scholarly **25%**, Focus **10%**, Communication **5%**. |
| K2 | `bottomAvg` **deleted** — not used. |
| K3 | Low 1 combos: Focus+Arg L1; Method+Arg L1; Scholarly+Arg L1; no-data with both Method+Arg L1. |
| K4 | Any Method band 1 → overall ceiling Mid 2. |
| K5 | AP integer for pill; Low/Mid/High tier on category bars. |
| K6 | `fillPercent` map — see `FILL_PERCENT_BY_BAND_TIER` in `gradingSpec.ts`. |
| K7 | Category High 5: &lt;5% of papers expected. |
| K8 | All categories ≥4 lifts overall floor to Low 4 (one condition for overall 5). |
| K9 | Focus **and** Communication both below Mid 3 → overall cap Low 3. |
| K10 | `borderlineDemonstratedGap` → overall cap Low 4. |
| K11 | Holistic rounding 0.35 for Mid tier — keep. |
| K12 | 1–100 legacy scale removed forever. |
| K13–K14 | Rejected papers: all Low 1 bars + word count shown. |

---

## SECTION L — Hard Caps Priority Stack

Apply in order (after category formulas, before/after calibration as noted):

1. Fabricated data admission  
2. Focus L1 + Argument L1  
3. Method L1 + Argument L1  
4. Scholarly L1 + Argument L1  
5. No student data → overall max Mid 2  
6. Literature review only → overall max Mid 2  
7. Partial execution → overall max High 3  
8. Asserted gap → Scholarly cap Mid 3, overall max High 3  
9. Synthesis isolation (3+) → Scholarly cap Low 2  
10. Weak implications + limitations caps (separate; additive pressure)  
11. Category scoring formulas  
12. Holistic overall  
13. Calibration (overall only, ±1 tier)  
14. Score 5 qualification  
15. Conservative unavailable adjustment  
16. Confidence generation  

| ID | Rule |
|----|------|
| L2 | Fabrication = hard non-execution: Method L1, overall max **Mid 2** (not Low 1). |
| L7 | Caps re-apply **after** Claude. |
| L8 | Double-pass caps in `gradePaper` intentional. |
| L9–L10 | When cap lowers overall below category-implied score, show **cap explanation flag** (`capFlags.ts`). |

---

## SECTION M — Calibration System

| ID | Rule |
|----|------|
| M1 | Five anchors now; target seven (add Score 1 Sample I, Score 2 Sample H — in `calibrationPapers.ts`). |
| M4 | `data/samples/manifest.json` lists anchors (no full text in repo). |
| M5 | Progress: "Comparing your paper against AP Research scoring benchmarks." |
| M6 | Student copy: "Your paper most closely resembles a College Board paper that scored a [N]." **No sample letter.** |
| M7–M9 | Stronger-than-3 floor; weaker-than-4 ceiling; rich-executed boost toward 5 — seven criteria. |
| M10–M12 | Calibration adjusts overall only, max **one tier** up or down. |
| M16 | Local category math wins genuine 5 over anchor mismatch. |
| M17 | Store adjustment reasons; first in confidence, all in teacher debug (future). |
| M18 | Recalibrate yearly with new official samples. |

---

## SECTION N — Claude Hybrid Secondary Grading

| ID | Rule |
|----|------|
| N1 | Trigger band 3–4 includes Low 3. |
| N2 | Overall 5 with any category &lt; Mid 3 triggers review. |
| N3 | Claude replaces all categories; caps re-apply. |
| N4–N6 | Body only ≤48k chars; evidence digest; functional region map. |
| N7 | Same caps after Claude. |
| N8 | Disagreement ≥2 bands → log for admin (future). |
| N9 | Timeout **35 seconds**. |
| N10 | API missing → conservative −1 tier + flag. |
| N11 | Claude rationale: teacher-only (future). |
| N12 | Scholarly-only Claude mode: do not implement. |
| N13–N15 | Teacher AI toggle (default on); student note "Enhanced analysis"; school token budget. |
| N16 | Claude does **not** receive anchor text. |
| N17–N18 | No invented figure data; retry once on JSON failure. |

---

## SECTION O — Visual and Image Limitations

| ID | Rule |
|----|------|
| O1 | Never penalize missing numbers when Figure N referenced. |
| O2–O7 | Figure/table/chart bonuses and decorative 0.5 signals. |
| O8 | Visual–RQ alignment positive flag (2+ analyzed figures + keyword overlap). |
| O9 | 150-word analysis window after figure reference. |
| O10 | Participant photos → ethics flag only. |
| O11–O12 | Hand-drawn / screenshot described analytically → analyzed figure credit. |
| O13 | Embedded images in paste invisible. |
| O14 | "See attached" without figure number → no credit. |
| O15 | No visuals in STEM lab → no penalty. |
| O16 | Heavy visuals, no prose → Argument max Mid 3. |

---

## SECTION P — Discipline-Specific Corpora

STEM IMRaD default; social science descriptive bands; psychology IRB+stats floor Low 4 overall when criteria met; education action research Focus cap High 3; humanities close reading paths; history demonstrated gap; economics secondary data; CS metrics 1.5 weight; engineering prototype metrics; arts performance reception; medical case ceilings; public health secondary data; environmental field work; AP Seminar note only; dual enrollment same caps; ESL no Communication grammar penalty.

---

## SECTION Q — Test Papers and Regression

| Paper | Expected overall |
|-------|------------------|
| Microplastics | Low 5 |
| Music study habits | Mid 2 |
| Social media mental health | Low 1 |
| Blue light athletes | High 4 (range High 4–Low 5) |
| Parental homework | Mid 3 (range Mid 3–Low 4) |
| Social media depression | Low 2 |
| CRT (Paper 15) | Scholarly High 4, Overall High 4 |
| Extracurricular (Paper 16) | Low 3 |
| Harlequin Ichthyosis | Low 2, Method ≤ Low 2 |
| Detergent simulation | Low 3, Argument ≥ Mid 3 |
| Body image survey | Low 3 |
| Green space | Low 2 |
| Mindfulness | Mid 3 |

| ID | Rule |
|----|------|
| Q13 | CI fails if **&gt;1 full band** from expected (sub-band drift OK). |
| Q14 | Do not store full student paper text in public repo — metadata + hash only. |
| Q15 | Strip expected-score lines in tests. |
| Q18 | Gold standard: 80% within one band on official corpus (separate accuracy report). |

---

## SECTION R — Flags, Confidence, and UI Copy

Exact flag strings for word count (D21), visual underestimate (R6), inconsistent style (R3), secondary review (R4), calibration (M6), Claude unavailable (R10). Confidence HIGH only with spread ≤1 **and** Claude confirmed in 3–4 range; spread ≥3 → LOW with explanation. Color tiers R13. Rejected papers R14.

---

## SECTION S — Security, Ops, and Environment

API auth before school deploy; CORS restrict for production; never log full paper to Claude logs; rate limits 20/hr logged / 10 anonymous; `maxDuration` 240s; env vars only; local works without API key; generic user errors; `/api/health` with version; grader version in report footer.

---

## SECTION T — Contradictions Resolved

| ID | Resolution |
|----|------------|
| T1 | `strongEmpiricalOverride` = false |
| T2 | Single `detectMethodDefended` |
| T3 | Communication heading penalty off when functional regions found |
| T4 | `identifyFunctionalRegions` once per grade (cache in evidence) |
| T5 | `bottomAvg` deleted |
| T6 | Calibration message = benchmarks not "anchor Sample D" |
| T7 | Internal `bandTier` vs AP integer label |
| T8 | Hard caps override calibration |
| T9 | Future tense before partial execution |
| T10 | Simulation floor overrides descriptive-only cap |
| T11 | Humanities narrative path exempts sparse parenthetical / stuffing |
| T12 | Strip text once before analysis |

---

## SECTION U — Philosophy and Edge Ethics

Grade outcomes not intent. Honesty about failure = same cap as deceptive unverifiable synthesis (overall max Mid 2). Fabrication admission max Mid 2 overall. AI lit-review admission → confidence flag only. Incomplete "Draft" → grade as-is. No score change for sensitive topics; ethics flags for animals/deception/illegal behavior surveys.

---

## SECTION V — True/False Reference

V1 body excludes refs/appendices TRUE · V2 headings alone never earn points TRUE · V3 substance without headings scores fairly TRUE · V4 proposal future tense max overall 2 default TRUE · V5 simulation numeric = student data TRUE · V6 lit review only not AP method TRUE · V7 embedded limitations count TRUE · V8 Claude optional TRUE · V9 500-word gate FALSE (450 hard) · V10 Scholarly 4 Method 2 TRUE · V11 overall 5 needs all ≥4, Communication ≥ Mid 3 TRUE · V12 images never read TRUE · V13 appendix stats need body cite TRUE · V14 teacher override future TRUE · V15 students never see sample letters TRUE · V16 functional regions before categories TRUE.

---

## SECTION W — Open Judgment (Calibration Anchors for Humans)

**Ideal Low 1:** Broad vague lit review, no RQ/method/data, conclusion restates others.  
**Ideal Mid 3:** Clear narrow RQ, executed survey/experiment, descriptive results, asserted gap, isolated lit.  
**Overall 4, Method 2:** Humanities rich gap/synthesis/argument/implications but non-replicable coding protocol.  
**Overall 5, Communication 3:** Excellent STEM experiment with demonstrated gap, defended method, ANOVA+effect sizes, sophisticated limitations/implications, messy citation style.  
**False positive fear:** Many sources + stats + headings but asserted gap, convenience survey, shallow limitations → should be Mid 3 not Low 4.  
**False negative fear:** Humanities interpretive work without stats misread as weak → deserves High 3/Low 4.  
**Leniency target (W9):** Slightly lenient on Communication, Scholarly, Focus when borderline.  
**Never assign (W13):** Mid 5 / High 5 without all Score 5 conditions; &lt;2% of submissions.

---

## Change Control

Any rule change requires explicit approval and an update to this file with a version bump in `gradingSpec.ts` (`GRADER_VERSION`). Implementation files must be updated in the same change set.
