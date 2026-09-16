@echo off
chcp 65001 >nul
:: ==============================================================================
:: SCRIPT DE LIMPIEZA PROFUNDA, OPTIMIZACION Y RESETEO DE PERFILES - LAB ESCOLAR
:: Version ampliada: logging, borrado robusto (robocopy), TRIM correcto,
:: limpieza WinSxS, Windows.old, papelera via PowerShell.
:: ==============================================================================
setlocal enabledelayedexpansion

:: ------------------------------------------------------------------------------
:: BLOQUE DE CONFIGURACION - ajustar aqui sin tocar el resto del script
:: ------------------------------------------------------------------------------
set "RC_FLAGS=/MIR /MT:16 /R:1 /W:1 /XJ /NFL /NDL /NJH /NJS"
set "UMBRAL_ALERTA_GB=5"
set "INICIO_TS=%time%"
:: ------------------------------------------------------------------------------

:: 1. Comprobacion de Privilegios de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Debe ejecutar este script como Administrador.
    echo     Haga clic derecho en el archivo .bat y seleccione "Ejecutar como administrador".
    pause
    exit /b
)

title Mantenimiento de Sistema y Optimizacion de Perfiles - Lab Escolar
color 0B

:: Preparar carpeta y archivo de log
set "LOGDIR=C:\MantenimientoEscuela\logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%" >nul 2>&1
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value ^| find "="') do set "DT=%%I"
set "LOGFILE=%LOGDIR%\mantenimiento_%DT:~0,8%_%DT:~8,6%.log"
echo Inicio de mantenimiento: %date% %time% > "%LOGFILE%"

:: Carpeta temporal vacia usada como "espejo" para borrados con robocopy (mas robusto que del/rmdir)
set "EMPTYDIR=%TEMP%\__empty_mirror__"
if not exist "%EMPTYDIR%" mkdir "%EMPTYDIR%" >nul 2>&1

cls
echo +------------------------------------------------------------------------------+
echo ^|                  SISTEMA DE LIMPIEZA Y OPTIMIZACION PRO                      ^|
echo ^|             RESETEO ANUAL DE PERFILES - LABORATORIO ESCOLAR                  ^|
echo +------------------------------------------------------------------------------+
echo.

:: Capturar espacio libre inicial en disco C: (en Bytes)
for /f %%A in ('powershell -command "(Get-Volume C).SizeRemaining"') do set "BYTES_INICIO=%%A"

echo +------------------------------------------------------------------------------+
echo ^| [1/13] SEGURIDAD: Verificando Defender y Firewall                            ^|
echo +------------------------------------------------------------------------------+
netsh advfirewall set allprofiles state on >nul 2>&1
sc config WinDefend start= auto >nul 2>&1
net start WinDefend >nul 2>&1
sc config MpsSvc start= auto >nul 2>&1
net start MpsSvc >nul 2>&1
echo  [OK] Estado de seguridad garantizado.
echo Seguridad OK >> "%LOGFILE%"
echo.

echo +------------------------------------------------------------------------------+
echo ^| [2/13] PROCESOS: Cerrando aplicaciones para liberar bloqueos                 ^|
echo +------------------------------------------------------------------------------+
taskkill /f /im chrome.exe /im msedge.exe /im firefox.exe /im brave.exe /im opera.exe /im vivaldi.exe /im discord.exe /im spotify.exe /im ms-teams.exe /im teams.exe /im telegram.exe /im Code.exe /im javaw.exe /im java.exe >nul 2>&1
echo  [OK] Procesos de usuario finalizados.
echo.

echo +------------------------------------------------------------------------------+
echo ^| [3/13] NAVEGADOR: Verificacion e instalacion de Google Chrome                ^|
echo +------------------------------------------------------------------------------+
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    echo  [OK] Google Chrome ya esta instalado.
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    echo  [OK] Google Chrome ya esta instalado.
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    echo  [OK] Google Chrome ya esta instalado.
) else (
    echo  [*] Google Chrome no fue encontrado. Instalando mediante winget...
    winget install --id Google.Chrome -e --accept-source-agreements --accept-package-agreements >nul 2>&1
    if !errorlevel! equ 0 (
        echo  [OK] Google Chrome se instalo correctamente.
        echo Chrome instalado >> "%LOGFILE%"
    ) else (
        echo  [!] Hubo un error al intentar instalar Google Chrome.
        echo Error instalando Chrome >> "%LOGFILE%"
    )
)
echo.

