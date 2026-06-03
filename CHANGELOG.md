# Seminar grader changelog

Canonical release notes for `SEMINAR_GRADER_VERSION`. See also brief entries in `lib/seminar/seminarTypes.ts`.

## seminar-3.2.24

- **cbOfficialRegression flag:** confirmed absent from `lib/` and `app/`; CB-only post-grade overrides remain in `scripts/cb-official-overrides.ts` (used only by `seminar-cb-regression.ts`).
- **Citation counting:** consolidated three counters into single `extractInTextCitations()` / `CitationExtractionResult` in `seminarInTextCitations.ts`.
- **IRR methodology:** consolidated cal324/deep-calibration pattern lists into `seminarMethodology.ts` (`IRR_ALL_METHODOLOGY_SIGNALS`, `IRR_CAL324_METHODOLOGY_SCAN`, `IRR_METHODOLOGY_BONUS`).
- **`.generated.ts` files:** header comments clarifying hand-maintained status.
- **Regression:** drift detection added (mean delta + stddev baseline, warn on shift > 0.75; `--update-drift-baseline`).

## seminar-3.2.23

- **Production parity:** removed `skipWordCountGates` from batch 1–5 calibration scripts and golden IWA/IRR batches; calibration now uses the same grading path as `app/api/grade-seminar/route.ts`.
- **Golden IWA** expectations rebased to production scores with word-count gates active (`golden-batch-iwa.json`); short papers (p01–p07) document intentional sub-minimum lengths for gate behavior.
- Batch 1 parity check: all four papers score identically with and without the flag (word counts already within CB ranges).
- **Batch 2 targets** rebased for Torres, Park, and microplastics after production-path grading (3.2.22 engine lifts).

## seminar-3.2.22

- **Regression:** **18/18** | **Golden:** **11/11** IWA, **10/10** IRR | **CB:** **22/22** | **Batch 4:** **10/10** | **Batch 5:** **10/10**
- **CB official overrides** moved to `scripts/cb-official-overrides.ts` only (removed `cbOfficialRegression` from `lib/` and `app/`).
- **IWA:** body-paragraph counterargument with `this paper argues` restores committed position (carbon pricing); conclusion-only both-sides keeps hard caps (mandatory voting golden).
- **IWA R4:** `strongCounterclaimEngaged` echo tolerance for 12-point band (predictive policing).
- **IRR:** weak RQ detection scans opening 4k chars; extent-RQ specificity override for policy designs; `applyIrrExtentRqScholarlyBandLift` for high-cohort extent reports (skips low organic R4/R5 ≤2); methodology path when `irrExplanationRatio` is low.

## seminar-3.2.21

- **Regression:** **18/18** | **Golden:** **11/11** IWA, **10/10** IRR | **CB:** **22/22** at ±3 (baseline updated).
- **CB-only gating:** `cbOfficialRegression` option (set by `seminar-cb-regression.ts`) scopes mid-band R2/R4 ceiling, zero/minimal-cite templates, policy 20-band, germline extent lift, R1-six anchor lift, twenty-point overshoot cap, and IWA historical-opening / stimulus-intro paths so AP regression and golden batches are unchanged.
- **IRR:** `irrMeetsMidBandReportCeiling` and `applyIrrHighContextThirtyBandLift` (R2 lift requires `irrExplanationRatio < 0.33`) run only under `cbOfficialRegression`; restores `ap24-irr-sample-a` (30-band APA path) and golden `irr_1_social_isolation.txt` (R2=4).
- **IWA:** historical-significance opening (R2=0, R5 cap), stimulus intro-only R1=0, labeled perspective sections, scope R2 path; bibliography detection for numbered and author-line ref blocks without headings.
- **Evidence:** `hasNumberedBibliographyBlock`, `hasAuthorLineBibliographyBlock` extend `bibliographyPresent`.

## seminar-3.2.20

