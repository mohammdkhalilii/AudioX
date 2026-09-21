#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="$ROOT_DIR/resources/binaries"
TARGET="${1:-all}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

download_win() {
  echo "Downloading Windows x64 FFmpeg & FFprobe..."
  mkdir -p "$BIN_DIR/win-x64"
  curl -sL "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -o "$TMP_DIR/ffmpeg-win.zip"
  unzip -q -j "$TMP_DIR/ffmpeg-win.zip" "*/bin/ffmpeg.exe" "*/bin/ffprobe.exe" -d "$BIN_DIR/win-x64/"
  echo "✓ Windows binaries staged in resources/binaries/win-x64/"
}

download_linux() {
  echo "Downloading Linux x64 Static FFmpeg & FFprobe..."
  mkdir -p "$BIN_DIR/linux-x64"
  curl -sL "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" -o "$TMP_DIR/ffmpeg-linux.tar.xz"
  tar -xf "$TMP_DIR/ffmpeg-linux.tar.xz" -C "$TMP_DIR"
  find "$TMP_DIR" -name "ffmpeg" -type f -exec cp {} "$BIN_DIR/linux-x64/ffmpeg" \;
  find "$TMP_DIR" -name "ffprobe" -type f -exec cp {} "$BIN_DIR/linux-x64/ffprobe" \;
  chmod +x "$BIN_DIR/linux-x64/"*
  echo "✓ Linux binaries staged in resources/binaries/linux-x64/"
}

download_mac() {
  echo "Downloading macOS arm64 Static FFmpeg & FFprobe..."
  mkdir -p "$BIN_DIR/mac-arm64"
  curl -sL "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-darwin-arm64" -o "$BIN_DIR/mac-arm64/ffmpeg"
  chmod +x "$BIN_DIR/mac-arm64/ffmpeg"
  cp "$BIN_DIR/mac-arm64/ffmpeg" "$BIN_DIR/mac-arm64/ffprobe"
  echo "✓ macOS arm64 binaries staged in resources/binaries/mac-arm64/"
}

case "$TARGET" in
  win|windows)
    download_win
    ;;
  linux)
    download_linux
    ;;
  mac|darwin)
    download_mac
    ;;
  current)
    case "$(uname -s)" in
      Darwin) download_mac ;;
      Linux)  download_linux ;;
      MINGW*|MSYS*|CYGWIN*) download_win ;;
      *) echo "Unknown platform $(uname -s)"; exit 1 ;;
    esac
    ;;
  all)
    download_win
    download_linux
    download_mac
    ;;
  *)
    echo "Usage: $0 [all|current|mac|win|linux]"
    exit 1
    ;;
esac
