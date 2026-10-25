@echo off
setlocal EnableExtensions
cd /d "%~dp0"

REM ---------------------------------------------------------------------------
REM THRIVE&CO launcher (Windows)
REM
REM   run.bat              Start with Neon PostgreSQL (reads .env)
REM   run.bat local        Start with the embedded H2 database
REM   run.bat --open       Start and open the browser
REM   run.bat build        Build the runnable JAR only
REM   run.bat test         Run the backend integration tests
REM   run.bat stop         Stop a running THRIVE&CO instance
REM   run.bat --help       Show help
REM ---------------------------------------------------------------------------

set "MODE=neon"
set "OPEN_BROWSER=0"

:parse
if "%~1"=="" goto after_parse
if /I "%~1"=="local" (
    set "MODE=local"
    shift
    goto parse
)
if /I "%~1"=="h2" (
    set "MODE=local"
    shift
    goto parse
)
if /I "%~1"=="neon" (
    set "MODE=neon"
    shift
    goto parse
)
if /I "%~1"=="supabase" (
    set "MODE=neon"
    shift
    goto parse
)
if /I "%~1"=="build" (
    set "MODE=build"
    shift
    goto parse
)
if /I "%~1"=="test" (
    set "MODE=test"
    shift
    goto parse
)
if /I "%~1"=="stop" (
    set "MODE=stop"
    shift
    goto parse
)
if /I "%~1"=="--open" (
    set "OPEN_BROWSER=1"
    shift
    goto parse
)
if /I "%~1"=="-h" goto help
if /I "%~1"=="--help" goto help
if /I "%~1"=="help" goto help
echo [ERROR] Unknown option: %~1
echo.
goto help

:after_parse
if /I "%MODE%"=="stop" goto stop

echo Checking Java...
where java >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Java is not installed or not on your PATH.
    echo         Install Java 21 ^(JDK^) and try again.
    exit /b 1
)

for /f "tokens=3" %%v in ('java -version 2^>^&1 ^| findstr /i "version"') do set "JAVA_VER=%%~v"
for /f "tokens=1 delims=." %%m in ("%JAVA_VER%") do set "JAVA_MAJOR=%%m"
if not defined JAVA_MAJOR (
    echo [ERROR] Could not determine the Java version.
    exit /b 1
)
if %JAVA_MAJOR% LSS 21 (
    echo [ERROR] Java 21 or newer is required. Found: %JAVA_VER%
    exit /b 1
)

if /I "%MODE%"=="build" (
    echo Building THRIVE^&CO...
    call mvnw.cmd -q -DskipTests package
    if errorlevel 1 exit /b 1
    echo Built target\thriveco-1.0.0.jar
    exit /b 0
)

if /I "%MODE%"=="test" (
    call mvnw.cmd test
    set "STATUS=%errorlevel%"
    exit /b %STATUS%
)

set "JAR=target\thriveco-1.0.0.jar"

if /I "%MODE%"=="neon" (
    if not exist ".env" (
        echo [ERROR] .env was not found.
        echo         Copy .env.example to .env and fill in your Neon credentials.
        echo         Or run the offline demo: run.bat local
        exit /b 1
    )
    findstr /C:"your-neon" .env >nul 2>nul
    if not errorlevel 1 (
        echo [ERROR] .env still contains placeholder values.
        echo         Open .env and fill in DB_URL / DB_USER / DB_PASSWORD.
        echo         Or run the offline demo: run.bat local
        exit /b 1
    )
)

if not exist "%JAR%" (
    echo Building THRIVE^&CO ^(first run^)...
    call mvnw.cmd -q -DskipTests package
    if errorlevel 1 exit /b 1
)

set "PORT=8080"
for /f "tokens=2 delims==" %%p in ('findstr /B /C:"PORT=" .env 2^>nul') do set "PORT=%%p"
set "URL=http://localhost:%PORT%"

echo ------------------------------------------------------------
if /I "%MODE%"=="local" (
    echo  THRIVE^&CO - local H2 database
    set "PROFILE_ARG=--spring.profiles.active=local"
) else (
    echo  THRIVE^&CO - Neon PostgreSQL
    set "PROFILE_ARG="
)
echo  URL:    %URL%
echo  Stop:   Ctrl+C
echo ------------------------------------------------------------
echo.

if "%OPEN_BROWSER%"=="1" start "" "%URL%"

java -jar "%JAR%" %PROFILE_ARG%
set "STATUS=%errorlevel%"

if not "%STATUS%"=="0" (
    if /I "%MODE%"=="neon" (
        echo.
        echo THRIVE^&CO could not start with Neon PostgreSQL.
        echo   - Check DB_URL, DB_USER and DB_PASSWORD in .env
        echo   - Make sure the Neon project is active and the pooled connection string is correct
        echo   - If TLS/channel binding fails, remove ^&channel_binding=require from DB_URL
        echo   - For the offline demo run: run.bat local
    )
)
exit /b %STATUS%

:stop
for /f "tokens=1" %%p in ('jps -l 2^>nul ^| findstr /C:"thriveco-1.0.0.jar"') do (
    taskkill /PID %%p /F >nul 2>nul
    echo Stopped PID %%p
)
exit /b 0

:help
echo THRIVE^&CO launcher
echo.
echo Usage:
echo   run.bat                Start with Neon PostgreSQL ^(default, reads .env^)
echo   run.bat local          Start with the embedded H2 database
echo   run.bat --open         Start and open the app in your browser
echo   run.bat build          Build target\thriveco-1.0.0.jar
echo   run.bat test           Run the JUnit integration tests
echo   run.bat stop           Stop a running THRIVE^&CO server
echo   run.bat --help         Show this message
echo.
echo Java 21 or newer is required. Maven is not required ^(mvnw.cmd is bundled^).
exit /b 0
