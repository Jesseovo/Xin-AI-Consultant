# 夹心 本地开发一键启动（Windows PowerShell）
# 1) 启动 docker-compose.dev.yml
# 2) 使用 docker exec 等待 MySQL 就绪
# 3) 新窗口启动后端与前端
# 4) 打印访问地址

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$mysqlContainer = "xin-mysql"
$mysqlRootPassword = "xin_root_2026"

Write-Host ""
Write-Host "======== 夹心 开发环境 ========" -ForegroundColor Cyan
Write-Host "1) 正在启动 Docker 服务（docker-compose.dev.yml）..." -ForegroundColor Yellow

docker compose -f docker-compose.dev.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Compose 启动失败。请确认已安装 Docker Desktop 且引擎正在运行。" -ForegroundColor Red
    exit 1
}

Write-Host "2) 等待 MySQL 可响应（docker exec mysqladmin ping）..." -ForegroundColor Yellow
$deadline = (Get-Date).AddSeconds(120)
$ready = $false
while ((Get-Date) -lt $deadline) {
    docker exec $mysqlContainer mysqladmin ping -h localhost -uroot -p$mysqlRootPassword --silent 2>$null
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 2
}
if (-not $ready) {
    Write-Host "MySQL 未在预期时间内就绪。请执行: docker logs $mysqlContainer" -ForegroundColor Red
    exit 1
}

Write-Host "3) 正在打开后端与前端终端窗口..." -ForegroundColor Yellow

$backendCmd = @"
cd `"$Root`"
`$env:PYTHONPATH = `"$Root`"
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
"@

$frontendCmd = @"
cd `"$Root\frontend`"
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Start-Sleep -Milliseconds 500
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "======== 访问地址 ========" -ForegroundColor Green
Write-Host "  前端: http://localhost:3000" -ForegroundColor White
Write-Host "  后端: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  API 文档: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "说明: 停止数据库与 Redis: docker compose -f docker-compose.dev.yml down" -ForegroundColor Gray
Write-Host ""
