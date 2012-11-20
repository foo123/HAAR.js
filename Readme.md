# HAAR.js Feature Detection Library for javascript and HTML5 canvas #

based on Viola-Jones Feature Detection Algorithm using Haar Cascades

This is a port of OpenCV C++ Haar Detection (actually a port of JViolaJones which is a port of OpenCV for Java)
to javascript and HTML5 canvas.

You can use the openCV cascades to build your detectors.

To do this just transform the opencv xml file to javascript
using the haartojs tool (in cascades folder)

example:
( to use opencv's haarcascades_frontalface_alt.xml  run following command)
```bash
haartojs haarcascades_frontalface_alt
```

this creates a javascript file:
haarcascades_frontalface_alt.js which you can include in your html file

the variable to use in javascript
is similarly
haarcascades_frontalface_alt

The Code works in the browser and inside nodejs

##Runing inside the brower##
 Loading wth script tags
	You can run the example face.html or mouth.html inside your browser

##Running inside node##
 For running, the package have a dependency on canvas
 You can find an example inside examples/nodes.js
Valide Output
```bash
node examples/node.js 
processing the picture
[{"x":102.5,"y":105.5,"width":160.66666666666666,"height":160.66666666666666}]
```

To work properly canvas need some system depencencies.
You can find instruction on https://github.com/LearnBoost/node-canvas/wiki
For example for Ubuntu : 
```bash
sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev
```

##Loading with RequireJS ##
 As a third option, you can load the library with requireJS, both on the browser on with node.
There is an example of loading with RequireJS inside node in examples/require.js.
The configuration would be the same inside a browser


Complete source code

*Author* Nikos M.
*URL* http://nikos-web-development.netai.net/
*URL* http://workingclasscode.uphero.com/
