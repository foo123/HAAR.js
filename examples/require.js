var requirejs = require('./r.js');

requirejs.config({
  nodeRequire: require,
  paths: {
    'haar-detector': '../build/haar-detector',
    'haarcascade_frontalface_alt': '../cascades/haarcascade_frontalface_alt'
  }
});


var Canvas = require('./CanvasLite.js')/*require('canvas')*/,
  fs = require('fs'),
  Image = Canvas.Image;

requirejs(['haar-detector', 'haarcascade_frontalface_alt'], function(HAAR, detector) {

  fs.readFile(__dirname + '/model1.jpg', function(err, squid) {
    if(err) throw err;
    var img = new Image(), loaded = false;

    /*callback called when the src will be filled*/
    img.onload = function() {
      loaded = true;
      console.log("processing the picture"); /*Launching the processing*/
      (new HAAR.Detector(detector.haarcascade_frontalface_alt)).image(img, 1, new Canvas()).complete(function() {
        //processing done
        console.log(JSON.stringify(this.objects));
      }).detect(1, 1.25, 0.1, 1, 0.2, true);
    };

    img.src = squid;

    setTimeout(function() {
      if(loaded) return;
      console.log("Image is long to be loaded");
    }, 3000);
  });
});