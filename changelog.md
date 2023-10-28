### ChangeLog

__1.0.7__
* stdMath not defined in Worker fixed

__1.0.6__
* fix detection with selected region again (revert to previous)

__1.0.5__
* fix detection with selected region

__1.0.4__
* better square root approximation in canny edges
* update CanvasLite
* update and fix tests/examples

__1.0.3__
* fix haartojs xml conversion scripts
* nodejs example with both node-canvas and CanvasLite

__1.0.2__
* port code from latest version of opencv

__1.0.0__
* backport from FILTER.js HAARDetector plugin correct handling of detecting with selection
* release version 1.0.0

__0.4.8__
* fix undeclared variable issue in `detectSingleStep` method
* add `detectSync` method
* [**HaarDetector**](https://github.com/foo123/FILTER.js/blob/master/src/plugins/HaarDetector.js) is a plugin of the project [FILTER.js](https://github.com/foo123/FILTER.js) for Image Processing and Computer Vision


__0.4.5__ , __0.4.6__, __0.4.7__
* update buildtools, dependencies, api-reference (latest)


__0.4.4__
* array edits
* compatible examples with IE, Opera
* update buildtools


__0.4.3__
* refactor code (make smaller)
* add clearCache method, to delete any stored/cached image data in the detector (in case space is an issue)
* add the tilted feature (Lienhart et al, extension)
* make new haartojs tool (supports both .js and .json output) output format changed, __make sure to re-convert your .js haar cascades!!__
* tidy up the repo, add new build scripts
* fix some typos, edits
* project stopped

__0.4.2__
* add _cascade_ method to detect different feature(using other haar cascade) with same cached image data

__0.4.1__
* cache image data to use with different selection (not re-compute if image is same but selection different)
* inline the haar-tree and haar-leaf evaluators inside the haar-stage evaluator for speed

__0.4__
* add selection option to confine detection to a specific image region
* add fine-tuning for canny pruning thresholds
* refactor/optimize merge method (filter features/rectangles that are inside other features), detection features may be slightly different now
* reduce unnecessary loops/computations from java port (now it is more javascript-esque or in some cases even asm-esque)
* implement fixed-point arithmetic where applicable (gray-scaling, canny computation, references included)
* optimize array indexing (remove unnecessary multiplications use only additions/subtractions)
* features are now custom classes with own methods (much easier to handle while backwards-compatible)
* partial code refactoring / minor fixes
* add more examples (eg many faces detection, tilted faces detection)
* update Readme

__0.3.1__
* fix ordering issue when using parallel computations (rectangles merged in random order)
* fix dimensions computation when scale <> 1 (floating point numbers can give errors)
* minor refactoring, optimizations

__0.3__
* support optional parallel computation/detection (browser and nodejs) using [parallel.js](https://github.com/adambom/parallel.js) library (included)
* refactoring of code

__0.2.1__
* use TypedArrays if available for faster array operations
* minor index/number optimizations

__0.2__
* add haartojs tool in php (in cascades folder)
* haartojs produces a javascript file using closures (fixes previous issue with the java tool)

__0.1.1__
* customization to work with Node.js and require.js by [maxired](https://github.com/maxired)  (using js closures)

__0.1__
* initial commit by [Nikos M.](https://github.com/foo123) (works on browser)
