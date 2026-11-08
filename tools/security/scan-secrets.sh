#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
SCAN_TARGET="${1:-$ROOT_DIR}"
GITLEAKS_VERSION="8.30.1"
GITLEAKS_RELEASE_BASE="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}"

if [[ ! -e "$SCAN_TARGET" ]]; then
  echo "Secret-scan target does not exist: $SCAN_TARGET" >&2
  exit 2
fi

GITLEAKS_BIN=""

prepare_gitleaks_binary() {
  local operating_system architecture archive cache_dir download_dir expected_checksum actual_checksum
  operating_system="$(uname -s | tr '[:upper:]' '[:lower:]')"
  architecture="$(uname -m)"

  case "$architecture" in
    arm64|aarch64) architecture="arm64" ;;
    x86_64|amd64) architecture="x64" ;;
    *)
      echo "Unsupported Gitleaks architecture: $architecture" >&2
      exit 2
      ;;
  esac

  case "$operating_system" in
    darwin|linux) ;;
    *)
      echo "Unsupported Gitleaks operating system: $operating_system" >&2
      exit 2
      ;;
  esac

  archive="gitleaks_${GITLEAKS_VERSION}_${operating_system}_${architecture}.tar.gz"
  cache_dir="$ROOT_DIR/.cache/gitleaks/v${GITLEAKS_VERSION}/${operating_system}_${architecture}"
  GITLEAKS_BIN="$cache_dir/gitleaks"

  if [[ -x "$GITLEAKS_BIN" ]]; then
    return
  fi

  download_dir="$(mktemp -d /tmp/skinlab-gitleaks-download.XXXXXX)"
  mkdir -p "$cache_dir"
  curl --fail --silent --show-error --location \
    "$GITLEAKS_RELEASE_BASE/gitleaks_${GITLEAKS_VERSION}_checksums.txt" \
    --output "$download_dir/checksums.txt"
  curl --fail --silent --show-error --location \
    "$GITLEAKS_RELEASE_BASE/$archive" \
    --output "$download_dir/$archive"

  expected_checksum="$(awk -v archive="$archive" '$2 == archive { print $1 }' "$download_dir/checksums.txt")"
  if command -v sha256sum >/dev/null 2>&1; then
    actual_checksum="$(sha256sum "$download_dir/$archive" | awk '{ print $1 }')"
  else
    actual_checksum="$(shasum -a 256 "$download_dir/$archive" | awk '{ print $1 }')"
  fi

  if [[ -z "$expected_checksum" || "$actual_checksum" != "$expected_checksum" ]]; then
    echo "Gitleaks archive checksum verification failed." >&2
    exit 2
  fi

  tar -xzf "$download_dir/$archive" -C "$cache_dir" gitleaks
  chmod +x "$GITLEAKS_BIN"
  rm -rf "$download_dir"
}

prepare_gitleaks_binary

run_directory_scan() {
  local target="$1"
  "$GITLEAKS_BIN" dir "$target" \
    --config "$ROOT_DIR/.gitleaks.toml" \
    --no-banner \
    --redact \
    --verbose \
    --exit-code 1
}

run_git_scan() {
  "$GITLEAKS_BIN" git "$ROOT_DIR" \
    --config "$ROOT_DIR/.gitleaks.toml" \
    --no-banner \
    --redact \
    --verbose \
    --exit-code 1
}

TARGET_REALPATH="$(cd "$(dirname "$SCAN_TARGET")" && pwd -P)/$(basename "$SCAN_TARGET")"

if [[ "$TARGET_REALPATH" != "$ROOT_DIR" ]]; then
  run_directory_scan "$TARGET_REALPATH"
  exit 0
fi

SNAPSHOT_DIR="$(mktemp -d /tmp/skinlab-gitleaks-worktree.XXXXXX)"
trap 'rm -rf "$SNAPSHOT_DIR"' EXIT

while IFS= read -r -d '' repository_file; do
  mkdir -p "$SNAPSHOT_DIR/$(dirname "$repository_file")"
  cp -pP "$ROOT_DIR/$repository_file" "$SNAPSHOT_DIR/$repository_file"
done < <(git -C "$ROOT_DIR" ls-files --cached --others --exclude-standard -z)

run_directory_scan "$SNAPSHOT_DIR"

if git -C "$ROOT_DIR" rev-parse --verify HEAD >/dev/null 2>&1; then
  run_git_scan
fi