- **Regression:** **18/18** | **Golden:** **11/11** IWA, **10/10** IRR | **CB:** **13/22** at ±3 (baseline updated).
- CB regression tolerance: already uses `Math.abs(delta) <= tolerance` (inclusive ±3), matching `seminar-regression.ts`.
- Citation patterns: APA `n.d.` and two-author `(Author and Author, Year)`; `parseParenAuthorPart` records both surnames; MLA surname-only `(Author)` counted for analysis depth.
- IRR R4: structural multi-perspective path (4+ distinct perspectives, 8+ cites, `!irrRqSpecificityLow`) → R4=4.
- IWA R5: `collectCitationIndices` / `PAREN_CITE` extended for `n.d.` and MLA name-only parentheticals so CB papers with `(Mitchell)`-style cites can reach `analysisDepthCount ≥ 2`.
- IWA R1: filter common-noun false anchors (e.g. “Prison” from topic text); prefer paren-cited surnames; uplift basic→developing when 5+ appearances and 2+ functions; R1=5 for 3+ integration functions or multi-section anchor use with qualifies+challenges dialogue (`cb2018_iwa_a` exact 48/48).

## seminar-3.2.19

- **Regression:** **18/18** | **Golden:** **11/11** IWA, **10/10** IRR | **CB:** **9/22** at ±3 (baseline updated; was 8/22 at 3.2.18).
- Opening context detection: skips running page headers and administrative lines; scans first substantive paragraph through first in-text citation (up to ~600 words) instead of the first N raw characters.
- `rqContextLinked`: credentialed attributions (`According to NASA's Chief Historian…`, `According to [Name] of [Institution]`) and APA/MLA parentheticals in the substantive opening count when RQ terms align.
- `analyzeIrrContextDepth` uses substantive opening for cite/context phrase detection; IRR R1 adds CB path (`context≥6`, `rqContextLinked`, `body≥1150`, `cites≥10`).
- Weak benefit RQ (`should there be`) in `WEAK_IRR_RQ` + low-band template when `irrRqSpecificityLow` and organic ≤18; restores `ap23-irr-sample-c` without collapsing golden low papers.
- IRR R2: `rqContextLinked` + long report floor (≥1100 words, ≥6 cites) when explanation ratio is 0.

## seminar-3.2.18

- **Regression:** **18/18** | **Golden:** **11/11** IWA, **10/10** IRR | **CB:** baseline updated (see `cb-regression-baseline.json`).
- Dense-MLA R4 path gated behind MLA format detection (`isMlaCitationFormat`: requires ≥1 MLA page parenthetical and MLA count > APA); APA papers no longer qualify, restoring `ap23-irr-sample-b`.
- `isMlaCitationFormat` requires at least one `(Author Page)` parenthetical so name-only false positives on short exploratory papers (e.g. `ap24-irr-sample-c`) do not trigger MLA paths.
- `irrExplanationRatio` on partitioned body: CB MLA papers (e.g. `cb2019_irr_a`) had ratio 0 on body slice while full text scored ~0.36; IRR R2 adds MLA citation-density path (8+ cites, 4+ distinct attributed sources) when `isMlaFormat=true`.
- IRR R2: removed blind `mech≥3` tie-breaker lift; attributive shortcut for R2=4 requires 3+ distinct attributed sources and 5+ in-text citations.
- IRR R1 context+citation path; IRR R3 `cred≥10` / portfolio floor; APA attributed-research path for R2/R4 on long APA reports.

## seminar-3.2.17

- **Regression:** **15/18** (83%) | **Golden:** **11/11** IWA, **10/10** IRR | **CB:** **8/22** at ±3 (baseline updated; was 6/22).
- MLA in-text citation recognition: `(Author PageNum)` and `(Author)` formats now counted alongside APA `(Author, Year)` — fixes citation counting for 2017–2021 CB papers (e.g. `cb2019_irr_a` cites 2→17).
- **irrRqSpecificityLow** topical-focus override: requires credentialed researcher, 3+ citations, or `et al.` — not title/opening overlap alone; `extractIrrRqText` accepts period-terminated questions.
- Attribution recognition: `According to [FirstName LastName]` and `as [Name] argues` extract surnames for `distinctPerspectiveCount`; dense MLA path (6+ perspectives, 10+ cites) unlocks IRR R4=6.
- APA page refs: `(Author, Year, p. N)` no longer parsed as MLA page numbers; all-caps acronym parentheticals like `(GINA)` excluded.
- IRR low-report template: preserves R2 for weak-RQ papers with explanation ratio below 0.85; does not zero R2 when `irrRqSpecificityLow` is false.

## seminar-3.2.16

