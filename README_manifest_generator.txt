# Valentine Site – Media Manifest Generator

## Why you need this
Browsers cannot automatically list files inside `/images` or `/videos`.
Your website loads a list from `media-manifest.json`, so you must regenerate it whenever you add/remove media.

## Quick use (Windows)
1. Put your files here:
   - `Images/` (or `images/`) for photos
   - `Videos/` (or `videos/`) for videos

2. Double-click:
   - `generate_manifest.bat`

3. Start local server:
   - `python -m http.server 8888 --bind 0.0.0.0`

## Quick use (macOS/Linux)
```bash
python3 generate_media_manifest.py
python3 -m http.server 8888 --bind 0.0.0.0
```

## Netlify
Netlify will NOT run this generator unless you add a build command.

### Option A (simplest)
Run the generator locally before you deploy (or before you drag-drop upload).

### Option B (auto at build time)
Add a `netlify.toml` with:

```toml
[build]
  command = "python generate_media_manifest.py"
  publish = "."
```

(If you already have a build step, append the command.)
