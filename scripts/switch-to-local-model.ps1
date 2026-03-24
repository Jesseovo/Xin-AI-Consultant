param(
    [string]$Model = "qwen2.5:3b",
    [string]$BaseUrl = "http://127.0.0.1:11435/v1",
    [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ConfigPath = Join-Path $ProjectRoot "backend\data\runtime_config.json"
$ConfigDir = Split-Path -Parent $ConfigPath
New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null

$config = @{}
if (Test-Path $ConfigPath) {
    try {
        $raw = Get-Content -Path $ConfigPath -Raw -Encoding UTF8
        if ($raw.Trim()) {
            $config = ConvertFrom-Json -InputObject $raw -AsHashtable
        }
    }
    catch {
        Write-Warning "Failed to parse existing runtime_config.json. A new config will be written."
        $config = @{}
    }
}

$config["base_url"] = $BaseUrl
$config["model"] = $Model
$config["api_key"] = $ApiKey

$json = $config | ConvertTo-Json -Depth 10
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($ConfigPath, $json, $utf8NoBom)

Write-Host "Switched runtime config to local model."
Write-Host "base_url=$BaseUrl"
Write-Host "model=$Model"
if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    Write-Host "api_key=<empty> (allowed for localhost/127.0.0.1)"
}
else {
    Write-Host "api_key=<provided>"
}
