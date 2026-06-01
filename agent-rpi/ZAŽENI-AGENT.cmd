@echo off
REM Test agenta na Windows (CMD) — en cikel ping + pošiljanje v portal
REM 1. Kopirajte agent.json.example v agent.json in izpolnite token + agent_id
REM 2. Zaženite: ZAŽENI-AGENT.cmd

cd /d "%~dp0opt\visionone-agent"
if not exist agent.json (
  echo MANJKA agent.json — kopirajte agent.json.example in izpolnite podatke.
  pause
  exit /b 1
)
python visionone_agent.py --config agent.json --once
echo.
echo Exit code: %ERRORLEVEL%  (0 = vse OK, 1 = izpad ali napaka portala)
pause
