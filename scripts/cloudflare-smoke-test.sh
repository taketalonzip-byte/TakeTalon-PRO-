#!/usr/bin/env bash
set -uo pipefail
BASE="${BASE_URL:-https://taketalon.pages.dev}"
PASS=0
FAIL=0
CHECKS=0

check_status() {
  local method="$1" path="$2" expected="$3" label="$4"
  CHECKS=$((CHECKS + 1))
  local headers body status
  headers=$(mktemp)
  body=$(mktemp)
  if [ "$method" = "GET" ]; then
    status=$(curl -L --max-time 30 -sS -D "$headers" -o "$body" -w '%{http_code}' "$BASE$path" || echo 000)
  else
    status=$(curl -L --max-time 30 -sS -D "$headers" -o "$body" -w '%{http_code}' -X "$method" -H 'Content-Type: application/json' -d '{}' "$BASE$path" || echo 000)
  fi
  if [ "$status" = "$expected" ]; then
    echo "PASS [$status] $label ($path)"
    PASS=$((PASS + 1))
  else
    echo "FAIL [$status expected $expected] $label ($path)"
    sed -n '1,4p' "$body" | tr '\n' ' ' | cut -c1-240
    echo
    FAIL=$((FAIL + 1))
  fi
  if grep -qiE 'x-render-origin|taketalon-pro\.onrender\.com' "$headers" "$body"; then
    echo "FAIL Render leakage detected in $path"
    FAIL=$((FAIL + 1))
  fi
  rm -f "$headers" "$body"
}

check_contains() {
  local path="$1" needle="$2" label="$3"
  CHECKS=$((CHECKS + 1))
  local body
  body=$(curl -L --max-time 30 -sS "$BASE$path" || true)
  if printf '%s' "$body" | grep -q "$needle"; then
    echo "PASS [content] $label ($path)"
    PASS=$((PASS + 1))
  else
    echo "FAIL [content] $label ($path): missing $needle"
    FAIL=$((FAIL + 1))
  fi
}

# Public application and SEO
check_status GET / 200 "application root"
check_status GET /about/ 200 "public about route"
check_status GET /robots.txt 200 "robots.txt"
check_status GET /sitemap.xml 200 "sitemap.xml"
check_contains /robots.txt "Googlebot" "Google crawl rule"
check_contains /robots.txt "YandexBot" "Yandex crawl rule"
check_contains /sitemap.xml "https://taketalon.pages.dev/" "canonical sitemap host"

# Cloudflare and Supabase health
check_status GET /api/health 200 "Cloudflare health"
check_status GET /api/cloudflare/supabase-status 200 "Supabase status"
check_status GET /api/sports/status 200 "sports provider status"

# Public read routes
check_status GET /api/sports/basketball/games 200 "basketball games"
check_status GET /api/sports/tennis/games 200 "tennis games"
check_status GET /api/sports/football/games 200 "football games"
check_status GET /api/basketball/matches 200 "basketball matches"
check_status GET /api/tennis/matches 200 "tennis matches"
check_status GET /api/football/matches 200 "football matches"
check_status GET /api/aviator/round 200 "aviator round read"

# Authenticated/admin guards: no credentials, so writes must be rejected safely.
check_status POST /api/cloudflare/admin/reconcile-unregistered-sender 401 "admin reconciliation auth guard"
check_status GET /api/cloudflare/admin/unregistered-senders 401 "admin sender-list auth guard"
check_status POST /api/cloudflare/admin/sms-gateway 401 "admin SMS auth guard"
check_status POST /api/cloudflare/supabase/create-post 401 "post creation auth guard"
check_status POST /api/profile-photo/upload 400 "profile photo input validation guard"
check_status POST /api/supabase/wallet-withdraw 404 "withdrawal intentionally out of scope"
check_status GET /api/not-migrated-route 404 "unknown route fail-closed"

printf '\nSUMMARY checks=%s passed=%s failed=%s\n' "$CHECKS" "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
