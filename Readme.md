# HAAR.js 

__Feature Detection Library for javascript__  (uses HTML5 canvas on browser and Canvas package on Node.js)

Based on [Viola-Jones Feature Detection Algorithm using Haar Cascades](http://www.cs.cmu.edu/~efros/courses/LBMV07/Papers/viola-cvpr-01.pdf)

This is a port of [OpenCV C++ Haar Detection](http://opencv.willowgarage.com/wiki/) (actually a port of [JViolaJones](http://code.google.com/p/jviolajones/) which is a port of OpenCV for Java) to javascript and HTML5 canvas.

[![Haar.js](/examples/haar-face.jpg)](http://foo123.github.com/examples/face-detection/)

###Live Example
* [Face Detection](http://foo123.github.com/examples/face-detection/)


You can use the __existing openCV cascades__ to build your detectors.

To do this just transform the opencv xml file to javascript
using the haartojs (php or java) tool (in cascades folder)

example:
( to use opencv's haarcascades_frontalface_alt.xml  run following command)
```bash
haartojs haarcascades_frontalface_alt
```

this creates a javascript file:   
*haarcascades_frontalface_alt.js*
which you can include in your html file or node file

the variable to use in javascript is similarly  
*haarcascades_frontalface_alt*

###Where to find Haar Cascades xml files to use for feature detection

* [OpenCV](http://opencv.org/)
* [This resource](http://alereimondo.no-ip.org/OpenCV/34)
* search the web :)
* [Train your own](http://docs.opencv.org/doc/user_guide/ug_traincascade.html)
* A [haarcascade for eyes](http://www-personal.umich.edu/~shameem/haarcascade_eye.html) contributed by [Mar Canet](https://github.com/mcanet) demo [here](/examples/eye.html)


###Usage Ideas

* [SmileDetectJS](https://github.com/roironn/SmileDetectJS)
* [ObjectDetect](https://github.com/mtschirs/js-objectdetect)

###TODO
* optimize detector for real-time usage on browsers (eg. reference-> https://github.com/liuliu/ccv)
* keep up with the changes in openCV cascades xml format (will try)

###ChangeLog

__0.2__
* add haartojs tool in php (in cascades folder)
* haartojs produces a javascript file using closures (fixes previous issue with the java tool)

__0.1.1__
* customization to work with Node.js and require.js by [maxired](https://github.com/maxired)  (using js closures) 

__0.1__
* initial commit by [Nikos M.](https://github.com/foo123) (works on browser)


__HAAR.js works in the browser and inside Node.js__

###Runing inside the brower
 Loading wth script tags
    You can run the example face.html or mouth.html inside your browser

###Running inside Node
 For running, the package have a dependency on canvas
 You can find an example inside examples/nodes.js
Valid Output
```bash
node examples/node.js 
processing the picture
[{"x":102.5,"y":105.5,"width":160.66666666666666,"height":160.66666666666666}]
```

To work properly, canvas need some system depencencies.
You can find instruction on https://github.com/LearnBoost/node-canvas/wiki
For example for Ubuntu : 
```bash
sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev
```

###Loading with RequireJS
 As a third option, you can load the library with requireJS, both on the browser on with node.
There is an example of loading with RequireJS inside node in examples/require.js.
The configuration would be the same inside a browser


*Contributor* Nikos M.  
*URL* [Nikos Web Development](http://nikos-web-development.netai.net/ "Nikos Web Development")  
*URL* [Haar.js blog post](http://nikos-web-development.netai.net/blog/haar-js-feature-detection-in-javascript-and-html5-canvas/ "Haar.js blog post")  
*URL* [WorkingClassCode](http://workingclasscode.uphero.com/ "Working Class Code")  

*Contributor* [maxired](https://github.com/maxired)
