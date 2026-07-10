@echo off
title 寶可夢圖鑑啟動器
chcp 65001 > nul
echo ==================================================
echo 正在啟動寶可夢圖鑑本機伺服器...
echo ==================================================
cd frontend
node start-app.js
pause
