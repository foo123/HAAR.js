var requirejs = require('requirejs');

requirejs.config({
	nodeRequire : require,
	paths : {
	'haar-detector' :'./haar-detector',
	'haarcascade_frontalface_alt' :'../cascades/haarcascade_frontalface_alt'
	},
	shim: {
        'haar-detector': {
            exports: 'HAAR'
        },
        'haarcascade_frontalface_alt' :{
        		exports : 'haarcascade_frontalface_alt'
        }
	}
	})

var Canvas = require('canvas'),
		fs=require('fs'),
 		Image = Canvas.Image;
var imageWidth = 100;
var imageHeight = 100;

requirejs(['haar-detector' ,'haarcascade_frontalface_alt' ], function(HAAR, detector){

fs.readFile(__dirname + '/../examples/model1.jpg', function(err, squid){
  if (err) throw err;
  img = new Image;
  img.src = squid;

  new HAAR.Detector(detector).image(img , 1 , new Canvas()) .complete(function(){
		console.log(JSON.stringify(this.objects))	
		}).detect(1, 1.25, 0.1, 1, true);
	});
});

