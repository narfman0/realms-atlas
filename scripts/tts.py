#!/usr/bin/env python3
"""Render narration clips for data/stories.json with Kokoro-82M (local, open weights).

Usage (from the repo root):
    .venv-tts/bin/python scripts/tts.py            # render new/changed stories only
    .venv-tts/bin/python scripts/tts.py --force    # re-render everything
    .venv-tts/bin/python scripts/tts.py --only karsus-folly weeping-war

Writes public/narration/<id>.mp3 (48 kbps mono via ffmpeg), caches a hash of the
spoken text + voice settings in public/narration/manifest.json, and fills
`audio` and `durationSec` back into data/stories.json. See docs/STORIES.md.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORIES = ROOT / "data" / "stories.json"
OUT_DIR = ROOT / "public" / "narration"
MANIFEST = OUT_DIR / "manifest.json"

ENGINE = "kokoro"
REPO_ID = "hexgrad/Kokoro-82M"
LANG = "b"  # British English
VOICE = "bm_george"
SPEED = 0.9
SAMPLE_RATE = 24000
BITRATE = "48k"

# Respellings applied to the *spoken* text only (stories.json keeps canonical spelling).
# Changing this table changes the hash, so affected clips re-render automatically.
PRONOUNCE = {
    "Faerûn": "Fair-oon",
    "Selûne": "Seh-loon",
    "Ahghairon": "Ah-gair-on",
    "Thultanthar": "Thul-tan-thar",
    "Mystryl": "Miss-trill",
    "Anauroch": "Ann-ow-rock",
    "Cormanthyr": "Kor-man-theer",
    "Eltargrim": "El-tar-grim",
    "Elturel": "El-tur-ell",
    "Crenshinibon": "Kren-shin-ih-bon",
    "Maegera": "May-gair-ah",
    "Hotenow": "Hote-now",
    "Abeir": "Ah-beer",
    "Uktar": "Ook-tar",
    "Khahan": "Kah-hahn",
    "Halruaa": "Hal-roo-ah",
    "Evereska": "Ev-er-ess-ka",
    "Ilsevele": "Il-seh-vell",
    "Raurlor": "Rowr-lor",
}


def spoken(text: str) -> str:
    for word, say in PRONOUNCE.items():
        text = re.sub(rf"\b{re.escape(word)}\b", say, text)
    return text


def clip_hash(text: str) -> str:
    key = json.dumps([ENGINE, REPO_ID, VOICE, SPEED, BITRATE, spoken(text)], ensure_ascii=False)
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]


def probe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    return round(float(out), 1)


_pipeline = None


def synth(text: str, mp3: Path) -> None:
    global _pipeline
    import numpy as np
    import soundfile as sf

    if _pipeline is None:
        from kokoro import KPipeline

        _pipeline = KPipeline(lang_code=LANG, repo_id=REPO_ID)
    chunks = []
    pause = np.zeros(int(SAMPLE_RATE * 0.25), dtype=np.float32)
    for _, _, audio in _pipeline(spoken(text), voice=VOICE, speed=SPEED, split_pattern=r"\n+"):
        chunks.append(audio.numpy() if hasattr(audio, "numpy") else audio)
        chunks.append(pause)
    lead = np.zeros(int(SAMPLE_RATE * 0.4), dtype=np.float32)
    wav = np.concatenate([lead, *chunks])
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        sf.write(tmp.name, wav, SAMPLE_RATE)
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", tmp.name, "-ac", "1", "-codec:a", "libmp3lame",
             "-b:a", BITRATE, str(mp3)],
            check=True,
        )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true", help="re-render every clip")
    ap.add_argument("--only", nargs="*", help="story ids to consider")
    args = ap.parse_args()

    stories = json.loads(STORIES.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    ids = {s["id"] for s in stories}
    for stale in set(manifest) - ids:  # story removed: drop its clip
        (OUT_DIR / f"{stale}.mp3").unlink(missing_ok=True)
        del manifest[stale]

    for s in stories:
        sid = s["id"]
        mp3 = OUT_DIR / f"{sid}.mp3"
        h = clip_hash(s["text"])
        cached = manifest.get(sid)
        wanted = not args.only or sid in args.only
        if wanted and (args.force or not mp3.exists() or not cached or cached.get("hash") != h):
            print(f"render {sid} ...", flush=True)
            synth(s["text"], mp3)
            manifest[sid] = {"hash": h, "durationSec": probe_duration(mp3), "voice": VOICE, "engine": ENGINE}
        elif cached:
            print(f"skip   {sid} (unchanged)")
        if sid in manifest and mp3.exists():
            s["audio"] = f"narration/{sid}.mp3"
            s["durationSec"] = manifest[sid]["durationSec"]
        else:
            s["audio"], s["durationSec"] = None, None

    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), indent=2) + "\n", encoding="utf-8")
    STORIES.write_text(json.dumps(stories, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum((OUT_DIR / f"{k}.mp3").stat().st_size for k in manifest)
    print(f"{len(manifest)} clips, {total / 1e6:.2f} MB, "
          f"{sum(v['durationSec'] for v in manifest.values()) / 60:.1f} min")
    return 0


if __name__ == "__main__":
    sys.exit(main())