echo +------------------------------------------------------------------------------+
echo ^| [4/13] SISTEMA: Liberacion masiva (Hibernacion, Logs, Spooler)               ^|
echo +------------------------------------------------------------------------------+
powercfg -h off >nul 2>&1
bitsadmin /reset /allusers >nul 2>&1

net stop spooler >nul 2>&1
del /f /q /s "%WINDIR%\System32\spool\PRINTERS\*" >nul 2>&1
net start spooler >nul 2>&1

for /f "tokens=*" %%g in ('wevtutil el') do (wevtutil cl "%%g" >nul 2>&1)

net stop dosvc >nul 2>&1
del /f /q /s "%WINDIR%\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache\*" >nul 2>&1
echo  [OK] Basura del sistema y registros purgados.
echo.

echo +------------------------------------------------------------------------------+
echo ^| [5/13] RENDIMIENTO: Red, Energia, TRIM/Desfragmentacion segun tipo de disco  ^|
echo +------------------------------------------------------------------------------+
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c >nul 2>&1
ipconfig /flushdns >nul 2>&1
netsh int tcp set global autotuninglevel=normal >nul 2>&1
:: Optimize-Volume detecta automaticamente si es SSD (TRIM) o HDD (desfragmentacion)
powershell -command "Optimize-Volume -DriveLetter C -Verbose" >> "%LOGFILE%" 2>&1
echo  [OK] Plan de energia activo, red optimizada y unidad C: optimizada.
echo.

echo +------------------------------------------------------------------------------+
echo ^| [6/13] ARCHIVOS TEMPORALES: Limpiando temporales globales                    ^|
echo +------------------------------------------------------------------------------+
robocopy "%EMPTYDIR%" "%WINDIR%\Temp" %RC_FLAGS% >nul 2>&1
robocopy "%EMPTYDIR%" "%WINDIR%\System32\config\systemprofile\AppData\Local\Temp" %RC_FLAGS% >nul 2>&1
robocopy "%EMPTYDIR%" "%WINDIR%\Prefetch" %RC_FLAGS% >nul 2>&1
robocopy "%EMPTYDIR%" "%WINDIR%\Logs" %RC_FLAGS% >nul 2>&1
robocopy "%EMPTYDIR%" "%PROGRAMDATA%\Microsoft\Windows\WER" %RC_FLAGS% >nul 2>&1
del /f /q /s "%WINDIR%\MEMORY.DMP" >nul 2>&1
robocopy "%EMPTYDIR%" "%WINDIR%\Minidump" %RC_FLAGS% >nul 2>&1

net stop wuauserv >nul 2>&1
net stop bits >nul 2>&1
robocopy "%EMPTYDIR%" "%WINDIR%\SoftwareDistribution\Download" %RC_FLAGS% >nul 2>&1
net start wuauserv >nul 2>&1
net start bits >nul 2>&1

:: Papelera de reciclaje vaciada con PowerShell (mas confiable que rd /s /q)
powershell -command "Clear-RecycleBin -DriveLetter C -Force -ErrorAction SilentlyContinue" >nul 2>&1

:: Windows.old si existe (resto de una actualizacion previa)
if exist "C:\Windows.old" (
    takeown /f "C:\Windows.old" /r /d y >nul 2>&1
    icacls "C:\Windows.old" /grant administrators:F /t >nul 2>&1
    robocopy "%EMPTYDIR%" "C:\Windows.old" %RC_FLAGS% >nul 2>&1
    rd /s /q "C:\Windows.old" >nul 2>&1
)

:: Limpieza de componentes de Windows (WinSxS) - reduce espacio de actualizaciones acumuladas
Dism.exe /online /Cleanup-Image /StartComponentCleanup /Quiet >nul 2>&1

echo  [OK] Temporales, descargas obsoletas, papelera y Windows.old eliminados.
echo Temporales del sistema limpiados >> "%LOGFILE%"
echo.

echo +------------------------------------------------------------------------------+
echo ^| [6b/13] INVENTARIO: Registrando programas instalados antes del reseteo      ^|
echo +------------------------------------------------------------------------------+
echo --- Programas instalados (%date%) --- >> "%LOGFILE%"
powershell -command "Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*,HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* | Where-Object DisplayName | Select-Object -ExpandProperty DisplayName | Sort-Object -Unique" >> "%LOGFILE%" 2>&1
echo  [OK] Inventario guardado en el log.
echo.

