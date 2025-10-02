#!/usr/bin/env bash
# Bash 3.2 compatible (macOS). Enforces 16KB alignment only for arm64-v8a and x86_64.
set -euo pipefail

ROOT="${1:-packages/react-native/android/src/main/jniLibs}"
# ABIs to enforce (space-separated). Edit or override via: ABIS="arm64-v8a x86_64" bash ...
ABIS=${ABIS:-"arm64-v8a x86_64"}

# --- Locate an ELF reader: readelf (Linux), greadelf (Homebrew), or llvm-readobj (Homebrew) ---
READER=""; MODE=""
if command -v readelf >/dev/null 2>&1; then
  READER="readelf"; MODE="readelf"
elif command -v greadelf >/dev/null 2>&1; then
  READER="greadelf"; MODE="readelf"
elif command -v llvm-readobj >/dev/null 2>&1; then
  READER="llvm-readobj"; MODE="llvm"
elif command -v brew >/dev/null 2>&1; then
  BINUTILS_PREFIX="$(brew --prefix binutils 2>/dev/null || true)"
  LLVM_PREFIX="$(brew --prefix llvm 2>/dev/null || true)"
  if [[ -n "$BINUTILS_PREFIX" && -x "$BINUTILS_PREFIX/bin/greadelf" ]]; then
    READER="$BINUTILS_PREFIX/bin/greadelf"; MODE="readelf"
  elif [[ -n "$LLVM_PREFIX" && -x "$LLVM_PREFIX/bin/llvm-readobj" ]]; then
    READER="$LLVM_PREFIX/bin/llvm-readobj"; MODE="llvm"
  fi
fi

if [[ -z "$READER" ]]; then
  cat <<'EOF' >&2
❌ No ELF reader found.
   Fix one:
     - brew install binutils   # then export PATH="$(brew --prefix binutils)/bin:$PATH"
     - brew install llvm       # then export PATH="$(brew --prefix llvm)/bin:$PATH"
     - (Linux) apt-get install binutils
EOF
  exit 2
fi

get_max_align() {
  # echo max PT_LOAD alignment (bytes) for a given .so
  local so="$1" max=0
  if [[ "$MODE" == "readelf" ]]; then
    # readelf -lW ... -> ... Align 0x####
    # awk '{print $NF}' prints the final token (alignment)
    while IFS= read -r align_hex; do
      align_hex="${align_hex#0x}"
      # bash 3.2 supports base conversion via $((16#...))
      local val=$((16#$align_hex))
      if (( val > max )); then max=$val; fi
    done < <("$READER" -lW "$so" 2>/dev/null | awk '/LOAD/ {print $NF}')
  else
    # llvm-readobj --program-headers ... -> 'Type: PT_LOAD' ... 'Alignment: 0x####'
    local inload=0
    # We can’t do multi-state parsing easily in pure shell; use awk.
    while IFS= read -r align_hex; do
      align_hex="${align_hex#0x}"
      local val=$((16#$align_hex))
      if (( val > max )); then max=$val; fi
    done < <("$READER" --program-headers "$so" 2>/dev/null \
            | awk '/Type: PT_LOAD/ {inload=1} inload && /Alignment:/ {print $2; inload=0}')
  fi
  echo "$max"
}

if [[ ! -d "$ROOT" ]]; then
  echo "❌ Directory not found: $ROOT" >&2
  exit 1
fi

fail=0
# Iterate ABIs without 'mapfile'
for abi in $ABIS; do
  abi_dir="$ROOT/$abi"
  if [[ ! -d "$abi_dir" ]]; then
    echo "⚠️  ABI directory missing (skipping): $abi_dir"
    continue
  fi

  # List .so files; avoid mapfile, use while+read with -print0/-d ''
  has_any=0
  while IFS= read -r -d '' so; do
    has_any=1
    max_align="$(get_max_align "$so" || echo 0)"
    if [[ -z "$max_align" || "$max_align" -lt 16384 ]]; then
      printf "❌ %s Align %s < 16384 (0x4000)\n" "$so" "${max_align:-N/A}"
      fail=1
    else
      printf "✅ %s Align %d (>= 16384)\n" "$so" "$max_align"
    fi
  done < <(find "$abi_dir" -type f -name '*.so' -print0 2>/dev/null)

  if [[ "$has_any" -eq 0 ]]; then
    echo "⚠️  No .so files under: $abi_dir"
  fi
done

exit "$fail"
