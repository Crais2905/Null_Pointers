param([ValidateSet('setup','up','test','seed')][string]$Task='up')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
function Run([string]$Dir,[string]$Exe,[string[]]$Arguments){
 Push-Location $Dir
 try { & $Exe @Arguments; if($LASTEXITCODE -ne 0){throw "$Exe failed"} } finally {Pop-Location}
}
$python=Join-Path $root 'ai/.venv/Scripts/python.exe'
if($Task -eq 'setup'){
 if(!(Test-Path $python)){
  Run $root 'python' @('-c','import sys; assert sys.version_info >= (3,11), "Python 3.11+ required"')
  Run $root 'python' @('-m','venv','ai/.venv')
 }
 Run $root $python @('-m','pip','install','-r','ai/requirements.txt')
 Run "$root/web" 'npm.cmd' @('install')
 if(!(Test-Path "$root/.env")){Copy-Item "$root/.env.example" "$root/.env"}
 if(!(Test-Path "$root/web/.env.local")){Copy-Item "$root/web/.env.example" "$root/web/.env.local"}
 Run $root $python @('scripts/sync_fixtures.py')
 exit
}
if($Task -eq 'seed'){Run $root $python @('scripts/sync_fixtures.py');exit}
if($Task -eq 'test'){
 Run $root $python @('scripts/check_scaffold.py')
 Run "$root/backend" 'mvn.cmd' @('test')
 Run "$root/ai" $python @('-m','pytest','-q')
 Run "$root/web" 'npm.cmd' @('run','build')
 exit
}
foreach($tool in @('mvn.cmd','npm.cmd')){if(!(Get-Command $tool -ErrorAction SilentlyContinue)){throw "Install $tool and add it to PATH"}}
if(!(Test-Path $python)){throw 'Run ./scripts/dev.ps1 setup first'}
# Load local env as data, never execute its contents.
if(Test-Path "$root/.env"){
 foreach($line in Get-Content "$root/.env"){
  if($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$'){[Environment]::SetEnvironmentVariable($matches[1],$matches[2],'Process')}
 }
}
$jobs=@()
try {
 $jobs+=Start-Job -ArgumentList "$root/backend" -ScriptBlock {param($d) Set-Location $d; & mvn.cmd spring-boot:run}
 $jobs+=Start-Job -ArgumentList "$root/ai",$python -ScriptBlock {param($d,$py) Set-Location $d; & $py -m uvicorn app.main:app --port 8000}
 $jobs+=Start-Job -ArgumentList "$root/web" -ScriptBlock {param($d) Set-Location $d; & npm.cmd run dev}
 while($true){$jobs|Receive-Job;if($jobs|Where-Object State -ne 'Running'){throw 'A service stopped; check output'};Start-Sleep -Milliseconds 500}
}finally{$jobs|Stop-Job;$jobs|Remove-Job -Force}
