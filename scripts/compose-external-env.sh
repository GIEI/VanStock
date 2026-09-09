#!/usr/bin/env bash
# Run Docker Compose with an explicit environment file kept outside this repository.
# This script never creates, copies, prints, or modifies the selected file.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/compose-external-env.sh /absolute/path/to/stocksimple.env [docker-compose options and command]

Examples:
  scripts/compose-external-env.sh /srv/stocksimple/config.env -f docker-compose.yml -f docker-compose.prod.yml up -d --build
  scripts/compose-external-env.sh /srv/stocksimple/config.env -f docker-compose.yml -f docker-compose.dev.yml up -d --build

The supplied file is passed to Docker Compose with --env-file. Existing commands
that omit this wrapper continue to use Docker Compose's normal project .env lookup.
EOF
}

if [[ $# -eq 0 || "$1" == "-h" || "$1" == "--help" ]]; then
  usage
  exit 0
fi

env_file="$1"
shift

if [[ "$env_file" != /* ]]; then
  env_file="$(pwd -P)/$env_file"
fi

if [[ ! -f "$env_file" || ! -r "$env_file" ]]; then
  echo "Error: external environment file is not a readable regular file." >&2
  exit 2
fi

# These are the variables currently required by backend/src/index.js and supplied
# to Compose services. Validate only their presence; never print configuration values.
required_keys=(DB_NAME DB_USER DB_PASSWORD JWT_SECRET)
for key in "${required_keys[@]}"; do
  if ! grep -Eq "^[[:space:]]*(export[[:space:]]+)?${key}=" "$env_file"; then
    echo "Error: external environment file is missing required key: ${key}" >&2
    exit 2
  fi
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$repo_root"

exec docker compose --env-file "$env_file" "$@"
