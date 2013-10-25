#!/bin/sh

# $1 is opencv haar xml file name
php -f ./haartojs.php -- --xml="$1" --output=js