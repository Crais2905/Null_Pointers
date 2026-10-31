param([switch]$Replay,[switch]$Test,[switch]$SetupOnly,[switch]$NoBrowser,[int]$ApiPort=8080,[int]$AiPort=8000,[int]$WebPort=5173)
$ErrorActionPreference='Stop'
$candidates=@()
$systemPython=Get-Command python.exe -ErrorAction SilentlyContinue
if($systemPython){$candidates+=$systemPython.Source}
foreach($version in @('314','313','312','311')){$candidates+=Join-Path $env:LOCALAPPDATA "Programs/Python/Python$version/python.exe"}
$candidates+=Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$python=$null
foreach($candidate in $candidates){
 if(Test-Path -LiteralPath $candidate){
  & $candidate -c 'import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)' 2>$null
  if($LASTEXITCODE -eq 0){$python=$candidate;break}
 }
}
if(!$python){throw 'Python 3.11+ not found. Install Python from python.org and run start.cmd again.'}
$arguments=@("$PSScriptRoot/fixer/scripts/launch.py",'--api-port',"$ApiPort",'--ai-port',"$AiPort",'--web-port',"$WebPort")
if($Replay){$arguments+='--replay'}
if($Test){$arguments+='--test'}
if($SetupOnly){$arguments+='--setup-only'}
if($NoBrowser){$arguments+='--no-browser'}
& $python @arguments
if($LASTEXITCODE -ne 0){throw "Fixer exited with code $LASTEXITCODE. Check .build/logs for service errors."}
