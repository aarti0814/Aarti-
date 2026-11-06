#!/usr/bin/env bash
# One static key frame per scene, rendered by Hyperframes from the real scene code,
# plus a labelled contact sheet: render/keyframes/keyframes-sheet.png
set -euo pipefail
cd "$(dirname "$0")/.."
out=render/keyframes
rm -rf "$out" && mkdir -p "$out"
# void, title lock, build, hero morph, stack, data, climax burst, end card
times="2.6,9.85,12.8,22.0,31.0,42.0,50.9,58.9"
npx hyperframes snapshot --at "$times" --no-end --output "$out" --timeout 120000 >/dev/null
names=(01-void 02-title 03-build 04-hero 05-stack 06-data 07-climax 08-end)
i=0
for f in $(ls "$out"/*.png | sort -V); do
  mv "$f" "$out/${names[$i]}.png"; i=$((i+1))
done
args=(); filt=""; lay=""
for n in "${!names[@]}"; do
  args+=(-i "$out/${names[$n]}.png")
  filt+="[$n]scale=640:360,drawtext=text='${names[$n]}':x=16:y=16:fontsize=22:fontcolor=0xF4F4F6:box=1:boxcolor=0x0B0B0F@0.7:boxborderw=6[v$n];"
  lay+="$(( (n % 4) * 640 ))_$(( (n / 4) * 360 ))|"
done
inputs=$(for n in "${!names[@]}"; do printf '[v%s]' "$n"; done)
ffmpeg -v error -y "${args[@]}" -filter_complex "${filt}${inputs}xstack=inputs=8:layout=${lay%|}[o]" -map "[o]" "$out/keyframes-sheet.png"
echo "wrote $out (8 key frames + keyframes-sheet.png)"
