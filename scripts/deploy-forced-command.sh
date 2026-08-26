#!/usr/bin/env bash
#
# /usr/local/bin/deploy-ozzy-client
#
# Restricted forced-command for the GitHub Actions client SSH key.
# Runs the blue-green deploy workflow as the ozzy-client-deploy user.
#
set -euo pipefail

LOG=/home/ozzy-client-deploy/logs/deploy.log
mkdir -p "$(dirname "$LOG")"
{
  date -u +'%Y-%m-%dT%H:%M:%SZ deploy start'
  if bash <<'CLIENT_DEPLOY'
    set -euo pipefail
    cd /srv/ozzy-client/source
    bash scripts/deploy.sh
CLIENT_DEPLOY
  then
    rc=0
  else
    rc=$?
  fi
  printf '%s deploy end rc=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$rc"
  exit $rc
} | tee -a "$LOG"
