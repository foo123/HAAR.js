# HAAR.js Feature Detection Library for javascript (uses HTML5 canvas on browser and Canvas package on node.js) #

based on [Viola-Jones Feature Detection Algorithm using Haar Cascades](http://www.cs.cmu.edu/~efros/courses/LBMV07/Papers/viola-cvpr-01.pdf)

This is a port of [OpenCV C++ Haar Detection](http://opencv.willowgarage.com/wiki/) (actually a port of [JViolaJones](http://code.google.com/p/jviolajones/) which is a port of OpenCV for Java)
to javascript and HTML5 canvas.

You can use the existing openCV cascades to build your detectors.

To do this just transform the opencv xml file to javascript
using the haartojs java tool (in cascades folder)

example:
( to use opencv's haarcascades_frontalface_alt.xml  run following command)
```bash
haartojs haarcascades_frontalface_alt
```

this creates a javascript file:   
haarcascades_frontalface_alt.js   
which you can include in your html file or node file

the variable to use in javascript is similarly  
haarcascades_frontalface_alt

##ChangeLog
* initial commit by [Nikos M.](https://github.com/foo123) (works on browser)
* customization to work with node.js and require.js by [maxired](https://github.com/maxired)  (using js closures) 

The Code works in the browser and inside node.js

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
(note: the java source classes, which parse the openCV xml cascades,  will be added to the project also)

*Contributor* Nikos M.  
*URL* [Nikos Web Development](http://nikos-web-development.netai.net/ "Nikos Web Development")  
*URL* [Haar.js blog post](http://nikos-web-development.netai.net/blog/haar-js-feature-detection-in-javascript-and-html5-canvas/ "Haar.js blog post")  
*URL* [WorkingClassCode](http://workingclasscode.uphero.com/ "Working Class Code")  

*Contributor* [maxired](https://github.com/maxired)
