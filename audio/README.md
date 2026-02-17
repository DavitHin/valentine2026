Local audio files

You do not need fixed file names anymore.

1. Put any audio files into:
- `audio/funny/`
- `audio/romantic/`
- `audio/panic/` (first file will be used as panic sound)

2. Generate manifest:
- `python generate_audio_manifest.py`
or
- `generate_audio_manifest.bat`

3. Commit `audio-manifest.json` so GitHub Pages can load it.

Notes:
- Supported extensions: `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`
- Browser cannot safely list folder contents on static hosting, so manifest is required.
