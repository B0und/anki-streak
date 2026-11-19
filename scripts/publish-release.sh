#!/usr/bin/env bash
set -euo pipefail

tag=${1:?Usage: scripts/publish-release.sh vMAJOR.MINOR.PATCH path/to/release-notes.md}
notes=${2:?Provide a release notes file}
[[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]
apk="dist/$tag/Anki-Streak.apk"
[[ -s "$apk" && -s "$notes" ]]

tag_commit=$(git rev-parse "refs/tags/$tag^{commit}")
git merge-base --is-ancestor "$tag_commit" HEAD
git show HEAD:.github/workflows/publish-release.yml >/dev/null
git push --atomic origin HEAD:refs/heads/main "refs/tags/$tag"

staging_dir=$(mktemp -d)
staging_index="$staging_dir/index"
trap 'rm -f -- "$staging_index"; rmdir -- "$staging_dir"' EXIT
export GIT_INDEX_FILE="$staging_index"
git read-tree HEAD
git update-index --add --cacheinfo 100644,"$(git hash-object -w "$apk")",.release/Anki-Streak.apk
checksum=$(sha256sum "$apk")
checksum_blob=$(printf '%s  Anki-Streak.apk\n' "${checksum%% *}" | git hash-object -w --stdin)
git update-index --add --cacheinfo 100644,"$checksum_blob",.release/SHA256SUMS.txt
git update-index --add --cacheinfo 100644,"$(git hash-object -w "$notes")",.release/release-notes.md
staging_commit=$(git commit-tree "$(git write-tree)" -p HEAD -m "Stage signed APK for $tag")
staging_ref="refs/heads/release-assets/$tag"
previous_staging=$(git ls-remote origin "$staging_ref" | cut -f1)
git push --force-with-lease="$staging_ref:$previous_staging" origin "$staging_commit:$staging_ref"
