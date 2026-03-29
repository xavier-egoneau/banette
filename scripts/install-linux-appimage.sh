#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPIMAGE_PATH="${1:-"$ROOT_DIR/dist/Banette-1.0.0.AppImage"}"
ICON_SOURCE="$ROOT_DIR/build/icon.png"
INSTALL_DIR="${XDG_BIN_HOME:-$HOME/.local/bin}"
APP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}"
DESKTOP_DIR="$APP_DIR/applications"
ICON_DIR="$APP_DIR/icons/hicolor/512x512/apps"
INSTALLED_APPIMAGE="$INSTALL_DIR/Banette.AppImage"
INSTALLED_ICON="$ICON_DIR/banette.png"
DESKTOP_FILE="$DESKTOP_DIR/banette.desktop"

if [[ ! -f "$APPIMAGE_PATH" ]]; then
  echo "AppImage introuvable: $APPIMAGE_PATH" >&2
  exit 1
fi

if [[ ! -f "$ICON_SOURCE" ]]; then
  echo "Icône introuvable: $ICON_SOURCE" >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR" "$DESKTOP_DIR" "$ICON_DIR"

install -m 755 "$APPIMAGE_PATH" "$INSTALLED_APPIMAGE"
install -m 644 "$ICON_SOURCE" "$INSTALLED_ICON"

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Banette
Comment=Notes et todos locaux en Markdown
Exec=$INSTALLED_APPIMAGE
Icon=$INSTALLED_ICON
Terminal=false
Categories=Office;Utility;
StartupNotify=true
StartupWMClass=Banette
X-AppImage-Version=1.0.0
EOF

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache "${APP_DIR}/icons/hicolor" >/dev/null 2>&1 || true
fi

echo "Banette a ete installee localement."
echo "AppImage: $INSTALLED_APPIMAGE"
echo "Desktop:  $DESKTOP_FILE"
echo "Icone:    $INSTALLED_ICON"
echo
echo "Tu peux maintenant chercher \"Banette\" dans le menu des applications."
