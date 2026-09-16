@echo off
:: ==============================================================================
:: SCRIPT DE LIMPIEZA PROFUNDA, OPTIMIZACION Y REINICIO PROGRAMADO
:: ==============================================================================
setlocal enabledelayedexpansion

:: 1. Comprobacion de Privilegios de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Debe ejecutar este script como Administrador.
    echo     Haga clic derecho en el archivo .bat y seleccione "Ejecutar como administrador".
    pause
    exit /b
)

title Limpieza Profunda, Optimizacion y Reinicio Programado
color 0A

:: Capturar espacio libre inicial en disco C: (en Bytes)
for /f %%A in ('powershell -command "(Get-Volume C).SizeRemaining"') do set "BYTES_INICIO=%%A"

echo ==============================================================================
echo [1/11] Verificando Seguridad (Defender y Firewall Activos)...
echo ==============================================================================
netsh advfirewall set allprofiles state on >nul 2>&1
sc config WinDefend start= auto >nul 2>&1
net start WinDefend >nul 2>&1
sc config MpsSvc start= auto >nul 2>&1
net start MpsSvc >nul 2>&1

echo ==============================================================================
echo [2/11] Cerrando Aplicaciones en Segundo Plano para Liberar Candados...
echo ==============================================================================
taskkill /f /im chrome.exe /im msedge.exe /im firefox.exe /im brave.exe /im opera.exe /im vivaldi.exe /im discord.exe /im spotify.exe /im ms-teams.exe /im teams.exe /im telegram.exe >nul 2>&1

echo ==============================================================================
echo [3/11] Liberacion Masiva de Espacio (Hibernacion, Logs, BITS)...
echo ==============================================================================
powercfg -h off >nul 2>&1
bitsadmin /reset /allusers >nul 2>&1

for /f "tokens=*" %%g in ('wevtutil el') do (wevtutil cl "%%g" >nul 2>&1)

net stop dosvc >nul 2>&1
del /f /q /s "%WINDIR%\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache\*" >nul 2>&1

echo ==============================================================================
echo [4/11] Optimizacion de Red y Plan de Energia...
echo ==============================================================================
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c >nul 2>&1
ipconfig /flushdns >nul 2>&1
netsh int tcp set global autotuninglevel=normal >nul 2>&1

echo ==============================================================================
echo [5/11] Limpiando Archivos Temporales de Sistema y Perfil de Servicio...
echo ==============================================================================
del /f /q /s "%WINDIR%\Temp\*" >nul 2>&1
for /d %%p in ("%WINDIR%\Temp\*") do rmdir /s /q "%%p" >nul 2>&1

del /f /q /s "%WINDIR%\System32\config\systemprofile\AppData\Local\Temp\*" >nul 2>&1
del /f /q /s "%WINDIR%\Prefetch\*" >nul 2>&1
del /f /q /s "%WINDIR%\Logs\*" >nul 2>&1
del /f /q /s "%PROGRAMDATA%\Microsoft\Windows\WER\*" >nul 2>&1
del /f /q /s "%WINDIR%\MEMORY.DMP" >nul 2>&1
del /f /q /s "%WINDIR%\Minidump\*" >nul 2>&1

net stop wuauserv >nul 2>&1
net stop bits >nul 2>&1
del /f /q /s "%WINDIR%\SoftwareDistribution\Download\*" >nul 2>&1
net start wuauserv >nul 2>&1
net start bits >nul 2>&1

rd /s /q C:\$Recycle.Bin >nul 2>&1

echo ==============================================================================
echo [6/11] Limpiando Archivos Personales y Caches de Todos los Perfiles...
echo ==============================================================================
for /d %%U in ("C:\Users\*") do (
    set "USER_NAME=%%~nxU"
    if /i not "!USER_NAME!"=="Public" (
        if /i not "!USER_NAME!"=="Default" (
            if /i not "!USER_NAME!"=="Default User" (
                if /i not "!USER_NAME!"=="All Users" (
                    echo [*] Limpiando archivos y cachés: !USER_NAME!

                    del /f /q /s "%%U\Documents\*" >nul 2>&1
                    for /d %%d in ("%%U\Documents\*") do rmdir /s /q "%%d" >nul 2>&1

                    del /f /q /s "%%U\Downloads\*" >nul 2>&1
                    for /d %%d in ("%%U\Downloads\*") do rmdir /s /q "%%d" >nul 2>&1

                    del /f /q /s "%%U\Pictures\*" >nul 2>&1
                    for /d %%d in ("%%U\Pictures\*") do rmdir /s /q "%%d" >nul 2>&1

                    del /f /q /s "%%U\Videos\*" >nul 2>&1
                    for /d %%d in ("%%U\Videos\*") do rmdir /s /q "%%d" >nul 2>&1

                    del /f /q /s "%%U\Music\*" >nul 2>&1
                    for /d %%d in ("%%U\Music\*") do rmdir /s /q "%%d" >nul 2>&1

                    del /f /q /s "%%U\Desktop\*" >nul 2>&1
                    for /d %%d in ("%%U\Desktop\*") do rmdir /s /q "%%d" >nul 2>&1

                    del /f /q /s "%%U\AppData\Local\Temp\*" >nul 2>&1
                    for /d %%d in ("%%U\AppData\Local\Temp\*") do rmdir /s /q "%%d" >nul 2>&1

                    del /f /q /s "%%U\AppData\Roaming\Microsoft\Windows\Recent\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\CrashDumps\*" >nul 2>&1

                    del /f /q /s "%%U\AppData\Local\Google\Chrome\User Data\Default\Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\Google\Chrome\User Data\Default\Code Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\Microsoft\Edge\User Data\Default\Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\Microsoft\Edge\User Data\Default\Code Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\BraveSoftware\Brave-Browser\User Data\Default\Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\Mozilla\Firefox\Profiles\*\cache2\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\Opera Software\Opera Stable\Cache\*" >nul 2>&1

                    del /f /q /s "%%U\AppData\Local\D3DSCache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\NVIDIA\DXCache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\AMD\DxCache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Roaming\discord\Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Roaming\discord\Code Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\Spotify\Data\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\Microsoft\Teams\Cache\*" >nul 2>&1

                    del /f /q /a /s "%%U\AppData\Local\Microsoft\Windows\Explorer\thumbcache_*.db" >nul 2>&1
                    del /f /q /a /s "%%U\AppData\Local\Microsoft\Windows\Explorer\iconcache_*.db" >nul 2>&1
                    del /f /q /a "%%U\AppData\Local\IconCache.db" >nul 2>&1

                    del /f /q "%%U\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\*" >nul 2>&1
                )
            )
        )
    )
)

