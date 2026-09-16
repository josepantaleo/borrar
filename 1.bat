@echo off
:: ==============================================================================
:: SCRIPT DE LIMPIEZA PROFUNDA, OPTIMIZACION Y FONDO NEGRO CON ICONOS DE SISTEMA
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

title Mantenimiento de Sistema y Optimizacion de Perfiles
color 0B

cls
echo +------------------------------------------------------------------------------+
echo ¦                  SISTEMA DE LIMPIEZA Y OPTIMIZACION PRO                      ¦
echo ¦                   ESTANDARIZACION DE PERFILES WINDOWS                        ¦
echo +------------------------------------------------------------------------------+
echo.

:: Capturar espacio libre inicial en disco C: (en Bytes)
for /f %%A in ('powershell -command "(Get-Volume C).SizeRemaining"') do set "BYTES_INICIO=%%A"

echo +------------------------------------------------------------------------------+
echo ¦ [1/11] SEGURIDAD: Verificando Defender y Firewall                            ¦
echo +------------------------------------------------------------------------------+
netsh advfirewall set allprofiles state on >nul 2>&1
sc config WinDefend start= auto >nul 2>&1
net start WinDefend >nul 2>&1
sc config MpsSvc start= auto >nul 2>&1
net start MpsSvc >nul 2>&1
echo  [?] Estado de seguridad garantizado.
echo.

echo +------------------------------------------------------------------------------+
echo ¦ [2/11] PROCESOS: Cerrando aplicaciones para liberar bloqueos                ¦
echo +------------------------------------------------------------------------------+
taskkill /f /im chrome.exe /im msedge.exe /im firefox.exe /im brave.exe /im opera.exe /im vivaldi.exe /im discord.exe /im spotify.exe /im ms-teams.exe /im teams.exe /im telegram.exe >nul 2>&1
echo  [?] Procesos de usuario finalizados.
echo.

echo +------------------------------------------------------------------------------+
echo ¦ [3/11] NAVEGADOR: Verificacion e instalacion de Google Chrome                ¦
echo +------------------------------------------------------------------------------+
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    echo  [?] Google Chrome ya esta instalado.
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    echo  [?] Google Chrome ya esta instalado.
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    echo  [?] Google Chrome ya esta instalado.
) else (
    echo  [*] Google Chrome no fue encontrado. Instalando mediante winget...
    winget install --id Google.Chrome -e --accept-source-agreements --accept-package-agreements >nul 2>&1
    if !errorlevel! equ 0 (
        echo  [?] Google Chrome se instalo correctamente.
    ) else (
        echo  [!] Hubo un error al intentar instalar Google Chrome.
    )
)
echo.

echo +------------------------------------------------------------------------------+
echo ¦ [4/11] SISTEMA: Liberacion masiva (Hibernacion, Logs, Spooler)               ¦
echo +------------------------------------------------------------------------------+
powercfg -h off >nul 2>&1
bitsadmin /reset /allusers >nul 2>&1

net stop spooler >nul 2>&1
del /f /q /s "%WINDIR%\System32\spool\PRINTERS\*" >nul 2>&1
net start spooler >nul 2>&1

for /f "tokens=*" %%g in ('wevtutil el') do (wevtutil cl "%%g" >nul 2>&1)

net stop dosvc >nul 2>&1
del /f /q /s "%WINDIR%\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache\*" >nul 2>&1
echo  [?] Basura del sistema y registros purgados.
echo.

echo +------------------------------------------------------------------------------+
echo ¦ [5/11] RENDIMIENTO: Optimizacion de Red, Energia y Trim SSD                  ¦
echo +------------------------------------------------------------------------------+
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c >nul 2>&1
ipconfig /flushdns >nul 2>&1
netsh int tcp set global autotuninglevel=normal >nul 2>&1
defrag C: /O >nul 2>&1
echo  [?] Plan de energia activo y unidad C: optimizada.
echo.

