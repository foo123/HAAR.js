@echo off

REM ###################################################
REM #
REM #   The buildtools repository is at:
REM #   https://github.com/foo123/scripts/buildtools
REM #
REM ###################################################

REM to use the python build tool do:
REM python %BUILDTOOLS%\build.py --deps ".\dependencies"

REM to use the php build tool do:
REM php -f %BUILDTOOLS%\build.php -- --deps=".\dependencies"

REM to use the node build tool do:
node %BUILDTOOLS%\build.js --deps ".\dependencies"
