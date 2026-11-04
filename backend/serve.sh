#!/bin/sh
# Starts the HTTP/JSON API for the web front end on http://localhost:8090 (build first with ./build.sh).
# PORT=9000 ./serve.sh uses another port. RUSH_WEB=/path/to/frontend/dist ./serve.sh also serves the front end.
cd "$(dirname "$0")"
exec java -cp out rush.web.WebServer
