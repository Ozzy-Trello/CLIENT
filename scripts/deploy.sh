#!/usr/bin/env bash
#
# Blue-green deploy for the Ozzy client.
#
# Flow: clone stable at a new release dir -> npm ci -> build -> merge static
# assets into the shared append-only dir -> start the inactive port's PM2 app
# on the new release -> verify (health buildId + every HTML-referenced asset)
# -> atomically flip the Nginx upstream include -> reload Nginx.
# The previously active release/port stays running untouched for rollback.
#
set -euo pipefail

APP_ROOT="${OZZY_DEPLOY_ROOT:-/root/produksi}"
LIVE_DIR="${OZZY_LIVE_DIR:-$APP_ROOT/client}"
RELEASES_DIR="$APP_ROOT/releases/client"
SHARED_STATIC="$APP_ROOT/shared/client/_next/static"
STATE_DIR="$APP_ROOT/state"
STATE_FILE="$STATE_DIR/client-deploy.env"
UPSTREAM_CONF="${OZZY_NGINX_UPSTREAM:-$APP_ROOT/nginx/ozzy-client-upstream.conf}"
NGINX_BIN="${NGINX_BIN:-/www/server/nginx/sbin/nginx}"
ECOSYSTEM_SRC="$(cd "$(dirname "$0")/.." && pwd)/ecosystem.config.js"

PORT_A="${OZZY_PORT_A:-3300}"
PORT_B="${OZZY_PORT_B:-3301}"
BRANCH="${OZZY_DEPLOY_BRANCH:-stable}"
KEEP_RELEASES=3
HEALTH_TIMEOUT=60

log() { printf '[deploy] %s\n' "$*"; }
fail() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

LOCK_DIR="/tmp/ozzy-client-deploy.lock"
mkdir "$LOCK_DIR" 2>/dev/null || fail "another deploy is in progress ($LOCK_DIR)"
trap 'rm -rf "$LOCK_DIR"' EXIT

command -v pm2 >/dev/null || fail "pm2 not found in PATH"
[ -x "$NGINX_BIN" ] || fail "nginx binary not found: $NGINX_BIN"
[ -d "$LIVE_DIR/.git" ] || fail "live checkout missing: $LIVE_DIR"

REMOTE_URL="$(git -C "$LIVE_DIR" remote get-url origin)"
EXPECTED_SHA="$(git ls-remote "$REMOTE_URL" "refs/heads/$BRANCH" | awk '{print substr($1,1,7)}')"
[ -n "$EXPECTED_SHA" ] || fail "could not resolve remote SHA for branch $BRANCH"

if grep -q "^DEPLOYED_SHA=$EXPECTED_SHA$" "$STATE_FILE" 2>/dev/null; then
  log "SHA $EXPECTED_SHA already deployed; nothing to do"
  exit 0
fi

# --- current state ---------------------------------------------------------
source_state() {
  if [ -f "$STATE_FILE" ]; then
    # shellcheck disable=SC1090
    source "$STATE_FILE"
  fi
  ACTIVE_PORT="${ACTIVE_PORT:-$PORT_A}"
  ACTIVE_RELEASE="${ACTIVE_RELEASE:-$LIVE_DIR}"
}
source_state

case "$ACTIVE_PORT" in
  "$PORT_A") INACTIVE_PORT="$PORT_B" ;;
  "$PORT_B") INACTIVE_PORT="$PORT_A" ;;
  *) fail "state file has unknown ACTIVE_PORT=$ACTIVE_PORT" ;;
esac
CANDIDATE_NAME="ozzy-client-$INACTIVE_PORT"

log "active port $ACTIVE_PORT ($(basename "$ACTIVE_RELEASE")), deploying $BRANCH@$EXPECTED_SHA on $INACTIVE_PORT"

# --- build new release -----------------------------------------------------
RELEASE_DIR="$RELEASES_DIR/$EXPECTED_SHA"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASES_DIR" "$SHARED_STATIC" "$STATE_DIR" "$(dirname "$UPSTREAM_CONF")"

log "cloning $BRANCH@$EXPECTED_SHA"
git clone --depth 1 --branch "$BRANCH" "$REMOTE_URL" "$RELEASE_DIR" >/dev/null 2>&1
ACTUAL_SHA="$(git -C "$RELEASE_DIR" rev-parse --short HEAD)"
[ "$ACTUAL_SHA" = "$EXPECTED_SHA" ] || fail "cloned SHA $ACTUAL_SHA != expected $EXPECTED_SHA"

# Carry over untracked server-side env files from the live checkout.
for envfile in "$LIVE_DIR"/.env*; do
  [ -f "$envfile" ] && cp "$envfile" "$RELEASE_DIR/"
done

