@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 书页工坊 - 本地服务
if not exist "runtime\node.exe" (
  echo 找不到随附的运行时。请完整解压应用后再启动。
  pause
  exit /b 1
)
"runtime\node.exe" server.cjs
if errorlevel 1 pause