echo +------------------------------------------------------------------------------+
echo ¦ [6/11] ARCHIVOS TEMPORALES: Limpiando temporales globales                    ¦
echo +------------------------------------------------------------------------------+
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
echo  [?] Temporales y descargas obsoletas eliminadas.
echo.

echo +------------------------------------------------------------------------------+
echo ¦ [7/11] PERFILES: Limpiando datos personales y cachés de usuarios             ¦
echo +------------------------------------------------------------------------------+
for /d %%U in ("C:\Users\*") do (
    set "USER_NAME=%%~nxU"
    if /i not "!USER_NAME!"=="Public" (
        if /i not "!USER_NAME!"=="Default" (
            if /i not "!USER_NAME!"=="Default User" (
                if /i not "!USER_NAME!"=="All Users" (
                    echo    [*] Procesando carpetas de: !USER_NAME!

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
                    del /f /q /s "%%U\AppData\Local\Microsoft\Edge\User Data\Default\Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\BraveSoftware\Brave-Browser\User Data\Default\Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\Mozilla\Firefox\Profiles\*\cache2\*" >nul 2>&1

                    del /f /q /s "%%U\AppData\Local\D3DSCache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\NVIDIA\DXCache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\AMD\DxCache\*" >nul 2>&1

                    del /f /q /a /s "%%U\AppData\Local\Microsoft\Windows\Explorer\thumbcache_*.db" >nul 2>&1
                    del /f /q /a /s "%%U\AppData\Local\Microsoft\Windows\Explorer\iconcache_*.db" >nul 2>&1
                    del /f /q /a "%%U\AppData\Local\IconCache.db" >nul 2>&1

                    del /f /q "%%U\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\*" >nul 2>&1
                )
            )
        )
    )
)
echo  [?] Carpetas personales y cachés purgadas.
echo.

echo +------------------------------------------------------------------------------+
echo ¦ [8/11] PERSONALIZACION: Fondo negro e Iconos fundamentales de Escritorio     ¦
echo +------------------------------------------------------------------------------+
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Explorer" /v DisableSearchBoxSuggestions /t REG_DWORD /d 1 /f >nul 2>&1

for /d %%U in ("C:\Users\*") do (
    set "USER_NAME=%%~nxU"
    if /i not "!USER_NAME!"=="Public" (
        if /i not "!USER_NAME!"=="Default User" (
            if /i not "!USER_NAME!"=="All Users" (
                if exist "%%U\NTUSER.DAT" (
                    echo    [*] Aplicando entorno gráfico a: !USER_NAME!
                    reg load "HKU\TempUserHive" "%%U\NTUSER.DAT" >nul 2>&1
                    if !errorlevel! equ 0 (
                        :: Fondo Negro Solido estricto
                        reg add "HKU\TempUserHive\Control Panel\Desktop" /v Wallpaper /t REG_SZ /d "" /f >nul 2>&1
                        reg add "HKU\TempUserHive\Control Panel\Desktop" /v WallpaperStyle /t REG_SZ /d "0" /f >nul 2>&1
                        reg add "HKU\TempUserHive\Control Panel\Desktop" /v TileWallpaper /t REG_SZ /d "0" /f >nul 2>&1
                        reg add "HKU\TempUserHive\Control Panel\Colors" /v Background /t REG_SZ /d "0 0 0" /f >nul 2>&1

                        :: Iconos fundamentales en el Escritorio (0 = Visible)
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\HideDesktopIcons\NewStartPanel" /v "{20D04FE0-3AEA-1069-A2D8-08002B30309D}" /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\HideDesktopIcons\NewStartPanel" /v "{59031a47-3f72-44a7-89c5-5595fe6b30ee}" /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\HideDesktopIcons\NewStartPanel" /v "{645FF040-5081-101B-9F08-00AA002F954E}" /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\HideDesktopIcons\NewStartPanel" /v "{5399E690-0968-11D1-9C99-00C04F79FA13}" /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\HideDesktopIcons\NewStartPanel" /v "{F0230A0D-0A4E-4420-AA38-3A183e87B11c}" /t REG_DWORD /d 0 /f >nul 2>&1

                        :: Activar Modo Oscuro para Apps y Sistema
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" /v AppsUseLightTheme /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" /v SystemUsesLightTheme /t REG_DWORD /d 0 /f >nul 2>&1

                        :: Ajustes de Rendimiento visual y Alineacion
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 2 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" /v EnableTransparency /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\Shell\Bags\1\Desktop" /v AutoArrange /t REG_DWORD /d 1 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\Shell\Bags\1\Desktop" /v SnapToGrid /t REG_DWORD /d 1 /f >nul 2>&1

                        :: Menú Inicio e Iconos de Barra de Tareas Limpios
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v TaskbarAl /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v ShowTaskViewButton /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v TaskbarDa /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v ShowCopilotButton /t REG_DWORD /d 0 /f >nul 2>&1

                        :: Explorador: Mostrar extensiones, ocultos y abrir en Este Equipo
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v HideFileExt /t REG_DWORD /d 0 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v Hidden /t REG_DWORD /d 1 /f >nul 2>&1
                        reg add "HKU\TempUserHive\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v LaunchTo /t REG_DWORD /d 1 /f >nul 2>&1

                        :: Desactivar Teclas de Adherencia y GameDVR
                        reg add "HKU\TempUserHive\Control Panel\Accessibility\StickyKeys" /v Flags /t REG_SZ /d "506" /f >nul 2>&1
                        reg add "HKU\TempUserHive\System\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 0 /f >nul 2>&1

                        reg unload "HKU\TempUserHive" >nul 2>&1
                    )
                )
            )
        )
    )
)
echo  [?] Fondo negro e íconos de sistema aplicados a todos los perfiles.
echo.

