#!/usr/bin/env python3
"""
Generate audio-manifest.json by scanning local audio folders.

Usage:
  python generate_audio_manifest.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
AUDIO_ROOT = ROOT / "audio"
OUT_FILE = ROOT / "audio-manifest.json"
EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"}


def rel_posix(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def human_name(path: Path) -> str:
    name = path.stem.replace("_", " ").replace("-", " ").strip()
    if not name:
        return "Track"
    return " ".join(part.capitalize() for part in name.split())


def scan_bucket(bucket: str) -> tuple[list[str], list[str]]:
    folder = AUDIO_ROOT / bucket
    if not folder.exists():
        return [], []

    files = sorted(
        p for p in folder.rglob("*")
        if p.is_file() and p.suffix.lower() in EXTENSIONS
    )
    rel = [rel_posix(p) for p in files]
    names = [human_name(p) for p in files]
    return rel, names


def pick_panic() -> str:
    folder = AUDIO_ROOT / "panic"
    if not folder.exists():
        return ""
    files = sorted(
        p for p in folder.rglob("*")
        if p.is_file() and p.suffix.lower() in EXTENSIONS
    )
    if not files:
        return ""
    return rel_posix(files[0])


def main() -> int:
    funny, funny_names = scan_bucket("funny")
    romantic, romantic_names = scan_bucket("romantic")
    panic = pick_panic()

    payload = {
        "funny": funny,
        "romantic": romantic,
        "panic": panic,
        "trackNames": {
            "funny": funny_names,
            "romantic": romantic_names,
        },
    }

    OUT_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_FILE}")
    print(f"Funny tracks: {len(funny)}")
    print(f"Romantic tracks: {len(romantic)}")
    print(f"Panic track: {panic or '(none)'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
