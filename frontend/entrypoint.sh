#!/bin/sh
# Substitute env vars into nginx config then start nginx
export API_URL="${API_URL:-http://api:8000}"
export WS_URL="${WS_URL:-http://api:8000/ws}"
envsubst '${API_URL} ${WS_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g "daemon off;"
