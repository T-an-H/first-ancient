$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$log = Join-Path $root ".codex-logs\frontend-5177.$stamp.log"

Set-Location -LiteralPath $root

if (-not (Test-Path (Split-Path -Parent $log))) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $log) | Out-Null
}

"[$(Get-Date -Format o)] starting vite dev on 5177" | Out-File -FilePath $log -Encoding utf8

& 'C:\Program Files\nodejs\npm.cmd' run dev -- --host 0.0.0.0 --port 5177 *>> $log
