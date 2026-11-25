@echo off
setlocal
title QG - construction de l'application
cd /d "%~dp0"
set "EV=33.2.1"
set "ROOT=%~dp0"
set "OUT=%ROOT%QG-App"

echo.
echo  ==============================================
echo    QG  //  construction de QG.exe
echo  ==============================================
echo.

where curl >nul 2>&1 || (echo [ERREUR] curl introuvable. Windows 10 ou 11 requis. & goto :fail)
where tar  >nul 2>&1 || (echo [ERREUR] tar introuvable. Windows 10 ou 11 requis. & goto :fail)

taskkill /im QG.exe /f >nul 2>&1

if not exist "_cache" mkdir "_cache"
if not exist "_cache\electron-v%EV%.zip" (
  echo [1/4] Telechargement du moteur Electron %EV% ^(~110 Mo, une seule fois^)...
  curl -L --fail --progress-bar -o "_cache\electron-v%EV%.zip.part" "https://github.com/electron/electron/releases/download/v%EV%/electron-v%EV%-win32-x64.zip" || goto :fail
  move /y "_cache\electron-v%EV%.zip.part" "_cache\electron-v%EV%.zip" >nul
) else (
  echo [1/4] Moteur Electron deja telecharge.
)

echo [2/4] Bibliotheques du globe 3D...
if not exist "app\vendor" mkdir "app\vendor"
call :dl "app\vendor\three.min.js" "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js" || goto :fail
call :dl "app\vendor\OrbitControls.js" "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js" || goto :fail
call :dl "app\vendor\topojson-client.min.js" "https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js" || goto :fail
call :dl "app\vendor\countries-110m.json" "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json" || goto :fail
call :dl "app\vendor\leaflet.js" "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js" || goto :fail
call :dl "app\vendor\leaflet.css" "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" || goto :fail

echo [3/4] Assemblage de QG.exe...
if not exist "%OUT%\QG.exe" (
  if exist "%OUT%" rmdir /s /q "%OUT%"
  mkdir "%OUT%"
  tar -xf "_cache\electron-v%EV%.zip" -C "%OUT%" || goto :fail
  ren "%OUT%\electron.exe" "QG.exe" || goto :fail
)
if exist "%OUT%\resources\default_app.asar" del /q "%OUT%\resources\default_app.asar"
robocopy "app" "%OUT%\resources\app" /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto :fail
copy /y "QG.ico" "%OUT%\QG.ico" >nul

echo [4/4] Raccourci sur le Bureau...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d 'QG.lnk')); $s.TargetPath='%OUT%\QG.exe'; $s.WorkingDirectory='%OUT%'; $s.IconLocation='%OUT%\QG.ico'; $s.Description='QG'; $s.Save()" >nul 2>&1

echo.
echo  [OK] QG.exe est pret : %OUT%\QG.exe
echo       Un raccourci "QG" a ete cree sur le Bureau.
echo       Pour mettre a jour l'app plus tard : relance ce fichier.
echo.
start "" "%OUT%\QG.exe"
timeout /t 4 >nul
exit /b 0

:dl
if exist "%~1" exit /b 0
curl -L --fail -s -o "%~1" "%~2" || (del /q "%~1" 2>nul & exit /b 1)
exit /b 0

:fail
echo.
echo  [ERREUR] La construction a echoue. Verifie ta connexion internet puis relance BUILD-QG.bat.
echo.
pause
exit /b 1
