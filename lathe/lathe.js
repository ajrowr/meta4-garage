
var P = FCPrimitives; /* NOTE. this use of P considered dangerous */

var LatheShape = function (pos, size, rotate, params) {
    FCPrimitives.Drawable.call(this, pos, size, rotate, params);
    var p = params || {};
    var sz = size || {};
    this.segmentCount = p.segmentCount || 100;
    this.segmentsFaceInwards = p.segmentsFaceInwards || false;
    this.profile = p.profile || [1,0];
    this.height = sz.height || 1;
    this.profileSampler = p.profileSampler || null;
    this.verticalSegmentCount = p.verticalSegmentCount || this.profileSampler && 100 || this.profile.length-1;
}

LatheShape.prototype = Object.create(FCPrimitives.Drawable.prototype);

LatheShape.prototype.divulge = function () {
    var lathe = this;
    var polylist = [];
    var indices = [], vertices = [];
    var segmentHeight = lathe.height / lathe.verticalSegmentCount;
    
    var segPoly = new FCPrimitives.Poly();
    
    var mkSampler = function (profile) {
        var samp = function (segIdx, segCount) {
            return profile[segIdx];
        }
        return samp;
    }
    
    var sampler = lathe.profileSampler || mkSampler(lathe.profile);
    
    for (var i=0; i<lathe.verticalSegmentCount; i++) {
        
        var ylo = segmentHeight * i, yhi = segmentHeight * (i+1);
        var anglePer = (2*Math.PI)/this.segmentCount;
        var r1 = sampler(i, lathe.verticalSegmentCount);
        var r2 = sampler(i+1, lathe.verticalSegmentCount);
        
        var texincr = 1/this.segmentCount;
        for (var j=0; j<this.segmentCount; j++) {
            var x1a = Math.cos(anglePer*j)*r1, x1b = Math.cos(anglePer*(j+1))*r1;
            var z1a = Math.sin(anglePer*j)*r1, z1b = Math.sin(anglePer*(j+1))*r1;
            var x2a = Math.cos(anglePer*j)*r2, x2b = Math.cos(anglePer*(j+1))*r2;
            var z2a = Math.sin(anglePer*j)*r2, z2b = Math.sin(anglePer*(j+1))*r2;
            var A = FCPrimitives.mkVert(x1a, ylo, z1a);
            var B = FCPrimitives.mkVert(x1b, ylo, z1b);
            var C = FCPrimitives.mkVert(x2b, yhi, z2b);
            var D = FCPrimitives.mkVert(x2a, yhi, z2a);
            var texL = texincr * j, texR = texincr * (j+1);
            var bl = [texL,1], br = [texR, 1], tl = [texL, 0], tr = [texR,0];
            segPoly.normal(Math.cos(anglePer*(j+0.5)), 0, Math.sin(anglePer*(j+0.5)));
            if (this.segmentsFaceInwards) {
                segPoly.add(A, bl, B, br, C, tr);
                segPoly.add(A, bl, C, tr, D, tl);
            }
            else {
                segPoly.add(C, tr, B, br, A, bl);
                segPoly.add(D, tl, C, tr, A, bl);
            
            }
        }
                
    }
    
    return {indices: segPoly.indices, vertices: segPoly.verts};
}


/* Extruders have a Shape and a Profile */
/* Each can be defined by an array of points or a sampler */
var LatheExtruderShape = function (pos, size, rotate, params) {
    FCPrimitives.Drawable.call(this, pos, size, rotate, params);
    var p = params || {};
    var sz = size || {};
    this.segmentsFaceInwards = p.segmentsFaceInwards || false;
    this.height = sz.height || 1;
    this.scale = sz.scale || 1;

    this.endcap = true; /* Fake it by doing a very short segment with normals perpendicular to the shape */

    // this.shapePoints = p.shapePoints || [[-1,0.4], [0,0.4], [0,1], [1,0], [0,-1], [0,-0.4], [-1,-0.4]].reverse();
    
    this.shape = {};
    this.profile = {
        segmentCount: p.profile && p.profile.segmentCount || p.segmentCount || 100,
        points: p.profile && p.profile.points || p.profile || null,
        sampler: p.profile && p.profile.sampler || p.profileSampler || null,
        samplerType: p.profile && p.profile.samplerType || null
    };
    
    this.shape = {
        pointCount: p.shape && p.shape.pointCount || null,
        points: p.shape && p.shape.points || p.shapePoints,
                    // || [[-1,0.4], [0,0.4], [0,1], [1,0], [0,-1], [0,-0.4], [-1,-0.4]].reverse(),
        sampler: p.shape && p.shape.sampler || null,
        parameters: p.shape && p.shape.parameters || {} 
    }
}

LatheExtruderShape.prototype = Object.create(FCPrimitives.Drawable.prototype);