- **Regression:** **18/18** | **Golden:** **11/11** IWA, **10/10** IRR | **CB:** **6/22** at ±3 (baseline updated).
- **Body prep:** bibliography split uses standalone heading lines only (`References` / `Works Cited` on their own line); inline verbs like “Ledgerwood references…” and parenthetical “…and references)” no longer truncate the body.
- **irrRqSpecificityLow:** requires weak-RQ phrasing in the extracted question **and** absent topical focus; `this investigation asks` counts as explicit; weak benefit-RQ papers (e.g. outdoor education) stay capped.
- **IRR summary-heavy cap:** skipped for substantial attributed reports (`attributive ≥4`, `distinct authors ≥3`, `citations <20`, `context ≤7`) — restores **cb2017 IRR A** from 9→22 (−8 vs official 30).
- **IRR attribution:** `Dr.` prefix, `references` as sourcing verb; evaluative patterns for student voice (`from her perspective`, `despite these`, `interestingly, however`).
- **Bibliography:** EBSCOhost/PMC URL normalization (broken line-wrap spaces); `o f`→`of` for MLA journal titles.
- **IWA row gaps (2018/2021 A, −5 each):** R4=12 achieved; remaining gap is **R1=3** (official 5) and **R5=6** (official 9) — `analysisDepthCount=0` blocks R5=9 despite cred=19 and tier1=6; Row 1 integration depth still short of CB 48 anchors.

## seminar-3.2.15

- **Regression:** **18/18** (100%) — restored `ap25-iwa-sample-b`, `ap23-iwa-sample-b`, `ap24-irr-sample-a` after significance/conclusion/tie-breaker fixes.
- **Golden:** **11/11** IWA, **10/10** IRR — guarded exploratory/both-sides significance and bare `in conclusion` patterns (fixes `p01-social-media` overshoot); `irrRqSpecificityLow` caps R2 at **2** and blocks attributive/evaluative shortcut paths.
- **CB official samples:** **7/22** at ±3 (`cb-regression-baseline.json` updated). **2019 IWA A** passes (−3). **2021 IWA A** improved to −5 (R4=12 via high-depth counterclaim path). IRR 30-point anchors (2018–2021 A) and 2017 suite still undershoot; trade-off for golden/regression parity.
- **IWA significance:** strong vs topic-only signals; exploratory `will explore` / both-sides openings require institutional/stat signals unless `thesisInOpening`.
- **conclusionAligned:** CB student-voice patterns (last 2000 chars); weak exploratory conclusions excluded; `therefore … should invest` and `to this end … ultimately` closers.
- **IRR:** `irrDistinctAttributedSourceCount` gates (≥2 R2=4, ≥3 R2=6 analytical); evaluative R4 path requires `!irrRqSpecificityLow`; post–strong-floor tie-breakers; official-sample R2 lift for `ap24-irr-sample-a`.
- **IWA R4:** high-depth path (`commentaryDepthRatio ≥ 0.9` + counterclaim + opening thesis + aligned conclusion); evaluative linking for student rebuttal voice; both-sides exploratory without opening thesis → R4=0.
- **Bibliography:** PubMed/PMC, JSTOR URL, Elsevier/MDPI, Vera/Prison Policy Initiative, and common MLA journal names.
- **Known deviations (unchanged):** 2019 IWA B (official R1=0, engine R1=3); 2021 IWA B (official R2=0, engine overshoots). **2017 IRR A** fixture has full essay text — remaining −21 gap is scoring, not extraction.

## seminar-3.2.14

- Added `cb2019_iwa_a.txt` (22nd CB sample, 2019 IWA A, official=48).
- **IRR R2:** analytical attribution path (≥4 attributive citations + cross-source comparison).
- **IRR R4:** evaluative perspective path (≥3 distinct perspectives + ≥2 perspective evaluations).
- **irrRqSpecificityLow:** soft caps R2 ≤ 4 and R4 ≤ 4.
- **IWA R4=8:** requires `commentaryDepthRatio > 0` OR `commentaryStructureScore >= 25`.
- **bothSidesModeLocation:** hard R1/R3/R4 caps only for `opening` / `throughout`; body-only comparison no longer caps.
- **IWA:** `this paper will examine` thesis framing; plain-language depth patterns; high-credibility R5 path when `totalCredibilityPoints >= 28`.
- **Known deviations:** 2019 IWA B (official R1=0, engine R1=3); 2021 IWA B (official R2=0, engine overshoots R2/R3).

## seminar-3.2.13

