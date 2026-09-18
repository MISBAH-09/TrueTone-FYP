#!/bin/sh
# Build backend image and run Django migrations against DATABASE_URL in backend/.env
set -e
cd "$(dirname "$0")"

echo "Building backend image..."
docker build -t truetone-backend:latest .

echo "Running migrations inside container (using backend/.env)..."
docker run --rm --env-file .env truetone-backend:latest python manage.py migrate

echo "Migrations complete." 
