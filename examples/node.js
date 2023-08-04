"use strict";
var HAAR = require('../build/haar-detector.js'),
  detector = require('../cascades/haarcascade_frontalface_alt.js')/*JSON.parse(require('fs').readFileSync(__dirname + '/../cascades/haarcascade_frontalface_alt.json', 'utf8'))*/
;

// if using node-canvas
//var Canvas = require('canvas');

// if using CanvasLite
var Canvas = require('./CanvasLite.js');

var Image = Canvas.Image;
require('fs').readFile(__dirname + '/model1.jpg', function(error, buffer) {
    if (error) throw error;
    var img = new Image(), loaded = false;
    //callback called when the src will be filled
    img.onload = function() {
        loaded = true;
        console.log("processing the picture");
        //Launching the processing
        (new HAAR.Detector(detector)).image(img, 1, new Canvas()).complete(function() {
          //processing done
          console.log(JSON.stringify(this.objects));
        }).detect(1, 1.25, 0.1, 1, 0.2, true);
    };
    img.src = buffer;
    setTimeout(function() {
        if (loaded) return;
        console.log("Image is long to be loaded");
    }, 3000);
});
