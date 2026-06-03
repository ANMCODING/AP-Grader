# Official College Board AP Seminar samples (2017–2021)

Extracted student essay texts with verified official row scores. Used by `scripts/seminar-cb-regression.ts` against `cb-samples-targets.json` (±3 total tolerance, `skipWordCountGates: true`).

## Included (22 targets, 21 files on disk)

All samples use the post-2018 rubric (IWA max 48, IRR max 30).

| File | Task | Official | Notes |
|------|------|----------|--------|
| cb2017_irr_a/b/c | IRR | 30 / 20 / 10 | |
| cb2018_irr_a/b/c | IRR | 30 / 20 / 10 | |
| cb2018_iwa_a/b | IWA | 48 / 35 | |
| cb2019_irr_a/b/c | IRR | 30 / 20 / 10 | irr_c ~889w (below 1080 min) |
| cb2019_iwa_a | IWA | 48 | **fixture pending** — add `cb2019_iwa_a.txt` when available |
| cb2019_iwa_b | IWA | 30 | Official R1=0 |
| cb2020_irr_a/b/c/d | IRR | 30 / 30 / 20 / 10 | Two 30-point PT1 samples (A, B) |
| cb2021_irr_a/b/c | IRR | 30 / 20 / 10 | irr_c ~968w (below 1080 min) |
| cb2021_iwa_a/b | IWA | 48 / 30 | iwa_b official R2=0 |

## Excluded from regression (by design)

| Sample | Reason |
|--------|--------|
| 2017 IWA A/B/C | Legacy 6-point rows (max 42); incompatible with current 48-pt rubric |
| 2018/2019/2021 IWA C | All-zero official samples |
| 2020 IWA packet | Directions/stimulus only — no student essays |

## Commands

```bash
npm run seminar:cb-regression
npm run seminar:all-regression   # existing 18 + CB samples
```
