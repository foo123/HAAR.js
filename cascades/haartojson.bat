@echo off

REM %1 is opencv haar xml file name
php -f .\haartojs.php -- --xml="%~f1" --output=json