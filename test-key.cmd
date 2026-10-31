@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0test-key.ps1" %*
