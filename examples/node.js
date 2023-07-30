var fs = require('fs'),
  HAAR = require('../build/haar-detector'),
  detector = require('../cascades/haarcascade_frontalface_alt')/*JSON.parse(fs.readFileSync(__dirname + '/../cascades/haarcascade_frontalface_alt.json', 'utf8'))*/;

/*
// if using node-canvas
var Canvas = require('canvas'), Image = Canvas.Image;
fs.readFile(__dirname + '/model1.jpg', function(err, squid) {
  if (err) throw err;
  var img = new Image();

  var loaded = false;

  //callback called when the src will be filled
  img.onload = function() {
    loaded = true;
    console.log("processing the picture")
    //Launching the processing
    new HAAR.Detector(detector).image(img, 1, new Canvas()).complete(function() {
      //processing done
      console.log(JSON.stringify(this.objects))
    }).detect(1, 1.25, 0.1, 1, 0.2, true);
  };

  img.src = squid;

  setTimeout(function() {
    if (loaded) return;
    console.log("Your image is long to be loaded - Have you followed canvas installation ? https://github.com/LearnBoost/node-canvas/wiki ")
  }, 2000);
});
*/
// if using CanvasLite
var Canvas = require('./CanvasLite.js'), Image = Canvas.Image;
var img = new Image(), loaded = false;
//callback called when the src will be filled
img.onload = function() {
    loaded = true;
    console.log("processing the picture")
    //Launching the processing
    new HAAR.Detector(detector).image(img, 1, new Canvas()).complete(function() {
      //processing done
      console.log(JSON.stringify(this.objects))
    }).detect(1, 1.25, 0.1, 1, 0.2, true);
};
img.src = __dirname + '/model1.jpg';
setTimeout(function() {
if (loaded) return;
console.log("Your image is long to be loaded");
}, 2000);
