#!/usr/bin/env bash
# 拉取宣传片所需字体到 public/fonts/（B 盘工程）。可重复运行，已存在的文件会跳过。
# 来源依次尝试：raw.githubusercontent → github raw → jsDelivr(GitHub 镜像)。
set -u

DIR="B:/deepseek-flash-promo/public/fonts"
mkdir -p "$DIR"

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

try() { # try <outfile> <url>...
  local out="$1"; shift
  if [ -s "$out" ]; then echo "SKIP  $out ($(stat -c%s "$out") bytes)"; return 0; fi
  local u
  for u in "$@"; do
    echo "GET   $u"
    if curl -fSL --retry 2 --retry-delay 1 -m 180 -A "$UA" -o "$out.part" "$u" 2>/dev/null; then
      if [ -s "$out.part" ] && [ "$(stat -c%s "$out.part")" -gt 40000 ]; then
        mv "$out.part" "$out"
        echo "OK    $out ($(stat -c%s "$out") bytes)"
        return 0
      fi
    fi
    rm -f "$out.part"
  done
  echo "FAIL  $out"
  return 1
}

GH="https://raw.githubusercontent.com/google/fonts/main/ofl"
GH2="https://github.com/google/fonts/raw/main/ofl"
JD="https://cdn.jsdelivr.net/gh/google/fonts@main/ofl"

try "$DIR/NotoSerifSC.ttf" \
  "$GH/notoserifsc/NotoSerifSC%5Bwght%5D.ttf" \
  "$GH2/notoserifsc/NotoSerifSC%5Bwght%5D.ttf" \
  "$JD/notoserifsc/NotoSerifSC%5Bwght%5D.ttf" \
  "$GH/notoserifsc/NotoSerifSC-Regular.otf"

try "$DIR/NotoSansSC.ttf" \
  "$GH/notosanssc/NotoSansSC%5Bwght%5D.ttf" \
  "$GH2/notosanssc/NotoSansSC%5Bwght%5D.ttf" \
  "$JD/notosanssc/NotoSansSC%5Bwght%5D.ttf" \
  "$GH/notosanssc/NotoSansSC-Regular.otf"

try "$DIR/Montserrat.ttf" \
  "$GH/montserrat/Montserrat%5Bwght%5D.ttf" \
  "$GH2/montserrat/Montserrat%5Bwght%5D.ttf" \
  "$JD/montserrat/Montserrat%5Bwght%5D.ttf"

try "$DIR/DMSans.ttf" \
  "$GH/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf" \
  "$GH2/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf" \
  "$JD/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf"

try "$DIR/FragmentMono-Regular.ttf" \
  "$GH/fragmentmono/FragmentMono-Regular.ttf" \
  "$GH2/fragmentmono/FragmentMono-Regular.ttf" \
  "$JD/fragmentmono/FragmentMono-Regular.ttf" \
  "https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Regular.ttf"

echo "== fonts dir =="
ls -la "$DIR"
