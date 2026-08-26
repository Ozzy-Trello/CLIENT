#!/usr/bin/env bash
#
# Roll the Nginx upstream back to the previous blue-green port.
# The previous release's PM2 app is still running, so this is a config flip.
#
set -euo pipefail

APP_ROOT="${OZZY_DEPLOY_ROOT:-/root/produksi}"
STATE_FILE="$APP_ROOT/state/client-deploy.env"
UPSTREAM_CONF="${OZZY_NGINX_UPSTREAM:-$APP_ROOT/nginx/ozzy-client-upstream.conf}"
NGINX_BIN="${NGINX_BIN:-/www/server/nginx/sbin/nginx}"

log() { printf '[rollback] %s\n' "$*"; }
fail() { printf '[rollback] ERROR: %s\n' "$*" >&2; exit 1; }

[ -f "$STATE_FILE" ] || fail "no state file: $STATE_FILE"
# shellcheck disable=SC1090
source "$STATE_FILE"
[ -n "${LAST_PORT:-}" ] || fail "state file has no LAST_PORT"

printf 'upstream ozzy_client {\n    server 127.0.0.1:%s;\n}\n' "$LAST_PORT" > "$UPSTREAM_CONF.tmp.$$"
mv "$UPSTREAM_CONF.tmp.$$" "$UPSTREAM_CONF"

if ! "$NGINX_BIN" -t >/dev/null 2>&1; then
  "$NGINX_BIN" -t || true
  fail "nginx -t failed after writing upstream $LAST_PORT; fix manually"
fi
"$NGINX_BIN" -s reload

cat > "$STATE_FILE" <<EOF
ACTIVE_PORT=$LAST_PORT
ACTIVE_RELEASE=$LAST_RELEASE
LAST_PORT=$ACTIVE_PORT
LAST_RELEASE=$ACTIVE_RELEASE
DEPLOYED_SHA=${PREV_DEPLOYED_SHA:-}
EOF

pm2 save >/dev/null
log "traffic restored to port $LAST_PORT ($(basename "${LAST_RELEASE:-unknown}"))"
