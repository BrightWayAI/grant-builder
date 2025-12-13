#!/bin/sh
set -e

# Run Prisma migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  node node_modules/prisma/build/index.js db push --accept-data-loss
  echo "Migrations complete."
fi

# Start the application
exec node server.js
