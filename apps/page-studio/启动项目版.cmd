@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 书页工坊 - 璀璨星图项目版
if exist "runtime\node.exe" (
  "runtime\node.exe" integration\host.cjs
) else (
  node integration\host.cjs
)
if errorlevel 1 pause
