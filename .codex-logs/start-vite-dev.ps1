$ErrorActionPreference = 'Stop'

$root = 'E:\课程平台3\xin'
$log = Join-Path $root '.codex-logs\vite.log'

Set-Location -LiteralPath $root

if (-not (Test-Path (Split-Path -Parent $log))) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $log) | Out-Null
}

"[$(Get-Date -Format o)] starting vite dev on 5173" | Out-File -FilePath $log -Encoding utf8
& 'C:\Program Files\nodejs\npm.cmd' run dev -- --host 0.0.0.0 --port 5173 *>> $log
