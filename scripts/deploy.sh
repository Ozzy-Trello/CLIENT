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

APP_ROOT="${OZZY_DEPLOY_ROOT:-/srv/ozzy-client}"
SOURCE_DIR="${OZZY_SOURCE_DIR:-$APP_ROOT/source}"
RELEASES_DIR="$APP_ROOT/releases"
SHARED_STATIC="$APP_ROOT/shared/client/_next/static"
STATE_DIR="$APP_ROOT/state"
STATE_FILE="$STATE_DIR/client-deploy.env"
UPSTREAM_CONF="${OZZY_NGINX_UPSTREAM:-$APP_ROOT/nginx/ozzy-client-upstream.conf}"
NGINX_SWITCH_HELPER="${OZZY_NGINX_HELPER:-/usr/local/sbin/switch-ozzy-client}"

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
[ -x "$NGINX_SWITCH_HELPER" ] || fail "nginx switch helper missing: $NGINX_SWITCH_HELPER"
[ -d "$SOURCE_DIR/.git" ] || fail "source checkout missing: $SOURCE_DIR"

REMOTE_URL="$(git -C "$SOURCE_DIR" remote get-url origin)"
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
  ACTIVE_RELEASE="${ACTIVE_RELEASE:-$SOURCE_DIR}"
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

# Carry over untracked server-side env files from the source checkout.
for envfile in "$SOURCE_DIR"/.env*; do
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
# startOrReload keeps the original pm_cwd, so recreate the candidate to pick
# up the new release dir. Safe: the candidate is always the inactive port.
pm2 delete "$CANDIDATE_NAME" >/dev/null 2>&1 || true

# An orphaned next-server child can outlive its npm parent and hold the port.
PIDS=""
for _ in $(seq 1 10); do
  PIDS="$(ss -ltnp "( sport = :$INACTIVE_PORT )" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true)"
  [ -z "$PIDS" ] && break
  sleep 1
done
if [ -n "$PIDS" ]; then
  log "killing stale listener(s) on $INACTIVE_PORT: $(echo "$PIDS" | tr '\n' ' ')"
  kill $PIDS 2>/dev/null || true
  sleep 2
fi
if ss -ltn "( sport = :$INACTIVE_PORT )" 2>/dev/null | grep -q LISTEN; then
  fail "port $INACTIVE_PORT still in use; refusing to start candidate"
fi

log "starting PM2 app $CANDIDATE_NAME on port $INACTIVE_PORT"
OZZY_CLIENT_PORT="$INACTIVE_PORT" \
  pm2 startOrReload "$RELEASE_DIR/ecosystem.config.js" --only "$CANDIDATE_NAME" --update-env >/dev/null

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
  ASSETS="$(curl -fsS "$CANDIDATE_URL$page" | grep -oE '/_next/static/[^"\\]+' | sort -u)"
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
write_upstream() {
  "$NGINX_SWITCH_HELPER" "$1"
}

write_upstream "$INACTIVE_PORT"
if [ "$(cat "$UPSTREAM_CONF" 2>/dev/null | awk '/server/{print $2}' | tr -d ';' | awk -F: '{print $NF}')" != "$INACTIVE_PORT" ]; then
  write_upstream "$ACTIVE_PORT"
  fail "upstream switch did not settle; restored to $ACTIVE_PORT"
fi

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
