@echo off
cd /d "%~dp0"
echo 正在启动本地服务器...
start http://localhost:8080/
python -m http.server 8080
