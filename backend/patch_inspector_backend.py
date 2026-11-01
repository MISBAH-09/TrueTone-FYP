"""
patch_inspector_backend.py
--------------------------
Adds the extra data the Pipeline Inspector page shows to evaluators:
  pipeline_engine.py          original photo size, faces detected, confidence
                              thresholds, and the 7 raw disease outputs
  Recommendations/views.py    optional "dry run" so the Inspector can preview
                              recommendations for the scan without saving anything

Run from the backend folder (the one with manage.py):
    python patch_inspector_backend.py

It saves a .bak copy of each file first and is safe to run twice.
If an anchor can't be found it tells you which one and changes nothing in that file.
"""
from pathlib import Path

HERE = Path(__file__).resolve().parent
MARK = "# inspector-patch"


def apply(path, edits):
    p = Path(path)
    if not p.exists():
        print(f"SKIP  {p}  (file not found)")
        return False
    s = p.read_text(encoding="utf-8")
    if MARK in s:
        print(f"OK    {p.name}: already patched")
        return True
    for label, old, new in edits:
        n = s.count(old)
        if n != 1:
            print(f"FAIL  {p.name}: could not find '{label}' exactly once (found {n}). Nothing changed in this file.")
            return False
        s = s.replace(old, new)
    p.with_name(p.name + ".bak").write_text(p.read_text(encoding="utf-8"), encoding="utf-8")
    p.write_text(s, encoding="utf-8")
    print(f"DONE  {p.name}: {len(edits)} edits applied, backup saved as {p.name}.bak")
    return True


# ─────────────────────────── pipeline_engine.py ───────────────────────────
engine_edits = [
    ("original size, before cropping",
     '    pil_img = pil_img.convert("RGB")\n    from inference.face_crop import crop_face_natural\n',
     '    pil_img = pil_img.convert("RGB")\n'
     '    orig_w, orig_h = pil_img.size  # inspector-patch: size before the face crop\n'
     '    from inference.face_crop import crop_face_natural\n'),

    ("info dict",
     '        "crop_box": crop_box,\n    }\n    return tensor, pil_img, info',
     '        "crop_box": crop_box,\n'
     '        "original_width": orig_w,\n'
     '        "original_height": orig_h,\n'
     '        "faces_detected": int(num_faces),\n'
     '        "face_found": bool(_found),\n'
     '    }\n    return tensor, pil_img, info'),

    ("clean_info in _aggregate",
     '        "crop_box": image_info.get("crop_box"),\n',
     '        "crop_box": image_info.get("crop_box"),\n'
     '        "original_width": image_info.get("original_width"),\n'
     '        "original_height": image_info.get("original_height"),\n'
     '        "faces_detected": image_info.get("faces_detected"),\n'
     '        "face_found": image_info.get("face_found"),\n'),

    ("clean_info in _run_selective",
     '            "crop_box": info.get("crop_box"),\n',
     '            "crop_box": info.get("crop_box"),\n'
     '            "original_width": info.get("original_width"),\n'
     '            "original_height": info.get("original_height"),\n'
     '            "faces_detected": info.get("faces_detected"),\n'
     '            "face_found": info.get("face_found"),\n'),

    ("keep the raw model labels before merging",
     '    raw_probs = probs.tolist()\n',
     '    raw_probs = probs.tolist()\n'
     '    raw_labels = list(class_labels)  # inspector-patch: labels as the model outputs them\n'),

    ("return dict of _infer_one",
     '        "is_healthy": is_healthy_pred,\n',
     '        "is_healthy": is_healthy_pred,\n'
     '        "threshold": confidence_threshold,\n'
     '        "raw_distribution": (\n'
     '            {lbl: round(raw_probs[i], 4) for i, lbl in enumerate(raw_labels)}\n'
     '            if model_name == "skin_disease" else None\n'
     '        ),\n'),

    ("skin_type entry in _aggregate",
     '                "distribution": type_res["all_probs"],\n',
     '                "distribution": type_res["all_probs"],\n'
     '                "threshold": type_res.get("threshold"),\n'),

    ("skin_tone entry in _aggregate",
     '                "distribution": tone_res["all_probs"],\n',
     '                "distribution": tone_res["all_probs"],\n'
     '                "threshold": tone_res.get("threshold"),\n'),

    ("skin_disease entry in _aggregate",
     '                "distribution": disease_res["all_probs"],\n',
     '                "distribution": disease_res["all_probs"],\n'
     '                "threshold": disease_res.get("threshold"),\n'
     '                "raw_distribution": disease_res.get("raw_distribution"),\n'),

    ("entries in _run_selective",
     '                "distribution": r["all_probs"],\n            }\n            if key == "skin_disease":',
     '                "distribution": r["all_probs"],\n'
     '                "threshold": r.get("threshold"),\n'
     '                "raw_distribution": r.get("raw_distribution"),\n'
     '            }\n            if key == "skin_disease":'),
]

