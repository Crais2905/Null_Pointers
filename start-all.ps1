param(
    [ValidateSet('up','test','setup','seed')]
    [string]$Task = 'up'
)
& "$PSScriptRoot\fixer\scripts\dev.ps1" -Task $Task
