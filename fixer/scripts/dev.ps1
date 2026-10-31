param([ValidateSet('setup','up','test','seed')][string]$Task='up')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent

function Find-SystemPython {
 $cmd = Get-Command python -ErrorAction SilentlyContinue
 if ($cmd -and (Test-Path $cmd.Source)) {
  try {
   & $cmd.Source -c "import sys; assert sys.version_info >= (3,11)" 2>$null
   if ($LASTEXITCODE -eq 0) { return $cmd.Source }
  } catch {}
 }
 $candidates = @(
  "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe",
  "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
  "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
  "C:\Python312\python.exe",
  "C:\Python311\python.exe"
 )
 foreach ($c in $candidates) {
  if (Test-Path $c) { return $c }
 }
 throw "Python 3.11+ not found. Please install Python 3.11+ or check path."
}

function Find-JavaHome {
 if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\javac.exe")) { return $env:JAVA_HOME }
 $candidates = @(
  "C:\Program Files\JetBrains\IntelliJ IDEA 2025.2.3\jbr",
  "C:\Program Files\JetBrains\WebStorm 2026.2.4\jbr",
  "C:\Program Files\JetBrains\PyCharm 2026.2.3\jbr",
  "C:\Program Files\Android\Android Studio\jbr",
  "C:\Program Files\Java\jdk-17",
  "C:\Program Files\Eclipse Adoptium"
 )
 foreach ($c in $candidates) {
  if (Test-Path "$c\bin\javac.exe") { return $c }
 }
 throw "JDK 17+ not found. Please set JAVA_HOME."
}

function Find-MavenCmd {
 $cmd = Get-Command mvn.cmd -ErrorAction SilentlyContinue
 if ($cmd -and (Test-Path $cmd.Source)) { return $cmd.Source }
 $candidates = @(
  "C:\Program Files\JetBrains\IntelliJ IDEA 2025.2.3\plugins\maven\lib\maven3\bin\mvn.cmd"
 )
 foreach ($c in $candidates) {
  if (Test-Path $c) { return $c }
 }
 $wrapper = Join-Path (Split-Path $root -Parent) "mvnw.cmd"
 if (Test-Path $wrapper) { return $wrapper }
 throw "Maven (mvn.cmd) not found."
}

function Run([string]$Dir,[string]$Exe,[string[]]$Arguments){
 Push-Location $Dir
 try { & $Exe @Arguments; if($LASTEXITCODE -ne 0){throw "$Exe failed"} } finally {Pop-Location}
}

$env:JAVA_HOME = Find-JavaHome
$mvnCmd = Find-MavenCmd
$python = Join-Path $root 'ai/.venv/Scripts/python.exe'

if($Task -eq 'setup'){
 if(!(Test-Path $python)){
  $sysPy = Find-SystemPython
  Run $root $sysPy @('-m','venv','ai/.venv')
 }
 Run $root $python @('-m','pip','install','-r','ai/requirements.txt')
 Run "$root/web" 'npm.cmd' @('install')
 if(!(Test-Path "$root/.env")){Copy-Item "$root/.env.example" "$root/.env"}
 if(!(Test-Path "$root/web/.env.local")){
  Set-Content -Path "$root/web/.env.local" -Value "VITE_API_URL=http://localhost:8080`r`nVITE_USE_MOCKS=false`r`n" -Encoding UTF8
 }
 Run $root $python @('scripts/sync_fixtures.py')
 exit
}

if($Task -eq 'seed'){Run $root $python @('scripts/sync_fixtures.py');exit}

if($Task -eq 'test'){
 Run $root $python @('scripts/check_scaffold.py')
 Run "$root/backend" $mvnCmd @('test')
 $env:PYTHONPATH = "$root/ai"
 Run "$root/ai" $python @('-m','pytest','-q')
 Run "$root/web" 'npm.cmd' @('run','build')
 exit
}

if(!(Test-Path $python)){throw 'Run ./scripts/dev.ps1 setup first'}