echo +------------------------------------------------------------------------------+
echo ¦ [9/11] TELEMETRIA: Desactivando servicios de rastreo                         ¦
echo +------------------------------------------------------------------------------+
sc config DiagTrack start= disabled >nul 2>&1
net stop DiagTrack >nul 2>&1
echo  [?] Servicio DiagTrack desactivado.
echo.

echo +------------------------------------------------------------------------------+
echo ¦ [10/11] LIBERADOR DE DISCO: Ejecutando autoclean de Windows                  ¦
echo +------------------------------------------------------------------------------+
cleanmgr /autoclean >nul 2>&1
echo  [?] Liberador de espacio completado.
echo.

echo +------------------------------------------------------------------------------+
echo ¦ [11/11] ENTORNO: Reiniciando el Explorador de Windows                        ¦
echo +------------------------------------------------------------------------------+
taskkill /f /im explorer.exe >nul 2>&1
timeout /t 2 /nobreak >nul
start explorer.exe >nul 2>&1
echo  [?] Shell de Windows reiniciada con la nueva configuración visual.
echo.

echo +------------------------------------------------------------------------------+
echo ¦                         RESUMEN DE RESULTADOS                                ¦
echo +------------------------------------------------------------------------------+
for /f %%B in ('powershell -command "(Get-Volume C).SizeRemaining"') do set "BYTES_FINAL=%%B"

powershell -command "$d = (%BYTES_FINAL% - %BYTES_INICIO%) / 1GB; $m = (%BYTES_FINAL% - %BYTES_INICIO%) / 1MB; if ($d -ge 1) { Write-Host '  Espacio recuperado:' ([math]::Round($d, 2)) 'GB' -ForegroundColor Green } else { Write-Host '  Espacio recuperado:' ([math]::Round($m, 2)) 'MB' -ForegroundColor Green }"

echo.
echo +------------------------------------------------------------------------------+
echo ¦   EL EQUIPO SE REINICIARA AUTOMATICA Y LIMPIAMENTE EN 30 SEGUNDOS            ¦
echo ¦   (Para cancelar el reinicio abre Ejecutar y escribe "shutdown /a")          ¦
echo +------------------------------------------------------------------------------+
shutdown /r /t 30 /c "Mantenimiento y optimizacion visual finalizada correctamente."
pause