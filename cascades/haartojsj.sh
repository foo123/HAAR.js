#!/bin/sh

# $1 is opencv haar xml file name without xml extension
java -jar haartojs.jar $1.xml $1 > $1.js