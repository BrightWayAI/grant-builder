#!/bin/sh
set -e

run_migrations() {
  if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL not set, skipping migrations."
    return 0
  fi

  attempts=${MIGRATION_MAX_ATTEMPTS:-30}
  delay=${MIGRATION_RETRY_DELAY_SECONDS:-5}
  strict=${MIGRATION_REQUIRED:-true}

  echo "Running database migrations (max ${attempts} attempts)..."

  n=1
  while [ $n -le $attempts ]; do
    if node node_modules/prisma/build/index.js db push --accept-data-loss --skip-generate; then
      echo "Migrations complete."
      return 0
    fi

    if [ $n -lt $attempts ]; then
      echo "Migration attempt ${n} failed, retrying in ${delay}s..."
      sleep "$delay"
    else
      echo "Migrations failed after ${attempts} attempts."
      if [ "$strict" = "true" ]; then
        echo "Exiting because MIGRATION_REQUIRED=${strict}."
        return 1
      else
        echo "Continuing startup with MIGRATION_REQUIRED=${strict}."
        return 0
      fi
    fi

    n=$((n + 1))
  done
}

run_migrations

echo "Starting application..."
exec node server.js
