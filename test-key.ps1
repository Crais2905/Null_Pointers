param(
    [Parameter(Position = 0)]
    [string]$ApiKey = "",
    [switch]$Save
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$venvPy = Join-Path $root "fixer\ai\.venv\Scripts\python.exe"
$fallbackPy = "C:\Users\olegn\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

$py = if (Test-Path $venvPy) { $venvPy } elseif (Test-Path $fallbackPy) { $fallbackPy } else { "python" }

$argsList = @("$root\fixer\scripts\test_api_key.py")
if ($ApiKey) { $argsList += $ApiKey }
if ($Save) { $argsList += "--save" }

& $py @argsList
