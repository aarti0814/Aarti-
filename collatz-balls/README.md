# 100 Balls. 1 Rule.

A finished YouTube Short about the **Collatz conjecture**, played out as a ball simulation.
Each of 100 balls starts at its own number and applies the 3n+1 rule every time it hits a wall
(even → ÷2, odd → ×3+1). A ball that reaches 1 flies home to the gold tray. A live chart traces ball #27's
path up to 9,232.

- `export/100-balls-1-rule.mp4`: the finished video with voiceover, ready to upload. See `YOUTUBE.md` for
  the title, description and tags.
- `export/thumbnail.jpg`: a frame at #27's 9,232 peak.
- `index.html`: the simulation. Open it in a browser to watch it live (sound effects only, no voice).
- `tools/render.js`: renders the video frame by frame (Playwright → ffmpeg).
- `tools/mix.py`: builds the soundtrack: the ElevenLabs voice lines in `assets/vo`, sound effects from the
  simulation's events, a generated ambient score, and ducking under the voice.

To rebuild from `tools/`: `node render.js && python3 mix.py`, then mux:
`ffmpeg -i video_noaudio.mp4 -i soundtrack.wav -c:v copy -af loudnorm=I=-14:TP=-1.5 -c:a aac -b:a 192k -shortest final.mp4`
