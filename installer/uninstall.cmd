@echo off
setlocal
title Desinstallation de QG 1.0
set "DEST=%LOCALAPPDATA%\Programs\QG-1.0"
taskkill /im QG-1.0.exe /f >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "foreach($d in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))){ Remove-Item -LiteralPath (Join-Path $d 'QG 1.0.lnk') -ErrorAction SilentlyContinue }" >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\QG-1.0" /f >nul 2>&1
echo.
echo   QG 1.0 a ete desinstalle.
echo   Tes donnees (projets, journal, reglages) sont conservees dans :
echo   %APPDATA%\QG 1.0
echo   Supprime ce dossier si tu veux tout effacer.
echo.
pause
cd /d "%TEMP%"
start "" /min cmd /c "ping -n 3 127.0.0.1 >nul & rmdir /s /q "%DEST%""
exit
