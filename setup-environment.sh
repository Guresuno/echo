#!/usr/bin/env bash
# ==============================================================================
# ECHO - Zero-Touch Environment & Dependency Setup Script (Linux/macOS)
# ==============================================================================
set -e

echo "=========================================================="
echo " [ECHO] Verificando e Instalando Entorno de Desarrollo...  "
echo "=========================================================="

# Node.js
if command -v node >/dev/null 2>&1; then
    echo "[OK] Node.js detectado: $(node -v)"
else
    echo "[+] Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs || true
fi

# Python
if command -v python3 >/dev/null 2>&1; then
    echo "[OK] Python detectado: $(python3 --version)"
else
    echo "[+] Instalando Python 3..."
    sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv || true
fi

# Rust
if command -v rustc >/dev/null 2>&1; then
    echo "[OK] Rust detectado: $(rustc --version)"
else
    echo "[+] Instalando Rust & Cargo..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# Java
if command -v java >/dev/null 2>&1; then
    echo "[OK] Java detectado: $(java -version 2>&1 | head -n 1)"
else
    echo "[+] Instalando OpenJDK 17..."
    sudo apt-get install -y openjdk-17-jdk || true
fi

# FFmpeg
if command -v ffmpeg >/dev/null 2>&1; then
    echo "[OK] FFmpeg detectado: $(ffmpeg -version | head -n 1)"
else
    echo "[+] Instalando FFmpeg..."
    sudo apt-get install -y ffmpeg || true
fi

# Backend pip dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/backend/requirements.txt" ]; then
    echo "[+] Instalando dependencias backend..."
    python3 -m pip install -r "$SCRIPT_DIR/backend/requirements.txt"
fi

# Desktop npm dependencies
if [ -d "$SCRIPT_DIR/client-desktop" ]; then
    echo "[+] Instalando dependencias desktop..."
    cd "$SCRIPT_DIR/client-desktop" && npm install
fi

# Mobile npm dependencies
if [ -d "$SCRIPT_DIR/client-mobile" ]; then
    echo "[+] Instalando dependencias mobile..."
    cd "$SCRIPT_DIR/client-mobile" && npm install
fi

echo "=========================================================="
echo " [ECHO] Aprovisionamiento completado con éxito.           "
echo "=========================================================="
