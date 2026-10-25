#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# THRIVE&CO launcher (Linux / macOS)
#
#   ./run.sh              Start with Neon PostgreSQL (reads .env)
#   ./run.sh local        Start with the embedded H2 database
#   ./run.sh --open       Start and open the browser
#   ./run.sh build        Build the runnable JAR only
#   ./run.sh test         Run the backend integration tests
#   ./run.sh stop         Stop a running THRIVE&CO instance
#   ./run.sh --help       Show this help
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

JAR="target/thriveco-1.0.0.jar"
MODE="neon"
OPEN_BROWSER="false"
JAVA_BIN=""

print_help() {
  cat <<'EOF'
THRIVE&CO launcher

Usage:
  ./run.sh                 Start with Neon PostgreSQL (default, reads .env)
  ./run.sh local           Start with the embedded H2 database (no cloud DB needed)
  ./run.sh --open          Start and open the app in your default browser
  ./run.sh build           Build target/thriveco-1.0.0.jar
  ./run.sh test            Run the JUnit integration tests
  ./run.sh stop            Stop a running THRIVE&CO server
  ./run.sh --help          Show this message

Examples:
  ./run.sh local --open
  ./run.sh neon
  ./run.sh build

Notes:
  - Java 21 or newer is required.
  - Maven does not need to be installed; the bundled ./mvnw is used.
  - Neon credentials live in .env (git-ignored).
EOF
}

for arg in "$@"; do
  case "$arg" in
    local|h2)        MODE="local" ;;
    supabase|neon|postgres|cloud) MODE="neon" ;;
    build)           MODE="build" ;;
    test)            MODE="test" ;;
    stop)            MODE="stop" ;;
    --open)          OPEN_BROWSER="true" ;;
    -h|--help|help)  print_help; exit 0 ;;
    *)
      echo "[ERROR] Unknown option: $arg"
      echo
      print_help
      exit 1
      ;;
  esac
done

java_version_of() {
  "$1" -version 2>&1 | awk -F'"' '/version/ {print $2; exit}'
}

try_java() {
  local candidate="$1"
  [ -n "$candidate" ] || return 1
  [ -f "$candidate" ] && [ -x "$candidate" ] || return 1
  [ -x "$(dirname "$candidate")/javac" ] || return 1

  local version major
  version="$(java_version_of "$candidate" 2>/dev/null || true)"
  major="$(printf '%s' "$version" | cut -d. -f1)"
  if [[ "$major" =~ ^[0-9]+$ ]] && [ "$major" -ge 21 ]; then
    # Resolve /usr/bin/java -> the real JDK path, so JAVA_HOME is correct.
    local resolved="$candidate"
    if command -v readlink >/dev/null 2>&1; then
      local real_path
      real_path="$(readlink -f "$candidate" 2>/dev/null || true)"
      if [ -n "$real_path" ]; then
        resolved="$real_path"
      fi
    fi
    JAVA_BIN="$resolved"
    return 0
  fi
  return 1
}

need_java() {
  [ -n "$JAVA_BIN" ] && return 0

  # 1. An explicitly configured JAVA_HOME wins if it is a JDK 21+.
  if [ -n "${JAVA_HOME:-}" ]; then
    try_java "$JAVA_HOME/bin/java" || true
  fi

  # 2. Whatever "java" is currently on PATH.
  if [ -z "$JAVA_BIN" ]; then
    local on_path
    on_path="$(command -v java 2>/dev/null || true)"
    if [ -n "$on_path" ]; then
      try_java "$on_path" || true
    fi
  fi

  # 3. Common Linux, macOS, SDKMAN, asdf/mise and Homebrew locations.
  if [ -z "$JAVA_BIN" ]; then
    local candidate
    for candidate in \
      /usr/lib/jvm/java-21-openjdk-amd64/bin/java \
      /usr/lib/jvm/java-1.21.0-openjdk-amd64/bin/java \
      /usr/lib/jvm/openjdk-21/bin/java \
      /usr/lib/jvm/*/bin/java \
      /usr/local/bin/java \
      /usr/bin/java \
      /snap/bin/java \
      /opt/java/openjdk/bin/java \
      /opt/homebrew/opt/openjdk@21/bin/java \
      /usr/local/opt/openjdk@21/bin/java \
      /Library/Java/JavaVirtualMachines/*/Contents/Home/bin/java \
      "$HOME/.sdkman/candidates/java/current/bin/java" \
      "$HOME/.sdkman/candidates/java"/*/bin/java \
      "$HOME/.jdks"/*/bin/java \
      "$HOME/.asdf/installs/java"/*/bin/java \
      "$HOME/.local/share/mise/installs/java"/*/bin/java
    do
      if try_java "$candidate"; then
        break
      fi
    done
  fi

  if [ -z "$JAVA_BIN" ]; then
    echo "[ERROR] Java 21+ (JDK) was not found."
    echo "        PATH=${PATH:-<empty>}"
    echo "        JAVA_HOME=${JAVA_HOME:-<unset>}"
    echo
    echo "        Install a JDK 21 and run this script again:"
    echo "          Ubuntu / Pop!_OS / Debian:"
    echo "            sudo apt update && sudo apt install openjdk-21-jdk"
    echo "          Fedora:"
    echo "            sudo dnf install java-21-openjdk-devel"
    echo "          macOS (Homebrew):"
    echo "            brew install openjdk@21"
    echo "          Windows:"
    echo "            winget install EclipseAdoptium.Temurin.21.JDK"
    echo
    echo "        Already installed elsewhere? Point the script at it:"
    echo "          export JAVA_HOME=/path/to/jdk-21"
    exit 1
  fi

  # Make the Maven wrapper and any child process use the same JDK.
  local java_dir
  java_dir="$(cd "$(dirname "$JAVA_BIN")" && pwd)"
  JAVA_HOME="$(cd "$java_dir/.." && pwd)"
  export JAVA_HOME
  export PATH="$java_dir:$PATH"

  echo "Using Java: $(java_version_of "$JAVA_BIN")"
  echo "            $JAVA_BIN"
}

