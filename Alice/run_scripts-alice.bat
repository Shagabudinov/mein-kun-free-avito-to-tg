@echo off
cd /d "D:\hh-bot/Alice"
start "" node hhReader.js
start "" python telegram-bot.py
exit
