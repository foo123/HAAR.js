/**
*
* HAAR.js Feature Detection Library based on Viola-Jones / Lienhart et al. Haar Detection algorithm
* modified port of jViolaJones for Java (http://code.google.com/p/jviolajones/) and OpenCV for C++ (https://github.com/opencv/opencv) to JavaScript
*
* https://github.com/foo123/HAAR.js
* @version: @@VERSION@@
*
* Supports parallel "map-reduce" computation both in browser and node using parallel.js library
* https://github.com/adambom/parallel.js (included)
*
**/
"use strict";

// the export object
var HAAR = {VERSION : "@@VERSION@@"}, Detector, Feature, proto = 'prototype', undef = undefined;

var // typed arrays substitute
    Array32F = (typeof Float32Array !== "undefined") ? Float32Array : Array,
    Array8U = (typeof Uint8Array !== "undefined") ? Uint8Array : Array,
    /*
    Array64F = (typeof Float64Array !== "undefined") ? Float64Array : Array,
    Array8I = (typeof Int8Array !== "undefined") ? Int8Array : Array,
    Array16I = (typeof Int16Array !== "undefined") ? Int16Array : Array,
    Array32I = (typeof Int32Array !== "undefined") ? Int32Array : Array,
    Array16U = (typeof Uint16Array !== "undefined") ? Uint16Array : Array,
    Array32U = (typeof Uint32Array !== "undefined") ? Uint32Array : Array,
    */

    // math functions brevity
    stdMath = Math,
    Abs = stdMath.abs, Max = stdMath.max,
    Min = stdMath.min, Floor = stdMath.floor,
    Round = stdMath.round, Sqrt = stdMath.sqrt,
    slice = Array[proto].slice
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

        // SAT(-1, y) = SAT(x, -1) = SAT(-1, -1) = 0
        // SAT(x, y) = SAT(x, y-1) + SAT(x-1, y) + I(x, y) - SAT(x-1, y-1)  <-- integral image

        // RSAT(-1, y) = RSAT(x, -1) = RSAT(x, -2) = RSAT(-1, -1) = RSAT(-1, -2) = 0
        // RSAT(x, y) = RSAT(x-1, y-1) + RSAT(x+1, y-1) - RSAT(x, y-2) + I(x, y) + I(x, y-1)    <-- rotated(tilted) integral image at 45deg
        gray[j] = g;
        integral[j] = sum;
        squares[j] = sum2;
        tilted[j] = g;

        ++j; i+=4;
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

        // SAT(-1, y) = SAT(x, -1) = SAT(-1, -1) = 0
        // SAT(x, y) = SAT(x, y-1) + SAT(x-1, y) + I(x, y) - SAT(x-1, y-1)  <-- integral image

        // RSAT(-1, y) = RSAT(x, -1) = RSAT(x, -2) = RSAT(-1, -1) = RSAT(-1, -2) = 0
        // RSAT(x, y) = RSAT(x-1, y-1) + RSAT(x+1, y-1) - RSAT(x, y-2) + I(x, y) + I(x, y-1)    <-- rotated(tilted) integral image at 45deg
        gray[j] = g;
        integral[j] = integral[j-w] + sum;
        squares[j] = squares[j-w] + sum2;
        tilted[j] = tilted[j+1-w] + (g + gray[j-w]) + ((y>1) ? tilted[j-w-w] : 0) + ((k>0) ? tilted[j-1-w] : 0);

        ++k; ++j; i+=4; if (k>=w) {k=0; ++y; sum=sum2=0;}
    }

    return {gray:gray, integral:integral, squares:squares, tilted:tilted};
}

