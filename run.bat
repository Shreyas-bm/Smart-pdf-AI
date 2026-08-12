@echo off
title SmartPDF AI - Development Workspace Launcher
setlocal enabledelayedexpansion

:: Check if running from correct directory
if not exist backend (
    echo [ERROR] Please run this batch file from the root directory of the SmartPDF AI project.
    pause
    exit /b
)

:: Auto-detect missing dependencies
set "MISSING_DEPS=0"
if not exist venv (
    set "MISSING_DEPS=1"
)
if not exist frontend\node_modules (
    set "MISSING_DEPS=1"
)

if "%MISSING_DEPS%"=="1" (
    echo ====================================================================
    echo             Missing Dependencies Detected
    echo ====================================================================
    echo.
    echo It looks like backend virtual environment or frontend node_modules
    echo are missing.
    echo.
    set /p install_now="Would you like to install them now? (Y/N) [Default is Y]: "
    if "!install_now!"=="" set install_now=Y
    if /i "!install_now!"=="Y" (
        goto INSTALL_DEPS
    )
)

:MENU
cls
echo ====================================================================
echo                   SmartPDF AI Launcher Panel
echo ====================================================================
echo.
echo  [1] Start Both (Backend + Frontend) [Recommended]
echo  [2] Start Backend Only (FastAPI)
echo  [3] Start Frontend Only (Next.js)
echo  [4] Install / Update Dependencies
echo  [5] Exit
echo.
echo ====================================================================
set /p choice="Enter your choice (1-5) [Default is 1]: "

if "%choice%"=="" set choice=1

if "%choice%"=="1" goto START_BOTH
if "%choice%"=="2" goto START_BACKEND
if "%choice%"=="3" goto START_FRONTEND
if "%choice%"=="4" goto INSTALL_DEPS
if "%choice%"=="5" goto EXIT
goto MENU

:START_BOTH
echo.
echo [+] Starting Backend Service in a new window...
if not exist venv (
    echo [!] Virtual environment 'venv' not found. Creating one...
    python -m venv venv
)
start "SmartPDF AI Backend" cmd /k "echo Starting FastAPI Backend... && cd backend && call ..\venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

echo [+] Starting Frontend Service in a new window...
if not exist frontend\node_modules (
    echo [!] frontend/node_modules not found. Installing packages...
    cd frontend && call npm install && cd ..
)
start "SmartPDF AI Frontend" cmd /k "echo Starting Next.js Frontend... && cd frontend && npm run dev"

echo.
echo ====================================================================
echo  Services started! You can close this window now or press any key.
echo  - Backend running at:  http://localhost:8000
echo  - Backend docs at:     http://localhost:8000/docs
echo  - Frontend running at: http://localhost:3000
echo ====================================================================
pause
goto EXIT

:START_BACKEND
echo.
echo [+] Starting Backend Service...
if not exist venv (
    echo [!] Virtual environment 'venv' not found. Creating one...
    python -m venv venv
)
cd backend
call ..\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
goto EXIT

:START_FRONTEND
echo.
echo [+] Starting Frontend Service...
if not exist frontend\node_modules (
    echo [!] frontend/node_modules not found. Installing packages...
    cd frontend && call npm install && cd ..
)
cd frontend
npm run dev
goto EXIT

:INSTALL_DEPS
echo.
echo ====================================================================
echo                   Installing Dependencies
echo ====================================================================
echo.
echo [+] Upgrading pip and installing backend dependencies...
if not exist venv (
    echo [!] Virtual environment 'venv' not found. Creating one...
    python -m venv venv
)
call venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r backend\requirements.txt

echo.
echo [+] Installing frontend dependencies (npm install)...
cd frontend
call npm install
cd ..

echo.
echo [+][Done] All dependencies installed successfully!
pause
goto MENU

:EXIT
echo.
echo Goodbye!
timeout /t 2 >nul
exit
