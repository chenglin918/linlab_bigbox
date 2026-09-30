@echo off
cd /d "%~dp0"
echo ============================================================
echo   BIG BOX Project Website
echo ============================================================
echo.
echo [1/2] Rebuilding chart data from Excel...
python build_data.py
if errorlevel 1 (
    echo.
    echo   WARNING: Could not update chart data.
    echo   Make sure the Excel file exists at:
    echo     results\Website_Result compilation_thawing.xlsx
    echo   The website will open using the last saved data.
) else (
    echo   Chart data updated successfully.
)
echo.
echo [2/2] Starting local server...
echo   Open your browser to: http://127.0.0.1:8127
echo   Keep this window open while viewing the website.
echo.

start http://127.0.0.1:8127
python -m http.server 8127 --bind 127.0.0.1

pause