LatheExtruderShape.prototype._makeFaceNormal = function (v1,v2,v3) {
    var X=0,Y=1,Z=2;
    
    var u = vec3.create();
    vec3.sub(u, v2, v1);
    var v = vec3.create();
    vec3.sub(v, v3, v1);
    var norm = vec3.create();
    norm[X] = u[Y]*v[Z] - u[Z]*v[Y];
    norm[Y] = u[Z]*v[X] - u[X]*v[Z];
    norm[Z] = u[X]*v[Y] - u[Y]*v[X];
    
    vec3.normalize(norm, norm);
    return norm;
}

LatheExtruderShape.prototype.divulge = function () {
    var lathe = this;
    var polylist = [];
    var indices = [], vertices = [];
    var segmentHeight = lathe.height / lathe.profile.segmentCount;

    var segPoly = new FCPrimitives.Poly();

    var samplerFactories = {
        BasicSampler: function (profile) {
            var samp = function (segIdx, segCount) {
                return profile[segIdx];
            }
            return samp;
        },
        ExtrudeSampler: function (profile) {
            var samp = function (segIdx, segCount) {
                if (segIdx==0) return 0.00001;
                else if (segIdx>=segCount) return 0.00001;
                else if (profile) return profile[segIdx];
                else return 1;
            }
            return samp;
        },
        BeveledExtrudeSampler: function (profile) {
            var samp = function (segIdx, segCount) {
                var frac = segIdx / segCount;
                if (segIdx==0) return 0.00001;
                else if (segIdx>=segCount) return 0.00001;
                else if (frac > 0.95) return 1.0-(0.04-(1.0-frac));
                else if (frac < 0.05) return 1.0-(0.04-frac);
                else if (profile) return profile[segIdx];
                else return 1;
            }
            return samp;
        }
    };
    
    var samplerType = samplerFactories[lathe.samplerType || 'ExtrudeSampler'];

    var sampler = lathe.profileSampler || samplerType(lathe.profile.points);
    var nShapePoints = lathe.shape.points && lathe.shape.points.length || lathe.shape.pointCount;
    var shapeSampler = lathe.shape.sampler || function (j, n) {return lathe.shape.points[j];}
    
    var sPoints = [];
    for (var i=0; i<nShapePoints; i++) {
        sPoints.push(shapeSampler(i, nShapePoints, lathe.shape.parameters));
    }
    
    for (var i=0; i<lathe.profile.segmentCount; i++) {
    
        var ylo = segmentHeight * i, yhi = segmentHeight * (i+1);
        var anglePer = (2*Math.PI)/this.segmentCount; //
        var r1 = sampler(i, lathe.profile.segmentCount);
        var r2 = sampler(i+1, lathe.profile.segmentCount);
        var s = this.scale;
    
        var texincr = 1/this.segmentCount; //
        for (var j=0; j<nShapePoints; j++) {
            var sp0 = sPoints[j==0 && nShapePoints-1 || j-1];
            var sp1 = sPoints[j];
            var x1a = sp0[0]*r1*s, x1b = sp1[0]*r1*s;
            var z1a = sp0[1]*r1*s, z1b = sp1[1]*r1*s;
            var x2a = sp0[0]*r2*s, x2b = sp1[0]*r2*s;
            var z2a = sp0[1]*r2*s, z2b = sp1[1]*r2*s;
            var A = FCPrimitives.mkVert(x1a, ylo, z1a);
            var B = FCPrimitives.mkVert(x1b, ylo, z1b);
            var C = FCPrimitives.mkVert(x2b, yhi, z2b);
            var D = FCPrimitives.mkVert(x2a, yhi, z2a);
            var texL = texincr * j, texR = texincr * (j+1);
            var bl = [texL,1], br = [texR, 1], tl = [texL, 0], tr = [texR,0];
            if (this.endcap && i+1==lathe.profile.segmentCount) {
                segPoly.normal(0, 1, 0); /* If using an endcap then the final segment "faces" directly up */
            }
            else if (this.endcap && i==0) {
                segPoly.normal(0, -1, 0)
            }
            else {
                // segPoly.normal(Math.cos(anglePer*(j+0.5)), 0, Math.sin(anglePer*(j+0.5))); //
                var v_1 = vec3.fromValues(C.x, C.y, C.z);
                var v_2 = vec3.fromValues(B.x, B.y, B.z);
                var v_3 = vec3.fromValues(A.x, A.y, A.z);
                var n = this._makeFaceNormal(v_1, v_2, v_3);
                segPoly.normal(n[0], n[1], n[2]);
            }
            if (this.segmentsFaceInwards) {
                segPoly.add(A, bl, B, br, C, tr);
                segPoly.add(A, bl, C, tr, D, tl);
            }
            else {
                segPoly.add(C, tr, B, br, A, bl);
                segPoly.add(D, tl, C, tr, A, bl);
        
            }
        }
            
    }

    return {indices: segPoly.indices, vertices: segPoly.verts};
}