echo +------------------------------------------------------------------------------+
echo ^| [7/13] PERFILES: Reseteando carpetas personales y caches de alumnos          ^|
echo +------------------------------------------------------------------------------+
for /d %%U in ("C:\Users\*") do (
    set "USER_NAME=%%~nxU"
    if /i not "!USER_NAME!"=="Public" (
        if /i not "!USER_NAME!"=="Default" (
            if /i not "!USER_NAME!"=="Default User" (
                if /i not "!USER_NAME!"=="All Users" (
                    echo    [*] Procesando carpetas de: !USER_NAME!
                    echo Procesando usuario: !USER_NAME! >> "%LOGFILE%"

                    robocopy "%EMPTYDIR%" "%%U\Documents" %RC_FLAGS% >nul 2>&1
                    robocopy "%EMPTYDIR%" "%%U\Downloads" %RC_FLAGS% >nul 2>&1
                    robocopy "%EMPTYDIR%" "%%U\Pictures" %RC_FLAGS% >nul 2>&1
                    robocopy "%EMPTYDIR%" "%%U\Videos" %RC_FLAGS% >nul 2>&1
                    robocopy "%EMPTYDIR%" "%%U\Music" %RC_FLAGS% >nul 2>&1
                    robocopy "%EMPTYDIR%" "%%U\Desktop" %RC_FLAGS% >nul 2>&1
                    robocopy "%EMPTYDIR%" "%%U\AppData\Local\Temp" %RC_FLAGS% >nul 2>&1

                    del /f /q /s "%%U\AppData\Roaming\Microsoft\Windows\Recent\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\CrashDumps\*" >nul 2>&1

                    del /f /q /s "%%U\AppData\Local\Google\Chrome\User Data\Default\Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\Microsoft\Edge\User Data\Default\Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\BraveSoftware\Brave-Browser\User Data\Default\Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\Mozilla\Firefox\Profiles\*\cache2\*" >nul 2>&1

                    del /f /q /s "%%U\AppData\Local\D3DSCache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\NVIDIA\DXCache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\AMD\DxCache\*" >nul 2>&1

                    :: Caches de herramientas de practicas (VS Code, Java)
                    robocopy "%EMPTYDIR%" "%%U\AppData\Roaming\Code\Cache" %RC_FLAGS% >nul 2>&1
                    robocopy "%EMPTYDIR%" "%%U\AppData\Roaming\Code\CachedData" %RC_FLAGS% >nul 2>&1
                    del /f /q /s "%%U\AppData\LocalLow\Sun\Java\Deployment\cache\*" >nul 2>&1

                    del /f /q /a /s "%%U\AppData\Local\Microsoft\Windows\Explorer\thumbcache_*.db" >nul 2>&1
                    del /f /q /a /s "%%U\AppData\Local\Microsoft\Windows\Explorer\iconcache_*.db" >nul 2>&1
                    del /f /q /a "%%U\AppData\Local\IconCache.db" >nul 2>&1

                    del /f /q "%%U\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\*" >nul 2>&1

                    :: Robocopy devuelve codigos 0-7 como exito; 8+ indica que algo no se pudo borrar
                    if !errorlevel! geq 8 (
                        echo    [!] Advertencia: algunos archivos de !USER_NAME! no se pudieron borrar >> "%LOGFILE%"
                    )
                )
            )
        )
    )
)
echo  [OK] Carpetas personales y caches de alumnos reseteadas.
echo.

echo +------------------------------------------------------------------------------+
echo ^| [8/13] PERSONALIZACION: Fondo negro e Iconos fundamentales de Escritorio     ^|
echo +------------------------------------------------------------------------------+
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\Explorer" /v DisableSearchBoxSuggestions /t REG_DWORD /d 1 /f >nul 2>&1

