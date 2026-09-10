$ErrorActionPreference = 'Stop'

$root = 'D:\APP\mysql-8.0.41-winx64'
$bin = Join-Path $root 'bin'
$data = Join-Path $root 'data'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$log = Join-Path $PSScriptRoot "mysql-3306.$stamp.log"

"[$(Get-Date -Format o)] starting mysql on 3306" | Out-File -FilePath $log -Encoding utf8

Set-Location -LiteralPath $bin

& (Join-Path $bin 'mysqld.exe') "--basedir=$root" "--datadir=$data" '--port=3306' '--console' *>> $log
