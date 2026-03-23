param(
    [string]$Model = "qwen2.5:7b",
    [string]$OllamaHost = "127.0.0.1:11435"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
$CacheRoot = Join-Path $ProjectRoot ".cache"
$TempDir = Join-Path $CacheRoot "tmp"
$XdgDir = Join-Path $CacheRoot "xdg"
$HfDir = Join-Path $CacheRoot "huggingface"
$OllamaModelsDir = Join-Path $CacheRoot "ollama\models"

$requiredDirs = @(
    $CacheRoot,
    $TempDir,
    $XdgDir,
    $HfDir,
    (Join-Path $HfDir "hub"),
    (Join-Path $HfDir "transformers"),
    $OllamaModelsDir
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
$env:OLLAMA_MODELS = $OllamaModelsDir
$env:OLLAMA_HOST = $OllamaHost

$ollamaCmd = Get-Command "ollama" -ErrorAction SilentlyContinue
$ollamaExe = if ($ollamaCmd) { $ollamaCmd.Source } else { $null }
if (-not $ollamaExe) {
    $candidates = @(
        (Join-Path $ProjectRoot "tools\\ollama\\ollama.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\\Ollama\\ollama.exe")
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            $ollamaExe = $candidate
            break
        }
    }
}
if (-not $ollamaExe) {
    throw "ollama not found in PATH or common install paths."
}

Write-Host "Pulling model: $Model"
Write-Host "OLLAMA_HOST=$($env:OLLAMA_HOST)"
Write-Host "OLLAMA_MODELS=$($env:OLLAMA_MODELS)"

& $ollamaExe pull $Model
if ($LASTEXITCODE -ne 0) {
    throw "Model pull failed. Make sure 'start-local-ollama.ps1' is running in another terminal."
}

Write-Host "Model pull completed."
& $ollamaExe list
