@echo off
rem Starts the HTTP/JSON API for the web front end on http://localhost:8090 (build first with build.bat).
rem set PORT=9000 to use another port; set RUSH_WEB=path\to\frontend\dist to also serve the front end.
cd /d "%~dp0"
java -cp out rush.web.WebServer