stop_server() {
  local pids=""
  if command -v jps >/dev/null 2>&1; then
    pids="$(jps -l 2>/dev/null | awk '/thriveco-1\.0\.0\.jar/ {print $1}')"
  else
    pids="$(pgrep -f 'thriveco-1\.0\.0\.jar' 2>/dev/null || true)"
  fi

  if [ -z "$pids" ]; then
    echo "No running THRIVE&CO server found."
  else
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    echo "Stopped THRIVE&CO process(es): $pids"
  fi
}

case "$MODE" in
  stop)
    stop_server
    exit 0
    ;;
  build)
    need_java
    echo "Building THRIVE&CO..."
    ./mvnw -q -DskipTests package
    echo "Built $JAR"
    exit 0
    ;;
  test)
    need_java
    ./mvnw test
    exit 0
    ;;
esac

need_java

if [ "$MODE" = "neon" ]; then
  if [ ! -f .env ]; then
    echo "[ERROR] .env was not found."
    echo "        Copy the template and fill in your Neon credentials:"
    echo "          cp .env.example .env"
    echo "        Or run the offline demo: ./run.sh local"
    exit 1
  fi

  if grep -Eq 'your-neon|<your-|your-real-password|your-database-password|your-password' .env; then
    echo "[ERROR] .env still contains placeholder values."
    echo "        Open .env and fill in DB_URL / DB_USER / DB_PASSWORD."
    echo "        Or run the offline demo: ./run.sh local"
    exit 1
  fi
fi

# Rebuild automatically when sources are newer than the JAR (or the JAR is missing).
if [ ! -f "$JAR" ] || [ -n "$(find src pom.xml -type f -newer "$JAR" -print -quit 2>/dev/null)" ]; then
  echo "Building THRIVE&CO (first run or source changed)..."
  ./mvnw -q -DskipTests package
fi

PORT="8080"
if [ -f .env ]; then
  ENV_PORT="$(grep -E '^[[:space:]]*PORT[[:space:]]*=' .env | tail -1 | cut -d= -f2- | tr -d '[:space:]' || true)"
  if [ -n "$ENV_PORT" ]; then
    PORT="$ENV_PORT"
  fi
fi
URL="http://localhost:${PORT}"

echo "------------------------------------------------------------"
if [ "$MODE" = "local" ]; then
  echo " THRIVE&CO - local H2 database"
else
  echo " THRIVE&CO - Neon PostgreSQL"
fi
echo " URL:    $URL"
echo " Stop:   Ctrl+C (or ./run.sh stop from another terminal)"
echo "------------------------------------------------------------"
echo

if [ "$OPEN_BROWSER" = "true" ]; then
  (
    sleep 3
    if command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$URL" >/dev/null 2>&1 || true
    elif command -v open >/dev/null 2>&1; then
      open "$URL" >/dev/null 2>&1 || true
    fi
  ) &
fi

set +e
if [ "$MODE" = "local" ]; then
  "$JAVA_BIN" -jar "$JAR" --spring.profiles.active=local
else
  "$JAVA_BIN" -jar "$JAR"
fi
STATUS=$?
set -e

if [ "$STATUS" -ne 0 ] && [ "$MODE" = "neon" ]; then
  echo
  echo "THRIVE&CO could not start with Neon PostgreSQL."
  echo "  - Check DB_URL, DB_USER and DB_PASSWORD in .env"
  echo "  - Make sure the Neon project is active and the pooled connection string is correct"
  echo "  - If TLS/channel binding fails, remove '&channel_binding=require' from DB_URL"
  echo "  - For the offline demo run: ./run.sh local"
fi

exit "$STATUS"
