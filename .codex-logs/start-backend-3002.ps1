$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $root 'server'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$log = Join-Path $serverDir ".codex-backend-3002.$stamp.log"

Set-Location -LiteralPath $serverDir

if (-not (Test-Path (Split-Path -Parent $log))) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $log) | Out-Null
}

"[$(Get-Date -Format o)] starting backend on 3002" | Out-File -FilePath $log -Encoding utf8

$env:PORT = '3002'

& 'C:\Program Files\nodejs\node.exe' 'index.js' *>> $log
