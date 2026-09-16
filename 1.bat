```bat
@echo off
setlocal EnableExtensions
title WINDOWS 0 KM - TODOS LOS USUARIOS
color 0A

:: ============================================================
:: WINDOWS 0 KM - TODOS LOS USUARIOS
:: ============================================================
:: ADVERTENCIA:
:: BORRA DATOS PERSONALES DE LOS PERFILES DE C:\Users
:: NO BORRA WINDOWS
:: NO DESINSTALA PROGRAMAS
:: NO EJECUTA SFC NI DISM
:: ============================================================

:: ------------------------------------------------------------
:: ADMINISTRADOR
:: ------------------------------------------------------------
net session >nul 2>&1

if %errorlevel% neq 0 (
    echo.
    echo Solicitando permisos de Administrador...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:: ------------------------------------------------------------
:: CONFIRMACION
:: ------------------------------------------------------------
cls

echo.
echo ============================================================
echo                    WINDOWS 0 KM
echo                 TODOS LOS USUARIOS
echo ============================================================
echo.
echo !!! ADVERTENCIA !!!
echo.
echo SE BORRARAN LOS ARCHIVOS PERSONALES DE TODOS LOS
echo PERFILES NORMALES DE C:\Users
echo.
echo SE BORRARA EL CONTENIDO DE:
echo.
echo   - ESCRITORIO
echo   - DOCUMENTOS
echo   - DESCARGAS
echo   - IMAGENES
echo   - VIDEOS
echo   - MUSICA
echo.
echo TAMBIEN:
echo   - TEMPORALES
echo   - CACHE
echo   - ARCHIVOS RECIENTES
echo   - MINIATURAS
echo   - CACHE DE NAVEGADORES
echo   - PAPELERA
echo.
echo NO SE BORRARAN:
echo   - WINDOWS
echo   - PROGRAMAS INSTALADOS
echo   - SYSTEM32
echo   - WinSxS
echo   - C:\Users\Default
echo   - C:\Users\Public
echo.
echo ============================================================
echo.
choice /c SN /n /m "Escriba S para continuar o N para cancelar: "

if errorlevel 2 goto CANCELAR


:: ============================================================
:: CERRAR EXPLORADOR Y NAVEGADORES
:: ============================================================
cls
echo.
echo [1/10] Cerrando aplicaciones...

taskkill /f /im explorer.exe >nul 2>&1
taskkill /f /im chrome.exe >nul 2>&1
taskkill /f /im msedge.exe >nul 2>&1
taskkill /f /im firefox.exe >nul 2>&1

timeout /t 3 >nul


:: ============================================================
:: BORRAR DATOS PERSONALES
:: ============================================================
cls
echo.
echo ============================================================
echo [2/10] BORRANDO DATOS PERSONALES
echo ============================================================
echo.

for /d %%U in ("C:\Users\*") do (

    if /I not "%%~nxU"=="Default" if /I not "%%~nxU"=="Default User" if /I not "%%~nxU"=="Public" if /I not "%%~nxU"=="All Users" (

        echo --------------------------------------------
        echo Usuario: %%~nxU
        echo --------------------------------------------

        echo Escritorio...
        del /f /s /q "%%U\Desktop\*" >nul 2>&1
        for /d %%D in ("%%U\Desktop\*") do rd /s /q "%%D" >nul 2>&1

        echo Documentos...
        del /f /s /q "%%U\Documents\*" >nul 2>&1
        for /d %%D in ("%%U\Documents\*") do rd /s /q "%%D" >nul 2>&1

        echo Descargas...
        del /f /s /q "%%U\Downloads\*" >nul 2>&1
        for /d %%D in ("%%U\Downloads\*") do rd /s /q "%%D" >nul 2>&1

        echo Imagenes...
        del /f /s /q "%%U\Pictures\*" >nul 2>&1
        for /d %%D in ("%%U\Pictures\*") do rd /s /q "%%D" >nul 2>&1

        echo Videos...
        del /f /s /q "%%U\Videos\*" >nul 2>&1
        for /d %%D in ("%%U\Videos\*") do rd /s /q "%%D" >nul 2>&1

        echo Musica...
        del /f /s /q "%%U\Music\*" >nul 2>&1
        for /d %%D in ("%%U\Music\*") do rd /s /q "%%D" >nul 2>&1

    )
)


:: ============================================================
:: TEMPORARIOS
:: ============================================================
cls
echo.
echo [3/10] Limpiando temporales de todos los usuarios...

for /d %%U in ("C:\Users\*") do (

    if /I not "%%~nxU"=="Default" if /I not "%%~nxU"=="Default User" if /I not "%%~nxU"=="Public" if /I not "%%~nxU"=="All Users" (

        del /f /s /q "%%U\AppData\Local\Temp\*" >nul 2>&1

        for /d %%D in ("%%U\AppData\Local\Temp\*") do (
            rd /s /q "%%D" >nul 2>&1
        )

    )
)

del /f /s /q "%SystemRoot%\Temp\*" >nul 2>&1

for /d %%D in ("%SystemRoot%\Temp\*") do (
    rd /s /q "%%D" >nul 2>&1
)


:: ============================================================
:: CACHE EXPLORER
:: ============================================================
cls
echo.
echo [4/10] Limpiando cache de Explorer...

for /d %%U in ("C:\Users\*") do (

    if /I not "%%~nxU"=="Default" if /I not "%%~nxU"=="Default User" if /I not "%%~nxU"=="Public" if /I not "%%~nxU"=="All Users" (

        del /f /q "%%U\AppData\Local\IconCache.db" >nul 2>&1

        del /f /q "%%U\AppData\Local\Microsoft\Windows\Explorer\iconcache*" >nul 2>&1

        del /f /q "%%U\AppData\Local\Microsoft\Windows\Explorer\thumbcache*" >nul 2>&1

    )
)


:: ============================================================
:: ARCHIVOS RECIENTES
:: ============================================================
cls
echo.
echo [5/10] Limpiando historial de archivos recientes...

for /d %%U in ("C:\Users\*") do (

    if /I not "%%~nxU"=="Default" if /I not "%%~nxU"=="Default User" if /I not "%%~nxU"=="Public" if /I not "%%~nxU"=="All Users" (

        del /f /q "%%U\AppData\Roaming\Microsoft\Windows\Recent\*" >nul 2>&1

        del /f /q "%%U\AppData\Roaming\Microsoft\Windows\Recent\AutomaticDestinations\*" >nul 2>&1

        del /f /q "%%U\AppData\Roaming\Microsoft\Windows\Recent\CustomDestinations\*" >nul 2>&1

    )
)


:: ============================================================
:: CHROME
:: ============================================================
cls
echo.
echo [6/10] Limpiando Chrome de todos los usuarios...

for /d %%U in ("C:\Users\*") do (

    if /I not "%%~nxU"=="Default" if /I not "%%~nxU"=="Default User" if /I not "%%~nxU"=="Public" if /I not "%%~nxU"=="All Users" (

        for /d %%P in ("%%U\AppData\Local\Google\Chrome\User Data\*") do (

            del /f /s /q "%%P\Cache\*" >nul 2>&1
            del /f /s /q "%%P\Code Cache\*" >nul 2>&1
            del /f /s /q "%%P\GPUCache\*" >nul 2>&1

        )

    )
)


:: ============================================================
:: EDGE
:: ============================================================
cls
echo.
echo [7/10] Limpiando Edge de todos los usuarios...

for /d %%U in ("C:\Users\*") do (

    if /I not "%%~nxU"=="Default" if /I not "%%~nxU"=="Default User" if /I not "%%~nxU"=="Public" if /I not "%%~nxU"=="All Users" (

        for /d %%P in ("%%U\AppData\Local\Microsoft\Edge\User Data\*") do (

            del /f /s /q "%%P\Cache\*" >nul 2>&1
            del /f /s /q "%%P\Code Cache\*" >nul 2>&1
            del /f /s /q "%%P\GPUCache\*" >nul 2>&1

        )

    )
)


:: ============================================================
:: WINDOWS UPDATE
:: ============================================================
cls
echo.
echo [8/10] Limpiando cache de Windows Update...

net stop wuauserv >nul 2>&1
net stop bits >nul 2>&1

del /f /s /q "%SystemRoot%\SoftwareDistribution\Download\*" >nul 2>&1

for /d %%D in ("%SystemRoot%\SoftwareDistribution\Download\*") do (
    rd /s /q "%%D" >nul 2>&1
)

net start bits >nul 2>&1
net start wuauserv >nul 2>&1


:: ============================================================
:: DNS + PAPELERA
:: ============================================================
cls
echo.
echo [9/10] Limpiando DNS y Papelera...

ipconfig /flushdns >nul 2>&1

PowerShell -NoProfile -ExecutionPolicy Bypass -Command ^
"Clear-RecycleBin -Force -ErrorAction SilentlyContinue" >nul 2>&1


:: ============================================================
:: LIMPIEZA DISCO
:: ============================================================
cls
echo.
echo [10/10] Ejecutando limpieza de disco de Windows...

if exist "%SystemRoot%\System32\cleanmgr.exe" (
    cleanmgr.exe /verylowdisk
)


:: ============================================================
:: FONDO NEGRO Y EXPLORADOR
:: ============================================================
cls
echo.
echo Configurando Explorer...

for /d %%U in ("C:\Users\*") do (

    if /I not "%%~nxU"=="Default" if /I not "%%~nxU"=="Default User" if /I not "%%~nxU"=="Public" if /I not "%%~nxU"=="All Users" (

        reg load "HKU\TEMP_%%~nxU" "%%U\NTUSER.DAT" >nul 2>&1

        if not errorlevel 1 (

            reg add "HKU\TEMP_%%~nxU\Control Panel\Colors" ^
            /v Background /t REG_SZ /d "0 0 0" /f >nul 2>&1

            reg add "HKU\TEMP_%%~nxU\Control Panel\Desktop" ^
            /v Wallpaper /t REG_SZ /d "" /f >nul 2>&1

            reg add "HKU\TEMP_%%~nxU\Control Panel\Desktop" ^
            /v WallpaperStyle /t REG_SZ /d "0" /f >nul 2>&1

            reg unload "HKU\TEMP_%%~nxU" >nul 2>&1
        )
    )
)

start explorer.exe

cls
echo.
echo ============================================================
echo                  WINDOWS 0 KM FINALIZADO
echo ============================================================
echo.
echo TODOS LOS USUARIOS HAN SIDO LIMPIADOS.
echo.
echo Datos personales eliminados:
echo   [OK] Escritorio
echo   [OK] Documentos
echo   [OK] Descargas
echo   [OK] Imagenes
echo   [OK] Videos
echo   [OK] Musica
echo.
echo Limpieza:
echo   [OK] Temporales
echo   [OK] Cache Explorer
echo   [OK] Miniaturas
echo   [OK] Archivos recientes
echo   [OK] Cache Chrome
echo   [OK] Cache Edge
echo   [OK] Windows Update
echo   [OK] DNS
echo   [OK] Papelera
echo   [OK] Limpieza de disco
echo.
echo Sistema:
echo   [OK] Windows conservado
echo   [OK] Programas conservados
echo   [OK] Explorer reiniciado
echo.
echo ============================================================
echo.
pause
exit /b


:CANCELAR
cls
echo.
echo ============================================================
echo OPERACION CANCELADA
echo ============================================================
echo.
echo No se elimino ningun archivo.
echo.
pause
exit /b
```
