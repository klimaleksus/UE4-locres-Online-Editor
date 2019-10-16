@echo off
cd /d "%~dp0"
node.exe UE4locresOnlineEditor.js "%~n0" %*
if errorlevel 1 pause
