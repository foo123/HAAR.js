/**************************************************************************************
** HAAR.js Feature Detection Library based on Viola-Jones Haar Detection algorithm
** Port of jviolajones (Java) which is a port of openCV C++ Haar Detector
**
** Author Nikos M.
** url http://nikos-web-development.netai.net/
**************************************************************************************/

var HAAR=HAAR||{};
// Detector Class with the haar cascade data
HAAR.Detector=function(haardata)
{
	this.haardata=haardata;
	this.async=true;
	this.onComplete=null;
	this.Image=null;
	this.canvas=null;
};
// set image for detector along with scaling
HAAR.Detector.prototype.image=function(image,scale)
{
	this.Image=image;
	this.canvas=document.createElement('canvas');
	if (typeof scale=='undefined')
		scale=0.5;
	this.ratio=scale;
	this.async=true;
	this.canvas.width=this.ratio*image.width;
	this.canvas.height=this.ratio*image.height;
	this.canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height, 0, 0, this.ratio*image.width, this.ratio*image.height);
	return this;
};
// detector on complete callback
HAAR.Detector.prototype.complete=function(func)
{
	this.onComplete=func;
	return this;
};
// Detector detect method to start detection
HAAR.Detector.prototype.detect=function(baseScale, scale_inc, increment, min_neighbors, doCannyPruning)
{
	if (typeof doCannyPruning=='undefined')
		doCannyPruning=true;
	this.doCannyPruning=doCannyPruning;
	this.ret=[];
	var sizex=this.haardata.size1;
	var sizey=this.haardata.size2;
	this.computeGray(this.canvas);
	var w=this.width;
	var h=this.height;
	this.maxScale = Math.min((w)/sizex,(h)/sizey);
	this.canny = null;
	if(this.doCannyPruning)
		this.canny = this.IntegralCanny(this.img);
	this.scale=baseScale;
	this.min_neighbors=min_neighbors;
	this.scale_inc=scale_inc;
	this.increment=increment;
	this.ready=false;
	var thiss=this;
	//if (this.async)
		this.interval=setInterval(function(){thiss.detectAsync()},30);
	/*else
	{
		while(this.scale<=this.maxScale+1)
			this.detectAsync();
		return this.objects;
	}*/
};
// Private functions for detection
HAAR.Detector.prototype.computeGray=function(image)
{
	this.gray=[];
	this.img=[];
	this.squares=[];
	var data=image.getContext('2d').getImageData(0,0,image.width,image.height);
	this.width=data.width;
	this.height=data.height;
	var w=data.width;
	var h=data.height;
	var col,col2,i,j,pix,r,g,b,grayc,grayc2;
	var rm=30/100,gm=59/100,bm=11/100;
	var im=data.data;
	for(i=0;i<w;i++)
	{
		col=0;
		col2=0;
		for(j=0;j<h;j++)
		{
			
			ind=(j*w+i);
			pix=ind*4;
			red = im[pix];
			green = im[pix+1];
			blue = im[pix+2];
			grayc=(rm*red +gm*green +bm*blue);
			grayc2=grayc*grayc;
			this.img[ind]=grayc;
			this.gray[ind]=(i>0?this.gray[i-1+j*w]:0)+col+grayc;
			this.squares[ind]=(i>0?this.squares[i-1+j*w]:0)+col2+grayc2;
			col+=grayc;
			col2+=grayc2;
		}
	}
};
HAAR.Detector.prototype.detectAsync=function()
{
	var sizex=this.haardata.size1;
	var sizey=this.haardata.size2;
	var w=this.width;
	var h=this.height;
	if (this.scale<=this.maxScale)
	{
		var step=Math.floor(this.scale*sizex*this.increment);
		var size=Math.floor(this.scale*this.haardata.size1);
		for(var i=0;i<w-size;i+=step)
		{
			for(var j=0;j<h-size;j+=step)
			{
				if(this.doCannyPruning)
				{
					var edges_density = this.canny[i+size+(j+size)*w]+this.canny[i+j*w]-this.canny[i+(j+size)*w]-this.canny[i+size+j*w];
					var d = edges_density/size/size;
					if(d<20||d>100)
						continue;
				}
				var pass=true;
				for(var s=0; s<this.haardata.stages.length;s++)
				{
					
					pass=this.evalStage(s,i,j,this.scale);
					if (pass==false)
						break;
				}
				if (pass) this.ret.push({x:i,y:j,width:size,height:size});
			}
		}
		this.scale*=this.scale_inc;
	}
	else
	{
		//if (this.async)
			clearInterval(this.interval);
		this.objects= this.merge(this.ret,this.min_neighbors);
		this.ready=true;
		if (this.async && this.onComplete)
			this.onComplete.call(this);
	}
};
HAAR.Detector.prototype.IntegralCanny=function(grayImage)
{
	var canny = [];
	var i,j,sum;
	var w=this.width;
	var h=this.height;
	for(i=2;i<w-2;i++)
		for(j=2;j<h-2;j++)
		{
			sum =0;
			sum+=2*grayImage[i-2+(j-2)*w];
		  sum+=4*grayImage[i-2+(j-1)*w];
		  sum+=5*grayImage[i-2+(j+0)*w];
		  sum+=4*grayImage[i-2+(j+1)*w];
		  sum+=2*grayImage[i-2+(j+2)*w];
		  sum+=4*grayImage[i-1+(j-2)*w];
		  sum+=9*grayImage[i-1+(j-1)*w];
		  sum+=12*grayImage[i-1+(j+0)*w];
		  sum+=9*grayImage[i-1+(j+1)*w];
		  sum+=4*grayImage[i-1+(j+2)*w];
		  sum+=5*grayImage[i+0+(j-2)*w];
		  sum+=12*grayImage[i+0+(j-1)*w];
		  sum+=15*grayImage[i+0+(j+0)*w];
		  sum+=12*grayImage[i+0+(j+1)*w];
		  sum+=5*grayImage[i+0+(j+2)*w];
		  sum+=4*grayImage[i+1+(j-2)*w];
		  sum+=9*grayImage[i+1+(j-1)*w];
		  sum+=12*grayImage[i+1+(j+0)*w];
		  sum+=9*grayImage[i+1+(j+1)*w];
		  sum+=4*grayImage[i+1+(j+2)*w];
		  sum+=2*grayImage[i+2+(j-2)*w];
		  sum+=4*grayImage[i+2+(j-1)*w];
		  sum+=5*grayImage[i+2+(j+0)*w];
		  sum+=4*grayImage[i+2+(j+1)*w];
		  sum+=2*grayImage[i+2+(j+2)*w];

		canny[i+j*w]=sum/159;
	}
	var grad = [];
	for(i=1;i<w-1;i++)
		for(j=1;j<h-1;j++)
		{
			var grad_x =-canny[i-1+(j-1)*w]+canny[i+1+(j-1)*w]-2*canny[i-1+j*w]+2*canny[i+1+j*w]-canny[i-1+(j+1)*w]+canny[i+1+(j+1)*w];
			var grad_y = canny[i-1+(j-1)*w]+2*canny[i+(j-1)*w]+canny[i+1+(j-1)*w]-canny[i-1+(j+1)*w]-2*canny[i+(j+1)*w]-canny[i+1+(j+1)*w];
			grad[i+j*w]=Math.abs(grad_x)+Math.abs(grad_y);
		}
	for(i=0;i<w;i++)
	{
		var col=0;
		for(j=0;j<h;j++)
		{
			var value= grad[i+j*w];
			canny[i+j*w]=(i>0?canny[i-1+j*w]:0)+col+value;
			col+=value;
		}
	}
	return canny;
};
HAAR.Detector.prototype.merge=function(rects, min_neighbors)
{
	var ret=new Array(rects.length);
	for (var r=0;r<ret.length;r++)
		ret[r]=0;
	var nb_classes=0;
	var retour=[];
	for(var i=0;i<rects.length;i++)
	{
		var found=false;
		for(var j=0;j<i;j++)
		{
			if(this.equals(rects[j],rects[i]))
			{
				found=true;
				ret[i]=ret[j];
			}
		}
		if(!found)
		{
			ret[i]=nb_classes;
			nb_classes++;
		}
	}
	var neighbors=new Array(nb_classes);
	var rect=new Array(nb_classes);
	for(var i=0;i<nb_classes;i++)
	{
		neighbors[i]=0;
		rect[i]={x:0,y:0,width:0,height:0};
	}
	for(var i=0;i<rects.length;i++)
	{
		neighbors[ret[i]]++;
		rect[ret[i]].x+=rects[i].x;
		rect[ret[i]].y+=rects[i].y;
		rect[ret[i]].height+=rects[i].height;
		rect[ret[i]].width+=rects[i].width;
	}
	for(var i = 0; i < nb_classes; i++ )
	{
		var n = neighbors[i];
		if( n >= min_neighbors)
		{
			var r={x:0,y:0,width:0,height:0};
			r.x = (rect[i].x*2 + n)/(2*n);
			r.y = (rect[i].y*2 + n)/(2*n);
			r.width = (rect[i].width*2 + n)/(2*n);
			r.height = (rect[i].height*2 + n)/(2*n);
			retour.push(r);
		}
	}
	if (this.ratio!=1) // scaled down, scale them back up
	{
		var ratio=1/this.ratio;
		for (var i=0;i<retour.length;i++)
		{
			var rr=retour[i];
			rr={x:rr.x*ratio,y:rr.y*ratio,width:rr.width*ratio,height:rr.height*ratio};
			retour[i]=rr;
		}
	}
	return retour;
};
HAAR.Detector.prototype.equals=function(r1, r2)
{
	var distance = Math.floor(r1.width*0.2);

	if(r2.x <= r1.x + distance &&
		   r2.x >= r1.x - distance &&
		   r2.y <= r1.y + distance &&
		   r2.y >= r1.y - distance &&
		   r2.width <= Math.floor( r1.width * 1.2 ) &&
		   Math.floor( r2.width * 1.2 ) >= r1.width) return true;
	if(r1.x>=r2.x&&r1.x+r1.width<=r2.x+r2.width&&r1.y>=r2.y&&r1.y+r1.height<=r2.y+r2.height) return true;
	return false;
};
HAAR.Detector.prototype.evalStage=function(s,i,j,scale)
{
	var sum=0;
	var threshold=this.haardata.stages[s].thres;
	var trees=this.haardata.stages[s].trees;
	var t,tl=trees.length;
	for(t=0;t<tl;t++)
	{
		sum+=this.evalTree(s,t,i,j,scale);
	}
	return sum>threshold;
};
HAAR.Detector.prototype.evalTree=function(s,t,i,j,scale)
{
	var features=this.haardata.stages[s].trees[t].feats;
	var cur_node_ind=0;
	var cur_node = features[cur_node_ind];
	while(true)
	{
		var where = this.getLeftOrRight(s,t,cur_node_ind, i, j, scale);
		if(where==0)
		{
			if(cur_node.has_l)
			{
				return cur_node.l_val;
			}
			else
			{
				cur_node_ind=cur_node.l_node;
				cur_node = features[cur_node_ind];
			}
		}
		else
		{
			if(cur_node.has_r)
			{

				return cur_node.r_val;
			}
			else
			{
				cur_node_ind=cur_node.r_node;
				cur_node = features[cur_node_ind];
			}
		}
	}
};
HAAR.Detector.prototype.getLeftOrRight=function(s,t,f, i, j, scale) 
{
	var sizex=this.haardata.size1;
	var sizey=this.haardata.size2;
	var w=Math.floor(scale*sizex);
	var h=Math.floor(scale*sizey);
	var ww=this.width;
	var hh=this.height;
	var inv_area=1./(w*h);
	var grayImage=this.gray;
	var squares=this.squares;
	var total_x=grayImage[i+w+(j+h)*ww]+grayImage[i+j*ww]-grayImage[i+(j+h)*ww]-grayImage[i+w+j*ww];
	var total_x2=squares[i+w+(j+h)*ww]+squares[i+j*ww]-squares[i+(j+h)*ww]-squares[i+w+j*ww];
	var moy=total_x*inv_area;
	var vnorm=total_x2*inv_area-moy*moy;
	var feature=this.haardata.stages[s].trees[t].feats[f];
	var rects=feature.rects;
	var nb_rects=rects.length;
	var threshold=feature.thres;
	vnorm=(vnorm>1)?Math.sqrt(vnorm):1;

	var rect_sum=0;
	for(var k=0;k<nb_rects;k++)
	{
		var r = rects[k];
		var rx1=i+Math.floor(scale*r.x1);
		var rx2=i+Math.floor(scale*(r.x1+r.y1));
		var ry1=j+Math.floor(scale*r.x2);
		var ry2=j+Math.floor(scale*(r.x2+r.y2));
		rect_sum+=Math.floor((grayImage[rx2+ry2*ww]-grayImage[rx1+ry2*ww]-grayImage[rx2+ry1*ww]+grayImage[rx1+ry1*ww])*r.f);
	}
	var rect_sum2=rect_sum*inv_area;
	return (rect_sum2<threshold*vnorm)?0:1;
};
