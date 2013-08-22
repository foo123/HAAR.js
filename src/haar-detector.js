/**
*
* HAAR.js Feature Detection Library based on Viola-Jones Haar Detection algorithm
* Port of jviolajones (Java) which is a port of openCV C++ Haar Detector
*
* Supports parallel "map-reduce" computation both in browser and nodejs using parallel.js library 
* https://github.com/adambom/parallel.js (included)
*
* version: 0.3.1
* https://github.com/foo123/HAAR.js
*
*
* @contributor Nikos M.  (http://nikos-web-development.netai.net/)
* @contributor maxired (https://github.com/maxired)
*
**/
(function(root) {
    var HAAR;

    // export using window object on browser, or export object on node,require
    if ('undefined' != typeof (module) && module.exports)  HAAR = module.exports;
    else if ('undefined' != typeof (exports) )  HAAR = exports;
    else  HAAR = root.HAAR = {};

    var // machine arrays substitute 
        Array32F = (typeof Float32Array !== "undefined") ? Float32Array : Array,
        Array64F = (typeof Float64Array !== "undefined") ? Float64Array : Array,
        Array8U = (typeof Uint8Array !== "undefined") ? Uint8Array : Array,
        Array16U = (typeof Uint16Array !== "undefined") ? Uint16Array : Array,
        Array32U = (typeof Uint32Array !== "undefined") ? Uint32Array : Array
    ;

    
    // Private methods for detection
    function computeGray(image) 
    {
        var data = image.getContext('2d').getImageData(0, 0, image.width, image.height),
            w = data.width, h = data.height, im = data.data,
            rm = 0.30, gm = 0.59, bm = 0.11, col, col2, i, j, pix, r, g, b, grayc, grayc2, 
            count=w*h, img = new Array32F(count), gray = new Array64F(count), squares = new Array64F(count)
            ;

        for(i = 0; i < w; i++) 
        {
            col = 0;  col2 = 0;
            for(j = 0; j < h; j++) 
            {
                ind = (j * w + i);   pix = ind * 4;
                red = im[pix];  green = im[pix + 1];  blue = im[pix + 2];
                grayc = (rm * red + gm * green + bm * blue);  grayc2 = grayc * grayc;
                col += grayc;  col2 += grayc2;
                img[ind] = grayc;
                gray[ind] = (i > 0 ? gray[i - 1 + j * w] : 0) + col;
                squares[ind] = (i > 0 ? squares[i - 1 + j * w] : 0) + col2;
            }
        }
        return {img:img, gray:gray, squares:squares};
    };

    function integralCanny(grayImage, w, h) 
    {
        var 
            i, j, sum, grad_x, grad_y, col, value,
            ind0, ind1, ind2, nd_1, ind_2,
            count=w*h, canny = new Array64F(count), grad = new Array64F(count)
        ;
        for(i = 2; i < w - 2; i++)
        {
            for(j = 2; j < h - 2; j++) 
            {
                ind0=j*w; ind1=ind0+w; ind2=ind1+w; ind_1=ind0-w; ind_2=ind_1-w;
                sum = 0;
                sum += 2 * grayImage[i - 2 + ind_2];
                sum += 4 * grayImage[i - 2 + ind_1];
                sum += 5 * grayImage[i - 2 + ind0];
                sum += 4 * grayImage[i - 2 + ind1];
                sum += 2 * grayImage[i - 2 + ind2];
                sum += 4 * grayImage[i - 1 + ind_2];
                sum += 9 * grayImage[i - 1 + ind_1];
                sum += 12 * grayImage[i - 1 + ind0];
                sum += 9 * grayImage[i - 1 + ind1];
                sum += 4 * grayImage[i - 1 + ind2];
                sum += 5 * grayImage[i + 0 + ind_2];
                sum += 12 * grayImage[i + 0 + ind_1];
                sum += 15 * grayImage[i + 0 + ind0];
                sum += 12 * grayImage[i + 0 + ind1];
                sum += 5 * grayImage[i + 0 + ind2];
                sum += 4 * grayImage[i + 1 + ind_2];
                sum += 9 * grayImage[i + 1 + ind_1];
                sum += 12 * grayImage[i + 1 + ind0];
                sum += 9 * grayImage[i + 1 + ind1];
                sum += 4 * grayImage[i + 1 + ind2];
                sum += 2 * grayImage[i + 2 + ind_2];
                sum += 4 * grayImage[i + 2 + ind_1];
                sum += 5 * grayImage[i + 2 + ind0];
                sum += 4 * grayImage[i + 2 + ind1];
                sum += 2 * grayImage[i + 2 + ind2];

                canny[i + ind0] = sum*0.0062893081761006;  // 1.0 / 159;
            }
        }
        
        for(i = 1; i < w - 1; i++)
        {
            for(j = 1; j < h - 1; j++) 
            {
                ind0=j*w; ind1=ind0+w; ind_1=ind0-w;
                grad_x = -canny[i - 1 + ind_1] + canny[i + 1 + ind_1] - 2 * canny[i - 1 + ind0] + 2 * canny[i + 1 + ind0] - canny[i - 1 + ind1] + canny[i + 1 + ind1];
                grad_y = canny[i - 1 + ind_1] + 2 * canny[i + ind_1] + canny[i + 1 + ind_1] - canny[i - 1 + ind1] - 2 * canny[i + ind1] - canny[i + 1 + ind1];
                grad[i + ind0] = Math.abs(grad_x) + Math.abs(grad_y);
            }
        }
        
        for(i = 0; i < w; i++) 
        {
            col = 0;
            for(j = 0; j < h; j++) 
            {
                ind0=j*w; value = grad[i + ind0];  col += value;
                canny[i + ind0] = (i > 0 ? canny[i - 1 + ind0] : 0) + col;
            }
        }
        return canny;
    };

    function merge(rects, min_neighbors, ratio) 
    {
        var retlen=rects.length, ret = new Array(retlen), nb_classes = 0, retour=[], 
            found=false, neighbors, rect, r, i, j, n;
        
        for(i = 0; i < retlen; i++)  ret[i] = 0;
        for(i = 0; i < retlen; i++) 
        {
            found = false;
            for(j = 0; j < i; j++) 
            {
                if(equals(rects[j], rects[i])) 
                {
                    found = true;
                    ret[i] = ret[j];
                }
            }
            
            if(!found) 
            {
                ret[i] = nb_classes;
                nb_classes++;
            }
        }
        
        neighbors = new Array(nb_classes);  rect = new Array(nb_classes);
        for(i = 0; i < nb_classes; i++) 
        {
            neighbors[i] = 0;
            rect[i] = {
                x: 0,  y: 0,
                width: 0, height: 0
            };
        }
        for(i = 0; i < retlen; i++) 
        {
            neighbors[ret[i]]++;
            rect[ret[i]].x += rects[i].x;
            rect[ret[i]].y += rects[i].y;
            rect[ret[i]].height += rects[i].height;
            rect[ret[i]].width += rects[i].width;
        }
        for(i = 0; i < nb_classes; i++) 
        {
            n = neighbors[i];
            if(n >= min_neighbors) 
            {
                r = {
                    x: 0, y: 0,
                    width: 0, height: 0
                };
                r.x = (rect[i].x * 2 + n) / (2 * n);
                r.y = (rect[i].y * 2 + n) / (2 * n);
                r.width = (rect[i].width * 2 + n) / (2 * n);
                r.height = (rect[i].height * 2 + n) / (2 * n);
                retour.push(r);
            }
        }
        if(ratio != 1) // scaled down, scale them back up
        {
            var rr; ratio = 1.0 / ratio;
            for(i = 0; i < retour.length; i++) 
            {
                rr = retour[i];
                retour[i] = {
                    x: rr.x * ratio, y: rr.y * ratio,
                    width: rr.width * ratio,  height: rr.height * ratio
                };
            }
        }
        return retour;
    };

    function equals(r1, r2) 
    {
        var distance = Math.max(Math.floor(r1.width * 0.2), Math.floor(r2.width * 0.2)) ;

        if(r2.x <= r1.x + distance && r2.x >= r1.x - distance && r2.y <= r1.y + distance && r2.y >= r1.y - distance && r2.width <= Math.floor(r1.width * 1.2) && Math.floor(r2.width * 1.2) >= r1.width) return true;
        if(r1.x >= r2.x && r1.x + r1.width <= r2.x + r2.width && r1.y >= r2.y && r1.y + r1.height <= r2.y + r2.height) return true;
        return false;
    };
    
    // used for parallel "map" computation
    function detectParallel(self) 
    {
        var scale=self.scale, sizex = self.haardata.size1, sizey = self.haardata.size2,
            ret=[], w = self.width, h = self.height, step, size, edges_density, d, ind1, ind2, pass,
            i, j, s, il, jl, sl;
        
        if(scale <= self.maxScale) 
        {
            step = Math.floor(scale * sizex * self.increment); size = Math.floor(scale * sizex);
            for(i = 0, il=w-size; i < il; i += step) 
            {
                for(j = 0, jl=h-size; j < jl; j += step) 
                {
                    if(self.doCannyPruning) 
                    {
                        ind1=i + (j + size) * w; ind2=i + j * w;
                        edges_density = self.canny[ind1 + size] + self.canny[ind2] - self.canny[ind1] - self.canny[ind2 + size];
                        d = edges_density / size / size;
                        if(d < 20 || d > 100) continue;
                    }
                    pass = true;
                    for(s = 0, sl=self.haardata.stages.length; s < sl; s++) 
                    {
                        pass = evalStage(self, s, i, j, scale);
                        if(pass == false) break;
                    }
                    if(pass) ret.push({
                            i: self.i,
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
        if (d[1].length) d[0]=d[0].concat(d[1]).sort(function(a, b){return a.i-b.i;}); 
        return d[0]; 
    };
    
    // used for asynchronous computation using fixed intervals
    function detectAsync(self) 
    {
        var sizex = self.haardata.size1, sizey = self.haardata.size2,
            w = self.width, h = self.height, step, size, edges_density, d, ind1, ind2, pass,
            i, j, s, il, jl, sl;
        
        if(self.scale <= self.maxScale) 
        {
            step = Math.floor(self.scale * sizex * self.increment); size = Math.floor(self.scale * sizex);
            for(i = 0, il=w-size; i < il; i += step) 
            {
                for(j = 0, jl=h-size; j < jl; j += step) 
                {
                    if(self.doCannyPruning) 
                    {
                        ind1=i + (j + size) * w; ind2=i + j * w;
                        edges_density = self.canny[ind1 + size] + self.canny[ind2] - self.canny[ind1] - self.canny[ind2 + size];
                        d = edges_density / size / size;
                        if(d < 20 || d > 100) continue;
                    }
                    pass = true;
                    for(s = 0, sl=self.haardata.stages.length; s < sl; s++) 
                    {
                        pass = evalStage(self, s, i, j, self.scale);
                        if(pass == false) break;
                    }
                    if(pass) self.ret.push({
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
        console.log(rects);
        self.objects = merge(rects, self.min_neighbors, self.Ratio); self.Ready = true;
        if(self.Async && self.onComplete) self.onComplete.call(self);
    };
    
    // Viola-Jones HAAR-Stage evaluator
    function evalStage(self, s, i, j, scale) 
    {
        var sum = 0, threshold = self.haardata.stages[s].thres, trees = self.haardata.stages[s].trees, t, tl = trees.length;
        for(t = 0; t < tl; t++) { sum += evalTree(self, s, t, i, j, scale); }
        return (sum > threshold);
    };

    // Viola-Jones HAAR-Tree evaluator
    function evalTree(self, s, t, i, j, scale) 
    {
        var features = self.haardata.stages[s].trees[t].feats, cur_node_ind = 0, cur_node = features[cur_node_ind];
        while(true) 
        {
            var where = getLeftOrRight(self, s, t, cur_node_ind, i, j, scale);
            if(where == 0) 
            {
                if(cur_node.has_l) {  return cur_node.l_val; } 
                else 
                {
                    cur_node_ind = cur_node.l_node;
                    cur_node = features[cur_node_ind];
                }
            } 
            else 
            {
                if(cur_node.has_r) {  return cur_node.r_val; } 
                else 
                {
                    cur_node_ind = cur_node.r_node;
                    cur_node = features[cur_node_ind];
                }
            }
        }
    };

    // Viola-Jones HAAR-Leaf evaluator
    function getLeftOrRight(self, s, t, f, i, j, scale) 
    {
        var sizex = self.haardata.size1, sizey = self.haardata.size2,
            w = Math.floor(scale * sizex), h = Math.floor(scale * sizey),
            ww = self.width, hh = self.height, inv_area = 1.0 /(w*h), ind=j*ww, indh=(j+h)*ww,
            grayImage = self.gray, squares = self.squares,
            total_x = grayImage[i + w + indh] + grayImage[i + ind] - grayImage[i + indh] - grayImage[i + w + ind],
            total_x2 = squares[i + w + indh] + squares[i + ind] - squares[i + indh] - squares[i + w + ind],
            moy = total_x * inv_area, vnorm = total_x2 * inv_area - moy * moy,
            feature = self.haardata.stages[s].trees[t].feats[f], rects = feature.rects, nb_rects = rects.length, threshold = feature.thres,
            rect_sum = 0, rect_sum2, k, r, rx1, rx2, ry1, ry2
            ;
        
        vnorm = (vnorm > 1) ? Math.sqrt(vnorm) : 1;
        for(k = 0; k < nb_rects; k++) 
        {
            r = rects[k];
            rx1 = i + Math.floor(scale * r.x1); rx2 = i + Math.floor(scale * (r.x1 + r.y1));
            ry1 = j + Math.floor(scale * r.x2); ry2 = j + Math.floor(scale * (r.x2 + r.y2));
            rect_sum += Math.floor((grayImage[rx2 + ry2 * ww] - grayImage[rx1 + ry2 * ww] - grayImage[rx2 + ry1 * ww] + grayImage[rx1 + ry1 * ww]) * r.f);
        }
        rect_sum2 = rect_sum * inv_area;
        return(rect_sum2 < threshold * vnorm) ? 0 : 1;
    };
    
    //
    //
    //
    // HAAR Detector Class (with the haar cascade data)
    HAAR.Detector = function(haardata, Parallel) {
        this.haardata = haardata;
        this.Async = true;
        this.Ready = false;
        this.doCannyPruning=false;
        this.Canvas = null;
        this.ret=null;
        this.TimeInterval=null;
        this.DetectInterval=30;
        this.Ratio=0.5;
        this.Parallel= Parallel || false;
        this.onComplete = null;
    };

    HAAR.Detector.prototype = {

        // set image for detector along with scaling (and an optional canvas, eg for nodejs)
        image : function(image, scale, canvas) {
            if (image)
            {
                this.Canvas = canvas || document.createElement('canvas');
                this.Ratio = (typeof scale == 'undefined') ? 0.5 : scale; this.Async = true; this.Ready = false;
                this.width = this.Canvas.width = Math.floor(this.Ratio * image.width); this.height = this.Canvas.height = Math.floor(this.Ratio * image.height);
                this.Canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height, 0, 0, this.Canvas.width, this.Canvas.height);
            }
            return this;
        },

        // detector set detection interval
        interval : function(it) {
            if (it>0) {this.DetectInterval = it;} return this;
        },
        
        // detector on complete callback
        complete : function(func) {
            this.onComplete = func; return this;
        },

        // Detector detect method to start detection
        detect : function(baseScale, scale_inc, increment, min_neighbors, doCannyPruning) {
            var self = this, 
                sizex = self.haardata.size1, sizey = self.haardata.size2, grayData;
            
            self.doCannyPruning = (typeof doCannyPruning == 'undefined') ? true : doCannyPruning;
            grayData = computeGray(self.Canvas); self.gray=grayData.gray; self.squares=grayData.squares;
            self.canny = (self.doCannyPruning) ? integralCanny(grayData.img, self.width, self.height) : null; grayData=null;
            
            self.maxScale = Math.min(self.width/sizex, self.height/sizey); self.scale = baseScale; self.min_neighbors = min_neighbors; 
            self.scale_inc = scale_inc; self.increment = increment; self.Ready = false;
            
            if (self.Parallel)
            {
                var data=[], sc, i=0; 
                for (sc=baseScale; sc<=self.maxScale; sc*=scale_inc)  
                    data.push({
                        haardata : self.haardata,
                        width : self.width,
                        height : self.height,
                        gray : self.gray,
                        squares : self.squares,
                        doCannyPruning : self.doCannyPruning,
                        canny : self.canny,
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
                new self.Parallel(data)
                    .require(evalStage, evalTree, getLeftOrRight, detectParallel, mergeParallel)
                    .map(detectParallel).reduce(mergeParallel)
                    .then(function(results){detectEnd(self, results);})
                ;
            }
            else//if (this.async)
            {
                // else detect asynchronously using fixed intervals
                self.ret = [];
                self.TimeInterval = setInterval(function() { detectAsync(self); }, self.DetectInterval);
            }
            return this;
        }
    }

})(this);