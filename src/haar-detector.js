/**
*
* HAAR.js Feature Detection Library based on Viola-Jones Haar Detection algorithm
* port of jViolaJones  for Java (http://code.google.com/p/jviolajones/) to JavaScript and Node
*
* https://github.com/foo123/HAAR.js
* @version: 0.4.4
*
* Supports parallel "map-reduce" computation both in browser and node using parallel.js library 
* https://github.com/adambom/parallel.js (included)
*
**/
(function(root, undef) {
    // the export object
    var HAAR;
    var VERSION = "0.4.4";
    var Detector, Feature;

    // export using window object on browser, or export object on node,require
    if ('undefined' != typeof (module) && module.exports)  HAAR = module.exports;
    else if ('undefined' != typeof (exports) )  HAAR = exports;
    else  HAAR = this.HAAR = {};
    
    HAAR.VERSION = VERSION;
    
    
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
        Abs=Math.abs, Max=Math.max, Min=Math.min, Floor=Math.floor, Round=Math.round, Sqrt=Math.sqrt,
        slice=Array.prototype.slice
    ;

    
    //
    // Private methods for detection
    //
    
    // compute grayscale image, integral image (SAT) and squares image (Viola-Jones)
    function integralImage(im, w, h/*, selection*/) 
    {
        var imLen=im.length, count=w*h
            , sum, sum2, i, j, k, y, g
            , gray = new Array8U(count)
            // Viola-Jones
            , integral = new Array32F(count), squares = new Array32F(count)
            // Lienhart et al. extension using tilted features
            , tilted = new Array32F(count)
            ;
        
        // first row
        j=0; i=0; sum=sum2=0; 
        while (j<w)
        {
            // use fixed-point gray-scale transform, close to openCV transform
            // https://github.com/mtschirs/js-objectdetect/issues/3
            // 0,29901123046875  0,58697509765625  0,114013671875 with roundoff
            g = ((4899 * im[i] + 9617 * im[i + 1] + 1868 * im[i + 2]) + 8192) >>> 14;
            
            g &= 255;  
            sum += g;  
            sum2 += /*(*/(g*g); //&0xFFFFFFFF) >>> 0;
            
            // SAT(–1,y)=SAT(x,–1)=SAT(–1,–1)=0
            // SAT(x,y)=SAT(x,y–1)+SAT(x–1,y)+I(x,y)–SAT(x–1,y–1)  <-- integral image
            
            // RSAT(–1,y)=RSAT(x,–1)=RSAT(x,–2)=0 RSAT(–1,–1)=RSAT(–1,–2)=0
            // RSAT(x,y)=RSAT(x–1,y–1)+RSAT(x+1,y–1)–RSAT(x,y–2)+I(x,y)+I(x,y–1) <-- rotated(tilted) integral image at 45deg
            gray[j] = g;
            integral[j] = sum;
            squares[j] = sum2;
            tilted[j] = g;
            
            j++; i+=4;
        }
        // other rows
        k=0; y=1; j=w; i=(w<<2); sum=sum2=0; 
        while (i<imLen)
        {
            // use fixed-point gray-scale transform, close to openCV transform
            // https://github.com/mtschirs/js-objectdetect/issues/3
            // 0,29901123046875  0,58697509765625  0,114013671875 with roundoff
            g = ((4899 * im[i] + 9617 * im[i + 1] + 1868 * im[i + 2]) + 8192) >>> 14;
            
            g &= 255;  
            sum += g;  
            sum2 += /*(*/(g*g); //&0xFFFFFFFF) >>> 0;
            
            // SAT(–1,y)=SAT(x,–1)=SAT(–1,–1)=0
            // SAT(x,y)=SAT(x,y–1)+SAT(x–1,y)+I(x,y)–SAT(x–1,y–1)  <-- integral image
            
            // RSAT(–1,y)=RSAT(x,–1)=RSAT(x,–2)=0 RSAT(–1,–1)=RSAT(–1,–2)=0
            // RSAT(x,y)=RSAT(x–1,y–1)+RSAT(x+1,y–1)–RSAT(x,y–2)+I(x,y)+I(x,y–1) <-- rotated(tilted) integral image at 45deg
            gray[j] = g;
            integral[j] = integral[j-w] + sum;
            squares[j] = squares[j-w] + sum2;
            tilted[j] = tilted[j+1-w] + (g + gray[j-w]) + ((y>1) ? tilted[j-w-w] : 0) + ((k>0) ? tilted[j-1-w] : 0);
            
            k++; j++; i+=4; if (k>=w) { k=0; y++; sum=sum2=0; }
        }
        
        return {gray:gray, integral:integral, squares:squares, tilted:tilted};
    }

    // compute Canny edges on gray-scale image to speed up detection if possible
    function integralCanny(gray, w, h) 
    {
        var i, j, k, sum, grad_x, grad_y,
            ind0, ind1, ind2, ind_1, ind_2, count=gray.length, 
            lowpass = new Array8U(count), canny = new Array32F(count)
        ;
        
        // first, second rows, last, second-to-last rows
        for (i=0; i<w; i++)
        {
            lowpass[i]=0;
            lowpass[i+w]=0;
            lowpass[i+count-w]=0;
            lowpass[i+count-w-w]=0;
            
            canny[i]=0;
            canny[i+count-w]=0;
        }
        // first, second columns, last, second-to-last columns
        for (j=0, k=0; j<h; j++, k+=w)
        {
            lowpass[0+k]=0;
            lowpass[1+k]=0;
            lowpass[w-1+k]=0;
            lowpass[w-2+k]=0;
            
            canny[0+k]=0;
            canny[w-1+k]=0;
        }
        // gauss lowpass
        for (i=2; i<w-2; i++)
        {
            sum=0;
            for (j=2, k=(w<<1); j<h-2; j++, k+=w) 
            {
                ind0 = i+k;
                ind1 = ind0+w; 
                ind2 = ind1+w; 
                ind_1 = ind0-w; 
                ind_2 = ind_1-w; 
                
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
                sum = /*(*/(0
                        + (gray[ind_2-2] << 1) + (gray[ind_1-2] << 2) + (gray[ind0-2] << 2) + (gray[ind0-2])
                        + (gray[ind1-2] << 2) + (gray[ind2-2] << 1) + (gray[ind_2-1] << 2) + (gray[ind_1-1] << 3)
                        + (gray[ind_1-1]) + (gray[ind0-1] << 4) - (gray[ind0-1] << 2) + (gray[ind1-1] << 3)
                        + (gray[ind1-1]) + (gray[ind2-1] << 2) + (gray[ind_2] << 2) + (gray[ind_2]) + (gray[ind_1] << 4)
                        - (gray[ind_1] << 2) + (gray[ind0] << 4) - (gray[ind0]) + (gray[ind1] << 4) - (gray[ind1] << 2)
                        + (gray[ind2] << 2) + (gray[ind2]) + (gray[ind_2+1] << 2) + (gray[ind_1+1] << 3) + (gray[ind_1+1])
                        + (gray[ind0+1] << 4) - (gray[ind0+1] << 2) + (gray[ind1+1] << 3) + (gray[ind1+1]) + (gray[ind2+1] << 2)
                        + (gray[ind_2+2] << 1) + (gray[ind_1+2] << 2) + (gray[ind0+2] << 2) + (gray[ind0+2])
                        + (gray[ind1+2] << 2) + (gray[ind2+2] << 1)
                        );// &0xFFFFFFFF ) >>> 0;
                
                /*
                Original Code
                
                grad[ind0] = sum/159 = sum*0.0062893081761006;
                */
                
                // sum of coefficients = 159, factor = 1/159 = 0,0062893081761006
                // 2^14 = 16384, 16384/2 = 8192
                // 2^14/159 = 103,0440251572322304 =~ 103 +/- 2^13
                //grad[ind0] = (( ((sum << 6)&0xFFFFFFFF)>>>0 + ((sum << 5)&0xFFFFFFFF)>>>0 + ((sum << 3)&0xFFFFFFFF)>>>0 + ((8192-sum)&0xFFFFFFFF)>>>0 ) >>> 14) >>> 0;
                lowpass[ind0] = ((((103*sum + 8192)&0xFFFFFFFF) >>> 14)&0xFF) >>> 0;
            }
        }
        
        // sobel gradient
        for (i=1; i<w-1 ; i++)
        {
            //sum=0; 
            for (j=1, k=w; j<h-1; j++, k+=w) 
            {
                // compute coords using simple add/subtract arithmetic (faster)
                ind0=k+i;
                ind1=ind0+w; 
                ind_1=ind0-w; 
                
                grad_x = ((0
                        - lowpass[ind_1-1] 
                        + lowpass[ind_1+1] 
                        - lowpass[ind0-1] - lowpass[ind0-1]
                        + lowpass[ind0+1] + lowpass[ind0+1]
                        - lowpass[ind1-1] 
                        + lowpass[ind1+1]
                        ))//&0xFFFFFFFF
                        ;
                grad_y = ((0
                        + lowpass[ind_1-1] 
                        + lowpass[ind_1] + lowpass[ind_1]
                        + lowpass[ind_1+1] 
                        - lowpass[ind1-1] 
                        - lowpass[ind1] - lowpass[ind1]
                        - lowpass[ind1+1]
                        ))//&0xFFFFFFFF
                        ;
                
                //sum += (Abs(grad_x) + Abs(grad_y))&0xFFFFFFFF;
                canny[ind0] = ( Abs(grad_x) + Abs(grad_y) );//&0xFFFFFFFF;
           }
        }
        
        // integral canny
        // first row
        i=0; sum=0;
        while (i<w)
        {
            sum += canny[i];
            canny[i] = sum;//&0xFFFFFFFF;
            i++;
        }
        // other rows
        i=w; k=0; sum=0;
        while (i<count)
        {
            sum += canny[i];
            canny[i] = (canny[i-w] + sum);//&0xFFFFFFFF;
            i++; k++; if (k>=w) { k=0; sum=0; }
        }
        
        return canny;
    }

    // merge the detected features if needed
    function merge(rects, min_neighbors, ratio, selection) 
    {
        var rlen=rects.length, ref = new Array(rlen), feats=[], 
            nb_classes = 0, neighbors, r, found=false, i, j, n, t, ri;
        
        // original code
        // find number of neighbour classes
        for (i = 0; i < rlen; i++) ref[i] = 0;
        for (i = 0; i < rlen; i++)
        {
            found = false;
            for (j = 0; j < i; j++)
            {
                if (rects[j].almostEqual(rects[i]))
                {
                    found = true;
                    ref[i] = ref[j];
                }
            }
            
            if (!found)
            {
                ref[i] = nb_classes;
                nb_classes++;
            }
        }        
        
        // merge neighbor classes
        neighbors = new Array(nb_classes);  r = new Array(nb_classes);
        for (i = 0; i < nb_classes; i++) { neighbors[i] = 0;  r[i] = new Feature(); }
        for (i = 0; i < rlen; i++) { ri=ref[i]; neighbors[ri]++; r[ri].add(rects[i]); }
        for (i = 0; i < nb_classes; i++) 
        {
            n = neighbors[i];
            if (n >= min_neighbors) 
            {
                t=1/(n + n);
                ri = new Feature(
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
    }
    
    // area used as compare func for sorting
    function byArea(a, b) { return a.area-b.area; }
    
    // serial index used as compare func for sorting
    function byOrder(a, b) { return a.index-b.index; }
    
    /*
    splice subarray (not used)
    http://stackoverflow.com/questions/1348178/a-better-way-to-splice-an-array-into-an-array-in-javascript
    Array.prototype.splice.apply(d[0], [prev, 0].concat(d[1])); 
    */
    
    // used for parallel "reduce" computation
    function mergeSteps(d) 
    { 
        // concat and sort according to serial ordering
        if (d[1].length) d[0]=d[0].concat(d[1]).sort(byOrder); 
        return d[0]; 
    }
    
    // used for parallel and/or asynchronous computation
    function detectSingleStep(self) 
    {
        var Sqrt = Sqrt || Math.sqrt, ret = [],
            haar = self.haardata, scaledSelection = self.scaledSelection,
            w = scaledSelection.width, h = scaledSelection.height, imArea=w*h, imArea1=imArea-1,
            sizex = haar.size1, sizey = haar.size2, xstep, ystep, xsize, ysize,
            startx = scaledSelection.x, starty = scaledSelection.y, startty,
            x, y, ty, tyw, tys, sl = haar.stages.length,
            p0, p1, p2, p3,
            bx1, bx2, by1, by2,
            swh, inv_area, total_x, total_x2, vnorm,
            edges_density, pass, cL = self.cannyLow, cH = self.cannyHigh, 
            
            stage, threshold, trees, tl,
            canny = self.canny, integral = self.integral, squares = self.squares, tilted = self.tilted,
            t, cur_node_ind, where, features, feature, rects, nb_rects, thresholdf, 
            rect_sum, kr, r, x1, y1, x2, y2, x3, y3, x4, y4, rw, rh, yw, yh, sum, 
            scale = self.scale, increment = self.increment, index = self.i||0, doCanny = self.doCannyPruning
            
        ;
        
        bx1=0; bx2=w-1; by1=0; by2=imArea-w;
        
        xsize = ~~(scale * sizex); 
        xstep = ~~(xsize * increment); 
        ysize = ~~(scale * sizey); 
        ystep = ~~(ysize * increment);
        //ysize = xsize; ystep = xstep;
        tyw = ysize*w; 
        tys = ystep*w; 
        startty = starty*tys; 
        xl = w-xsize; 
        yl = h-ysize;
        swh = xsize*ysize; 
        inv_area = 1.0/swh;
        
        for (y=starty, ty=startty; y<yl; y+=ystep, ty+=tys) 
        {
            for (x=startx; x<xl; x+=xstep) 
            {
                p0 = x-1 + ty-w;    p1 = p0 + xsize;
                p2 = p0 + tyw;    p3 = p2 + xsize;
                
                // clamp
                p0 = (p0<0) ? 0 : (p0>imArea1) ? imArea1 : p0;
                p1 = (p1<0) ? 0 : (p1>imArea1) ? imArea1 : p1;
                p2 = (p2<0) ? 0 : (p2>imArea1) ? imArea1 : p2;
                p3 = (p3<0) ? 0 : (p3>imArea1) ? imArea1 : p3;
                
                if (doCanny) 
                {
                    // avoid overflow
                    edges_density = inv_area * (canny[p3] - canny[p2] - canny[p1] + canny[p0]);
                    if (edges_density < cL || edges_density > cH) continue;
                }
                
                // pre-compute some values for speed
                
                // avoid overflow
                total_x = inv_area * (integral[p3] - integral[p2] - integral[p1] + integral[p0]);
                // avoid overflow
                total_x2 = inv_area * (squares[p3] - squares[p2] - squares[p1] + squares[p0]);
                
                vnorm = total_x2 - total_x * total_x;
                vnorm = (vnorm > 1) ? Sqrt(vnorm) : /*vnorm*/  1 ;  
                
                pass = true;
                for (s = 0; s < sl; s++) 
                {
                    // Viola-Jones HAAR-Stage evaluator
                    stage = haar.stages[s];
                    threshold = stage.thres;
                    trees = stage.trees; tl = trees.length;
                    sum=0;
                    
                    for (t = 0; t < tl; t++) 
                    { 
                        //
                        // inline the tree and leaf evaluators to avoid function calls per-loop (faster)
                        //
                        
                        // Viola-Jones HAAR-Tree evaluator
                        features = trees[t].feats; 
                        cur_node_ind = 0;
                        while (true) 
                        {
                            feature = features[cur_node_ind]; 
                            
                            // Viola-Jones HAAR-Leaf evaluator
                            rects = feature.rects; 
                            nb_rects = rects.length; 
                            thresholdf = feature.thres; 
                            rect_sum = 0;
                            
                            if (feature.tilt)
                            {
                                // tilted rectangle feature, Lienhart et al. extension
                                for (kr = 0; kr < nb_rects; kr++) 
                                {
                                    r = rects[kr];
                                    
                                    // this produces better/larger features, possible rounding effects??
                                    x1 = x + ~~(scale * r[0]);
                                    y1 = (y-1 + ~~(scale * r[1])) * w;
                                    x2 = x + ~~(scale * (r[0] + r[2]));
                                    y2 = (y-1 + ~~(scale * (r[1] + r[2]))) * w;
                                    x3 = x + ~~(scale * (r[0] - r[3]));
                                    y3 = (y-1 + ~~(scale * (r[1] + r[3]))) * w;
                                    x4 = x + ~~(scale * (r[0] + r[2] - r[3]));
                                    y4 = (y-1 + ~~(scale * (r[1] + r[2] + r[3]))) * w;
                                    
                                    // clamp
                                    x1 = (x1<bx1) ? bx1 : (x1>bx2) ? bx2 : x1;
                                    x2 = (x2<bx1) ? bx1 : (x2>bx2) ? bx2 : x2;
                                    x3 = (x3<bx1) ? bx1 : (x3>bx2) ? bx2 : x3;
                                    x4 = (x4<bx1) ? bx1 : (x4>bx2) ? bx2 : x4;
                                    y1 = (y1<by1) ? by1 : (y1>by2) ? by2 : y1;
                                    y2 = (y2<by1) ? by1 : (y2>by2) ? by2 : y2;
                                    y3 = (y3<by1) ? by1 : (y3>by2) ? by2 : y3;
                                    y4 = (y4<by1) ? by1 : (y4>by2) ? by2 : y4;
                                    
                                    // RSAT(x–h+w,y+w+h–1)+RSAT(x,y–1)–RSAT(x–h,y+h–1)–RSAT(x+w,y+w–1)
                                    //      x4     y4           x1  y1      x3   y3          x2  y2
                                    rect_sum+= r[4] * (tilted[x4 + y4] - tilted[x3 + y3] - tilted[x2 + y2] + tilted[x1 + y1]);
                                }
                            }
                            else
                            {
                                // orthogonal rectangle feature, Viola-Jones original
                                for (kr = 0; kr < nb_rects; kr++) 
                                {
                                    r = rects[kr];
                                    
                                    // this produces better/larger features, possible rounding effects??
                                    x1 = x-1 + ~~(scale * r[0]); 
                                    x2 = x-1 + ~~(scale * (r[0] + r[2]));
                                    y1 = (w) * (y-1 + ~~(scale * r[1])); 
                                    y2 = (w) * (y-1 + ~~(scale * (r[1] + r[3])));
                                    
                                    // clamp
                                    x1 = (x1<bx1) ? bx1 : (x1>bx2) ? bx2 : x1;
                                    x2 = (x2<bx1) ? bx1 : (x2>bx2) ? bx2 : x2;
                                    y1 = (y1<by1) ? by1 : (y1>by2) ? by2 : y1;
                                    y2 = (y2<by1) ? by1 : (y2>by2) ? by2 : y2;
                                    
                                    // SAT(x–1,y–1)+SAT(x+w–1,y+h–1)–SAT(x–1,y+h–1)–SAT(x+w–1,y–1)
                                    //     x1  y1        x2    y2         x1  y2         x2   y1
                                    rect_sum+= r[4] * (integral[x2 + y2]  - integral[x1 + y2] - integral[x2 + y1] + integral[x1 + y1]);
                                }
                            }
                            
                            where = (rect_sum * inv_area < thresholdf * vnorm) ? 0 : 1;
                            // END Viola-Jones HAAR-Leaf evaluator
                            
                            if (where) 
                            {
                                if (feature.has_r) { sum += feature.r_val; break; } 
                                else { cur_node_ind = feature.r_node; }
                            } 
                            else 
                            {
                                if (feature.has_l) { sum += feature.l_val; break; } 
                                else { cur_node_ind = feature.l_node; }
                            }
                        }
                        // END Viola-Jones HAAR-Tree evaluator
                    
                    }
                    pass = (sum > threshold) ? true : false;
                    // END Viola-Jones HAAR-Stage evaluator
                    
                    if (!pass) break;
                }
                
                if (pass) 
                {
                    ret.push({
                        index: index,
                        x: x, y: y,
                        width: xsize,  height: ysize
                    });
                }
            }
        }
        
        // return any features found in this step
        return ret;
    }

    // called when detection ends, calls user-defined callback if any
    function detectEnd(self, rects) 
    {
        for (var i=0, l=rects.length; i<l; i++) rects[i] = new Feature(rects[i]);
        self.objects = merge(rects, self.min_neighbors, self.Ratio, self.Selection); 
        self.Ready = true;
        if (self.onComplete) self.onComplete.call(self);
    }
    
    //
    //
    //
    // HAAR Detector Class (with the haar cascade data)
    Detector = HAAR.Detector = function(haardata, ParallelClass) {
        this.haardata = haardata;
        this.Ready = false;
        this.doCannyPruning = false;
        this.Canvas = null;
        this.Selection = null;
        this.scaledSelection = null;
        this.objects = null;
        this.TimeInterval = null;
        this.DetectInterval = 30;
        this.Ratio = 0.5;
        this.cannyLow = 20;
        this.cannyHigh = 100;
        this.Parallel= ParallelClass || false;
        this.onComplete = null;
    };
    
    Detector.prototype = {

        constructor : Detector,
        
        haardata : null,
        Canvas : null,
        objects : null,
        
        Selection : null,
        scaledSelection : null,
        Ratio : 0.5,
        origWidth : 0,
        origHeight : 0,
        width : 0,
        height : 0,
        
        DetectInterval : 30,
        TimeInterval : null,
        
        doCannyPruning : false,
        cannyLow : 20,
        cannyHigh : 100,
        canny : null,
        
        integral : null,
        squares : null,
        tilted : null,
        
        Parallel : false,
        Ready : false,
        onComplete : null,
        
        // clear the image and detector data
        // reload the image to re-compute the needed image data (.image method)
        // and re-set the detector haar data (.cascade method)
        clearCache : function() {
            this.haardata = null; 
            this.canny = null;
            this.integral = null;
            this.squares = null;
            this.tilted = null;
            
            return this;
        },
        
        // set haardata, use same detector with cached data, to detect different feature
        cascade : function(haardata) { 
            this.haardata = haardata; 
            
            return this; 
        },
        
        // set image for detector along with scaling (and an optional canvas, eg for node)
        image : function(image, scale, canvas) {
            if (image)
            {
                var ctx, imdata, integralImg, w, h, sw, sh, r;
                
                // re-use the existing canvas if possible and not create new one
                if (!this.Canvas) this.Canvas = canvas || document.createElement('canvas');
                r = this.Ratio = (typeof scale == 'undefined') ? 0.5 : scale; 
                this.Ready = false;
                
                // make easy for video element to be used as input image
                w = this.origWidth = (image instanceof HTMLVideoElement) ? image.videoWidth : image.width;
                h = this.origHeight = (image instanceof HTMLVideoElement) ? image.videoHeight : image.height;
                sw = this.width = this.Canvas.width = Round(r * w); 
                sh = this.height = this.Canvas.height = Round(r * h);
                
                ctx = this.Canvas.getContext('2d');
                ctx.drawImage(image, 0, 0, w, h, 0, 0, sw, sh);
                
                // compute image data now, once per image change
                imdata = ctx.getImageData(0, 0, sw, sh);
                integralImg = integralImage(imdata.data, imdata.width, imdata.height/*, this.scaledSelection*/);
                this.integral = integralImg.integral; 
                this.squares = integralImg.squares; 
                this.tilted = integralImg.tilted; 
                this.canny = integralCanny(integralImg.gray, sw, sh/*, this.scaledSelection.width, this.scaledSelection.height*/);
                
                integralImg.gray = null; 
                integralImg.integral = null; 
                integralImg.squares = null; 
                integralImg.tilted = null; 
                integralImg = null;
            }
            
            return this;
        },

        // detector set detection interval
        interval : function(it) { 
            if (it>0) this.DetectInterval = it; 
            
            return this; 
        },
        
        // customize canny prunning thresholds for best results
        cannyThreshold : function(thres) {
            (thres && "undefined"!=typeof(thres.low)) && (this.cannyLow = thres.low);
            (thres && "undefined"!=typeof(thres.high)) && (this.cannyHigh = thres.high);
            
            return this;
        },
        
        // set custom detection region as selection
        selection : function(/* ..variable args here.. */) { 
            var args = slice.call(arguments), argslen=args.length;
            
            if (1==argslen && 'auto'==args[0] || !argslen) this.Selection = null;
            else this.Selection = Feature.prototype.data.apply(new Feature(), args); 
            
            return this; 
        },
        
        // detector on complete callback
        complete : function(callback) { 
            this.onComplete = callback; 
            
            return this; 
        },

        // Detector detect method to start detection
        detect : function(baseScale, scale_inc, increment, min_neighbors, doCannyPruning) {
            var self = this,
                sizex = self.haardata.size1, sizey = self.haardata.size2;
            
            if (!self.Selection) self.Selection = new Feature(0, 0, self.origWidth, self.origHeight);
            self.Selection.x = ('auto'==self.Selection.x) ? 0 : self.Selection.x;
            self.Selection.y = ('auto'==self.Selection.y) ? 0 : self.Selection.y;
            self.Selection.width = ('auto'==self.Selection.width) ? self.origWidth : self.Selection.width;
            self.Selection.height = ('auto'==self.Selection.height) ? self.origHeight : self.Selection.height;
            self.scaledSelection = self.Selection.clone().scale(self.Ratio).round();
            
            baseScale = (typeof baseScale == 'undefined') ? 1.0 : baseScale;
            scale_inc = (typeof scale_inc == 'undefined') ? 1.25 : scale_inc;
            increment = (typeof increment == 'undefined') ? 0.5 : increment;
            min_neighbors = (typeof min_neighbors == 'undefined') ? 1 : min_neighbors;
            self.doCannyPruning = (typeof doCannyPruning == 'undefined') ? true : doCannyPruning;
            
            self.maxScale = Min(self.width/sizex, self.height/sizey); 
            self.scale = baseScale; 
            self.min_neighbors = min_neighbors; 
            self.scale_inc = scale_inc; 
            self.increment = increment; 
            self.Ready = false;
            
            // needs parallel.js library (included)
            if (self.Parallel && self.Parallel.isSupported())
            {
                var data=[], sc, i=0; 
                for (sc=baseScale; sc<=self.maxScale; sc*=self.scale_inc)
                {
                    data.push({
                        haardata : self.haardata,
                        
                        width : self.width,
                        height : self.height,
                        scaledSelection : {x:self.scaledSelection.x, y:self.scaledSelection.y, width:self.scaledSelection.width, height:self.scaledSelection.height},
                        
                        integral : self.integral,
                        squares : self.squares,
                        tilted : self.tilted,
                        
                        doCannyPruning : self.doCannyPruning,
                        canny : (self.doCannyPruning) ? self.canny : null,
                        cannyLow : self.cannyLow,
                        cannyHigh : self.cannyHigh,
                        
                        maxScale : self.maxScale,
                        min_neighbors : self.min_neighbors,
                        scale_inc : self.scale_inc,
                        increment : self.increment,
                        scale : sc, // current scale to check
                        i : i++ // serial ordering
                    });
                }
                
                // needs parallel.js library (included)
                // parallelize the detection, using map-reduce
                // should also work in Nodejs (using child processes)
                new self.Parallel(data, {synchronous: false})
                    .require( byOrder, detectSingleStep, mergeSteps )
                    .map( detectSingleStep ).reduce( mergeSteps )
                    .then( function(rects){
                        detectEnd(self, rects);
                    } )
                ;
            }
            else
            {
                // else detect asynchronously using fixed intervals
                var rects = [], 
                    detectAsync = function() {         
                        if (self.scale <= self.maxScale) 
                        {
                            rects = rects.concat( detectSingleStep(self) ); 
                            // increase scale
                            self.scale *= self.scale_inc;
                            self.TimeInterval = setTimeout(detectAsync, self.DetectInterval);
                        }
                        else
                        {
                            clearTimeout( self.TimeInterval ); 
                            detectEnd(self, rects);
                        }
                    }
                ;
                
                self.TimeInterval = setTimeout(detectAsync, self.DetectInterval);
            }
            
            return this;
        }
    };
    
    
    //
    //
    //
    // Feature/Rectangle Class  (arguably better than generic Object)
    Feature = HAAR.Feature = function(x, y, w, h, i) { 
        this.data(x, y, w, h, i);
    };
    
    Feature.prototype = {
        
        constructor : Feature,
        
        index : 0,
        x : 0,
        y : 0,
        width : 0,
        height : 0,
        area : 0,
        
        isInside : false,
        
        data : function(x, y, w, h, i) {
            if (x && (x instanceof Feature)) 
            {
                this.copy(x);
            }
            else if (x && (x instanceof Object))
            {
                this.x = x.x || 0;
                this.y = x.y || 0;
                this.width = x.width || 0;
                this.height = x.height || 0;
                this.index = x.index || 0;
                this.area = x.area || 0;
                this.isInside = x.isInside || false;
            }
            else
            {
                this.x = x || 0;
                this.y = y || 0;
                this.width = w || 0;
                this.height = h || 0;
                this.index = i || 0;
                this.area = 0;
                this.isInside = false;
            }
            
            return this;
        },
        
        add : function (f) { 
            this.x += f.x; 
            this.y += f.y; 
            this.width += f.width; 
            this.height += f.height; 
            return this; 
        },
        
        scale : function(s) { 
            this.x *= s; 
            this.y *= s; 
            this.width *= s; 
            this.height *= s; 
            return this; 
        },
        
        round : function() { 
            this.x = ~~(this.x+0.5); 
            this.y = ~~(this.y+0.5); 
            this.width = ~~(this.width+0.5); 
            this.height = ~~(this.height+0.5); 
            return this; 
        },
        
        computeArea : function() { 
            this.area = this.width*this.height; 
            return this.area; 
        }, 
        
        inside : function(f) { 
            return ( 
                (this.x >= f.x) && 
                (this.y >= f.y) && 
                (this.x+this.width <= f.x+f.width) && 
                (this.y+this.height <= f.y+f.height)
                ) ? true : false; 
        },
        
        contains : function(f) { 
            return f.inside(this); 
        },
        
        equal : function(f) { 
            return (
                (f.x == this.x) && 
                (f.y == this.y) && 
                (f.width == this.width) && 
                (f.height == this.height)
            ) ? true : false; 
        },
        
        almostEqual : function(f) { 
            var d1=Max(f.width, this.width)*0.2, d2=Max(f.height, this.height)*0.2;
            //var d1=Max(f.width, this.width)*0.5, d2=Max(f.height, this.height)*0.5;
            //var d2=d1=Max(f.width, this.width, f.height, this.height)*0.4;
            return ( 
                Abs(this.x-f.x) <= d1 && 
                Abs(this.y-f.y) <= d2 && 
                Abs(this.width-f.width) <= d1 && 
                Abs(this.height-f.height) <= d2 
                ) ? true : false; 
        },
        
        clone : function() {
            var f = new Feature();
            f.x = this.x; 
            f.y = this.y; 
            f.width = this.width; 
            f.height = this.height; 
            f.index = this.index; 
            f.area = this.area; 
            f.isInside = this.isInside;
            
            return f;
        },
        
        copy : function(f) {
            if ( f && (f instanceof Feature) )
            {
                this.x = f.x; 
                this.y = f.y; 
                this.width = f.width; 
                this.height = f.height; 
                this.index = f.index; 
                this.area = f.area; 
                this.isInside = f.isInside;
            }
            
            return this;
        },
        
        toString : function() {
            return '[ x: ' + this.x + ', y: ' + this.y + ', width: ' + this.width + ', height: ' + this.height + ' ]';
        }
    };

}).call(this);