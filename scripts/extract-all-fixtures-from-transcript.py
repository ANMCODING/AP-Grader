#!/usr/bin/env python3
"""Extract longest available paper text from session transcript (jsonl)."""
import json
import re
from pathlib import Path

TRANSCRIPT = Path(
    "/Users/morel/.cursor/projects/Users-morel-Desktop-RESEARCH-2/agent-transcripts/"
    "41743452-7af8-4440-963a-68f777864014/41743452-7af8-4440-963a-68f777864014.jsonl"
)
TRANSCRIPT_TXT = Path(
    "/mnt/transcripts/2026-05-18-17-24-31-ap-research-grading-engine.txt"
)
OUT = Path(__file__).resolve().parent.parent / "data" / "test-papers"

PAPERS = [
    {
        "file": "paper17-first-generation-students.txt",
        "title": "The Experience of First-Generation College Students Navigating Academic Identity in a Predominantly White Institution",
        "end": "Yosso, T. J. (2005). Whose culture has capital",
        "test_num": 17,
    },
    {
        "file": "paper22-growth-mindset-resilience.txt",
        "title": "The Relationship Between Growth Mindset and Academic Resilience in High School Students Experiencing Academic Setbacks",
        "end": "Yeager, D. S., & Dweck, C. S. (2012). Mindset interventions are a scalable treatment",
        "test_num": 22,
    },
    {
        "file": "paper23-spinach-photosynthesis.txt",
        "title": "The Effect of Different Light Wavelengths on Photosynthesis Rate in Spinacia Oleracea",
        "end": "Yorio, N. C.",
        "test_num": 23,
    },
    {
        "file": "paper25-ya-fiction-mental-health.txt",
        "title": "How Are Mental Health Conditions Represented in Young Adult Fiction? A Content Analysis",
        "end": "Wahl, O. F. (1992). Mass media images of mental illness",
        "test_num": 25,
    },
    {
        "file": "paper26-bilingual-education-ell.txt",
        "title": "The Effect of Bilingual Education Programs on English Language Acquisition and Academic Identity in Elementary English Language Learners",
        "end": "Thomas, W. P., & Collier, V. P. (2002). A national study of school effectiveness",
        "test_num": 26,
    },
    {
        "file": "paper28-music-plant-growth.txt",
        "title": "The Effect of Music Genre on Plant Growth Rate in Phaseolus Vulgaris",
        "end": "Weinberger, P., & Measures, M. (1968). Effects of two audible sound sources",
        "test_num": 28,
    },
    {
        "file": "paper29-influencer-purchasing.txt",
        "title": "The Impact of Social Media Influencers on Teenage Purchasing Decisions",
        "end": "Schouten, A. P., Janssen, L., & Verspaget, M. (2020). Celebrity vs. influencer endorsements",
        "test_num": 29,
    },
    {
        "file": "paper30-cold-water-immersion.txt",
        "title": "The Effect of Cold Water Immersion Temperature on Muscle Recovery Markers and Perceived Recovery in Collegiate Club Athletes Following High-Intensity Exercise",
        "end": "Order 6: 14 degrees C, 8 degrees C, 20 degrees C",
        "test_num": 30,
    },
    {
        "file": "paper33-sleep-finals-week.txt",
        "title": "The Relationship Between Sleep Duration and Academic Performance in High School Students During Finals Week",
        "end": "Wolfson, A. R., & Carskadon, M. A. (1998). Sleep schedules and daytime functioning",
        "test_num": 33,
    },
    {
        "file": "paper35-culturally-responsive-math.txt",
        "title": "The Effect of Culturally Responsive Assessment Practices on Mathematics Achievement and Math Identity in Black Middle School Students",
        "end": "Walton, G. M., & Spencer, S. J. (2009). Latent ability",
        "test_num": 35,
    },
]


def load_messages():
    paths = [TRANSCRIPT_TXT, TRANSCRIPT]
    for path in paths:
        if not path.exists():
            continue
        if path.suffix == ".jsonl":
            for line in path.open(encoding="utf-8"):
                o = json.loads(line)
                for c in o.get("message", {}).get("content", []):
                    if c.get("type") == "text":
                        t = re.sub(r"</?user_query>", "", c.get("text", ""))
                        yield t
                    elif c.get("type") == "tool_use" and c.get("name") == "Write":
                        inp = c.get("input", {})
                        if "test-papers" in inp.get("path", ""):
                            yield inp.get("contents", "")
        else:
            yield path.read_text(encoding="utf-8")


def split_test_paper_block(text: str, num: int) -> str:
    matches = list(re.finditer(r"TEST PAPER (\d+)", text))
    for i, m in enumerate(matches):
        if int(m.group(1)) != num:
            continue
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        return text[start:end].strip()
    return ""


def extract_title_to_end(text: str, title: str, end: str) -> str:
    si = text.find(title)
    if si < 0:
        return ""
    ei = text.find(end, si)
    if ei < 0:
        return ""
    tail = text[ei : ei + 900]
    m = re.search(
        r"[\s\S]+?(?:https?://[^\s]+|Child Development|Psychological Science|"
        r"HortScience|International Journal of Advertising|Botany)[^\n]*",
        tail,
    )
    endpos = ei + (m.end() if m else len(tail))
    return text[si:endpos].strip()


def clean_fixture(text: str, title: str) -> str:
    text = re.sub(r"^TEST PAPER \d+[^\n]*\n", "", text)
    text = re.sub(r"^[^\n]+\nExpected score:[^\n]+\n", "", text, flags=re.I)
    text = re.sub(r"^Strong [^\n]+\n", "", text)
    text = re.sub(r"^This paper [^\n]+\n", "", text)
    si = text.find(title)
    if si > 0:
        text = text[si:]
    return text.strip()


def best_for_paper(spec: dict, messages) -> tuple:
    best = ""
    num = spec["test_num"]
    title = spec["title"]
    end = spec["end"]

    for t in messages:
        candidates = []
        block = split_test_paper_block(t, num)
        if block:
            candidates.append(clean_fixture(block, title))
        candidates.append(clean_fixture(extract_title_to_end(t, title, end), title))
        if title in t:
            # from title to next Paper N / TEST PAPER
            si = t.find(title)
            rest = t[si:]
            m = re.search(r"\n(?:Paper \d+|TEST PAPER \d+)", rest[3000:])
            if m:
                candidates.append(clean_fixture(rest[: 3000 + m.start()], title))
            else:
                candidates.append(clean_fixture(extract_title_to_end(t, title, end), title))

        for c in candidates:
            if len(c.split()) > len(best.split()):
                best = c

    return best, len(best.split())


def main():
    messages = list(load_messages())
    print(f"Loaded {len(messages)} transcript segments\n")

    for spec in PAPERS:
        text, wc = best_for_paper(spec, messages)
        out = OUT / spec["file"]
        if not text:
            print(f"FAIL {spec['file']}: not found in transcript")
            continue
        out.write_text(text + "\n", encoding="utf-8")
        print(f"Wrote {spec['file']}: {wc} words")

    print("\nDone.")


if __name__ == "__main__":
    main()
