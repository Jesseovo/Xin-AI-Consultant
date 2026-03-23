param(
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
$CacheRoot = Join-Path $ProjectRoot ".cache"
$TempDir = Join-Path $CacheRoot "tmp"
$XdgDir = Join-Path $CacheRoot "xdg"
$HfDir = Join-Path $CacheRoot "huggingface"
$PipCacheDir = Join-Path $CacheRoot "pip"

$requiredDirs = @(
    $CacheRoot,
    $TempDir,
    $XdgDir,
    $HfDir,
    (Join-Path $HfDir "hub"),
    (Join-Path $HfDir "transformers"),
    $PipCacheDir
)

foreach ($dir in $requiredDirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$env:TEMP = $TempDir
$env:TMP = $TempDir
$env:XDG_CACHE_HOME = $XdgDir
$env:HF_HOME = $HfDir
$env:HUGGINGFACE_HUB_CACHE = Join-Path $HfDir "hub"
$env:TRANSFORMERS_CACHE = Join-Path $HfDir "transformers"
$env:PIP_CACHE_DIR = $PipCacheDir
$env:NO_PROXY = "127.0.0.1,localhost,0.0.0.0"
$env:no_proxy = $env:NO_PROXY

Set-Location $ProjectRoot
Write-Host "Starting backend on port $Port with project-local caches..."

& py -m uvicorn backend.main:app --host 0.0.0.0 --port $Port --reload
