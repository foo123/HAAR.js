var Canvas = require('canvas'),
  fs = require('fs'),
  HAAR = require('../build/haar-detector.min'),
  detector = require('../cascades/haarcascade_frontalface_alt').haarcascade_frontalface_alt,
  Image = Canvas.Image;
  
fs.readFile(__dirname + '/model1.jpg', function(err, squid) {
  if (err) throw err;
  img = new Image;

  var loaded = false;

  /*callback called when the src will be filled*/
  img.onload = function() {
    loaded = true;
    console.log("processing the picture")
    /*Launching the processing*/
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