r"""
diagnose_disease.py - find out WHY the condition model keeps saying "acne".

Run from the backend folder with the .venv active. Point it at ANY folder of photos:
    python diagnose_disease.py "C:\path\to\photos" --skip-face-check

No sorting needed. The true type is read from the file name:
    ca1test.png / cy1test.png -> acne     e1test.jpg -> eczema      ps1test.png / psy2test.png -> psoriasis
    r1test.jpg -> rosacea                 tr1test.png -> tinea      h1.jpg or healthy1.jpg -> healthy
(Photos with other names are still analysed, just without a right/wrong verdict.
 Photos inside subfolders named healthy / eczema / psoriasis / rosacea / tinea_ringworm /
 comedonal_acne / cystic_acne also work.)
"""
import re
import sys
import logging
from collections import Counter, defaultdict
from pathlib import Path

logging.basicConfig(level=logging.WARNING)

from pipeline_engine import get_pipeline

EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
ACNE = ("common_acne", "cystic_acne")
# folder name -> the label the app should report
EXPECT = {
    "healthy": "healthy", "eczema": "eczema", "psoriasis": "psoriasis", "rosacea": "rosacea",
    "tinea": "tinea", "tinea_ringworm": "tinea",
    "acne": "common_acne", "common_acne": "common_acne", "comedonal_acne": "common_acne", "cystic_acne": "common_acne",
}


NAME_RULES = [
    (re.compile(r"^(ca|cy)\d"), "common_acne"),
    (re.compile(r"^(acne|cystic|comedonal|common)"), "common_acne"),
    (re.compile(r"^(e\d|eczema)"), "eczema"),
    (re.compile(r"^(psy?\d|psoriasis)"), "psoriasis"),
    (re.compile(r"^(r\d|rosacea)"), "rosacea"),
    (re.compile(r"^(tr\d|tinea)"), "tinea"),
    (re.compile(r"^(h\d|healthy)"), "healthy"),
]


def truth_from_name(stem):
    s = stem.lower()
    for rx, label in NAME_RULES:
        if rx.match(s):
            return label
    return None


def app_label(raw_label):
    """What the raw model class becomes in the app (both acne types read as acne)."""
    return "common_acne" if raw_label in ACNE else raw_label


def collect(root):
    items = []
    for p in sorted(root.iterdir()):
        if p.is_file() and p.suffix.lower() in EXTS:
            items.append((p, truth_from_name(p.stem), "(file name)"))
        elif p.is_dir():
            truth = EXPECT.get(p.name.lower())
            for q in sorted(p.rglob("*")):
                if q.is_file() and q.suffix.lower() in EXTS:
                    items.append((q, truth, p.name))
    return items


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    skip = "--skip-face-check" in sys.argv
    if not args:
        print(__doc__)
        sys.exit(1)
    root = Path(args[0])
    if not root.is_dir():
        print(f"Folder not found: {root}")
        sys.exit(1)
    items = collect(root)
    if not items:
        print(f"No images found in {root}")
        sys.exit(1)

    pipeline = get_pipeline()
    rows = []
    print(f"\n{'photo':<28}{'really is':<16}{'model top class (raw)':<26}{'app says':<22}note")
    print("-" * 110)
    for path, truth, group in items:
        res = pipeline.analyze_all(path.read_bytes(), path.name, skip_face_check=skip)
        name = f"{group}/{path.name}"[:27]
        if res.get("status") != "success":
            print(f"{name:<28}{(truth or '?'):<16}NOT ANALYZED: {res.get('error_code') or res.get('message') or res.get('errors')}")
            continue
        d = res["predictions"]["skin_disease"]
        raw = d.get("raw_distribution")
        if not raw:
            print("\nThe engine has no raw_distribution yet. Run:  python patch_inspector_backend.py   and restart.")
            sys.exit(1)
        raw_top = max(raw, key=raw.get)
        app = d["label"]
        shown = f"{app} {d['confidence']:.0%}" + ("" if d["is_confident"] else " (unclear)")
        flip = app == "common_acne" and raw_top not in ACNE
        note = "SUM-FLIP: acne only wins because two acne classes are added up" if flip else ""
        print(f"{name:<28}{(truth or '?'):<16}{raw_top + f' {raw[raw_top]:.0%}':<26}{shown:<22}{note}")
        rows.append({"truth": truth, "raw_top": raw_top, "app": app, "unclear": not d["is_confident"], "flip": flip})

    if not rows:
        return
    print("\n" + "=" * 110)
    print("WHAT THE APP SAID, across all photos:", dict(Counter(r["app"] for r in rows)))
    print("WHAT THE MODEL'S SINGLE TOP CLASS WAS:", dict(Counter(r["raw_top"] for r in rows)))
    flips = sum(r["flip"] for r in rows)
    print(f"SUM-FLIPS (acne won only because of the merge): {flips} of {len(rows)}")

    known = [r for r in rows if r["truth"]]
    if known:
        print("\nACCURACY PER KIND OF PHOTO (true type read from the file names)")
        print(f"{'really is':<14}{'photos':>7}{'app correct':>14}{'top class correct':>20}   app answered")
        by = defaultdict(list)
        for r in known:
            by[r["truth"]].append(r)
        for truth, rs in sorted(by.items()):
            ok_app = sum(r["app"] == truth for r in rs)
            ok_raw = sum(app_label(r["raw_top"]) == truth for r in rs)
            ans = dict(Counter(r["app"] for r in rs))
            print(f"{truth:<14}{len(rs):>7}{ok_app:>10}/{len(rs):<3}{ok_raw:>16}/{len(rs):<3}   {ans}")
        print("\nHOW TO READ THIS")
        print(" - 'app correct' much lower than 'top class correct'  ->  the acne merge is pushing results to acne.")
        print(" - Both low on photos from the training test set       ->  a pipeline problem (wrong model file, order or preprocessing).")
        print(" - Good on training test photos, bad on web/phone ones ->  the model does not generalise (a data problem, not a code bug).")


if __name__ == "__main__":
    main()