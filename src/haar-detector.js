/**
*
* HAAR.js Feature Detection Library based on Viola-Jones Haar Detection algorithm
* Port of jviolajones (Java) which is a port of openCV C++ Haar Detector
*
* https://github.com/foo123/HAAR.js
* @version: 0.4.2
*
* Supports parallel "map-reduce" computation both in browser and nodejs using parallel.js library 
* https://github.com/adambom/parallel.js (included)
*
**/

(function(root) {
    var HAAR;

    // export using window object on browser, or export object on node,require
    if ('undefined' != typeof (module) && module.exports)  HAAR = module.exports;
    else if ('undefined' != typeof (exports) )  HAAR = exports;
    else  HAAR = root.HAAR = {};

    var // typed arrays substitute 
        Array32F = (typeof Float32Array !== "undefined") ? Float32Array : Array,
        Array64F = (typeof Float64Array !== "undefined") ? Float64Array : Array,
        Array8I = (typeof Int8Array !== "undefined") ? Int8Array : Array,
        Array16I = (typeof Int16Array !== "undefined") ? Int16Array : Array,
        Array32I = (typeof Int32Array !== "undefined") ? Int32Array : Array,
        Array8U = (typeof Uint8Array !== "undefined") ? Uint8Array : Array,
        Array16U = (typeof Uint16Array !== "undefined") ? Uint16Array : Array,
        Array32U = (typeof Uint32Array !== "undefined") ? Uint32Array : Array,
        
        // math functions brevity
        Abs=Math.abs, Max=Math.max, Min=Math.min, Floor=Math.floor, Round=Math.round, Sqrt=Math.sqrt
    ;

    //
    // Private methods for detection
    //
    
    // compute gray-scale image, integral image and square image (Viola-Jones)
    function integralImage(canvas/*, selection*/) 
    {
        //var data = canvas.getContext('2d').getImageData(selection.x, selection.y, selection.width, selection.height),
        var data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height),
            w = data.width, h = data.height, im = data.data, count=w*h,
            col, col2, i, j, k, pix, ind,
            gray = new Array8U(count), integral = new Array32U(count), squares = new Array32U(count)
            ;
        
        for (i = 0; i < w; i++) 
        {
            col=col2=0; k=0;
            for (j = 0; j < h; j++) 
            {
                // compute coords using simple add/subtract arithmetic (faster)
                ind=k+i; pix=ind << 2; k+=w;
                // use fixed-point gray-scale transform, close to openCV transform
                // https://github.com/mtschirs/js-objectdetect/issues/3
                // 0,29901123046875  0,58697509765625  0,114013671875 with roundoff
                gray[ind] = ((4899 * im[pix] + 9617 * im[pix + 1] + 1868 * im[pix + 2]) + 8192) >>> 14;
                col += (gray[ind]&0xFF) >>> 0;  col2 += ((gray[ind]*gray[ind])&0xFFFFFFFF) >>> 0;
                if (i)
                {
                    integral[ind] = integral[ind-1] + col;
                    squares[ind] = squares[ind-1] + col2;
                }
                else
                {
                    integral[ind] = col;
                    squares[ind] = col2;
                }
            }
        }
        return {gray:gray, integral:integral, squares:squares};
    };

    // compute Canny edges on gray-scale image to speed up detection if possible
    function integralCanny(gray, w, h) 
    {
        var i, j, k, sum=0, grad_x, grad_y,
            ind0, ind1, ind2, ind_1, ind_2, count=w*h, 
            grad = new Array8U(count), canny = new Array32U(count)
            ;
        
        for (i = 0; i < w; i++)
        {
            k=0; sum=0;
            for (j = 0; j < h; j++) 
            {
                // compute coords using simple add/subtract arithmetic (faster)
                ind0=k+i; k+=w;
                
                if (i<2 || i>=w-2 || j<2 || j>=h-2) { grad[ind0]=0; continue; }
                
                ind1=ind0+w; ind2=ind1+w; ind_1=ind0-w; ind_2=ind_1-w; 
                
                /*
                 Original Code
                 
                sum = 0;
                sum += 2 * grayImage[- 2 + ind_2];
                sum += 4 * grayImage[- 2 + ind_1];
                sum += 5 * grayImage[- 2 + ind0];
                sum += 4 * grayImage[- 2 + ind1];
                sum += 2 * grayImage[- 2 + ind2];
                sum += 4 * grayImage[- 1 + ind_2];
                sum += 9 * grayImage[- 1 + ind_1];
                sum += 12 * grayImage[- 1 + ind0];
                sum += 9 * grayImage[- 1 + ind1];
                sum += 4 * grayImage[- 1 + ind2];
                sum += 5 * grayImage[0 + ind_2];
                sum += 12 * grayImage[0 + ind_1];
                sum += 15 * grayImage[0 + ind0];
                sum += 12 * grayImage[i + 0 + ind1];
                sum += 5 * grayImage[0 + ind2];
                sum += 4 * grayImage[1 + ind_2];
                sum += 9 * grayImage[1 + ind_1];
                sum += 12 * grayImage[1 + ind0];
                sum += 9 * grayImage[1 + ind1];
                sum += 4 * grayImage[1 + ind2];
                sum += 2 * grayImage[2 + ind_2];
                sum += 4 * grayImage[2 + ind_1];
                sum += 5 * grayImage[2 + ind0];
                sum += 4 * grayImage[2 + ind1];
                sum += 2 * grayImage[2 + ind2];
                */
                
                // use as simple fixed-point arithmetic as possible (only addition/subtraction and binary shifts)
                // http://stackoverflow.com/questions/11703599/unsigned-32-bit-integers-in-javascript
                // http://stackoverflow.com/questions/6232939/is-there-a-way-to-correctly-multiply-two-32-bit-integers-in-javascript/6422061#6422061
                // http://stackoverflow.com/questions/6798111/bitwise-operations-on-32-bit-unsigned-ints
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#%3E%3E%3E_%28Zero-fill_right_shift%29
                sum = ((0
                        + (gray[ind_2-2] << 1) + (gray[ind_1-2] << 2) + (gray[ind0-2] << 2) + (gray[ind0-2])
                        + (gray[ind1-2] << 2) + (gray[ind2-2] << 1) + (gray[ind_2-1] << 2) + (gray[ind_1-1] << 3)
                        + (gray[ind_1-1]) + (gray[ind0-1] << 4) - (gray[ind0-1] << 2) + (gray[ind1-1] << 3)
                        + (gray[ind1-1]) + (gray[ind2-1] << 2) + (gray[ind_2] << 2) + (gray[ind_2]) + (gray[ind_1] << 4)
                        - (gray[ind_1] << 2) + (gray[ind0] << 4) - (gray[ind0]) + (gray[ind1] << 4) - (gray[ind1] << 2)
                        + (gray[ind2] << 2) + (gray[ind2]) + (gray[ind_2+1] << 2) + (gray[ind_1+1] << 3) + (gray[ind_1+1])
                        + (gray[ind0+1] << 4) - (gray[ind0+1] << 2) + (gray[ind1+1] << 3) + (gray[ind1+1]) + (gray[ind2+1] << 2)
                        + (gray[ind_2+2] << 1) + (gray[ind_1+2] << 2) + (gray[ind0+2] << 2) + (gray[ind0+2])
                        + (gray[ind1+2] << 2) + (gray[ind2+2] << 1)
                        ) &0xFFFFFFFF ) >>> 0;
                
                /*
                Original Code
                
                grad[ind0] = sum/159 = sum*0.0062893081761006;
                */
                
                // sum of coefficients = 159, factor = 1/159 = 0,0062893081761006
                // 2^14 = 16384, 16384/2 = 8192
                // 2^14/159 = 103,0440251572322304 =~ 103 +/- 2^13
                //grad[ind0] = (( ((sum << 6)&0xFFFFFFFF)>>>0 + ((sum << 5)&0xFFFFFFFF)>>>0 + ((sum << 3)&0xFFFFFFFF)>>>0 + ((8192-sum)&0xFFFFFFFF)>>>0 ) >>> 14) >>> 0;
                grad[ind0] = ((((103*sum + 8192)&0xFFFFFFFF) >>> 14)&0xFF) >>> 0;
            }
        }
        
        for (i = 0; i < w; i++)
        {
            k=0; sum=0; 
            for (j = 0; j < h; j++) 
            {
                // compute coords using simple add/subtract arithmetic (faster)
                ind0=k+i; k+=w;
                
                if (i<1 || i>=w-1 || j<1 || j>=h-1) 
                { 
                    sum=0;
                }
                else
                {
                    ind1=ind0+w; ind_1=ind0-w; 
                    
                    grad_x = ((0
                            - grad[ind_1-1] 
                            + grad[ind_1+1] 
                            - grad[ind0-1] - grad[ind0-1]
                            + grad[ind0+1] + grad[ind0+1]
                            - grad[ind1-1] 
                            + grad[ind1+1]
                            ))&0xFFFFFFFF
                            ;
                    grad_y = ((0
                            + grad[ind_1-1] 
                            + grad[ind_1] + grad[ind_1]
                            + grad[ind_1+1] 
                            - grad[ind1-1] 
                            - grad[ind1] - grad[ind1]
                            - grad[ind1+1]
                            ))&0xFFFFFFFF
                            ;
                    sum+=(Abs(grad_x) + Abs(grad_y));
                }
                canny[ind0] = (i) ? (canny[ind0-1]+sum) : sum;
           }
        }
        return canny;
    };

    // Viola-Jones HAAR-Stage evaluator
    function evalStage(self, s, i, j, scale, vnorm, inv_area) 
    {
        var Floor=Floor || Math.floor, 
            stage=self.haardata.stages[s], threshold=stage.thres, trees=stage.trees, tl=trees.length,
            integralImage=self.integral, squares=self.squares, ww=self.scaledSelection.width, hh=self.scaledSelection.height, 
            t, cur_node_ind, where, features, feature, rects, nb_rects, thresholdf, 
            rect_sum, k, r, rx1, rx2, ry1, ry2, sum=0
        ;
        
        for (t = 0; t < tl; t++) 
        { 
            //
            // inline the tree and leaf evaluators to avoid function calls per-loop (faster)
            //
            
            // Viola-Jones HAAR-Tree evaluator
            features=trees[t].feats; cur_node_ind=0;
            while (true) 
            {
                feature=features[cur_node_ind]; 
                // Viola-Jones HAAR-Leaf evaluator
                rects=feature.rects; nb_rects=rects.length; thresholdf=feature.thres; rect_sum=0;
                for (k = 0; k < nb_rects; k++) 
                {
                    r = rects[k];
                    rx1 = i + Floor(scale * r.x1); rx2 = i + Floor(scale * (r.x1 + r.y1));
                    ry1 = ww*(j + Floor(scale * r.x2)); ry2 = ww*(j + Floor(scale * (r.x2 + r.y2)));
                    rect_sum+= /*Floor*/(r.f * (integralImage[rx2 + ry2] - integralImage[rx1 + ry2] - integralImage[rx2 + ry1] + integralImage[rx1 + ry1]));
                }
                where = (rect_sum * inv_area < thresholdf * vnorm) ? 0 : 1;
                // END Viola-Jones HAAR-Leaf evaluator
                
                if (0 == where) 
                {
                    if (feature.has_l) { sum+=feature.l_val; break; } 
                    else { cur_node_ind=feature.l_node; }
                } 
                else 
                {
                    if (feature.has_r) { sum+=feature.r_val; break; } 
                    else { cur_node_ind=feature.r_node; }
                }
            }
            // END Viola-Jones HAAR-Tree evaluator
        }
        return (sum > threshold);
        // END Viola-Jones HAAR-Stage evaluator
    };
    
    // merge the detected features if needed
    function merge(rects, min_neighbors, ratio, selection) 
    {
        var rlen=rects.length, ref = new Array(rlen), feats=[], 
            nb_classes = 0, neighbors, r, found=false, i, j, n, t, ri;
        
        for (i = 0; i < rlen; i++) 
        {
            ref[i] = 0; found = false; rects[i]=new HAAR.Feature(rects[i]);
            for (j = 0; j < i; j++) { if (rects[j].almostEqual(rects[i])) { found = true; ref[i] = ref[j]; }  }
            if (!found) { ref[i] = nb_classes;  nb_classes++; }
        }
        
        neighbors = new Array(nb_classes);  r = new Array(nb_classes);
        for (i = 0; i < nb_classes; i++) { neighbors[i] = 0;  r[i] = new HAAR.Feature(); }
        for (i = 0; i < rlen; i++) { ri=ref[i]; neighbors[ri]++; r[ri].add(rects[i]); }
        
        // merge neighbor classes
        for (i = 0; i < nb_classes; i++) 
        {
            n = neighbors[i];
            if (n >= min_neighbors) 
            {
                t=1/(n + n);
                ri = new HAAR.Feature(
                    t*(r[i].x * 2 + n),  t*(r[i].y * 2 + n),
                    t*(r[i].width * 2 + n),  t*(r[i].height * 2 + n)
                );
                
                feats.push(ri);
            }
        }
        
        if (ratio != 1) { ratio=1.0/ratio; }
        // filter inside rectangles
        rlen=feats.length;
        for (i=0; i<rlen; i++)
        {
            for (j=i+1; j<rlen; j++)
            {
                if (!feats[i].isInside && feats[i].inside(feats[j])) { feats[i].isInside=true; }
                else if (!feats[j].isInside && feats[j].inside(feats[i])) { feats[j].isInside=true; }
            }
        }
        i=rlen;
        while (--i >= 0) 
        { 
            if (feats[i].isInside) 
            {
                feats.splice(i, 1); 
            }
            else 
            {
                // scaled down, scale them back up
                if (ratio != 1)  feats[i].scale(ratio); 
                //feats[i].x+=selection.x; feats[i].y+=selection.y;
                feats[i].round().computeArea(); 
            }
        }
        // sort according to size 
        // (a deterministic way to present results under different cases)
        return feats.sort(byArea);
    };
    
    // area used as compare func for sorting
    function byArea(a, b) { return a.area-b.area; };
    
    // serial index used as compare func for sorting
    function byOrder(a, b) { return a.index-b.imdex; };
    
    // used for parallel "map" computation
    function detectParallel(self) 
    {
        var Floor= Floor || Math.floor, Sqrt= Sqrt || Math.sqrt, scale=self.scale, sizex = self.haardata.size1, sizey = self.haardata.size2,
            ret=[], w = self.scaledSelection.width, h = self.scaledSelection.height, step, size, edges_density, d, ds, pass, 
            ind1, ind2, k, kw, ks, i, j, s, il, jl, sl,
            cL=self.cannyLow, cH=self.cannyHigh, starti=self.scaledSelection.x, startj=self.scaledSelection.y, 
            // pre-compute some values for speed
            sw, sh, swh, wh, inv_area, ii, iih, total_x, total_x2, mu, vnorm;
        
        if (scale <= self.maxScale) 
        {
            step = Floor(scale * sizex * self.increment); size = Floor(scale * sizex); 
            kw=size*w; ks=step*w; ds=1/(size*size);
            // pre-compute some values for speed
            sw = size; sh = Floor(self.scale * sizey); swh=sw*sh; wh=w*sh; inv_area=1.0/swh;
            for (i = starti, il=w-size; i < il; i += step) 
            {
                k=(startj) ? startj*ks : 0;
                for (j = startj, jl=h-size; j < jl; j += step) 
                {
                    ind1=i + k + kw; ind2=i + k; k+=ks;
                    if (self.doCannyPruning) 
                    {
                        edges_density = self.canny[ind1 + size] + self.canny[ind2] - self.canny[ind1] - self.canny[ind2 + size];
                        d = ds*edges_density;
                        if (d < cL || d > cH) continue;
                    }
                    // pre-compute some values for speed
                    ii=ind2; iih=ii+wh;
                    total_x = self.integral[sw + iih] + self.integral[ii] - self.integral[iih] - self.integral[sw + ii];
                    total_x2 = self.squares[sw + iih] + self.squares[ii] - self.squares[iih] - self.squares[sw + ii];
                    mu = total_x * inv_area; vnorm = total_x2 * inv_area - mu * mu;
                    vnorm = (vnorm > 1) ? Sqrt(vnorm) : 1;
                    pass = true;
                    for (s = 0, sl=self.haardata.stages.length; s < sl; s++) 
                    {
                        pass = evalStage(self, s, i, j, self.scale, vnorm, inv_area);
                        if (pass == false) break;
                    }
                    if (pass) ret.push({  // maybe use HAARFeature Class here ??
                            index: self.i,
                            x: i, y: j,
                            width: size,  height: size
                        });
                }
            }
        }
        return ret;        
    };
    
    /*
    splice subarray (not used)
    http://stackoverflow.com/questions/1348178/a-better-way-to-splice-an-array-into-an-array-in-javascript
    Array.prototype.splice.apply(d[0], [prev, 0].concat(d[1])); 
    */
    
    // used for parallel "reduce" computation
    function mergeParallel(d) 
    { 
        // concat and sort according to serial ordering
        if (d[1].length) d[0]=d[0].concat(d[1]).sort(byOrder); 
        return d[0]; 
    };
    
    // used for asynchronous computation using fixed intervals
    function detectAsync(self) 
    {
        var Floor= Floor || Math.floor, sizex = self.haardata.size1, sizey = self.haardata.size2,
            w = self.scaledSelection.width, h = self.scaledSelection.height, step, size, edges_density, d, ds, pass, 
            ind1, ind2, k, kw, ks, i, j, s, il, jl, sl, 
            cL=self.cannyLow, cH=self.cannyHigh, starti=self.scaledSelection.x, startj=self.scaledSelection.y,
            // pre-compute some values for speed
            sw, sh, swh, wh, inv_area, ii, iih, total_x, total_x2, mu, vnorm;
        
        if (self.scale <= self.maxScale) 
        {
            step = Floor(self.scale * sizex * self.increment); size = Floor(self.scale * sizex);
            kw=size*w; ks=step*w; ds=1/(size*size);
            // pre-compute some values for speed
            sw = size; sh = Floor(self.scale * sizey); swh=sw*sh; wh=w*sh; inv_area=1.0/swh;
            for (i = starti, il=w-size; i < il; i += step) 
            {
                k=(startj) ? startj*ks : 0;
                for (j = startj, jl=h-size; j < jl; j += step) 
                {
                    ind1=i + k + kw; ind2=i + k; k+=ks;
                    if (self.doCannyPruning) 
                    {
                        edges_density = ((self.canny[ind1 + size] + self.canny[ind2] - self.canny[ind1] - self.canny[ind2 + size]));
                        d = ds*edges_density;
                        if (d < cL || d > cH) continue;
                    }
                    // pre-compute some values for speed
                    ii=ind2; iih=ii+wh;
                    total_x = self.integral[sw + iih] + self.integral[ii] - self.integral[iih] - self.integral[sw + ii];
                    total_x2 = self.squares[sw + iih] + self.squares[ii] - self.squares[iih] - self.squares[sw + ii];
                    mu = total_x * inv_area; vnorm = total_x2 * inv_area - mu * mu;
                    vnorm = (vnorm > 1) ? Sqrt(vnorm) : 1;
                    pass = true;
                    for (s = 0, sl=self.haardata.stages.length; s < sl; s++) 
                    {
                        pass = evalStage(self, s, i, j, self.scale, vnorm, inv_area);
                        if(pass == false) break;
                    }
                    if (pass) self.ret.push({  // maybe use HAARFeature Class here ??
                            x: i, y: j,
                            width: size,  height: size
                        });
                }
            }
            self.scale *= self.scale_inc;
        } 
        else { clearInterval(self.TimeInterval); detectEnd(self, self.ret); }
    };

    // called when detection ends, calls user-callback if any
    function detectEnd(self, rects) 
    {
        //console.log(rects);
        self.objects = merge(rects, self.min_neighbors, self.Ratio, self.Selection); self.ret=null; self.Ready = true;
        if (self.onComplete) self.onComplete.call(self);
    };
    
    
    //
    //
    //
    // Feature/Rectangle Class  (arguably faster than generic Object)
    HAAR.Feature=function(x, y, w, h, i) { this.data(x, y, w, h, i) };
    
    HAAR.Feature.prototype={
        
        index : 0,
        x : 0,
        y : 0,
        width : 0,
        height : 0,
        area : 0,
        isInside : false,
        
        data : function(x, y, w, h, i) {
            if (x && (x instanceof HAAR.Feature)) 
            {
                x.clone(this);
            }
            else if (x && (x instanceof Object))
            {
                this.x=x.x || 0;
                this.y=x.y || 0;
                this.width=x.width || 0;
                this.height=x.height || 0;
                this.index=x.index || 0;
                this.area=x.area || 0;
                this.isInside=x.isInside || false;
            }
            else
            {
                this.x=x || 0;
                this.y=y || 0;
                this.width=w || 0;
                this.height=h || 0;
                this.index=i || 0;
                this.area=0;
                this.isInside=false;
            }
            return this;
        },
        
        add : function (f) { this.x+=f.x; this.y+=f.y; this.width+=f.width; this.height+=f.height; return this; },
        
        scale : function(s) { this.x*=s; this.y*=s; this.width*=s; this.height*=s; return this; },
        
        round : function() { this.x=Round(this.x); this.y=Round(this.y); this.width=Round(this.width); this.height=Round(this.height); return this; },
        
        computeArea : function() { this.area=this.width*this.height; return this.area; }, 
        
        inside : function(f) { return ((this.x>=f.x) && (this.y>=f.y) && (this.x+this.width<=f.x+f.width) && (this.y+this.height<=f.y+f.height)) ? true : false; },
        
        contains : function(f) { return f.inside(this); },
        
        equal : function(f) { return ((f.x==this.x) && (f.y==this.y) && (f.width==this.width) && (f.height=this.height)) ? true : false; },
        
        almostEqual : function(f) { 
            var d1=Max(f.width, this.width)*0.18, d2=Max(f.height, this.height)*0.18;
            return ( Abs(this.x-f.x) <= d1 && Abs(this.y-f.y) <= d2 && Abs(this.width-f.width) <= d1 && Abs(this.height-f.height) <= d2 ) ? true : false; 
        },
        
        clone : function(f) {
            f=f || new HAAR.Feature();
            f.x=this.x; f.y=this.y; f.width=this.width; f.height=this.height; 
            f.index=this.index; f.area=this.area; f.isInside=this.isInside;
            return f;
        }
    };
    
    //
    //
    //
    // HAAR Detector Class (with the haar cascade data)
    HAAR.Detector = function(haardata, ParallelClass) {
        this.haardata = haardata;
        this.Ready = false;
        this.doCannyPruning=false;
        this.Canvas = null;
        this.ret=null;
        this.Selection=null;
        this.scaledSelection=null;
        this.objects=null;
        this.TimeInterval=null;
        this.DetectInterval=30;
        this.Ratio=0.5;
        this.ImageChanged=false;
        this.cannyLow=20;
        this.cannyHigh=100;
        this.Parallel= ParallelClass || false;
        this.onComplete = null;
    };
    
    HAAR.Detector.prototype = {

        haardata : null,
        objects : null,
        Selection : null,
        Ready : false,
        
        // set haardata, use same detector with cached data, to detect different feature
        cascade : function(haardata) { this.haardata=haardata; return this; },
    
        // set image for detector along with scaling (and an optional canvas, eg for nodejs)
        image : function(image, scale, canvas) {
            if (image)
            {
                this.Canvas = canvas || document.createElement('canvas');
                this.Ratio = (typeof scale == 'undefined') ? 0.5 : scale; this.Async = true; this.Ready = false;
                this.origWidth=image.width;  this.origHeight=image.height;
                this.width = this.Canvas.width = Round(this.Ratio * image.width); this.height = this.Canvas.height = Round(this.Ratio * image.height);
                this.Canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height, 0, 0, this.width, this.height);
                this.ImageChanged=true;
            }
            return this;
        },

        // detector set detection interval
        interval : function(it) { if (it>0) {this.DetectInterval = it;} return this; },
        
        // customize canny prunning thresholds for best results
        cannyThreshold : function(thres) {
            (thres && 'undefined'!=typeof(thres.low)) && (this.cannyLow=thres.low);
            (thres && 'undefined'!=typeof(thres.high)) && (this.cannyHigh=thres.high);
            return this;
        },
        
        // set custom detection region as selection
        selection : function(/* ..variable args here.. */) { 
            var args=Array.prototype.slice.call(arguments);
            if (1==args.length && 'auto'==args[0] || !args.length) this.Selection=null;
            else this.Selection=HAAR.Feature.prototype.data.apply(new HAAR.Feature(), args); 
            return this; 
        },
        
        // detector on complete callback
        complete : function(func) { this.onComplete = func; return this; },

        // Detector detect method to start detection
        detect : function(baseScale, scale_inc, increment, min_neighbors, doCannyPruning) {
            var self = this, 
                sizex = self.haardata.size1, sizey = self.haardata.size2, integralImg;
            
            if (!self.Selection) self.Selection = new HAAR.Feature(0, 0, self.origWidth, self.origHeight);
            self.Selection.x=('auto'==self.Selection.x) ? 0 : self.Selection.x;
            self.Selection.y=('auto'==self.Selection.y) ? 0 : self.Selection.y;
            self.Selection.width=('auto'==self.Selection.width) ? self.origWidth : self.Selection.width;
            self.Selection.height=('auto'==self.Selection.height) ? self.origHeight : self.Selection.height;
            self.scaledSelection=self.Selection.clone().scale(self.Ratio).round();
            
            baseScale = (typeof baseScale == 'undefined') ? 1.0 : baseScale;
            scale_inc = (typeof scale_inc == 'undefined') ? 1.25 : scale_inc;
            increment = (typeof increment == 'undefined') ? 0.1 : increment;
            min_neighbors = (typeof min_neighbors == 'undefined') ? 1 : min_neighbors;
            self.doCannyPruning = (typeof doCannyPruning == 'undefined') ? true : doCannyPruning;
            
            if (self.ImageChanged) // allow to use cached image data with same image/different selection
            {
                integralImg = integralImage(self.Canvas/*, self.scaledSelection*/);
                self.canny = (self.doCannyPruning) ? integralCanny(integralImg.gray, self.width, self.height/*, self.scaledSelection.width, self.scaledSelection.height*/) : null;
                self.integral=integralImg.integral; self.squares=integralImg.squares; integralImg=null;
            }
            self.ImageChanged=false;
            
            self.maxScale = Min(self.width/sizex, self.height/sizey); self.scale = baseScale; self.min_neighbors = min_neighbors; 
            self.scale_inc = scale_inc; self.increment = increment; self.Ready = false;
            
            if (self.Parallel && self.Parallel.isSupported())
            {
                var data=[], sc, i=0; 
                for (sc=baseScale; sc<=self.maxScale; sc*=scale_inc)  
                    data.push({
                        haardata : self.haardata,
                        width : self.width,
                        height : self.height,
                        scaledSelection : {x:self.scaledSelection.x, y:self.scaledSelection.y, width:self.scaledSelection.width, height:self.scaledSelection.height},
                        integral : self.integral,
                        squares : self.squares,
                        doCannyPruning : self.doCannyPruning,
                        canny : self.canny,
                        cannyLow : self.cannyLow,
                        cannyHigh : self.cannyHigh,
                        maxScale : self.maxScale,
                        min_neighbors : min_neighbors,
                        scale_inc : scale_inc,
                        increment : increment,
                        scale : sc, // current scale to check
                        i : i++ // serial ordering
                    });
                
                // needs parallel.js library (included)
                // parallelize the detection, using map-reduce
                // should also work in Nodejs (using child processes)
                new self.Parallel(data, {synchronous: false})
                    .require(byOrder, evalStage, detectParallel, mergeParallel)
                    .map(detectParallel).reduce(mergeParallel)
                    .then(function(results){detectEnd(self, results);})
                ;
            }
            else
            {
                // else detect asynchronously using fixed intervals
                self.ret = [];
                self.TimeInterval = setInterval(function() { detectAsync(self); }, self.DetectInterval);
            }
            return this;
        }
    };

})(this);