# ───────────────────────── Recommendations/views.py ─────────────────────────
views_edits = [
    ("helper above get_recommendations",
     '@csrf_exempt\n@require_http_methods(["POST"])\n@require_token\ndef get_recommendations(request):',
     '''# inspector-patch: dry-run support for the Pipeline Inspector page
def _read_profile_override(request):
    """
    Optional dry run. The Inspector page sends the profile it
    just scanned as JSON: {"profile_override": {"skin_type", "skin_tone",
    "skin_conditions": []}}. Returns a sanitised dict, or None for a normal request.
    Nothing is saved - age, allergies and pregnancy still come from the saved profile.
    """
    import json
    import re
    try:
        body = json.loads(request.body or b"{}")
    except (ValueError, TypeError):
        return None
    raw = body.get("profile_override") if isinstance(body, dict) else None
    if not isinstance(raw, dict):
        return None
    clean = {}
    if raw.get("skin_type") in ("oily", "dry", "combination", "normal"):
        clean["skin_type"] = raw["skin_type"]
    if raw.get("skin_tone") in ("fair", "medium", "dark"):
        clean["skin_tone"] = raw["skin_tone"]
    if isinstance(raw.get("skin_conditions"), list):
        clean["skin_conditions"] = [
            c.strip().lower() for c in raw["skin_conditions"]
            if isinstance(c, str) and re.fullmatch(r"[A-Za-z_]{1,40}", c.strip())
        ][:5]
    return clean or None


@csrf_exempt
@require_http_methods(["POST"])
@require_token
def get_recommendations(request):'''),

    ("apply the override before scoring",
     '    )\n\n    try:\n        engine = get_engine()\n        result = engine.recommend(profile)',
     '''    )

    profile_source = "saved_profile"
    override = _read_profile_override(request)
    if override:
        if "skin_type" in override:
            profile.skin_type = override["skin_type"]
        if "skin_tone" in override:
            profile.skin_tone = override["skin_tone"]
        if "skin_conditions" in override:
            profile.skin_conditions = override["skin_conditions"]
        profile_source = "scan_preview"

    try:
        engine = get_engine()
        result = engine.recommend(profile)'''),

    ("tell the page which profile was used",
     '        "not_relevant_count": result["not_relevant_count"],\n    })',
     '''        "not_relevant_count": result["not_relevant_count"],
        "profile_used": {
            "source": profile_source,
            "skin_type": profile.skin_type,
            "skin_tone": profile.skin_tone,
            "skin_conditions": list(profile.skin_conditions),
            "age_bracket": profile.age_bracket,
            "allergies": list(profile.allergies),
            "is_pregnant_or_breastfeeding": profile.is_pregnant_or_breastfeeding,
        },
    })'''),
]

if __name__ == "__main__":
    a = apply(HERE / "pipeline_engine.py", engine_edits)
    b = apply(HERE / "Recommendations" / "views.py", views_edits)
    print("\nAll good. Restart the backend (Ctrl+C, then: python manage.py runserver 8000)." if a and b
          else "\nSomething was skipped or failed - read the lines above.")