for /d %%U in ("C:\Users\*") do (
    set "USER_NAME=%%~nxU"
    if /i not "!USER_NAME!"=="Public" (
        if /i not "!USER_NAME!"=="Default" (
            if /i not "!USER_NAME!"=="Default User" (
                if /i not "!USER_NAME!"=="All Users" (
                    if exist "%%U\NTUSER.DAT" (
                        echo    [*] Aplicando entorno grafico a: !USER_NAME!
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

                            :: Menu Inicio e Iconos de Barra de Tareas Limpios
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
)
echo  [OK] Fondo negro e iconos de sistema aplicados a todos los perfiles.
echo.

echo +------------------------------------------------------------------------------+
echo ^| [9/13] TELEMETRIA: Desactivando servicios de rastreo                         ^|
echo +------------------------------------------------------------------------------+
sc config DiagTrack start= disabled >nul 2>&1
net stop DiagTrack >nul 2>&1
start /wait wsreset.exe -i >nul 2>&1
echo  [OK] Servicio DiagTrack desactivado y cache de Microsoft Store reseteada.
echo.

echo +------------------------------------------------------------------------------+
echo ^| [10/13] LIBERADOR DE DISCO: Ejecutando autoclean de Windows                  ^|
echo +------------------------------------------------------------------------------+
cleanmgr /sageset:65535 /verylowdisk >nul 2>&1
cleanmgr /sagerun:65535 >nul 2>&1
echo  [OK] Liberador de espacio completado.
echo.

echo +------------------------------------------------------------------------------+
echo ^| [11/13] SALUD DEL DISCO: Verificacion rapida del sistema de archivos         ^|
echo +------------------------------------------------------------------------------+
:: Marca el volumen para chequeo solo si hay errores detectados (no fuerza reinicio extra)
chkdsk C: /scan >nul 2>&1
echo  [OK] Verificacion de disco completada.
echo.

echo +------------------------------------------------------------------------------+
echo ^| [12/13] LIMPIEZA DE CARPETA TEMPORAL DE TRABAJO                              ^|
echo +------------------------------------------------------------------------------+
rd /s /q "%EMPTYDIR%" >nul 2>&1
echo  [OK] Carpeta espejo temporal eliminada.
echo.

echo +------------------------------------------------------------------------------+
echo ^| [13/13] ENTORNO: Reiniciando el Explorador de Windows                        ^|
echo +------------------------------------------------------------------------------+
taskkill /f /im explorer.exe >nul 2>&1
timeout /t 2 /nobreak >nul
start explorer.exe >nul 2>&1
echo  [OK] Shell de Windows reiniciada con la nueva configuracion visual.
echo.

echo +------------------------------------------------------------------------------+
echo ^|                         RESUMEN DE RESULTADOS                                ^|
echo +------------------------------------------------------------------------------+
for /f %%B in ('powershell -command "(Get-Volume C).SizeRemaining"') do set "BYTES_FINAL=%%B"

powershell -command "$d = (%BYTES_FINAL% - %BYTES_INICIO%) / 1GB; $m = (%BYTES_FINAL% - %BYTES_INICIO%) / 1MB; if ($d -ge 1) { Write-Host '  Espacio recuperado:' ([math]::Round($d, 2)) 'GB' -ForegroundColor Green } else { Write-Host '  Espacio recuperado:' ([math]::Round($m, 2)) 'MB' -ForegroundColor Green }"

:: Tiempo total transcurrido
powershell -command "$ini = [datetime]::Parse('%INICIO_TS%'); $fin = Get-Date; $diff = $fin - $ini; if ($diff.TotalSeconds -lt 0) { $diff = $diff.Add([timespan]::FromDays(1)) }; Write-Host ('  Tiempo total: {0:mm} min {0:ss} seg' -f $diff)"

:: Alerta de espacio libre bajo tras el reseteo
powershell -command "$gbLibre = (Get-Volume C).SizeRemaining / 1GB; if ($gbLibre -lt %UMBRAL_ALERTA_GB%) { Write-Host ('  [!] ALERTA: solo quedan {0:N1} GB libres en C:' -f $gbLibre) -ForegroundColor Red }"

echo Fin de mantenimiento: %date% %time% >> "%LOGFILE%"
echo Log guardado en: %LOGFILE%
echo.
echo +------------------------------------------------------------------------------+
echo ^|   EL EQUIPO SE REINICIARA AUTOMATICA Y LIMPIAMENTE EN 30 SEGUNDOS            ^|
echo ^|   (Para cancelar el reinicio abre Ejecutar y escribe "shutdown /a")         ^|
echo +------------------------------------------------------------------------------+
shutdown /r /t 30 /c "Mantenimiento, reseteo de perfiles y optimizacion visual finalizada correctamente."
pause

:: ------------------------------------------------------------------------------
:: OPCIONAL: para que este reseteo se ejecute solo, cada año, en la misma fecha,
:: registralo una vez como tarea programada corriendo estas 2 lineas manualmente
:: (reemplaza la fecha MM/DD/YYYY y la ruta del script):
::
:: schtasks /create /tn "ResetAnualLabEscolar" /tr "C:\ruta\mantenimiento_escuela.bat" /sc yearly /d MON /m MAR /sd 03/01/2027 /st 07:00 /ru SYSTEM /rl HIGHEST
::
:: ------------------------------------------------------------------------------