echo ==============================================================================
echo [7/11] Configurando Registro en Todos los Perfiles (Incluyendo Futuros)...
echo ==============================================================================
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Explorer" /v DisableSearchBoxSuggestions /t REG_DWORD /d 1 /f >nul 2>&1

for /d %%U in ("C:\Users\*") do (
    set "USER_NAME=%%~nxU"
    if /i not "!USER_NAME!"=="Public" (
        if /i not "!USER_NAME!"=="Default User" (
            if /i not "!USER_NAME!"=="All Users" (
                if exist "%%U\NTUSER.DAT" (
                    echo [*] Configurando registro de: !USER_NAME!
                    reg load "HKU\TempUserHive" "%%U\NTUSER.DAT" >nul 2>&1
                    if !errorlevel! equ 0 (
                        reg add "HKU\TempUserHive\Control Panel\Desktop" /v Wallpaper /t REG_SZ /d "" /f >nul 2>&1
                        reg add "HKU\TempUserHive\Control Panel\Colors" /v Background /t REG_SZ /d "0 0 0" /f >nul 2>&1

                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 2 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" /v EnableTransparency /t REG_DWORD /d 0 /f >nul 2>&1

                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\Shell\Bags\1\Desktop" /v AutoArrange /t REG_DWORD /d 1 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\Shell\Bags\1\Desktop" /v SnapToGrid /t REG_DWORD /d 1 /f >nul 2>&1

                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v TaskbarAl /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Search" /v BingSearchEnabled /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" /v SystemPaneSuggestionsEnabled /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" /v SubscribedContent-338388Enabled /t REG_DWORD /d 0 /f >nul 2>&1

                        reg add "HKU\TempUserHive\System\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\GameDVR" /v AppCaptureEnabled /t REG_DWORD /d 0 /f >nul 2>&1

                        reg unload "HKU\TempUserHive" >nul 2>&1
                    )
                )
            )
        )
    )
)

echo ==============================================================================
echo [8/11] Ajustando Telemetria Basica...
echo ==============================================================================
sc config DiagTrack start= disabled >nul 2>&1
net stop DiagTrack >nul 2>&1

echo ==============================================================================
echo [9/11] Ejecutando Herramienta Liberador de Espacio en Disco...
echo ==============================================================================
cleanmgr /autoclean >nul 2>&1

echo ==============================================================================
echo [10/11] Reiniciando Explorador de Windows...
echo ==============================================================================
taskkill /f /im explorer.exe >nul 2>&1
timeout /t 2 /nobreak >nul
start explorer.exe >nul 2>&1

echo ==============================================================================
echo [11/11] RESUMEN DE ESPACIO LIBERADO
echo ==============================================================================
for /f %%B in ('powershell -command "(Get-Volume C).SizeRemaining"') do set "BYTES_FINAL=%%B"

powershell -command "$d = (%BYTES_FINAL% - %BYTES_INICIO%) / 1GB; $m = (%BYTES_FINAL% - %BYTES_INICIO%) / 1MB; if ($d -ge 1) { Write-Host 'Espacio total recuperado:' ([math]::Round($d, 2)) 'GB' -ForegroundColor Green } else { Write-Host 'Espacio total recuperado:' ([math]::Round($m, 2)) 'MB' -ForegroundColor Green }"

echo ==============================================================================
echo PROCESO FINALIZADO - EL EQUIPO SE REINICIARA EN 30 SEC
echo (Si deseas cancelar el reinicio, presiona Win+R, escribe "shutdown /a" y Enter)
echo ==============================================================================
shutdown /r /t 30 /c "Reinicio automatico tras finalizacion del mantenimiento general."
pause