// compute Canny edges on gray-scale image to speed up detection if possible
function integralCanny(gray, w, h)
{
    var i, j, k, sum, grad_x, grad_y, tm, tM,
        ind0, ind1, ind2, ind_1, ind_2, count=gray.length,
        lowpass = new Array8U(count), canny = new Array32F(count)
    ;

    // first, second rows, last, second-to-last rows
    for (i=0; i<w; ++i)
    {
        lowpass[i]=0;
        lowpass[i+w]=0;
        lowpass[i+count-w]=0;
        lowpass[i+count-w-w]=0;

        canny[i]=0;
        canny[i+count-w]=0;
    }
    // first, second columns, last, second-to-last columns
    for (j=0, k=0; j<h; ++j, k+=w)
    {
        lowpass[0+k]=0;
        lowpass[1+k]=0;
        lowpass[w-1+k]=0;
        lowpass[w-2+k]=0;

        canny[0+k]=0;
        canny[w-1+k]=0;
    }
    // gauss lowpass
    for (i=2; i+2<w; ++i)
    {
        sum=0;
        for (j=2, k=(w<<1); j+2<h; ++j, k+=w)
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
    for (i=1; i+1<w ; ++i)
    {
        //sum=0;
        for (j=1, k=w; j+1<h; ++j, k+=w)
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
            grad_x = Abs(grad_x);
            grad_y = Abs(grad_y);
            //canny[ind0] = grad_x+grad_y;//&0xFFFFFFFF;
            tM = Max(grad_x, grad_y);
            tm = Min(grad_x, grad_y);
            // approximation of square root
            canny[ind0] = tM ? (tM*(1+0.43*tm/tM*tm/tM)) : 0;//&0xFFFFFFFF;
       }
    }

    // integral canny
    // first row
    i=0; sum=0;
    while (i<w)
    {
        sum += canny[i];
        canny[i] = sum;//&0xFFFFFFFF;
        ++i;
    }
    // other rows
    i=w; k=0; sum=0;
    while (i<count)
    {
        sum += canny[i];
        canny[i] = (canny[i-w] + sum);//&0xFFFFFFFF;
        ++i; ++k; if (k>=w) {k=0; sum=0;}
    }

    return canny;
}

// merge the detected features if needed
function groupRectangles(rects, min_neighbors, epsilon)
{
    var rlen = rects.length, ref = new Array(rlen), feats = [],
        nb_classes = 0, neighbors, r, found = false, i, j, n, t, ri;

    // original code
    // find number of neighbour classes
    for (i = 0; i < rlen; ++i) ref[i] = 0;
    for (i = 0; i < rlen; ++i)
    {
        found = false;
        for (j = 0; j < i; ++j)
        {
            if (rects[j].equals(rects[i], epsilon))
            {
                found = true;
                ref[i] = ref[j];
            }
        }

        if (!found)
        {
            ref[i] = nb_classes;
            ++nb_classes;
        }
    }

    // merge neighbor classes
    neighbors = new Array(nb_classes);  r = new Array(nb_classes);
    for (i = 0; i < nb_classes; ++i) {neighbors[i] = 0;  r[i] = new Feature();}
    for (i = 0; i < rlen; ++i) {ri=ref[i]; ++neighbors[ri]; r[ri].add(rects[i]);}
    for (i = 0; i < nb_classes; ++i)
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

    // filter inside rectangles
    rlen = feats.length;
    for (i=0; i<rlen; ++i)
    {
        for (j=i+1; j<rlen; ++j)
        {
            if (!feats[i].isInside && feats[i].inside(feats[j], epsilon))
                feats[i].isInside = true;
            if (!feats[j].isInside && feats[j].inside(feats[i], epsilon))
                feats[j].isInside = true;
        }
    }
    i = rlen;
    while (--i >= 0)
    {
        if (feats[i].isInside) feats.splice(i, 1);
    }

    return feats;
}

// area used as compare func for sorting
function byArea(a, b) {return b.area-a.area;}

// serial index used as compare func for sorting
function byOrder(a, b) {return a.index-b.index;}

/*
splice subarray (not used)
http://stackoverflow.com/questions/1348178/a-better-way-to-splice-an-array-into-an-array-in-javascript
Array.prototype.splice.apply(d[0], [prev, 0].concat(d[1]));
*/

// used for parallel "reduce" computation
function mergeSteps(d)
{
    // concat and sort according to serial ordering
    if (d[1].length)
    {
        d[0].push.apply(d[0], d[1]);
        d[0].sort(byOrder);
    }
    return d[0];
}

