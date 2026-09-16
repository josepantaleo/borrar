@echo off
:: ==============================================================================
:: SCRIPT DE LIMPIEZA PROFUNDA Y OPTIMIZACION DE PERFILES WINDOWS
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

echo ==============================================================================
echo [1/8] Verificando Seguridad (Defender y Firewall)...
echo ==============================================================================
netsh advfirewall set allprofiles state on >nul 2>&1
sc config WinDefend start= auto >nul 2>&1
net start WinDefend >nul 2>&1
sc config MpsSvc start= auto >nul 2>&1
net start MpsSvc >nul 2>&1

echo ==============================================================================
echo [2/8] Configurando Red y Plan de Energia...
echo ==============================================================================
:: Plan de energia: Alto rendimiento
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c >nul 2>&1
:: Limpieza de caché DNS
ipconfig /flushdns >nul 2>&1

echo ==============================================================================
echo [3/8] Limpiando Archivos Temporales del Sistema y Windows Update...
echo ==============================================================================
del /f /q /s "%WINDIR%\Temp\*" >nul 2>&1
for /d %%p in ("%WINDIR%\Temp\*") do rmdir /s /q "%%p" >nul 2>&1

del /f /q /s "%WINDIR%\Prefetch\*" >nul 2>&1
del /f /q /s "%PROGRAMDATA%\Microsoft\Windows\WER\*" >nul 2>&1

:: Limpieza de Windows Update Download
net stop wuauserv >nul 2>&1
net stop bits >nul 2>&1
del /f /q /s "%WINDIR%\SoftwareDistribution\Download\*" >nul 2>&1
net start wuauserv >nul 2>&1
net start bits >nul 2>&1

:: Vaciar Papelera de Reciclaje
rd /s /q C:\$Recycle.Bin >nul 2>&1

echo ==============================================================================
echo [4/8] Procesando Perfiles de Usuario (Excluyendo Public y Default)...
echo ==============================================================================
for /d %%U in ("C:\Users\*") do (
    set "USER_NAME=%%~nxU"
    if /i not "!USER_NAME!"=="Public" (
        if /i not "!USER_NAME!"=="Default" (
            if /i not "!USER_NAME!"=="Default User" (
                if /i not "!USER_NAME!"=="All Users" (
                    echo [*] Limpiando perfil: !USER_NAME!

                    :: Borrado de carpetas personales
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

                    :: Temporales y cachés de usuario
                    del /f /q /s "%%U\AppData\Local\Temp\*" >nul 2>&1
                    for /d %%d in ("%%U\AppData\Local\Temp\*") do rmdir /s /q "%%d" >nul 2>&1

                    del /f /q /s "%%U\AppData\Roaming\Microsoft\Windows\Recent\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\CrashDumps\*" >nul 2>&1

                    :: Cachés de Navegadores (Chrome, Edge, Brave, Firefox)
                    del /f /q /s "%%U\AppData\Local\Google\Chrome\User Data\Default\Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\Google\Chrome\User Data\Default\Code Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\Microsoft\Edge\User Data\Default\Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\Microsoft\Edge\User Data\Default\Code Cache\*" >nul 2>&1
                    del /f /q /s "%%U\AppData\Local\BraveSoftware\Brave-Browser\User Data\Default\Cache\*" >nul 2>&1

                    :: Caché de Miniaturas e Iconos
                    del /f /q /a /s "%%U\AppData\Local\Microsoft\Windows\Explorer\thumbcache_*.db" >nul 2>&1
                    del /f /q /a /s "%%U\AppData\Local\Microsoft\Windows\Explorer\iconcache_*.db" >nul 2>&1
                    del /f /q /a "%%U\AppData\Local\IconCache.db" >nul 2>&1

                    :: Limpieza de accesos directos de Inicio en el perfil
                    del /f /q "%%U\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\*" >nul 2>&1
                )
            )
        )
    )
)

echo ==============================================================================
echo [5/8] Ajustando Apariencia y Rendimiento del Sistema...
echo ==============================================================================
:: Fondo de pantalla negro
reg add "HKCU\Control Panel\Desktop" /v Wallpaper /t REG_SZ /d "" /f >nul 2>&1
reg add "HKCU\Control Panel\Colors" /v Background /t REG_SZ /d "0 0 0" /f >nul 2>&1

:: Reducir efectos visuales (Ajustar para obtener el mejor rendimiento)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 2 /f >nul 2>&1

:: Orden y alineación de iconos a la cuadrícula
reg add "HKCU\Software\Microsoft\Windows\Shell\Bags\1\Desktop" /v AutoArrange /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\Shell\Bags\1\Desktop" /v SnapToGrid /t REG_DWORD /d 1 /f >nul 2>&1

echo ==============================================================================
echo [6/8] Ejecutando Herramienta Liberador de Espacio en Disco...
echo ==============================================================================
cleanmgr /autoclean >nul 2>&1

echo ==============================================================================
echo [7/8] Reiniciando Explorador de Windows...
echo ==============================================================================
taskkill /f /im explorer.exe >nul 2>&1
timeout /t 2 /nobreak >nul
start explorer.exe >nul 2>&1

echo ==============================================================================
echo [8/8] PROCESO FINALIZADO CON EXITO
echo ==============================================================================
pause