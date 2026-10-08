# Stories and narration

The atlas has short narrated vignettes ("Hear the tale") tied to major events. Each is read by one
consistent in-world narrator, **an Avowed of Candlekeep** reading aloud from the Chronicles. See
`docs/SPEC-2.md` (Narration) for the UI behavior.

## Files

| Path | What |
| --- | --- |
| `data/stories.json` | The stories (schema below). |
| `public/narration/<id>.mp3` | Pre-rendered audio, 48 kbps mono. |
| `public/narration/manifest.json` | Per-clip text hash + duration; lets `scripts/tts.py` skip unchanged clips. |
| `scripts/tts.py` | Renders clips with Kokoro-82M and writes `audio`/`durationSec` back into `data/stories.json`. |

## Adding or editing a story

1. Append an object to `data/stories.json`:

   ```jsonc
   {
     "id": "kebab-case-id",            // also the mp3 filename
     "title": "The Folly of Karsus",
     "year": -339,                     // DR
     "worldId": "toril",
     "placeIds": ["thultanthar", "anauroch"], // first one is where the camera flies
     "eventTitle": "Karsus's Folly and the fall of Netheril", // exact data/timeline.json title, or null
     "narrator": "an Avowed of Candlekeep",
     "text": "120–180 words ...",
     "audio": null,                    // filled by scripts/tts.py
     "durationSec": null               // filled by scripts/tts.py
   }
   ```

2. Writing rules:
   - 120–180 words (about 55–70 s of audio). Original prose only: never paste or lightly reword wiki
     text. A quick check is to compare 6-word runs of your text against the relevant wiki pages
     (`curl -s 'https://forgottenrealms.fandom.com/api.php?action=parse&page=<Page>&prop=wikitext&format=json'`).
   - Keep years, names and outcomes consistent with `data/timeline.json` and `data/places/*.json`.
   - Stay in the narrator's voice: a Candlekeep scholar, first person allowed, dry asides welcome.
   - Write for the ear: spell out awkward numbers ("Three hundred and thirty-nine years before..."),
     avoid parentheses and abbreviations. Plain years like 1372 are read correctly.
3. Regenerate audio (below), then commit `data/stories.json` and `public/narration/` together.

If no audio is rendered, leave `"audio": null`; the app falls back to the browser's Web Speech API.

## Regenerating audio

One-time setup (Kokoro needs Python 3.10–3.12; the system Python 3.14 has no wheels for its deps).
`espeak-ng` and `ffmpeg` must be installed system-wide.

```sh
uv venv -p 3.12 .venv-tts
export VIRTUAL_ENV=.venv-tts
uv pip install --index-url https://download.pytorch.org/whl/cpu torch     # CPU-only torch, smaller
uv pip install kokoro soundfile 'transformers>=4.40' pip
uv pip install en_core_web_sm@https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
```

(The `transformers` pin stops the resolver from backtracking to an ancient release that needs Rust;
the spaCy model is installed up front because misaki otherwise tries to pip-install it at runtime.)
The first run downloads the model (~330 MB) from Hugging Face into `~/.cache/huggingface`.

Render:

```sh
.venv-tts/bin/python scripts/tts.py                    # only new or changed stories
.venv-tts/bin/python scripts/tts.py --only weeping-war # just one
.venv-tts/bin/python scripts/tts.py --force            # everything
```

CPU rendering takes a few seconds per clip. The script hashes the spoken text together with the
voice settings, so editing a story's text, the voice, speed, or the pronunciation table re-renders
only what changed. Removing a story deletes its mp3 on the next run.

Settings live at the top of `scripts/tts.py`: voice `bm_george` (British male), speed 0.9, 48 kbps
mono mp3. `PRONOUNCE` respells tricky Realms names for the speech engine only (e.g. `Faerûn` →
`Fair-oon`); add entries there when a name comes out wrong, and the affected clips re-render.

Budget: keep the whole `public/narration/` folder under 12 MB (16 clips are about 6 MB).
