#!/usr/bin/env bash
#
# Roll the Nginx upstream back to the previous blue-green port.
# The previous release's PM2 app is still running, so this is a config flip.
#
set -euo pipefail

APP_ROOT="${OZZY_DEPLOY_ROOT:-/srv/ozzy-client}"
STATE_FILE="$APP_ROOT/state/client-deploy.env"
NGINX_SWITCH_HELPER="${OZZY_NGINX_HELPER:-/usr/local/sbin/switch-ozzy-client}"

log() { printf '[rollback] %s\n' "$*"; }
fail() { printf '[rollback] ERROR: %s\n' "$*" >&2; exit 1; }

[ -f "$STATE_FILE" ] || fail "no state file: $STATE_FILE"
# shellcheck disable=SC1090
source "$STATE_FILE"
[ -n "${LAST_PORT:-}" ] || fail "state file has no LAST_PORT"

"$NGINX_SWITCH_HELPER" "$LAST_PORT" || fail "nginx switch helper failed for $LAST_PORT"

cat > "$STATE_FILE" <<EOF
ACTIVE_PORT=$LAST_PORT
ACTIVE_RELEASE=$LAST_RELEASE
LAST_PORT=$ACTIVE_PORT
LAST_RELEASE=$ACTIVE_RELEASE
DEPLOYED_SHA=${PREV_DEPLOYED_SHA:-}
EOF

pm2 save >/dev/null
log "traffic restored to port $LAST_PORT ($(basename "${LAST_RELEASE:-unknown}"))"
