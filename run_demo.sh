#!/bin/sh
#
# run_demo.sh — start the full local demo stack on one laptop:
#   [ananta]    Ananta (Quantum Studio)  http://localhost:5500  (hosts the Careers tab)
#   [qpath-api] QPath FastAPI backend     http://localhost:8000  (health: /api/v1/health)
#   [qpath-web] QPath Vite dev frontend   http://localhost:5173  (embedded in Ananta)
#
# Open after launch:  http://localhost:5500/#careers
#
# POSIX sh; tested in Git Bash (MSYS) on Windows, portable to Linux/macOS.
# Each child runs with its own project dir as cwd and exec's the real server
# binary, so the captured PID is the process we can kill on Ctrl+C / exit.

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANANTA_DIR="$SCRIPT_DIR/Ananta"
QPATH_DIR="$SCRIPT_DIR/Qpath"
BACKEND_DIR="$QPATH_DIR/backend"
FRONTEND_DIR="$QPATH_DIR/frontend"

LOG_DIR="$(mktemp -d)"

# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

port_in_use() {
  port="$1"
  # Windows netstat says LISTENING; Linux/macOS netstat says LISTEN.
  if command -v netstat >/dev/null 2>&1 && \
     netstat -an 2>/dev/null | grep -iE 'listen' | grep -Eq "[:.]${port}([^0-9]|$)"; then
    return 0
  fi
  # Fallback probe: anything that accepts a TCP connection counts as busy.
  curl -s -o /dev/null --max-time 1 "http://127.0.0.1:${port}/" 2>/dev/null
}

check_ports() {
  busy=""
  for p in 5500 8000 5173; do
    if port_in_use "$p"; then busy="$busy $p"; fi
  done
  if [ -n "$busy" ]; then
    echo "ERROR: port(s)$busy already in use."
    echo "Stop whatever is listening on the named port(s) first"
    echo "(a previous run of this script? another dev server?), then retry."
    exit 1
  fi
}

# Start a service from its own directory, tag its log lines, remember PIDs.
#   $1 tag, $2 dir, $3 pid-file suffix stem, rest = exact command to run
start_service() {
  tag="$1"; dir="$2"; stem="$3"; shift 3
  mkdir -p "$LOG_DIR"
  (
    cd "$dir" || exit 1
    exec "$@"
  ) > "$LOG_DIR/$tag.log" 2>&1 &
  echo "$!" > "$LOG_DIR/$stem.pid"
  tail -f "$LOG_DIR/$tag.log" 2>/dev/null | sed -u "s/^/[$tag] /" &
  echo "$!" > "$LOG_DIR/$stem.tail"
}

wait_for_url() {
  url="$1"; name="$2"
  i=0
  while [ "$i" -lt 60 ]; do                       # up to ~60 s
    if curl -s -f -o /dev/null --max-time 2 "$url" 2>/dev/null; then
      echo "OK: $name is up at $url"
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done
  echo "ERROR: $name did not become ready at $url within 60s."
  return 1
}

kill_stored_pid() {
  stem="$1"
  f="$LOG_DIR/$stem"
  [ -f "$f" ] || return 0
  pid=$(cat "$f" 2>/dev/null)
  rm -f "$f"
  [ -n "$pid" ] || return 0
  kill "$pid" >/dev/null 2>&1
  # Native Windows processes (node.exe / python.exe) can ignore MSYS signals;
  # force-kill via the Windows PID so nothing is left listening.
  wp=$(cat "/proc/$pid/winpid" 2>/dev/null)
  if [ -n "$wp" ] && command -v taskkill >/dev/null 2>&1; then
    taskkill //F //T //PID "$wp" >/dev/null 2>&1
  fi
}

cleanup() {
  echo ""
  echo "Stopping demo processes..."
  kill_stored_pid "ananta.tail"
  kill_stored_pid "qpath-api.tail"
  kill_stored_pid "qpath-web.tail"
  kill_stored_pid "ananta.pid"
  kill_stored_pid "qpath-api.pid"
  kill_stored_pid "qpath-web.pid"
  rm -rf "$LOG_DIR" 2>/dev/null
  echo "Done."
}

trap cleanup EXIT INT TERM

# --------------------------------------------------------------------------- #
# Preflight
# --------------------------------------------------------------------------- #

check_ports

for c in node curl; do
  command -v "$c" >/dev/null 2>&1 || { echo "ERROR: $c not found on PATH."; exit 1; }
done

[ -f "$ANANTA_DIR/server.js" ]       || { echo "ERROR: Ananta not found at $ANANTA_DIR";       exit 1; }
[ -f "$BACKEND_DIR/pyproject.toml" ] || { echo "ERROR: QPath backend not found at $BACKEND_DIR"; exit 1; }
[ -d "$FRONTEND_DIR/node_modules" ]  || { echo "ERROR: QPath frontend deps missing.";          exit 1; }

# Ananta deps (node_modules is gitignored; install once if absent)
if [ ! -d "$ANANTA_DIR/node_modules" ]; then
  echo "[ananta] node_modules missing — running npm install (one-time)..."
  (cd "$ANANTA_DIR" && npm install --no-fund --no-audit) || {
    echo "ERROR: Ananta npm install failed."; exit 1; }
fi

# Backend venv python: Windows uses Scripts/, POSIX uses bin/
if [ -x "$BACKEND_DIR/.venv/Scripts/python.exe" ]; then
  PY="$BACKEND_DIR/.venv/Scripts/python.exe"
elif [ -x "$BACKEND_DIR/.venv/bin/python" ]; then
  PY="$BACKEND_DIR/.venv/bin/python"
else
  echo "ERROR: QPath backend venv missing."
  echo "  -> run: python3 setup_project.py  (in Qpath/) once before this script."
  exit 1
fi

# --------------------------------------------------------------------------- #
# Launch
# --------------------------------------------------------------------------- #

start_service ananta    "$ANANTA_DIR"    ananta    node server.js

start_service qpath-api "$BACKEND_DIR"    qpath-api "$PY" -m uvicorn app.main:app --port 8000

start_service qpath-web "$FRONTEND_DIR"  qpath-web node node_modules/vite/bin/vite.js \
  --port 5173 --strictPort

echo ""
echo "Waiting for services to come up..."
ok=1
wait_for_url "http://localhost:8000/api/v1/health" "QPath API" || ok=
if [ -z "$ok" ]; then
  echo "  [qpath-api] log tail:"; tail -n 20 "$LOG_DIR/qpath-api.log" 2>/dev/null; exit 1
fi
wait_for_url "http://localhost:5500/" "Ananta" || ok=
if [ -z "$ok" ]; then
  echo "  [ananta] log tail:"; tail -n 20 "$LOG_DIR/ananta.log" 2>/dev/null; exit 1
fi
wait_for_url "http://localhost:5173/" "QPath web" || ok=
if [ -z "$ok" ]; then
  echo "  [qpath-web] log tail:"; tail -n 20 "$LOG_DIR/qpath-web.log" 2>/dev/null; exit 1
fi

echo ""
echo "================================================================="
echo "  Demo ready:"
echo "    Ananta + Careers tab : http://localhost:5500/#careers"
echo "    QPath standalone     : http://localhost:5173"
echo "  Ctrl+C stops all three processes."
echo "================================================================="
echo ""

wait
