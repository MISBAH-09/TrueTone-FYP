# PowerShell script to build backend image and run Django migrations
Set-StrictMode -Version Latest
$here = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $here

Write-Host "Building backend image..."
docker build -t truetone-backend:latest .

Write-Host "Running migrations inside container (using backend/.env)..."
docker run --rm --env-file .env truetone-backend:latest python manage.py migrate

Write-Host "Migrations complete."