@echo off
rem Builds, runs the rule self-tests, replays every scripted run in runs\expected.txt (checking its RESULT line
rem and comparing the transcript with runs\expected-output\), then runs the web adapter self-test.
setlocal enabledelayedexpansion
cd /d "%~dp0"
call build.bat || exit /b 1
if exist out-test rmdir /s /q out-test
mkdir out-test
dir /s /b src\main\java\*.java src\test\java\*.java > sources.txt
javac --release 17 -d out-test @sources.txt || exit /b 1
java -ea -cp out-test rush.RulesSelfTest || exit /b 1
if not exist runs\logs mkdir runs\logs
set FAILED=0
for /f "eol=# tokens=1,2,3" %%a in (runs\expected.txt) do (
  java -cp out rush.Main --seed %%b < runs\%%a > runs\logs\%%~na.log 2>&1
  findstr /b /c:"RESULT: %%c" runs\logs\%%~na.log > nul || (echo FAIL %%a: expected %%c & set FAILED=1)
  fc /b runs\logs\%%~na.log runs\expected-output\%%~na.log > nul || (echo FAIL %%a: transcript differs & set FAILED=1)
)
java -ea -cp out-test rush.web.WebAdapterSelfTest . || exit /b 1
if "%FAILED%"=="1" exit /b 1
echo ALL CHECKS PASSED
