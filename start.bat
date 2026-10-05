@echo off
cd /d "%~dp0"
echo.
echo   Personal Menu - starting the service
echo   (keep this black window open while using it)
echo.
if not exist ".venv\Scripts\python.exe" python -m venv .venv
if not exist ".venv\Scripts\flask.exe" ".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r requirements.txt
".venv\Scripts\python.exe" server\app.py --open %*
echo.
echo   The service has stopped.
echo   If the message above is an error, please send it to me.
echo.
pause
