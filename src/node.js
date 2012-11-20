var Canvas = require('canvas'),
	fs = require('fs'),
	HAAR = require('./haar-detector'),
	detector = require('../cascades/haarcascade_frontalface_alt').haarcascade_frontalface_alt,
	Image = Canvas.Image;
var imageWidth = 100;
var imageHeight = 100;


fs.readFile(__dirname + '/../examples/model1.jpg', function(err, squid) {
	if(err) throw err;
	img = new Image;
	img.src = squid;

	new HAAR.Detector(detector).image(img, 1, new Canvas()).complete(function() {
		console.log(JSON.stringify(this.objects))
	}).detect(1, 1.25, 0.1, 1, true);
});