#!/bin/sh
set -e

# ==============================================================================
# THRIVE&CO - Docker Entrypoint for Render / Cloud Deployment
# ==============================================================================

# 1. Normalize DATABASE_URL (Render PostgreSQL default) to JDBC format if DB_URL is not set
if [ -n "$DATABASE_URL" ] && [ -z "$DB_URL" ]; then
  case "$DATABASE_URL" in
    jdbc:*)
      export DB_URL="$DATABASE_URL"
      ;;
    postgres://*)
      export DB_URL="jdbc:postgresql://${DATABASE_URL#postgres://}"
      ;;
    postgresql://*)
      export DB_URL="jdbc:postgresql://${DATABASE_URL#postgresql://}"
      ;;
    *)
      export DB_URL="$DATABASE_URL"
      ;;
  esac
fi

# 2. Ensure DB_URL has the jdbc: prefix if provided as raw postgres:// or postgresql://
if [ -n "$DB_URL" ]; then
  case "$DB_URL" in
    jdbc:*)
      ;;
    postgres://*)
      export DB_URL="jdbc:postgresql://${DB_URL#postgres://}"
      ;;
    postgresql://*)
      export DB_URL="jdbc:postgresql://${DB_URL#postgresql://}"
      ;;
  esac
fi

# 3. Informative log if running without DB credentials
if [ -z "$DB_URL" ] && [ -z "$DATABASE_URL" ] && [ -z "$SPRING_PROFILES_ACTIVE" ]; then
  echo "[THRIVE&CO] NOTE: Neither DB_URL nor DATABASE_URL was provided."
  echo "[THRIVE&CO] Tip: To run with the embedded H2 database (zero DB setup), set SPRING_PROFILES_ACTIVE=local in Render."
fi

# 4. Use Render's PORT or fallback to 8080
PORT="${PORT:-8080}"
export PORT

echo "[THRIVE&CO] Starting application on port $PORT..."

# 5. Exec Java (replaces PID 1 so container signals like SIGTERM are received by JVM)
exec java $JAVA_OPTS -Dserver.port="$PORT" -jar /app/app.jar "$@"
