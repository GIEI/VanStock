#!/usr/bin/env bash
# Fail when generated files or runtime configuration are tracked by Git.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$repo_root"

forbidden=''
while IFS= read -r path; do
  case "$path" in
    .env|.DS_Store|*/.DS_Store|SITOWEB/config.php|firebase-service-account.json|*/firebase-service-account.json|MOBILE/android/app/google-services.json|MOBILE/ios/Runner/GoogleService-Info.plist|config/nginx.prod.conf|nginx/certs/*|nginx/certbot/*|frontend/node_modules/*|frontend/dist/*|MOBILE/android/daemon/*|MOBILE/android/kotlin-profile/*|MOBILE/android/native/*|MOBILE/ios/build/*|.codex/*|.idea/*|*.log)
      forbidden+="${path}"$'\n'
      ;;
    data/backups/*|data/uploads/*)
      if [[ "$path" != data/backups/.gitkeep && "$path" != data/uploads/.gitkeep ]]; then
        forbidden+="${path}"$'\n'
      fi
      ;;
  esac
done < <(git ls-files)

if [[ -n "$forbidden" ]]; then
  echo 'Error: files that must remain local are tracked:' >&2
  printf '%s' "$forbidden" >&2
  exit 1
fi

echo 'Public repository tree check passed.'
