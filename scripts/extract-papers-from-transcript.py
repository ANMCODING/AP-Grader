#!/usr/bin/env python3
"""Extract full test papers from session transcript (jsonl or txt)."""
import json
import re
import sys
from pathlib import Path

TRANSCRIPT_PATHS = [
    Path("/mnt/transcripts/2026-05-18-17-24-31-ap-research-grading-engine.txt"),
    Path(
        "/Users/morel/.cursor/projects/Users-morel-Desktop-RESEARCH-2/agent-transcripts/"
        "41743452-7af8-4440-963a-68f777864014/41743452-7af8-4440-963a-68f777864014.jsonl"
    ),
]

OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "test-papers"

PAPERS = [
    {
        "file": "paper17-first-generation-students.txt",
        "start": "The Experience of First-Generation College Students Navigating Academic Identity in a Predominantly White Institution",
        "end": "Yosso, T. J. (2005). Whose culture has capital",
        "min_words": 3500,
    },
    {
        "file": "paper22-growth-mindset-resilience.txt",
        "start": "The Relationship Between Growth Mindset and Academic Resilience in High School Students Experiencing Academic Setbacks",
        "end": "Yeager, D. S., & Dweck, C. S. (2012). Mindset interventions are a scalable treatment",
        "min_words": 3500,
    },
    {
        "file": "paper23-spinach-photosynthesis.txt",
        "start": "The Effect of Different Light Wavelengths on Photosynthesis Rate in Spinacia Oleracea",
        "end": "Yorio, N. C.",
        "end_alt": "HortScience",
        "min_words": 3500,
    },
    {
        "file": "paper25-ya-fiction-mental-health.txt",
        "start": "How Are Mental Health Conditions Represented in Young Adult Fiction? A Content Analysis",
        "end": "Wahl, O. F. (1992). Mass media images of mental illness",
        "min_words": 3200,
    },
    {
        "file": "paper26-bilingual-education-ell.txt",
        "start": "The Effect of Bilingual Education Programs on English Language Acquisition and Academic Identity in Elementary English Language Learners",
        "end": "Thomas, W. P., & Collier, V. P. (2002). A national study of school effectiveness",
        "min_words": 3500,
    },
    {
        "file": "paper28-music-plant-growth.txt",
        "start": "The Effect of Music Genre on Plant Growth Rate in Phaseolus Vulgaris",
        "end": "Weinberger, P., & Measures, M. (1968). Effects of two audible sound sources",
        "min_words": 3000,
    },
    {
        "file": "paper29-influencer-purchasing.txt",
        "start": "The Impact of Social Media Influencers on Teenage Purchasing Decisions",
        "end": "Schouten, A. P., Janssen, L., & Verspaget, M. (2020). Celebrity vs. influencer endorsements",
        "min_words": 2800,
    },
    {
        "file": "paper30-cold-water-immersion.txt",
        "start": "The Effect of Cold Water Immersion Temperature on Muscle Recovery Markers and Perceived Recovery in Collegiate Club Athletes Following High-Intensity Exercise",
        "end": "Order 6: 14 degrees C, 8 degrees C, 20 degrees C",
        "min_words": 4000,
    },
    {
        "file": "paper33-sleep-finals-week.txt",
        "start": "The Relationship Between Sleep Duration and Academic Performance in High School Students During Finals Week",
        "end": "Wolfson, A. R., & Carskadon, M. A. (1998). Sleep schedules and daytime functioning",
        "min_words": 3200,
    },
    {
        "file": "paper35-culturally-responsive-math.txt",
        "start": "The Effect of Culturally Responsive Assessment Practices on Mathematics Achievement and Math Identity in Black Middle School Students",
        "end": "Walton, G. M., & Spencer, S. J. (2009). Latent ability",
        "min_words": 4000,
    },
]


def load_corpus() -> str:
    for p in TRANSCRIPT_PATHS:
        if not p.exists():
            continue
        if p.suffix == ".jsonl":
            chunks = []
            for line in p.open(encoding="utf-8"):
                try:
                    o = json.loads(line)
                except json.JSONDecodeError:
                    continue
                for c in o.get("message", {}).get("content", []):
                    if c.get("type") == "text":
                        t = c.get("text", "")
                        t = re.sub(r"</?user_query>", "", t)
                        chunks.append(t)
            return "\n\n".join(chunks)
        return p.read_text(encoding="utf-8")
    raise FileNotFoundError("No transcript found at expected paths")


def extract_paper(corpus: str, spec: dict):
    start = spec["start"]
    idx = corpus.find(start)
    if idx < 0:
        return None
    # Include AP Research header if title is not at very start
    block_start = idx
    for back in ["AP Research\nApril 2025", "Word Count:"]:
        p = corpus.rfind(back, max(0, idx - 200), idx)
        if p >= 0 and idx - p < 150:
            block_start = min(block_start, p)
    # Prefer starting at title
    block_start = idx

    end_markers = [spec["end"]]
    if spec.get("end_alt"):
        end_markers.append(spec["end_alt"])

    best_end = -1
    for em in end_markers:
        e = corpus.find(em, idx)
        if e < 0:
            continue
        # extend to end of reference line / paragraph
        line_end = corpus.find("\n\n", e)
        if line_end < 0:
            line_end = len(corpus)
        else:
            line_end += 2
            # include rest of references section until next TEST PAPER or user_query
            next_break = re.search(
                r"\n(?:TEST PAPER \d+|</?user_query>|My expectations:)",
                corpus[e:],
            )
            if next_break:
                line_end = min(line_end, e + next_break.start())
            else:
                # take through end of reference entry (next blank + non-ref)
                rest = corpus[e : e + 800]
                m = re.search(
                    r"(.{0,400}?(?:https?://[^\s]+|Child Development|Psychological Science|HortScience|International Journal of Advertising)[^\n]*\n?)",
                    rest,
                    re.DOTALL,
                )
                if m:
                    line_end = e + m.end()

        if line_end > best_end:
            best_end = line_end

    if best_end < 0:
        return None

    text = corpus[block_start:best_end].strip()
    # Trim trailing meta about expectations
    text = re.split(r"\n(?:My expectations:|TEST PAPER \d+)", text)[0].strip()
    return text


def main():
    corpus = load_corpus()
    print(f"Corpus length: {len(corpus.split())} words from transcript")

    results = []
    for spec in PAPERS:
        text = extract_paper(corpus, spec)
        out = OUT_DIR / spec["file"]
        if not text:
            print(f"FAIL {spec['file']}: start marker not found")
            results.append((spec["file"], False, 0))
            continue
        wc = len(text.split())
        out.write_text(text + "\n", encoding="utf-8")
        ok = wc >= spec["min_words"]
        print(f"{'OK' if ok else 'WARN'} {spec['file']}: {wc} words (min {spec['min_words']})")
        results.append((spec["file"], ok, wc))

    if not all(r[1] for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
