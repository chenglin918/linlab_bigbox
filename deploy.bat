@echo off
cd /d "%~dp0"

echo ============================================
echo   Deploy to GitHub Pages
echo ============================================
echo.

:: Stage ALL changes (new files, edits, deletions) across the whole repo
git add .

:: Check if there is anything new to commit
git diff --cached --quiet
if %errorlevel% == 0 (
    echo No local changes to commit.
    echo Checking for unpushed commits...
    goto :push
)

:: Show what will be committed
echo Files being committed:
git diff --cached --name-only
echo.

:: Ask for a commit message
set /p MSG="Enter commit message (or press Enter for default): "
if "%MSG%"=="" set MSG=Update website content

git commit -m "%MSG%"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Commit failed.
    pause
    exit /b 1
)

:push
:: Pull remote changes first (rebase keeps history clean)
echo.
echo Syncing with remote...
git pull --rebase origin main
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Could not sync with remote. Resolve conflicts and try again.
    pause
    exit /b 1
)

:: Push to main -> triggers GitHub Actions -> deploys to Pages
echo.
echo Pushing to GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Push failed. Check your internet connection or credentials.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Done! GitHub Actions will deploy the site
echo   automatically in about 1-2 minutes.
echo   https://chenglin918.github.io/linlab_bigbox/
echo ============================================
echo.
pause
