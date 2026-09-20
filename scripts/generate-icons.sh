#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

# 1. 1024x1024 base PNG
magick -background none -density 300 resources/icon.svg -resize 1024x1024 resources/icon.png

# 2. Windows .ico
magick resources/icon.png -define icon:auto-resize=256,128,64,48,32,16 resources/icon.ico

# 3. macOS .icns
magick resources/icon.png resources/icon.icns

echo "Icon build complete:"
ls -lh resources/icon.*

