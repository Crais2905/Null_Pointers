param([ValidateSet('setup','up','test','seed')][string]$Task='up')
$root=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
switch($Task){
 'setup' { & "$root/start.ps1" -SetupOnly }
 'test' { & "$root/start.ps1" -Test }
 'seed' { & "$root/fixer/ai/.venv/Scripts/python.exe" "$PSScriptRoot/sync_fixtures.py" }
 default { & "$root/start.ps1" }
}