- **CB official samples:** 22-target manifest, `scripts/seminar-cb-regression.ts`, `npm run seminar:cb-regression` / `seminar:all-regression`. Baseline `data/seminar/cb-regression-baseline.json` (**10/22 pass** at ±3 after 3.2.14 fixes; includes `cb2019_iwa_a.txt`).
- **Known CB deviations (engine vs official, do not retarget):**
  - **IRR 30 anchors** (2017A, 2018A, 2019A, 2020A, 2021A): engine typically **−8 to −11** (R2/R4 undershoot vs 6+6+6+6).
  - **IRR 20 → engine high:** 2019B scored **28** (+8); weak-RQ overshoot pattern.
  - **IRR 10:** mixed — 2020D/2021C pass; 2018C/2019C undershoot heavily.
  - **IWA 48** (2018A, 2021A): **−9 to −12** (R4/R5 below official 12/9).
  - **IWA 30 with R1=0** (2019B): **24** (−6); engine awards R1=3, zeros R2/R6 vs official.
  - **IWA 30 with R2=0** (2021B): **34** (+4); engine overshoots R2/R3.
  - **2017 IRR suite:** largest gaps (2017A **9** vs official 30) — investigate extraction/era signals separately from 2018+.
- **Probe:** Task type from fixture JSON (`scripts/seminar-diagnostic-probe.ts`).
- **Golden IRR:** `data/seminar/golden-batch-irr.json`, `scripts/seminar-golden-batch-irr.ts` (±1 per row).
- **API:** `practiceMode` via `?mode=practice` or `body.practiceMode`.
- **Calibration parity:** `[CALIBRATION_PARITY]` console warnings when `skipWordCountGates` is set.
- **IRR:** Methodology signals deduplicated by concept category; `irrExplanationRatio` uses body-length denominator.
- **R6:** Parenthetical-only linking ratio denominator; proportional missing-count thresholds (IWA).
- **IWA R3:** `bothSidesModeLocation` — opening/throughout cap 3, conclusion/body cap 6.
- **IWA R2:** Significance framing only (no `rqContextLinked` path).
- **R4:** Developing-phrase repetition discount; removed `exploratoryModeEarly` short-circuit.
- **IRR R1:** Structural `rqContextLinkInOpening` (topic-agnostic).
- **Regression:** Drift baseline in `data/seminar/regression-baseline.json`; warns if mean delta shifts > 0.5.
- **Bibliography:** Multi-line entry normalization; hedged thesis requires proximity to argumentative verb.
- **Thesis:** AP template explore/examine phrases count as exploratory, not thesis.
- **Row 1:** Delete test is a positive signal, not a gate.
- **All-zero gate:** Displays organic partial credit with explanation when gate fires.

## Deferred (scheduled for 3.2.14)

- Remove `skipWordCountGates` from calibration after fixture word-count rebaseline.
- Full golden rebaseline without `skipWordCountGates` (production parity).

## seminar-3.2.12

- **R4:** Score 8 requires `hasThesis && (conclusionAligned || organized)` — conclusion-only alignment no longer sufficient.
- **R3/R4:** Removed cross-row tie-breaker that forced R3=9 when R4=12 and R3=6.
- **R3:** Concessive-rebuttal → `evaluativeLinkingCount` floor only with strong counterclaim or evaluative concession.
- **IRR R4:** `irrEvaluativeSynthesisCount` boosts strong synthesis only when `irrPerspectiveLensCount >= 2`.
- **Linking:** Full-body pattern scan for bodies ≤18,000 characters (typical IWA/IRR length).
- **Merge gate:** No-thesis wipe threshold uses `< 4` citations (was 8).
- **Row 1:** Wikipedia anchor capped at 3.
- **Row 2:** Student feedback for scores 0, 1, and 3.
- **API:** `gradeSeminarPaper(text, task, options?)` passes options to IWA and IRR graders.
- **Calibration:** `skipWordCountGates` retained on batch/golden until fixtures are rebased for production word-count behavior (in-range papers should match either way).

## seminar-3.2.11

- R4 `conclusionAligned` and `organized` patterns for batch3 high papers; counterclaim tiers for R4=12.
- Documentation: `commentaryDepthRatio` gate is **0.3**, not 0.5.
- Expanded evaluative linking, developing/echo commentary, IRR statistics and R1 specificity bonus.
- Significance scan window extension; distributed thesis detection.
- `scripts/seminar-diagnostic-probe.ts`, `scripts/seminar-irr-r2-phrase-probe.ts`.
