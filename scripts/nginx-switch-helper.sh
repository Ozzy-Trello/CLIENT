#!/usr/bin/env bash
#
# /usr/local/sbin/switch-ozzy-client <port>
#
# Validates that <port> matches one of the configured blue-green ports and
# atomically rewrites /root/produksi/nginx/ozzy-client-upstream.conf between
# nginx -t and nginx -s reload. The original file is restored on failure.
#
set -euo pipefail

PORT="$1"
ALLOWED="3300 3301"

case " $ALLOWED " in
  *" $PORT "*) ;;
  *) echo "refused: port $PORT not in {${ALLOWED// /,}}" >&2; exit 64 ;;
esac

CONF=/root/produksi/nginx/ozzy-client-upstream.conf
BACKUP="${CONF}.pre-switch.$$"
NGINX_BIN="${NGINX_BIN:-/www/server/nginx/sbin/nginx}"

[ -f "$CONF" ] || { echo "missing $CONF" >&2; exit 66; }
cp "$CONF" "$BACKUP"

write_up() {
  printf 'upstream ozzy_client {\n    server 127.0.0.1:%s;\n}\n' "$1" > "$CONF.tmp.$$"
  mv "$CONF.tmp.$$" "$CONF"
}

write_up "$PORT"
trap 'rm -f "$CONF.tmp.$$"' EXIT

if ! "$NGINX_BIN" -t >/dev/null 2>&1; then
  "$NGINX_BIN" -t || true
  cp "$BACKUP" "$CONF"
  echo "nginx -t failed; upstream restored" >&2
  exit 65
fi

"$NGINX_BIN" -s reload
echo "switched ozzy_client upstream to 127.0.0.1:$PORT"