// used for parallel, asynchronous and/or synchronous computation
function detectSingleStep(self)
{
    var Sqrt = Math.sqrt, ret = [],
        haar = self.haardata, haar_stages = haar.stages, scaledSelection = self.scaledSelection,
        w = self.width, h = self.height,
        selw = scaledSelection.width, selh = scaledSelection.height, imArea=w*h, imArea1=imArea-1,
        sizex = haar.size1, sizey = haar.size2, xstep, ystep, xsize, ysize,
        startx = scaledSelection.x, starty = scaledSelection.y, startty,
        x, y, ty, tyw, tys, sl = haar_stages.length,
        p0, p1, p2, p3, xl, yl, s, t,
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
    xl = startx+selw-xsize;
    yl = starty+selh-ysize;
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
            if (0 >= vnorm) continue;
            vnorm = /*(vnorm > 1) ?*/ Sqrt(vnorm) /*: /*vnorm* /  1*/;

            pass = true;
            for (s = 0; s < sl; ++s)
            {
                // Viola-Jones HAAR-Stage evaluator
                stage = haar_stages[s];
                threshold = stage.thres;
                trees = stage.trees; tl = trees.length;
                sum=0;

                for (t = 0; t < tl; ++t)
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
                            for (kr = 0; kr < nb_rects; ++kr)
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

                                // RSAT(x-h+w, y+w+h-1) + RSAT(x, y-1) - RSAT(x-h, y+h-1) - RSAT(x+w, y+w-1)
                                //        x4     y4            x1  y1          x3   y3            x2   y2
                                rect_sum+= r[4] * (tilted[x4 + y4] - tilted[x3 + y3] - tilted[x2 + y2] + tilted[x1 + y1]);
                            }
                        }
                        else
                        {
                            // orthogonal rectangle feature, Viola-Jones original
                            for (kr = 0; kr < nb_rects; ++kr)
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

                                // SAT(x-1, y-1) + SAT(x+w-1, y+h-1) - SAT(x-1, y+h-1) - SAT(x+w-1, y-1)
                                //      x1   y1         x2      y2          x1   y1            x2    y1
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
function detectEnd(self, rects, withOnComplete)
{
    var i, n, o, ratio;
    for (i=0, n=rects.length; i<n; ++i) rects[i] = new Feature(rects[i]);
    self.objects = groupRectangles(rects, self.min_neighbors, self.epsilon);
    ratio = 1.0 / self.Ratio;
    for (i=0, n=self.objects.length; i<n; ++i)
    {
        o = self.objects[i];
        o.scale(ratio).round().computeArea();
        self.objects[i] = {
            x: o.x,
            y: o.y,
            width: o.width,
            height: o.height,
            area: o.area
        };
    }
    // sort according to size
    // (a deterministic way to present results under different cases)
    self.objects.sort(byArea);
    self.Ready = true;
    if (withOnComplete && self.onComplete) self.onComplete.call(self);
}


/**[DOC_MARKDOWN]
*
* #### Detector Methods
*
[/DOC_MARKDOWN]**/

//
//
//
// HAAR Detector Class (with the haar cascade data)
/**[DOC_MARKDOWN]
* __constructor(haardata, Parallel)__
* ```javascript
* new detector(haardata, Parallel);
* ```
*
* __Explanation of parameters__
*
* * _haardata_ : The actual haardata (as generated by haartojs tool), this is specific per feature, openCV haar data can be used.
* * _Parallel_ : Optional, this is the _Parallel_ object, as returned by the _parallel.js_ script (included). It enables HAAR.js to run parallel computations both in browser and node (can be much faster)
[/DOC_MARKDOWN]**/
Detector = HAAR.Detector = function(haardata, Parallel) {
    var self = this;
    self.haardata = haardata || null;
    self.Ready = false;
    self.doCannyPruning = false;
    self.Canvas = null;
    self.Selection = null;
    self.scaledSelection = null;
    self.objects = null;
    self.TimeInterval = null;
    self.DetectInterval = 30;
    self.Ratio = 0.5;
    self.cannyLow = 20;
    self.cannyHigh = 100;
    self.Parallel= Parallel || null;
    self.onComplete = null;
};

Detector[proto] = {

    constructor: Detector,

    haardata: null,
    Canvas: null,
    objects: null,

    Selection: null,
    scaledSelection: null,
    Ratio: 0.5,
    origWidth: 0,
    origHeight: 0,
    width: 0,
    height: 0,

    DetectInterval: 30,
    TimeInterval: null,

    doCannyPruning: false,
    cannyLow: 20,
    cannyHigh: 100,
    canny: null,

    integral: null,
    squares: null,
    tilted: null,

    Parallel: null,
    Ready: false,
    onComplete: null,

    /**[DOC_MARKDOWN]
    * __dispose()__
    * ```javascript
    * detector.dispose();
    * ```
    *
    * Disposes the detector and clears space of data cached
    [/DOC_MARKDOWN]**/
    dispose: function() {
        var self = this;
        if ( self.DetectInterval ) clearTimeout( self.DetectInterval );
        self.DetectInterval = null;
        self.TimeInterval = null;
        self.haardata = null;
        self.Canvas = null;
        self.objects = null;
        self.Selection = null;
        self.scaledSelection = null;
        self.Ratio = null;
        self.origWidth = null;
        self.origHeight = null;
        self.width = null;
        self.height = null;
        self.doCannyPruning = null;
        self.cannyLow = null;
        self.cannyHigh = null;
        self.canny = null;
        self.integral = null;
        self.squares = null;
        self.tilted = null;
        self.Parallel = null;
        self.Ready = null;
        self.onComplete = null;
        return self;
    },

    // clear the image and detector data
    // reload the image to re-compute the needed image data (.image method)
    // and re-set the detector haar data (.cascade method)
    /**[DOC_MARKDOWN]
    * __clearCache()__
    * ```javascript
    * detector.clearCache();
    * ```
    *
    * Clear any cached image data and haardata in case space is an issue. Use image method and cascade method (see below) to re-set image and haar data
    [/DOC_MARKDOWN]**/
    clearCache: function() {
        var self = this;
        self.haardata = null;
        self.canny = null;
        self.integral = null;
        self.squares = null;
        self.tilted = null;
        self.Selection = null;
        self.scaledSelection = null;
        return self;
    },

    // set haardata, use same detector with cached data, to detect different feature
    /**[DOC_MARKDOWN]
    * __cascade(haardata)__
    * ```javascript
    * detector.cascade(haardata);
    * ```
    *
    * Allow to use same detector (with its cached image data), to detect different feature on same image, by using another cascade. This way any image pre-processing is done only once
    *
    * __Explanation of parameters__
    *
    * * _haardata_ : The actual haardata (as generated by haartojs tool), this is specific per feature, openCV haar data can be used.
    [/DOC_MARKDOWN]**/
    cascade: function(haardata) {
        this.haardata = haardata || null;
        return this;
    },

    // set haardata, use same detector with cached data, to detect different feature
    /**[DOC_MARKDOWN]
    * __parallel(Parallel)__
    * ```javascript
    * detector.paralell(Parallel | false);
    * ```
    *
    * Enable/disable parallel processing (passing the Parallel Object or null/false)
    *
    * __Explanation of parameters__
    *
    * * _Parallel_ : The actual Parallel object used in parallel.js (included)
    [/DOC_MARKDOWN]**/
    parallel: function(Parallel) {
        this.Parallel = Parallel || null;
        return this;
    },

    // set image for detector along with scaling (and an optional canvas, eg for node)
    /**[DOC_MARKDOWN]
    * __image(ImageOrVideoOrCanvas, scale, CanvasClass)__
    * ```javascript
    * detector.image(ImageOrVideoOrCanvas, scale, CanvasClass);
    * ```
    *
    * __Explanation of parameters__
    *
    * * _ImageOrVideoOrCanvas_ : an actual Image or Video element or Canvas Object (in this case they are equivalent).
    * * _scale_ : The percent of scaling from the original image, so detection proceeds faster on a smaller image (default __1.0__ ). __NOTE__ scaling might alter the detection results sometimes, if having problems opt towards 1 (slower)
    * * _CanvasClass_ : This is optional and used only when running in nodejs (passing an alternative Canvas object for nodejs).
    [/DOC_MARKDOWN]**/
    image: function(image, scale, canvas) {
        var self = this;
        if (image)
        {
            var ctx, imdata, integralImg, w, h, sw, sh, r, cnv, isVideo = ('undefined' !== typeof HTMLVideoElement) && (image instanceof HTMLVideoElement);

            // re-use the existing canvas if possible and not create new one
            if (!self.Canvas) self.Canvas = canvas || document.createElement('canvas');
            cnv = self.Canvas;
            r = self.Ratio = (null == scale) ? 1.0 : (+scale);
            self.Ready = false;

            // make easy for video element to be used as input image
            w = self.origWidth = isVideo ? image.videoWidth : image.width;
            h = self.origHeight = isVideo ? image.videoHeight : image.height;
            sw = self.width = cnv.width = Round(r * w);
            sh = self.height = cnv.height = Round(r * h);

            ctx = cnv.getContext('2d');
            ctx.drawImage(image, 0, 0, w, h, 0, 0, sw, sh);

            // compute image data now, once per image change
            imdata = ctx.getImageData(0, 0, sw, sh);
            integralImg = integralImage(imdata.data, imdata.width, imdata.height/*, self.scaledSelection*/);
            self.integral = integralImg.integral;
            self.squares = integralImg.squares;
            self.tilted = integralImg.tilted;
            self.canny = integralCanny(integralImg.gray, sw, sh/*, self.scaledSelection.width, self.scaledSelection.height*/);

            integralImg.gray = null;
            integralImg.integral = null;
            integralImg.squares = null;
            integralImg.tilted = null;
            integralImg = null;
        }
        return self;
    },

    // detector set detection interval
    /**[DOC_MARKDOWN]
    * __interval(detectionInterval)__
    * ```javascript
    * detector.interval(detectionInterval);
    * ```
    *
    * __Explanation of parameters__
    *
    * * _detectionInterval_ : interval to run the detection asynchronously (if not parallel) in  microseconds (default __30__).
    [/DOC_MARKDOWN]**/
    interval: function(it) {
        if (it>0) this.DetectInterval = it;
        return this;
    },

    // customize canny prunning thresholds for best results
    /**[DOC_MARKDOWN]
    * __cannyThreshold({low: lowThreshold, high: highThreshold})__
    * ```javascript
    * detector.cannyThreshold({low: lowThreshold, high: highThreshold});
    * ```
    *
    * Set the thresholds when Canny Pruning is used, for extra fine-tuning.
    * Canny Pruning detects the number/density of edges in a given region. A region with too few or too many edges is unlikely to be a feature.
    * Default values work fine in most cases, however depending on image size and the specific feature, some fine tuning could be needed
    *
    * __Explanation of parameters__
    *
    * * _low_ : (Optional) The low threshold (default __20__ ).
    * * _high_ : (Optional) The high threshold (default __100__ ).
    [/DOC_MARKDOWN]**/
    cannyThreshold: function(thres) {
        (thres && undef!==thres.low) && (this.cannyLow = thres.low);
        (thres && undef!==thres.high) && (this.cannyHigh = thres.high);
        return this;
    },

    // set custom detection region as selection
    /**[DOC_MARKDOWN]
    * __select|selection('auto'|object|feature|x [,y, width, height])__
    * ```javascript
    * detector.selection('auto'|object|feature|x [,y, width, height]);
    * ```
    *
    * Allow to set a custom region in the image to confine the detection process only in that region (eg detect nose while face already detected)
    *
    * __Explanation of parameters__
    *
    * * _1st parameter_ : This can be the string 'auto' which sets the whole image as the selection, or an object ie: {x:10, y:'auto', width:100, height:'auto'} (every param set as 'auto' will take the default image value) or a detection rectangle/feature, or a x coordinate (along with rest coordinates).
    * * _y_ : (Optional) the selection start y coordinate, can be an actual value or 'auto' (y=0)
    * * _width_ : (Optional) the selection width, can be an actual value or 'auto' (width=image.width)
    * * _height_ : (Optional) the selection height, can be an actual value or 'auto' (height=image.height)
    *
    * The actual selection rectangle/feature is available as this.Selection or detector.Selection
    [/DOC_MARKDOWN]**/
    select: function(/* ..variable args here.. */) {
        var args = slice.call(arguments), argslen=args.length;

        if (1==argslen && 'auto'==args[0] || !argslen) this.Selection = null;
        else this.Selection = Feature[proto].data.apply(new Feature(), args);
        return this;
    },

    // detector on complete callback
    /**[DOC_MARKDOWN]
    * __complete(callback)__
    * ```javascript
    * detector.complete(callback);
    * ```
    *
    * Set the callback handler when detection completes (for parallel and asynchronous detection)
    *
    * __Explanation of parameters__
    *
    * * _callback_ : The user-defined callback function (will be called within the detectors scope, the value of 'this' will be the detector instance).
    [/DOC_MARKDOWN]**/
    complete: function(callback) {
        this.onComplete = callback || null;
        return this;
    },

    // Detector detect method to start detection
    /**[DOC_MARKDOWN]
    * __detect(baseScale, scale_inc, increment, min_neighbors, epsilon, doCannyPruning)__
    * ```javascript
    * detector.detect(baseScale, scale_inc, increment, min_neighbors, epsilon, doCannyPruning);
    * ```
    *
    * __Explanation of parameters__ ([JViolaJones Parameters](http://code.google.com/p/jviolajones/wiki/Parameters))
    *
    * * *baseScale* : The initial ratio between the window size and the Haar classifier size (default __1__ ).
    * * *scale_inc* : The scale increment of the window size, at each step (default __1.25__ ).
    * * *increment* : The shift of the window at each sub-step, in terms of percentage of the window size (default __0.5__ ).
    * * *min_neighbors* : The minimum numbers of similar rectangles needed for the region to be considered as a feature (avoid noise) (default __1__ )
    * * *epsilon*   : Epsilon value that determines similarity between detected rectangles. `0` means identical (default __0.2__ )
    * * *doCannyPruning* : enable Canny Pruning to pre-detect regions unlikely to contain features, in order to speed up the execution (optional default __false__ ).
    [/DOC_MARKDOWN]**/
    detect: function(baseScale, scale_inc, increment, min_neighbors, epsilon, doCannyPruning) {
        var self = this;
        var haardata = self.haardata,
            sizex = haardata.size1, sizey = haardata.size2,
            selection, scaledSelection,
            width = self.width, height = self.height,
            origWidth = self.origWidth, origHeight = self.origHeight,
            maxScale, scale,
            integral = self.integral, squares = self.squares, tilted = self.tilted, canny = self.canny,
            cannyLow = self.cannyLow, cannyHigh = self.cannyHigh
        ;

        if (!self.Selection) self.Selection = new Feature(0, 0, origWidth, origHeight);
        selection = self.Selection;
        selection.x = ('auto'==selection.x) ? 0 : selection.x;
        selection.y = ('auto'==selection.y) ? 0 : selection.y;
        selection.width = ('auto'==selection.width) ? origWidth : selection.width;
        selection.height = ('auto'==selection.height) ? origHeight : selection.height;
        scaledSelection = self.scaledSelection = selection.clone().scale(self.Ratio).round();

        baseScale = (null == baseScale) ? 1.0 : (+baseScale);
        scale_inc = (null == scale_inc) ? 1.25 : (+scale_inc);
        increment = (null == increment) ? 0.5 : (+increment);
        min_neighbors = (null == min_neighbors) ? 1 : (+min_neighbors);
        epsilon = (typeof epsilon == 'undefined') ? 0.2 : (+epsilon);
        doCannyPruning = (typeof doCannyPruning == 'undefined') ? false : (!!doCannyPruning);

        maxScale = self.maxScale = Min(scaledSelection.width/sizex, scaledSelection.height/sizey);
        scale = self.scale = baseScale;
        self.min_neighbors = min_neighbors;
        self.scale_inc = scale_inc;
        self.increment = increment;
        self.epsilon = epsilon;
        self.doCannyPruning = doCannyPruning;
        self.Ready = false;

        // needs parallel.js library (included)
        var parallel = self.Parallel;
        if (parallel && parallel.isSupported())
        {
            var data=[], sc, i=0;

            for (sc=baseScale; sc<=maxScale; sc*=scale_inc)
            {
                data.push({
                    haardata : haardata,

                    width : width,
                    height : height,
                    scaledSelection : {x:scaledSelection.x, y:scaledSelection.y, width:scaledSelection.width, height:scaledSelection.height},

                    integral : integral,
                    squares : squares,
                    tilted : tilted,

                    doCannyPruning : doCannyPruning,
                    canny : (doCannyPruning) ? canny : null,
                    cannyLow : cannyLow,
                    cannyHigh : cannyHigh,

                    maxScale : maxScale,
                    min_neighbors : min_neighbors,
                    epsilon: epsilon,
                    scale_inc : scale_inc,
                    increment : increment,
                    scale : sc, // current scale to check
                    i : i++ // serial ordering
                });
            }

            // needs parallel.js library (included)
            // parallelize the detection, using map-reduce
            // should also work in Nodejs (using child processes)
            new parallel(data, {synchronous: false})
                .require(byOrder, detectSingleStep, mergeSteps)
                .map(detectSingleStep).reduce(mergeSteps)
                .then(function(rects) {detectEnd(self, rects, true);})
            ;
        }
        else
        {
            // else detect asynchronously using fixed intervals
            var rects = [],
                detectAsync = function detectAsync() {
                    if (self.scale <= self.maxScale)
                    {
                        rects.push.apply(rects, detectSingleStep(self));
                        // increase scale
                        self.scale *= self.scale_inc;
                        self.TimeInterval = setTimeout(detectAsync, self.DetectInterval);
                    }
                    else
                    {
                        clearTimeout(self.TimeInterval);
                        detectEnd(self, rects, true);
                    }
                }
            ;

            self.TimeInterval = setTimeout(detectAsync, self.DetectInterval);
        }
        return self;
    },

    /**[DOC_MARKDOWN]
    * __detectSync(baseScale, scale_inc, increment, min_neighbors, doCannyPruning)__
    * ```javascript
    * var features = detector.detectSync(baseScale, scale_inc, increment, min_neighbors, doCannyPruning);
    * ```
    *
    * Run detector synchronously in one step, instead of parallel or asynchronously. Can be useful when immediate results are needed. Due to massive amount of processing the UI thread may be blocked.
    *
    * __Explanation of parameters__ (similar to *detect* method)
    *
    [/DOC_MARKDOWN]**/
    detectSync: function(baseScale, scale_inc, increment, min_neighbors, epsilon, doCannyPruning) {
        var self = this, maxScale,
            sizex = self.haardata.size1, sizey = self.haardata.size2;

        if (!self.Selection) self.Selection = new Feature(0, 0, self.origWidth, self.origHeight);
        self.Selection.x = ('auto'==self.Selection.x) ? 0 : self.Selection.x;
        self.Selection.y = ('auto'==self.Selection.y) ? 0 : self.Selection.y;
        self.Selection.width = ('auto'==self.Selection.width) ? self.origWidth : self.Selection.width;
        self.Selection.height = ('auto'==self.Selection.height) ? self.origHeight : self.Selection.height;
        self.scaledSelection = self.Selection.clone().scale(self.Ratio).round();

        baseScale = (null == baseScale) ? 1.0 : (+baseScale);
        scale_inc = (null == scale_inc) ? 1.25 : (+scale_inc);
        increment = (null == increment) ? 0.5 : (+increment);
        min_neighbors = (null == min_neighbors) ? 1 : (+min_neighbors);
        self.epsilon = (typeof epsilon == 'undefined') ? 0.2 : (+epsilon);
        self.doCannyPruning = (typeof doCannyPruning == 'undefined') ? false : (!!doCannyPruning);

        maxScale = self.maxScale = Min(self.scaledSelection.width/sizex, self.scaledSelection.height/sizey);
        self.scale = baseScale;
        self.min_neighbors = min_neighbors;
        self.scale_inc = scale_inc;
        self.increment = increment;
        self.Ready = false;

        // detect synchronously
        var rects = [];
        // detection loop
        while (self.scale <= maxScale)
        {
            rects.push.apply(rects, detectSingleStep(self));
            // increase scale
            self.scale *= scale_inc;
        }

        detectEnd(self, rects, false);

        // return results
        return self.objects;
    }

};
// aliases
Detector[proto].selection = Detector[proto].select;

//
//
//
// Feature/Rectangle Class  (arguably better than generic Object)
Feature = HAAR.Feature = function(x, y, w, h, i) {
    this.data(x, y, w, h, i);
};
Feature.groupRectangles = groupRectangles;
Feature[proto] = {

    constructor: Feature,

    index: 0,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    area: 0,

    isInside: false,

    data: function(x, y, w, h, i) {
        var self = this;
        if (x && (x instanceof Feature))
        {
            self.copy(x);
        }
        else if (x && (x instanceof Object))
        {
            self.x = x.x || 0;
            self.y = x.y || 0;
            self.width = x.width || 0;
            self.height = x.height || 0;
            self.index = x.index || 0;
            self.area = x.area || 0;
            self.isInside = x.isInside || false;
        }
        else
        {
            self.x = x || 0;
            self.y = y || 0;
            self.width = w || 0;
            self.height = h || 0;
            self.index = i || 0;
            self.area = 0;
            self.isInside = false;
        }

        return self;
    },

    add: function (f) {
        var self = this;
        self.x += f.x;
        self.y += f.y;
        self.width += f.width;
        self.height += f.height;
        return self;
    },

    scale: function(s) {
        var self = this;
        self.x *= s;
        self.y *= s;
        self.width *= s;
        self.height *= s;
        return self;
    },

    round: function() {
        var self = this;
        self.x = ~~(self.x+0.5);
        self.y = ~~(self.y+0.5);
        self.width = ~~(self.width+0.5);
        self.height = ~~(self.height+0.5);
        return self;
    },

    computeArea: function() {
        var self = this;
        self.area = self.width*self.height;
        return self.area;
    },

    inside: function(f, eps) {
        if (null == eps) eps = 0.1;
        if (0 > eps) eps = 0;
        var dx = f.width * eps, dy = f.height * eps;
        return (this.x >= f.x - dx) &&
            (this.y >= f.y - dy) &&
            (this.x + this.width <= f.x + f.width + dx) &&
            (this.y + this.height <= f.y + f.height + dy);
    },

    contains: function(f, eps) {
        return f.inside(this, null == eps ? 0.1 : eps);
    },

    equals: function(f, eps) {
        if (null == eps) eps = 0.2;
        if (0 > eps) eps = 0;
        var delta = eps * (Min(this.width, f.width) + Min(this.height, f.height)) * 0.5;
        return Abs(this.x - f.x) <= delta &&
            Abs(this.y - f.y) <= delta &&
            Abs(this.x + this.width - f.x - f.width) <= delta &&
            Abs(this.y + this.height - f.y - f.height) <= delta;
    },

    clone: function() {
        var self = this, f = new Feature();
        f.x = self.x;
        f.y = self.y;
        f.width = self.width;
        f.height = self.height;
        f.index = self.index;
        f.area = self.area;
        f.isInside = self.isInside;
        return f;
    },

    copy: function(f) {
        var self = this;
        if ( f && (f instanceof Feature) )
        {
            self.x = f.x;
            self.y = f.y;
            self.width = f.width;
            self.height = f.height;
            self.index = f.index;
            self.area = f.area;
            self.isInside = f.isInside;
        }
        return self;
    },

    toString: function() {
        return ['[ x:', this.x, 'y:', this.y, 'width:', this.width, 'height:', this.height, ']'].join(' ');
    }
};
