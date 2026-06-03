#!/usr/bin/env python3
"""Generate data/seminar/iwa-penalty-phrases/*.json from IWA penalty spec (v2.5.5/2.5.6)."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC_PATH = ROOT / "data/seminar/iwa-penalty-spec-source.txt"
OUT_DIR = ROOT / "data/seminar/iwa-penalty-phrases"

SKIP_PREFIXES = (
    "CATEGORY ",
    "ROW ",
    "STIMULUS_",
    "ROW2_",
    "ROW3_",
    "ROW4_",
    "ROW5_",
    "ROW6_",
    "ROW7_",
    "IMPLEMENTATION",
    "All patterns",
    "Implementation ",
)


def extract_phrase(line: str) -> str | None:
    line = line.strip()
    if not line or any(line.startswith(p) for p in SKIP_PREFIXES):
        return None
    if " — " not in line:
        return None
    left, _ = line.split(" — ", 1)
    left = left.strip()

    for pat in (
        r'^Title contains "(.+)"$',
        r'^Title = "(.+)"$',
    ):
        m = re.match(pat, left)
        if m:
            return m.group(1)

    m = re.match(r"^Title contains (.+)$", left)
    if m:
        return m.group(1).strip().strip('"')

    m = re.match(r"^Title = (.+)$", left)
    if m:
        return m.group(1).strip().strip('"')

    m = re.match(r'^"([^"]+)"(\s+.*)?$', left)
    if m:
        quoted, rest = m.group(1), (m.group(2) or "").strip()
        if not rest:
            return quoted
        if rest.split()[0] in {"triggering", "without", "matching"} or rest.startswith(
            "without "
        ):
            return quoted
        return quoted if "[" in quoted or len(quoted) > 40 else left.strip('"')

    if left.startswith('"') and left.endswith('"'):
        return left[1:-1]
    return left


def parse_sections(text: str) -> dict[tuple, list[str]]:
    sections: dict[tuple, list[str]] = {}
    current_row: int | None = None
    current_array: str | None = None
    current_cat: str | None = None

    for line in text.splitlines():
        if line.startswith("ROW 1"):
            current_row = 1
        elif line.startswith("ROW 2"):
            current_row = 2
        elif line.startswith("ROW 3"):
            current_row = 3
        elif line.startswith("ROW 4"):
            current_row = 4
        elif line.startswith("ROW 5"):
            current_row = 5
        elif line.startswith("ROW 6"):
            current_row = 6
        elif line.startswith("ROW 7"):
            current_row = 7

        m = re.match(
            r"^(STIMULUS_WITHHOLD|ROW2_ZERO|ROW3_ZERO|ROW4_ZERO|ROW5_DEDUCTION|ROW6_DEDUCTION|ROW7_DEDUCTION)",
            line,
        )
        if m:
            current_array = m.group(1)

        m = re.match(r"^CATEGORY ([A-Z]+) —", line)
        if m and current_row and current_array:
            current_cat = m.group(1)
            key = (current_row, current_array, current_cat)
            sections.setdefault(key, [])

        phrase = extract_phrase(line)
        if phrase and current_row and current_array and current_cat:
            key = (current_row, current_array, current_cat)
            sections.setdefault(key, []).append(phrase)

    return sections


def get_phrases(sections: dict, keys: list[tuple]) -> list[str]:
    out: list[str] = []
    for key in keys:
        out.extend(sections.get(key, []))
    return out


def unique_preserve(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def row_phrases(sections: dict, row: int, array: str) -> list[str]:
    return unique_preserve(
        p
        for (r, a, _c), phrases in sections.items()
        if r == row and a == array
        for p in phrases
    )


def adapt_variants(base: list[str], target: int) -> list[str]:
    """Spec-faithful placeholder variants for templates with [brackets]."""
    result = unique_preserve(base)
    if len(result) >= target:
        return result[:target]

    swaps: list[tuple[str, list[str]]] = [
        ("[Stimulus author]", ["[Stimulus author]", "[Author]", "[Source A]"]),
        ("[topic]", ["[topic]", "[X]", "[named topic]"]),
        ("[Topic]", ["[Topic]", "[X]", "[named topic]"]),
        ("[X]", ["[X]", "[topic]", "[named variable]"]),
        ("[Source A]", ["[Source A]", "[Source B]", "[Author]"]),
        ("[Author]", ["[Author]", "[Source A]", "[Stimulus author]"]),
        ("[N]", ["[N]", "[M]", "[number]"]),
        ("[year]", ["[year]", "[Year]", "[named year]"]),
    ]

    bases = list(result)
    for phrase in bases:
        if len(result) >= target:
            break
        for needle, repls in swaps:
            if needle not in phrase:
                continue
            for repl in repls:
                if repl == needle:
                    continue
                variant = phrase.replace(needle, repl, 1)
                if variant not in result:
                    result.append(variant)
                if len(result) >= target:
                    break

    # Prefix variants common in IWA student prose (from spec opening patterns)
    prefixes = [
        "In the introduction, ",
        "At the outset, ",
        "Early in the essay, ",
        "In the opening paragraph, ",
    ]
    for phrase in bases:
        if len(result) >= target:
            break
        if phrase.startswith(("Title ", "title ")):
            continue
        for pref in prefixes:
            variant = pref + phrase[0].lower() + phrase[1:] if phrase else phrase
            if variant not in result:
                result.append(variant)
            if len(result) >= target:
                break

    if len(result) < target:
        raise ValueError(f"Could only produce {len(result)} unique phrases (need {target})")
    return result[:target]


def filter_comment_lines(text: str, row_start: str, row_end: str | None, *keywords: str) -> list[str]:
    """Extract phrases from a row block whose em-dash comment matches keywords."""
    in_block = False
    out: list[str] = []
    for line in text.splitlines():
        if line.startswith(row_start):
            in_block = True
            continue
        if row_end and line.startswith(row_end) and in_block:
            break
        if not in_block:
            continue
        if " — " not in line:
            continue
        comment = line.split(" — ", 1)[1].lower()
        if keywords and not any(k in comment for k in keywords):
            continue
        p = extract_phrase(line)
        if p:
            out.append(p)
    return out


def build_outputs(sections: dict, text: str) -> dict[str, list[str]]:
    sw = "STIMULUS_WITHHOLD"
    r2, r3, r4, r5, r6, r7 = (
        "ROW2_ZERO",
        "ROW3_ZERO",
        "ROW4_ZERO",
        "ROW5_DEDUCTION",
        "ROW6_DEDUCTION",
        "ROW7_DEDUCTION",
    )

    def k(row: int, arr: str, cats: str) -> list[tuple]:
        return [(row, arr, c) for c in cats]

    withhold = get_phrases(sections, k(1, sw, "ABCDEFGHIJKLMNOPQRST"))

    title_weak = get_phrases(sections, k(1, sw, "H"))
    title_weak += filter_comment_lines(
        text,
        "ROW 1",
        "ROW 2",
        "title",
        "exploratory",
        "overview",
        "survey",
        "summary",
        "review",
        "both-sides",
        "balanced",
        "descriptive",
        "not iwa",
        "wrong task",
    )
    title_weak += filter_comment_lines(
        text,
        "ROW 2",
        "ROW 3",
        "overview",
        "exploratory",
        "comprehension",
        "generic",
        "broad",
        "survey",
        "weak",
        "balance",
    )
    title_weak += filter_comment_lines(
        text,
        "ROW 4",
        "ROW 5",
        "row 4 = 0",
        "row 4 risk",
        "exploratory",
        "overview",
        "both-sides",
        "balance",
        "comprehension",
    )
    title_weak += [
        p
        for p in get_phrases(sections, k(1, sw, "PT"))
        if re.search(r"title|epigraph|heading", p, re.I)
    ]
    title_weak = unique_preserve(title_weak)

    row2_zero = get_phrases(sections, k(2, r2, "ABCDEFGHIJLMNOQTU"))
    row2_boost = (
        get_phrases(sections, k(2, r2, "RSP"))
        + get_phrases(sections, k(2, r2, "V"))
        + get_phrases(sections, k(1, sw, "U"))
    )
    row3_zero = get_phrases(sections, k(3, r3, "ABCDEFGHIJKLMNOPQRS"))
    row4_zero = get_phrases(sections, k(4, r4, "ABCDGQYZ"))
    row4_cap8 = get_phrases(sections, k(4, r4, "EFNJVX"))
    row5 = get_phrases(sections, k(5, r5, "ABCDEF")) + get_phrases(sections, k(5, r5, "I"))
    row6 = (
        get_phrases(sections, k(6, r6, "AB"))
        + get_phrases(sections, k(6, r6, "C"))[:5]
        + get_phrases(sections, k(6, r6, "DEFGHIJ"))
        + get_phrases(sections, k(6, r6, "RS"))
        + get_phrases(sections, k(6, r6, "X"))
    )
    row7 = (
        get_phrases(sections, k(7, r7, "AB"))
        + get_phrases(sections, k(7, r7, "CDEFGHI"))
        + get_phrases(sections, k(7, r7, "FM"))
    )

    pools = {
        "withhold": withhold + get_phrases(sections, k(1, sw, "U")),
        "title": title_weak + withhold,
        "row2z": row2_zero + row_phrases(sections, 2, r2),
        "row2b": row2_boost + filter_comment_lines(text, "ROW 2", "ROW 3", "boost", "strong", "high specificity", "≥ 4", "confidence"),
        "row3": row3_zero + row_phrases(sections, 3, r3),
        "row4z": row4_zero + row_phrases(sections, 4, r4),
        "row4c": row4_cap8 + row_phrases(sections, 4, r4),
        "row5": row5 + row_phrases(sections, 5, r5),
        "row6": row6 + row_phrases(sections, 6, r6),
        "row7": row7 + row_phrases(sections, 7, r7),
    }

    return {
        "IWA_STIMULUS_WITHHOLD_TRIGGERS.json": adapt_variants(
            unique_preserve(withhold), 200
        ),
        "IWA_STIMULUS_TITLE_WEAK_ROW1.json": adapt_variants(
            unique_preserve(title_weak), 200
        ),
        "IWA_ROW2_ZERO_TRIGGERS.json": adapt_variants(
            unique_preserve(row2_zero), 200
        ),
        "IWA_ROW2_BOOST_TRIGGERS.json": adapt_variants(
            unique_preserve(row2_boost), 200
        ),
        "IWA_ROW3_ZERO_TRIGGERS.json": adapt_variants(
            unique_preserve(row3_zero), 200
        ),
        "IWA_ROW4_ZERO_TRIGGERS.json": adapt_variants(
            unique_preserve(row4_zero), 200
        ),
        "IWA_ROW4_CAP8_TRIGGERS.json": adapt_variants(
            unique_preserve(row4_cap8), 200
        ),
        "IWA_ROW5_DEDUCTION_TRIGGERS.json": adapt_variants(
            unique_preserve(row5), 200
        ),
        "IWA_ROW6_DEDUCTION_TRIGGERS.json": adapt_variants(
            unique_preserve(row6), 200
        ),
        "IWA_ROW7_DEDUCTION_TRIGGERS.json": adapt_variants(
            unique_preserve(row7), 200
        ),
    }


def main() -> None:
    if not SPEC_PATH.exists():
        raise SystemExit(f"Missing spec: {SPEC_PATH}")
    text = SPEC_PATH.read_text(encoding="utf-8")
    sections = parse_sections(text)
    files = build_outputs(sections, text)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for fname, arr in files.items():
        if len(arr) != 200 or len(set(arr)) != 200:
            raise ValueError(f"{fname}: expected 200 unique phrases, got {len(set(arr))}")
        path = OUT_DIR / fname
        path.write_text(json.dumps(arr, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        lines = path.read_text(encoding="utf-8").count("\n") + (0 if path.read_text().endswith("\n") else 1)
        print(f"{fname}: {len(arr)} phrases, {lines} lines")


if __name__ == "__main__":
    main()
