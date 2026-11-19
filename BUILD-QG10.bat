@echo off
setlocal
title QG 1.0 - construction de l'installateur
cd /d "%~dp0"
set "ROOT=%~dp0"
set "EV=33.2.1"
set "OUT=%ROOT%build\QG-1.0"

echo.
echo  ==================================================
echo    QG 1.0  //  construction de QG-1.0-Setup.exe
echo  ==================================================
echo.
where curl >nul 2>&1 || (echo [ERREUR] curl introuvable - Windows 10/11 requis. & goto :fail)
where tar  >nul 2>&1 || (echo [ERREUR] tar introuvable - Windows 10/11 requis. & goto :fail)
taskkill /im QG-1.0.exe /f >nul 2>&1

if not exist "_cache" mkdir "_cache"
if not exist "_cache\electron-v%EV%.zip" if exist "..\QG\_cache\electron-v%EV%.zip" copy /y "..\QG\_cache\electron-v%EV%.zip" "_cache\" >nul
if not exist "_cache\electron-v%EV%.zip" (
  echo [1/6] Telechargement du moteur Electron %EV% ^(~110 Mo^)...
  curl -L --fail --progress-bar -o "_cache\electron.part" "https://github.com/electron/electron/releases/download/v%EV%/electron-v%EV%-win32-x64.zip" || goto :fail
  move /y "_cache\electron.part" "_cache\electron-v%EV%.zip" >nul
) else ( echo [1/6] Moteur Electron deja present. )

echo [2/6] Bibliotheques du globe 3D (embarquees dans l'app)...
if not exist "app\vendor" mkdir "app\vendor"
call :dl "app\vendor\three.min.js" "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js" || goto :fail
call :dl "app\vendor\OrbitControls.js" "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js" || goto :fail
call :dl "app\vendor\topojson-client.min.js" "https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js" || goto :fail
call :dl "app\vendor\countries-110m.json" "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json" || goto :fail
call :dl "app\vendor\leaflet.js" "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js" || goto :fail
call :dl "app\vendor\leaflet.css" "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" || goto :fail

echo [3/6] Assemblage de QG-1.0.exe...
if exist "build" rmdir /s /q "build"
mkdir "%OUT%" || goto :fail
tar -xf "_cache\electron-v%EV%.zip" -C "%OUT%" || goto :fail
ren "%OUT%\electron.exe" "QG-1.0.exe" || goto :fail
del /q "%OUT%\resources\default_app.asar" 2>nul
for %%F in ("%OUT%\locales\*.pak") do if /i not "%%~nF"=="fr" if /i not "%%~nF"=="en-US" del /q "%%F"
robocopy "app" "%OUT%\resources\app" /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto :fail
copy /y "QG.ico" "%OUT%\QG.ico" >nul
copy /y "installer\uninstall.cmd" "%OUT%\uninstall.cmd" >nul

echo [4/6] Version portable (zip)...
if not exist "dist" mkdir "dist"
del /q "dist\*" 2>nul
tar -a -cf "dist\QG-1.0-portable.zip" -C "build" "QG-1.0" || goto :fail

echo [5/6] Installateur QG-1.0-Setup.exe...
set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%CSC%" (echo [ERREUR] Compilateur .NET introuvable. & goto :fail)
set "NET=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319"
if not exist "%NET%\System.IO.Compression.FileSystem.dll" set "NET=%WINDIR%\Microsoft.NET\Framework\v4.0.30319"
"%CSC%" /nologo /target:winexe /optimize+ /codepage:65001 /out:"dist\QG-1.0-Setup.exe" /win32icon:"QG.ico" /resource:"dist\QG-1.0-portable.zip",qg-app.zip /reference:"%NET%\System.IO.Compression.dll" /reference:"%NET%\System.IO.Compression.FileSystem.dll" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll "installer\Setup.cs" || goto :fail
if not exist "dist\QG-1.0-Setup.exe" goto :fail

echo [6/6] Empreintes SHA-256 (a publier avec les fichiers)...
(for %%F in ("dist\QG-1.0-Setup.exe" "dist\QG-1.0-portable.zip") do (echo %%~nxF& certutil -hashfile "%%~F" SHA256 | findstr /v ":")) > "dist\SHA256.txt"

echo.
echo  [OK] Fichiers prets dans : %ROOT%dist
echo       - QG-1.0-Setup.exe     installateur (a publier)
echo       - QG-1.0-portable.zip  version sans installation
echo       - SHA256.txt           empreintes pour verifier les telechargements
echo.
start "" "%ROOT%dist"
pause
exit /b 0

:dl
if exist "%~1" exit /b 0
curl -L --fail -s -o "%~1" "%~2" || (del /q "%~1" 2>nul & exit /b 1)
exit /b 0

:fail
echo.
echo  [ERREUR] La construction a echoue. Verifie ta connexion internet puis relance BUILD-QG10.bat.
pause
exit /b 1
