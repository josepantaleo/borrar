@echo off
setlocal EnableExtensions

:: ============================================================
:: PUESTA A PUNTO IPEM 146 - WINDOWS 10
:: ============================================================

:: Comprobar si somos administrador
net session >nul 2>&1

if not "%errorlevel%"=="0" (
    echo.
    echo ============================================================
    echo       SE NECESITAN PERMISOS DE ADMINISTRADOR
    echo ============================================================
    echo.
    echo Se abrira la ventana de Windows para autorizar el proceso.
    echo.
    
    powershell.exe -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"

    exit /b
)

:: ============================================================
:: A PARTIR DE AQUI SOMOS ADMINISTRADOR
:: ============================================================

set "CARPETA=C:\Puesta_Punto_IPEM146"
set "LOG=%CARPETA%\Informe_%COMPUTERNAME%.txt"

if not exist "%CARPETA%" mkdir "%CARPETA%"

cls

echo ============================================================
echo.
echo              PUESTA A PUNTO IPEM 146
echo.
echo ============================================================
echo.
echo Equipo: %COMPUTERNAME%
echo Usuario: %USERNAME%
echo.
echo Iniciando...
echo.

(
echo ============================================================
echo PUESTA A PUNTO IPEM 146
echo ============================================================
echo Equipo: %COMPUTERNAME%
echo Usuario: %USERNAME%
echo Fecha: %DATE%
echo Hora: %TIME%
echo ============================================================
echo.
) > "%LOG%"

:: ============================================================
:: 1. ESCRITORIO NEGRO
:: ============================================================

echo [1/10] Configurando escritorio...

reg add "HKCU\Control Panel\Colors" ^
 /v Background /t REG_SZ /d "0 0 0" /f >nul 2>&1

reg add "HKCU\Control Panel\Desktop" ^
 /v Wallpaper /t REG_SZ /d "" /f >nul 2>&1

reg add "HKCU\Control Panel\Desktop" ^
 /v WallpaperStyle /t REG_SZ /d "0" /f >nul 2>&1

reg add "HKCU\Control Panel\Desktop" ^
 /v TileWallpaper /t REG_SZ /d "0" /f >nul 2>&1

:: ============================================================
:: 2. ICONOS
:: ============================================================

echo [2/10] Configurando iconos...

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" ^
 /v HideIcons /t REG_DWORD /d 0 /f >nul 2>&1

reg add "HKCU\Software\Microsoft\Windows\Shell\Bags\1\Desktop" ^
 /v IconSize /t REG_DWORD /d 48 /f >nul 2>&1

:: ============================================================
:: 3. EXPLORADOR
:: ============================================================

echo [3/10] Configurando Explorador...

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" ^
 /v HideFileExt /t REG_DWORD /d 0 /f >nul 2>&1

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" ^
 /v Hidden /t REG_DWORD /d 2 /f >nul 2>&1

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" ^
 /v ShowSuperHidden /t REG_DWORD /d 0 /f >nul 2>&1

:: ============================================================
:: 4. LIMPIAR TEMPORALES
:: ============================================================

echo [4/10] Limpiando archivos temporales...

del /f /s /q "%TEMP%\*" >nul 2>&1

for /d %%D in ("%TEMP%\*") do rd /s /q "%%D" >nul 2>&1

del /f /s /q "%SystemRoot%\Temp\*" >nul 2>&1

for /d %%D in ("%SystemRoot%\Temp\*") do rd /s /q "%%D" >nul 2>&1

:: ============================================================
:: 5. DISM
:: ============================================================

echo.
echo [5/10] Reparando Windows con DISM...
echo.
echo Este proceso puede tardar bastante.
echo.

DISM /Online /Cleanup-Image /RestoreHealth >> "%LOG%" 2>&1

:: ============================================================
:: 6. SFC
:: ============================================================

echo.
echo [6/10] Comprobando archivos de Windows...
echo.

sfc /scannow >> "%LOG%" 2>&1

:: ============================================================
:: 7. RED
:: ============================================================

echo.
echo [7/10] Reparando red...

netsh winsock reset >> "%LOG%" 2>&1

netsh int ip reset >> "%LOG%" 2>&1

ipconfig /flushdns >> "%LOG%" 2>&1

ipconfig /renew >> "%LOG%" 2>&1

:: ============================================================
:: 8. FIREWALL
:: ============================================================

echo [8/10] Comprobando Firewall...

netsh advfirewall set allprofiles state on >> "%LOG%" 2>&1

:: ============================================================
:: 9. ENERGIA
:: ============================================================

echo [9/10] Configurando energia...

powercfg /setactive SCHEME_BALANCED >> "%LOG%" 2>&1

:: ============================================================
:: 10. DISCO
:: ============================================================

echo [10/10] Comprobando disco...

chkdsk %SystemDrive% /scan >> "%LOG%" 2>&1

:: ============================================================
:: INFORMACION FINAL
:: ============================================================

echo.
echo Generando informe...

echo. >> "%LOG%"
echo ================= RED ================= >> "%LOG%"
ipconfig /all >> "%LOG%" 2>&1

echo. >> "%LOG%"
echo ================= DISCO ================= >> "%LOG%"
wmic logicaldisk get caption,size,freespace >> "%LOG%" 2>&1

echo. >> "%LOG%"
echo ================= FIN ================= >> "%LOG%"
echo Finalizado: %DATE% %TIME% >> "%LOG%"

:: ============================================================
:: ACTUALIZAR ESCRITORIO
:: ============================================================

RUNDLL32.EXE user32.dll,UpdatePerUserSystemParameters

taskkill /f /im explorer.exe >nul 2>&1

timeout /t 2 /nobreak >nul

start explorer.exe

:: ============================================================
:: FINAL
:: ============================================================

cls

echo.
echo ============================================================
echo.
echo             PUESTA A PUNTO TERMINADA
echo.
echo ============================================================
echo.
echo Equipo:
echo %COMPUTERNAME%
echo.
echo Se realizaron las siguientes tareas:
echo.
echo [OK] Fondo negro
echo [OK] Iconos normales
echo [OK] Explorador
echo [OK] Temporales
echo [OK] DISM
echo [OK] SFC
echo [OK] Red
echo [OK] DNS
echo [OK] Firewall
echo [OK] Energia
echo [OK] Disco
echo.
echo Informe:
echo %LOG%
echo.
echo ============================================================
echo.
echo La computadora se reiniciara en 20 segundos.
echo.
timeout /t 20 /nobreak

shutdown /r /t 5

exit /b