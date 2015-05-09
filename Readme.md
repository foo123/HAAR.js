# HAAR.js 

### Further development on this project has stopped!!

This project has stopped, no new features are added or updated. However the functionality works as stated in this document and the API reference. Further development has moved to the [FILTER.js](https://github.com/foo123/FILTER.js) project, for Image Processing and Computer Vision, which includes a new [**HaarDetector plugin**](https://github.com/foo123/FILTER.js/blob/master/src/plugins/HaarDetector.js) which can be seen as the continuation of this project.


__Feature Detection Library for JavaScript__    (uses HTML5 canvas on browser and Canvas package on Node)

Based on [Viola-Jones Feature Detection Algorithm using Haar Cascades](http://www.cs.cmu.edu/~efros/courses/LBMV07/Papers/viola-cvpr-01.pdf)

This is a port of [OpenCV C++ Haar Detection](http://opencv.org/) (actually a port of [JViolaJones](http://code.google.com/p/jviolajones/) which is a port of OpenCV for Java) to JavaScript and Node

Light-weight (~10kB minified, ~5kB gzipped).

[![Haar.js Face Detection](/examples/haar-face-detection.png)](http://foo123.github.com/examples/face-detection/)
[![Haar.js Many Faces Detection](/examples/haar-faces-detection.png)](http://foo123.github.com/examples/faces-detection/)
[![Haar.js Mouth Detection](/examples/haar-mouth-detection.png)](http://foo123.github.com/examples/mouth-detection/)
![Haar.js Eyes Detection](/examples/haar-eyes-detection.png)

###Contents

* [Live Examples](#live-examples)
* [How to Use](#how-to-use)
* [API Reference](/api-reference.md)
* [Haar Cascades](#where-to-find-haar-cascades-xml-files-to-use-for-feature-detection)
* [Usage Ideas](#usage-ideas)
* [Todo](#todo)
* [Changelog](/changelog.md)
* [Credits](/credits.md)

###Live Examples
* [Interactive Face Detection](http://foo123.github.com/examples/face-detection/)
* [Many Faces Detection](http://foo123.github.com/examples/faces-detection/)
* [Interactive Mouth Detection](http://foo123.github.com/examples/mouth-detection/)


###How To use
You can use the __existing openCV cascades__  to build your detectors.

To do this just transform the __opencv xml file__ to *javascript* or *json* format
using the __haartojs__ (php) tool (in cascades folder)

__examples:__

to use opencv's *haarcascades_frontalface_alt.xml*  in *javascript* do:

```bash
haartojs haarcascades_frontalface_alt.xml > haarcascades_frontalface_alt.js
```

this creates a javascript file:   *haarcascades_frontalface_alt.js*
which you can include in your html file or node file

the variable to use in javascript is similarly  
*haarcascades_frontalface_alt*  (both in browser and node)

to transform a cascade xml file to *json* format do:

```bash
haartojson haarcascades_frontalface_alt.xml > haarcascades_frontalface_alt.json
```

The structure of the *.js* and *.json* formats is exactly the same, so you can interchange between the two freely


__IMPORTANT__ : The conversion process has changed from previous versions (both in the CLI script and in HAAR.js)

The changes are :

* the feature rectangle coordinates are stored in an array instead of an object hash
* the tilted flag/attribute for rectangles (Rainer Lienhart et al.) is incorporated in the conversion

so __make sure to re-convert your .js xml cascades__ for this version of HAAR.js

The tilted attribute for rectangles (Rainer Lienhart et al. extension of the algorithm) describes tilted (rotated 45 deg) features (rectangles)
in order to detect more features at rotated positions

The tilted flag is added in the *.js* or *.json* files (as *tilt* ), 
(see also [js-objectdetect](https://github.com/mtschirs/js-objectdetect) , which uses the Lienhart extension of the algorithm)

This is now incorporated into HAAR.js and this increases the compatibility 
with the OpenCV cascades (when they use tilted features, eg mouth cascade)


__HAAR.js works both in the browser and in Node.js (supporting parallel computations with Parallel.js)__


**NOTE** HAAR.js (0.4.4+) (and the generated cascades) support *umd-style* generic loading capability for: **commonjs / node** , **amd** , **browsers script tags**


####Runing inside the browser
 Loading wth script tags
    You can run the example face.html or mouth.html inside your browser

####Running inside node
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

####Loading with requirejs
 As a third option, you can load the library with requireJS, both on the browser on with node.
There is an example of loading with RequireJS inside node in examples/require.js.
The configuration would be the same inside a browser


####Supporting parallel computation
 The [parallel.js](https://github.com/adambom/parallel.js) library is included in this repository, see the _face.html_ example for how to use.
 In most cases using parallel computation (if supported) can be much faster (eg _eye.html_ example)


###Where to find Haar Cascades xml files to use for feature detection
* [OpenCV](http://opencv.org/)
* [This resource](http://alereimondo.no-ip.org/OpenCV/34)
* search the web :)
* [Train your own](http://docs.opencv.org/doc/user_guide/ug_traincascade.html) with a little extra help [here](http://note.sonots.com/SciSoftware/haartraining.html) and [here](http://coding-robin.de/2013/07/22/train-your-own-opencv-haar-classifier.html)
* A [haarcascade for eyes](http://www-personal.umich.edu/~shameem/haarcascade_eye.html) contributed by [Mar Canet](https://github.com/mcanet) demo [here](/examples/eye.html)



###Usage Ideas
* [SmileDetectJS](https://github.com/roironn/SmileDetectJS)
* [ObjectDetect](https://github.com/mtschirs/js-objectdetect) (some common ideas with HAAR.js are used with extra functionality like object tracking)



###TODO
- [x] optimize detector for real-time usage on browsers (eg. -> https://github.com/liuliu/ccv) [DONE use parallel.js]
- [x] add selection option, detection is confined to that selection (eg detect nose while face already detected) [DONE]
- [x] check if some operations can use fixed-point arithmetic, or other micro-optimizations [DONE where applicable]
- [ ] keep up with the changes in openCV cascades xml format (will try)
- [ ] add some real performance tests (anyone interested??)


*URL* [Nikos Web Development](http://nikos-web-development.netai.net/ "Nikos Web Development")  
*URL* [Haar.js blog post](http://nikos-web-development.netai.net/blog/haar-js-feature-detection-in-javascript-and-html5-canvas/ "Haar.js blog post")  
*URL* [WorkingClassCode](http://workingclasscode.uphero.com/ "Working Class Code")  
