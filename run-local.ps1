<# 
  Run Smart Menu Semantic locally (frontend + Netlify Functions)
  Usage: powershell -ExecutionPolicy Bypass -File .\run-local.ps1
#>

param(
  [string]$ApiKey = $env:API_KEY,
  [string]$ApiBaseUrl = $env:VITE_API_BASE_URL
)

function Ensure-Env {
  # For this environment, fix API_KEY to the provided value or "key"
  $ApiKey = "key"
  if (-not $ApiBaseUrl -or $ApiBaseUrl.Trim() -eq "") {
    $ApiBaseUrl = "http://localhost:8888/.netlify/functions/api"
  }
  $env:API_KEY = $ApiKey
  $env:VITE_API_BASE_URL = $ApiBaseUrl
  Write-Host "API_KEY set to: $($env:API_KEY)"
  Write-Host "VITE_API_BASE_URL set to: $($env:VITE_API_BASE_URL)"
}

function Ensure-Dependencies {
  if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found. Installing dependencies..."
    npm install
  } else {
    Write-Host "Dependencies already installed (node_modules exists)."
  }
}

function Start-App {
  Write-Host "Starting Netlify dev (frontend + functions)..."
  npx netlify-cli dev
}

Ensure-Env
Ensure-Dependencies
Start-App
