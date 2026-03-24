param(
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CacheRoot = Join-Path $ProjectRoot ".cache"
$NpmCacheDir = Join-Path $CacheRoot "npm"

New-Item -ItemType Directory -Force -Path $CacheRoot | Out-Null
New-Item -ItemType Directory -Force -Path $NpmCacheDir | Out-Null

$env:NPM_CONFIG_CACHE = $NpmCacheDir
$env:npm_config_cache = $NpmCacheDir

$npmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    throw "npm.cmd not found in PATH."
}

Set-Location (Join-Path $ProjectRoot "frontend")
Write-Host "Starting frontend on port $Port with npm cache: $NpmCacheDir"

& $npmCmd.Source run dev -- --port $Port
