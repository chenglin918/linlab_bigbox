@echo off
echo Starting BIG BOX Project Website...
echo A local server will start and your default browser will open automatically.
echo Please keep this window open while you view the website.
echo.

:: Open the browser first so it hits the server right as it starts
start http://127.0.0.1:8127

:: Start the python http server in the current directory
python -m http.server 8127 --bind 127.0.0.1

pause