log "npm ci + build in $RELEASE_DIR"
(cd "$RELEASE_DIR" && npm ci --no-audit --no-fund >/dev/null)
(cd "$RELEASE_DIR" && npm run build >/dev/null)

# Append-only shared static: old HTML keeps resolving its chunks after cutover.
cp -r "$RELEASE_DIR/.next/static/." "$SHARED_STATIC/"
rm -rf "$RELEASE_DIR/.next/static"
ln -s "$SHARED_STATIC" "$RELEASE_DIR/.next/static"

BUILD_ID="$(cat "$RELEASE_DIR/.next/BUILD_ID")"
log "built BUILD_ID=$BUILD_ID"

# --- start candidate -------------------------------------------------------
log "starting PM2 app $CANDIDATE_NAME on port $INACTIVE_PORT"
OZZY_CLIENT_CWD="$RELEASE_DIR" OZZY_CLIENT_PORT="$INACTIVE_PORT" \
  pm2 startOrReload "$ECOSYSTEM_SRC" --only "$CANDIDATE_NAME" --update-env >/dev/null

CANDIDATE_URL="http://127.0.0.1:$INACTIVE_PORT"
HEALTH_OK=""
for _ in $(seq 1 "$HEALTH_TIMEOUT"); do
  if curl -fsS "$CANDIDATE_URL/api/health" | grep -q "\"buildId\":\"$BUILD_ID\""; then
    HEALTH_OK=1
    break
  fi
  sleep 1
done
[ -n "$HEALTH_OK" ] || fail "candidate health check never reported BUILD_ID=$BUILD_ID"

# Every asset referenced by the served HTML must exist with a non-HTML type.
log "verifying assets referenced by / and /login"
for page in "/" "/login"; do
  ASSETS="$(curl -fsS "$CANDIDATE_URL$page" | grep -oE '/_next/static/[^"]+' | sort -u)"
  [ -n "$ASSETS" ] || fail "no static assets referenced by $page"
  while IFS= read -r asset; do
    RESULT="$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$CANDIDATE_URL$asset")"
    CODE="${RESULT%% *}"
    TYPE="${RESULT#* }"
    case "$TYPE" in
      text/html*) fail "$page references $asset -> HTTP $CODE $TYPE (HTML body)" ;;
    esac
    [ "$CODE" = "200" ] || fail "$page references $asset -> HTTP $CODE"
  done <<< "$ASSETS"
done
log "candidate verified"

# --- atomic cutover --------------------------------------------------------
UPSTREAM_BACKUP="$UPSTREAM_CONF.pre-deploy"
[ -f "$UPSTREAM_CONF" ] && cp "$UPSTREAM_CONF" "$UPSTREAM_BACKUP"

write_upstream() {
  local port="$1" target="$2"
  printf 'upstream ozzy_client {\n    server 127.0.0.1:%s;\n}\n' "$port" > "$target.tmp.$$"
  mv "$target.tmp.$$" "$target"
}

write_upstream "$INACTIVE_PORT" "$UPSTREAM_CONF"
if ! "$NGINX_BIN" -t >/dev/null 2>&1; then
  "$NGINX_BIN" -t || true
  [ -f "$UPSTREAM_BACKUP" ] && cp "$UPSTREAM_BACKUP" "$UPSTREAM_CONF"
  write_upstream "$ACTIVE_PORT" "$UPSTREAM_CONF"
  fail "nginx -t failed; upstream restored to $ACTIVE_PORT"
fi
"$NGINX_BIN" -s reload

PUBLIC_CHECK="${OZZY_PUBLIC_URL:-}"
if [ -n "$PUBLIC_CHECK" ]; then
  sleep 2
  SERVED_BUILD="$(curl -fsS --max-time 15 "$PUBLIC_CHECK/api/health" | sed -n 's/.*"buildId":"\([^"]*\)".*/\1/p' || true)"
  [ "$SERVED_BUILD" = "$BUILD_ID" ] || fail "public URL still serves BUILD_ID=${SERVED_BUILD:-<none>}, expected $BUILD_ID"
fi

# --- persist state + prune -------------------------------------------------
cat > "$STATE_FILE" <<EOF
ACTIVE_PORT=$INACTIVE_PORT
ACTIVE_RELEASE=$RELEASE_DIR
LAST_PORT=$ACTIVE_PORT
LAST_RELEASE=$ACTIVE_RELEASE
DEPLOYED_SHA=$EXPECTED_SHA
EOF

log "pruning releases older than $KEEP_RELEASES (keeping active + last)"
ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | while read -r old; do
  old="${old%/}"
  case "$old" in "$ACTIVE_RELEASE"|"$LAST_RELEASE") continue ;; esac
  log "removing $old"
  rm -rf "$old"
done

pm2 save >/dev/null
log "cutover complete: port $INACTIVE_PORT serving BUILD_ID=$BUILD_ID (rollback target: port $ACTIVE_PORT)"
