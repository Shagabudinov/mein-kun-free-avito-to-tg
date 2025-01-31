@echo off
cd /d "D:\hh-bot"
start "" node hhReader.js
start "" python telegram-bot.py
exit