if(Test-Path "$root/.env"){
 foreach($line in Get-Content "$root/.env"){
  if($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$'){[Environment]::SetEnvironmentVariable($matches[1],$matches[2],'Process')}
 }
}

function Stop-PortProcess([int[]]$Ports) {
 foreach ($port in $Ports) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conns) {
   foreach ($c in $conns) {
    if ($c.OwningProcess -gt 4) {
     Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
   }
  }
 }
}

$javaHome = $env:JAVA_HOME
$jobs=@()
try {
 Stop-PortProcess @(8000, 8080, 5173)
 Write-Host "===================================================================" -ForegroundColor Cyan
 Write-Host " Starting Fixer Services:" -ForegroundColor Cyan
 Write-Host "   1. Python AI Engine -> http://127.0.0.1:8000/health" -ForegroundColor Green
 Write-Host "   2. Java Spring Boot -> http://localhost:8080/api/health" -ForegroundColor Green
 Write-Host "   3. React Vite UI    -> http://localhost:5173" -ForegroundColor Green
 Write-Host " Press Ctrl+C to stop all services." -ForegroundColor Yellow
 Write-Host "===================================================================" -ForegroundColor Cyan

 # PowerShell treats stderr output inside Start-Job as RemoteException when $ErrorActionPreference='Stop'.
 # Setting $ErrorActionPreference='Continue' inside each job and loading .env inside each job ensures clean execution.
 $jobs += Start-Job -Name "PythonAI" -ArgumentList "$root","$root/ai",$python -ScriptBlock {
  param($r,$d,$py)
  $ErrorActionPreference = 'Continue'
  if(Test-Path "$r/.env"){
   foreach($line in Get-Content "$r/.env"){
    if($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$'){[Environment]::SetEnvironmentVariable($matches[1],$matches[2],'Process')}
   }
  }
  $env:PYTHONPATH = $d
  Set-Location $d
  & $py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 2>&1 | ForEach-Object { "[AI]   $_" }
 }

 $jobs += Start-Job -Name "JavaBackend" -ArgumentList "$root","$root/backend",$mvnCmd,$javaHome -ScriptBlock {
  param($r,$d,$mvn,$jh)
  $ErrorActionPreference = 'Continue'
  if(Test-Path "$r/.env"){
   foreach($line in Get-Content "$r/.env"){
    if($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$'){[Environment]::SetEnvironmentVariable($matches[1],$matches[2],'Process')}
   }
  }
  $env:JAVA_HOME = $jh
  Set-Location $d
  & $mvn spring-boot:run 2>&1 | ForEach-Object { "[JAVA] $_" }
 }

 $jobs += Start-Job -Name "ViteWeb" -ArgumentList "$root","$root/web" -ScriptBlock {
  param($r,$d)
  $ErrorActionPreference = 'Continue'
  if(Test-Path "$r/.env"){
   foreach($line in Get-Content "$r/.env"){
    if($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$'){[Environment]::SetEnvironmentVariable($matches[1],$matches[2],'Process')}
   }
  }
  Set-Location $d
  & npm.cmd run dev 2>&1 | ForEach-Object { "[WEB]  $_" }
 }

 $ErrorActionPreference = 'Continue'
 while($true){
  foreach ($j in $jobs) {
   $out = Receive-Job -Job $j -ErrorAction SilentlyContinue
   if ($out) { $out | ForEach-Object { Write-Host $_ } }
  }
  $stopped = $jobs | Where-Object { $_.State -ne 'Running' }
  if ($stopped) {
   foreach ($s in $stopped) {
    Write-Host "Service $($s.Name) stopped with state: $($s.State)" -ForegroundColor Red
    Receive-Job -Job $s -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ -ForegroundColor Red }
   }
   break
  }
  Start-Sleep -Milliseconds 500
 }
} finally {
 Write-Host "Stopping all Fixer services..." -ForegroundColor Yellow
 $jobs | Stop-Job -ErrorAction SilentlyContinue
 $jobs | Remove-Job -Force -ErrorAction SilentlyContinue
 Stop-PortProcess @(8000, 8080, 5173)
}
