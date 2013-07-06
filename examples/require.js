var requirejs = require('requirejs');

requirejs.config({
  nodeRequire: require,
  paths: {
    'haar-detector': '../build/haar-detector.min',
    'haarcascade_frontalface_alt': '../cascades/haarcascade_frontalface_alt'
  },
  shim: {
    'haar-detector': {
      exports: 'HAAR'
    },
    'haarcascade_frontalface_alt': {
      exports: 'haarcascade_frontalface_alt'
    }
  }
});


var Canvas = require('canvas'),
  fs = require('fs'),
  Image = Canvas.Image;

requirejs(['haar-detector', 'haarcascade_frontalface_alt'], function(HAAR, detector) {

  fs.readFile(__dirname + '/model1.jpg', function(err, squid) {
    if(err) throw err;
    img = new Image;

    var loaded = false;

    /*callback called when the src will be filled*/
    img.onload = function() {
      loaded = true;
      console.log("processing the picture") /*Launching the processing*/
      new HAAR.Detector(detector).image(img, 1, new Canvas()).complete(function() {
        //processing done
        console.log(JSON.stringify(this.objects))
      }).detect(1, 1.25, 0.1, 1, true);
    };

    img.src = squid;

    setTimeout(function() {
      if(loaded) return;
      console.log("Your image is long to be loaded - Have you followed canvas installation ? https://github.com/LearnBoost/node-canvas/wiki ")
    }, 2000);
  });
});