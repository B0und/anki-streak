#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mirror_root="$PWD/.agent_sources"
mkdir -p "$mirror_root"

sync_source() {
  local repo="$1" revision="$2" name="${1##*/}"
  local target="$mirror_root/$name" url="https://github.com/$repo.git"
  if [[ -e "$target" || -L "$target" ]]; then
    if [[ -L "$target" || ! -d "$target/.git" || "$(git -C "$target" remote get-url origin)" != "$url" ||
          -n "$(git -C "$target" status --porcelain)" ]]; then
      printf 'Move the modified or unrelated checkout at %s before syncing.\n' "$target" >&2
      return 1
    fi
  else
    git init -q "$target"
    git -C "$target" remote add origin "$url"
  fi

  local commit
  if ! commit=$(git -C "$target" rev-parse --verify "$revision^{commit}" 2>/dev/null); then
    git -C "$target" fetch -q --depth=1 origin "$revision"
    commit=$(git -C "$target" rev-parse --verify 'FETCH_HEAD^{commit}')
    if [[ "$revision" == refs/tags/* ]]; then
      git -C "$target" update-ref "$revision" "$commit"
    elif [[ "$commit" != "$revision" ]]; then
      printf 'Expected %s at %s, got %s.\n' "$repo" "$revision" "$commit" >&2
      return 1
    fi
  fi
  if [[ "$(git -C "$target" rev-parse --verify HEAD 2>/dev/null || true)" != "$commit" ]]; then
    git -C "$target" checkout -q --detach "$commit"
  fi
  printf '%s %s\n' "$target" "$commit"
}

effect_version=$(node -p "require('./package.json').dependencies.effect")
sync_source Effect-TS/effect "refs/tags/effect@$effect_version"
sync_source alchemy-run/alchemy 60d1eab63c5312d1f6bc962bc4559db93a355d37
sync_source UsefulSoftwareCo/executor f2582c5896e7da783f0dfd32d72d972e15a79444
sync_source joelhooks/rat-stack e1d7a713c3094a1b771ac29d1bbda12691263b7d
sync_source mimukodik/slack-listener f57532d6052ab6e0f0cd71e74fe96cf2d935ede1
