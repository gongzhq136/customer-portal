#!/bin/sh
set -e

# Run Drizzle migrations
echo "Running Drizzle migrations..."
if ! npx drizzle-kit migrate --config drizzle.config.ts; then
  echo "Migration failed!"
  exit 1
fi
# Execute the command passed as arguments to this script (which is the CMD from Dockerfile)
echo "Starting Nuxt server..."
exec "$@"
