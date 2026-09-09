#!/usr/bin/env bash
# Create a local configuration for a new VanStock installation.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
env_file="$repo_root/.env"

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Usage: scripts/setup.sh

Creates .env from safe values for a new local installation. It never replaces
an existing .env file.
EOF
  exit 0
fi

if [[ $# -ne 0 ]]; then
  echo "Error: unknown option: $1" >&2
  exit 2
fi

if [[ -e "$env_file" ]]; then
  echo "Error: .env already exists. It was not changed." >&2
  exit 2
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "Error: openssl is required to generate secure secrets." >&2
  exit 2
fi

prompt() {
  local label="$1"
  local default="$2"
  local value
  read -r "value?${label} [${default}]: "
  printf '%s' "${value:-$default}"
}

prompt_secret() {
  local label="$1"
  local value
  read -r -s "value?${label} (leave empty to generate one): "
  printf '\n' >&2
  printf '%s' "$value"
}

reject_invalid_env_value() {
  local name="$1"
  local value="$2"
  if [[ "$value" == *$'\n'* || "$value" == *$'\r'* ]]; then
    echo "Error: ${name} cannot contain a line break." >&2
    exit 2
  fi
}

db_name="$(prompt 'Database name' 'stocksimple')"
db_user="$(prompt 'Database user' 'stockuser')"
db_password="$(prompt_secret 'Database password')"
admin_company="$(prompt 'Company name' 'Example Company')"
admin_email="$(prompt 'Administrator email' 'admin@example.com')"
admin_password="$(prompt_secret 'Administrator password')"
allowed_origins="$(prompt 'Allowed origins (comma-separated)' 'http://localhost')"

db_password="${db_password:-$(openssl rand -hex 24)}"
admin_password="${admin_password:-$(openssl rand -base64 24)}"
jwt_secret="$(openssl rand -hex 32)"
encryption_key="$(openssl rand -hex 32)"

for name in db_name db_user db_password admin_company admin_email admin_password allowed_origins jwt_secret encryption_key; do
  reject_invalid_env_value "$name" "${!name}"
done

umask 077
{
  printf 'DB_NAME=%s\n' "$db_name"
  printf 'DB_USER=%s\n' "$db_user"
  printf 'DB_PASSWORD=%s\n' "$db_password"
  printf 'JWT_SECRET=%s\n' "$jwt_secret"
  printf 'APP_ENCRYPTION_KEY=%s\n' "$encryption_key"
  printf 'ALLOWED_ORIGINS=%s\n' "$allowed_origins"
  printf 'DEFAULT_COMPANY_NAME=%s\n' "$admin_company"
  printf 'DEFAULT_ADMIN_EMAIL=%s\n' "$admin_email"
  printf 'DEFAULT_ADMIN_PASS=%s\n' "$admin_password"
} > "$env_file"

echo "Created .env with permissions restricted to the current user."
echo "First administrator: ${admin_email}"
echo "Administrator password: ${admin_password}"
echo "Store this password securely; it is shown only now."
