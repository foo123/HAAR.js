/**
*
* HAAR.js Feature Detection Library based on Viola-Jones Haar Detection algorithm
* Port of jviolajones (Java) which is a port of openCV C++ Haar Detector
*
* version: 0.2.1
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

    // Detector Class with the haar cascade data
    HAAR.Detector = function(haardata) {
        this.haardata = haardata;
        this.async = true;
        this.onComplete = null;
        this.Image = null;
        this.canvas = null;
        this._interval=30;
    };

    HAAR.Detector.prototype = {

        // set image for detector along with scaling
        image : function(image, scale, canvas) {
            this.Image = image;   this.canvas = canvas || document.createElement('canvas');
            if(typeof scale == 'undefined') scale = 0.5;  this.ratio = scale;   this.async = true;
            this.canvas.width = scale * image.width;   this.canvas.height = scale * image.height;
            this.canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height, 0, 0, scale * image.width, scale * image.height);
            return this;
        },

        // detector on complete callback
        complete : function(func) {
            this.onComplete = func;   return this;
        },

        // detector set detection interval
        interval : function(it) {
            this._interval = it;   return this;
        },
        
        // Detector detect method to start detection
        detect : function(baseScale, scale_inc, increment, min_neighbors, doCannyPruning) {
            if(typeof doCannyPruning == 'undefined') doCannyPruning = true;
            this.doCannyPruning = doCannyPruning;
            this.ret = [];
            var sizex = this.haardata.size1, sizey = this.haardata.size2;
            this.computeGray(this.canvas);
            var w = this.width, h = this.height;
            this.maxScale = Math.min((w) / sizex, (h) / sizey);
            this.canny = null;
            if(this.doCannyPruning) this.canny = this.IntegralCanny(this.img);
            this.scale = baseScale;   this.min_neighbors = min_neighbors;
            this.scale_inc = scale_inc;  this.increment = increment;   this.ready = false;
            var self = this;
            //if (this.async)
            this._timeinterval = setInterval(function() {  self.detectAsync()  }, this._interval);
        },


        // Private functions for detection
        computeGray : function(image) {
            var 
                data = image.getContext('2d').getImageData(0, 0, image.width, image.height),
                w = data.width, h = data.height, col, col2, i, j, pix, r, g, b, grayc, grayc2, im = data.data,
                rm = 0.30, gm = 0.59, bm = 0.11, count=w*h;

            this.width = w;  this.height = h;
            this.gray = new Array64F(count); this.img = new Array32F(count);  this.squares = new Array64F(count);

            for(i = 0; i < w; i++) 
            {
                col = 0;  col2 = 0;
                for(j = 0; j < h; j++) 
                {
                    ind = (j * w + i);   pix = ind * 4;
                    red = im[pix];  green = im[pix + 1];  blue = im[pix + 2];
                    grayc = (rm * red + gm * green + bm * blue);  grayc2 = grayc * grayc;
                    col += grayc;  col2 += grayc2;
                    this.img[ind] = grayc;
                    this.gray[ind] = (i > 0 ? this.gray[i - 1 + j * w] : 0) + col;
                    this.squares[ind] = (i > 0 ? this.squares[i - 1 + j * w] : 0) + col2;
                }
            }
        },

        detectAsync : function() {
            var sizex = this.haardata.size1, sizey = this.haardata.size2;
            var w = this.width, h = this.height, step, size, edges_density, d, ind1, ind2, pass;
            if(this.scale <= this.maxScale) 
            {
                step = Math.floor(this.scale * sizex * this.increment); size = Math.floor(this.scale * sizex);
                for(var i = 0, il=w-size; i < il; i += step) 
                {
                    for(var j = 0, jl=h-size; j < jl; j += step) 
                    {
                        if(this.doCannyPruning) 
                        {
                            ind1=i + (j + size) * w; ind2=i + j * w;
                            edges_density = this.canny[ind1 + size] + this.canny[ind2] - this.canny[ind1] - this.canny[ind2 + size];
                            d = edges_density / size / size;
                            if(d < 20 || d > 100) continue;
                        }
                        pass = true;
                        for(var s = 0, sl=this.haardata.stages.length; s < sl; s++) 
                        {
                            pass = this.evalStage(s, i, j, this.scale);
                            if(pass == false) break;
                        }
                        if(pass) this.ret.push({
                                x: i, y: j,
                                width: size,  height: size
                            });
                    }
                }
                this.scale *= this.scale_inc;
            } 
            else 
            {
                clearInterval(this._timeinterval);
                this.objects = this.merge(this.ret, this.min_neighbors);
                this.ready = true;
                if(this.async && this.onComplete) this.onComplete.call(this);
            }
        },

        IntegralCanny : function(grayImage) {
            var 
                i, j, sum, w = this.width, h = this.height, grad_x, grad_y, col, value,
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

                    canny[i + ind0] = sum / 159;
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
        },

        merge : function(rects, min_neighbors) {
            var retlen=rects.length, ret = new Array(retlen), nb_classes = 0, retour=[], found=false, neighbors, rect;
            for(var r = 0; r < retlen; r++)  ret[r] = 0;
            for(var i = 0; i < retlen; i++) 
            {
                found = false;
                for(var j = 0; j < i; j++) 
                {
                    if(this.equals(rects[j], rects[i])) 
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
            for(var i = 0; i < nb_classes; i++) 
            {
                neighbors[i] = 0;
                rect[i] = {
                    x: 0,  y: 0,
                    width: 0, height: 0
                };
            }
            for(var i = 0; i < rects.length; i++) 
            {
                neighbors[ret[i]]++;
                rect[ret[i]].x += rects[i].x;
                rect[ret[i]].y += rects[i].y;
                rect[ret[i]].height += rects[i].height;
                rect[ret[i]].width += rects[i].width;
            }
            for(var i = 0; i < nb_classes; i++) 
            {
                var n = neighbors[i];
                if(n >= min_neighbors) 
                {
                    var r = {
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
            if(this.ratio != 1) // scaled down, scale them back up
            {
                var ratio = 1.0 / this.ratio;
                for(var i = 0; i < retour.length; i++) 
                {
                    var rr = retour[i];
                    retour[i] = {
                        x: rr.x * ratio, y: rr.y * ratio,
                        width: rr.width * ratio,  height: rr.height * ratio
                    };
                }
            }
            return retour;
        },

        equals : function(r1, r2) {
            var distance = Math.max(Math.floor(r1.width * 0.2), Math.floor(r2.width * 0.2)) ;

            if(r2.x <= r1.x + distance && r2.x >= r1.x - distance && r2.y <= r1.y + distance && r2.y >= r1.y - distance && r2.width <= Math.floor(r1.width * 1.2) && Math.floor(r2.width * 1.2) >= r1.width) return true;
            if(r1.x >= r2.x && r1.x + r1.width <= r2.x + r2.width && r1.y >= r2.y && r1.y + r1.height <= r2.y + r2.height) return true;
            return false;
        },

        evalStage : function(s, i, j, scale) {
            var sum = 0, threshold = this.haardata.stages[s].thres, trees = this.haardata.stages[s].trees, t, tl = trees.length;
            for(t = 0; t < tl; t++) { sum += this.evalTree(s, t, i, j, scale); }
            return (sum > threshold);
        },

        evalTree : function(s, t, i, j, scale) {
            var features = this.haardata.stages[s].trees[t].feats, cur_node_ind = 0, cur_node = features[cur_node_ind];
            while(true) 
            {
                var where = this.getLeftOrRight(s, t, cur_node_ind, i, j, scale);
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
        },

        getLeftOrRight : function(s, t, f, i, j, scale) {
            var sizex = this.haardata.size1, sizey = this.haardata.size2;
            var w = Math.floor(scale * sizex), h = Math.floor(scale * sizey);
            var ww = this.width, hh = this.height, inv_area = 1.0 /(w*h), ind=j*ww, indh=(j+h)*ww;
            var grayImage = this.gray, squares = this.squares;
            var total_x = grayImage[i + w + indh] + grayImage[i + ind] - grayImage[i + indh] - grayImage[i + w + ind];
            var total_x2 = squares[i + w + indh] + squares[i + ind] - squares[i + indh] - squares[i + w + ind];
            var moy = total_x * inv_area, vnorm = total_x2 * inv_area - moy * moy;
            var feature = this.haardata.stages[s].trees[t].feats[f], rects = feature.rects, nb_rects = rects.length, threshold = feature.thres;
            vnorm = (vnorm > 1) ? Math.sqrt(vnorm) : 1;

            var rect_sum = 0;
            for(var k = 0; k < nb_rects; k++) 
            {
                var r = rects[k];
                var rx1 = i + Math.floor(scale * r.x1);
                var rx2 = i + Math.floor(scale * (r.x1 + r.y1));
                var ry1 = j + Math.floor(scale * r.x2);
                var ry2 = j + Math.floor(scale * (r.x2 + r.y2));
                rect_sum += Math.floor((grayImage[rx2 + ry2 * ww] - grayImage[rx1 + ry2 * ww] - grayImage[rx2 + ry1 * ww] + grayImage[rx1 + ry1 * ww]) * r.f);
            }
            var rect_sum2 = rect_sum * inv_area;
            return(rect_sum2 < threshold * vnorm) ? 0 : 1;
        }
    }

})(this);