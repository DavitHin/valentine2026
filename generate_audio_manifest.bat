@echo off
setlocal
python "%~dp0generate_audio_manifest.py"
if errorlevel 1 (
  echo Failed to generate audio-manifest.json
  exit /b 1
)
echo Done.
