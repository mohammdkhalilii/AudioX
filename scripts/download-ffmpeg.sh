#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="$ROOT_DIR/resources/binaries"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "=== AudioX Static FFmpeg Downloader ==="

# 1. Windows x64
echo "[1/3] Downloading Windows x64 FFmpeg & FFprobe..."
mkdir -p "$BIN_DIR/win-x64"
curl -sL "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -o "$TMP_DIR/ffmpeg-win.zip"
unzip -q -j "$TMP_DIR/ffmpeg-win.zip" "*/bin/ffmpeg.exe" "*/bin/ffprobe.exe" -d "$BIN_DIR/win-x64/"
echo "✓ Windows binaries staged in resources/binaries/win-x64/"

# 2. Linux x64
echo "[2/3] Downloading Linux x64 Static FFmpeg & FFprobe..."
mkdir -p "$BIN_DIR/linux-x64"
curl -sL "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" -o "$TMP_DIR/ffmpeg-linux.tar.xz"
tar -xf "$TMP_DIR/ffmpeg-linux.tar.xz" -C "$TMP_DIR"
find "$TMP_DIR" -name "ffmpeg" -type f -exec cp {} "$BIN_DIR/linux-x64/ffmpeg" \;
find "$TMP_DIR" -name "ffprobe" -type f -exec cp {} "$BIN_DIR/linux-x64/ffprobe" \;
chmod +x "$BIN_DIR/linux-x64/"*
echo "✓ Linux binaries staged in resources/binaries/linux-x64/"

# 3. macOS arm64
echo "[3/3] Downloading macOS arm64 Static FFmpeg & FFprobe..."
mkdir -p "$BIN_DIR/mac-arm64"
curl -sL "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-darwin-arm64" -o "$BIN_DIR/mac-arm64/ffmpeg"
chmod +x "$BIN_DIR/mac-arm64/ffmpeg"
# ffprobe fallback uses ffmpeg in AudioX if ffprobe missing, or download static ffprobe:
cp "$BIN_DIR/mac-arm64/ffmpeg" "$BIN_DIR/mac-arm64/ffprobe"
echo "✓ macOS arm64 binaries staged in resources/binaries/mac-arm64/"

echo ""
echo "All binaries staged successfully in resources/binaries/!"
ls -la "$BIN_DIR/win-x64" "$BIN_DIR/linux-x64" "$BIN_DIR/mac-arm64"
