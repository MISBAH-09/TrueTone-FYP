"""
TrueTone – Checkpoint Inspector
=================================
Run this FIRST to see the exact architecture inside each .pt / .pth file.
This tells us what classifier head was used during training.

Usage:
    python inspect_checkpoint.py
"""

import torch
from pathlib import Path

MODELS = {
    "Skin Type"   : "models/skin_type/best_model.pth",
    "Skin Tone"   : "models/skin_tone/best_model.pth",
    "Skin Disease": "models/skin_disease/best_model.pth",
}

for name, path in MODELS.items():
    print(f"\n{'═'*60}")
    print(f"  {name}  →  {path}")
    print('═'*60)

    if not Path(path).exists():
        print(f"  ✗  File not found: {path}")
        continue

    ckpt = torch.load(path, map_location="cpu", weights_only=False)

    # unwrap if wrapped
    if isinstance(ckpt, dict):
        if "model_state_dict" in ckpt:
            sd = ckpt["model_state_dict"]
            print(f"  Format : wrapped dict  (keys: {list(ckpt.keys())})")
        elif "state_dict" in ckpt:
            sd = ckpt["state_dict"]
            print(f"  Format : torchvision-style dict")
        else:
            sd = ckpt
            print(f"  Format : plain state_dict")
    else:
        print(f"  Format : full serialised model (not state_dict)")
        sd = ckpt.state_dict() if hasattr(ckpt, 'state_dict') else {}

    print(f"\n  Classifier keys & shapes:")
    for k, v in sd.items():
        if "classifier" in k:
            print(f"    {k:<45} {list(v.shape)}")

    # infer num_classes from last classifier weight
    classifier_weights = {k: v for k, v in sd.items()
                          if "classifier" in k and k.endswith(".weight")}
    if classifier_weights:
        last_key = sorted(classifier_weights.keys())[-1]
        num_classes = sd[last_key].shape[0]
        print(f"\n  ✓  Detected num_classes = {num_classes}")

    print()
