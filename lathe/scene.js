
var P = FCPrimitives;

var LatheShape = function (pos, size, rotate, params) {
    P.Drawable.call(this, pos, size, rotate, params);
    var p = params || {};
    var sz = size || {};
    this.segmentCount = p.segmentCount || 100;
    this.segmentsFaceInwards = p.segmentsFaceInwards || false;
    this.profile = p.profile || [1,0];
    this.height = sz.height || 1;
    this.profileSampler = p.profileSampler || null;
    this.verticalSegmentCount = p.verticalSegmentCount || this.profile.length-1;
}

LatheShape.prototype = Object.create(P.Drawable.prototype);

LatheShape.prototype.divulge = function () {
    var lathe = this;
    var polylist = [];
    var indices = [], vertices = [];
    var segmentHeight = lathe.height / lathe.verticalSegmentCount;
    
    var segPoly = new P.Poly();
    
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
            var A = P.mkVert(x1a, ylo, z1a);
            var B = P.mkVert(x1b, ylo, z1b);
            var C = P.mkVert(x2b, yhi, z2b);
            var D = P.mkVert(x2a, yhi, z2a);
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


var _mkGridAssigner = function (x, z, w, d, u) {
    var idx = 0;
    var getNext = function () {
        return {x: x+(u*idx++), y:0, z:z};
    }
    return getNext;
}

var _mkColourFetcher = function (scene) {
    var idx = 1;
    var getNext = function () {
        return scene.texColours[idx++%scene.texColours.length];
    }
    return getNext;
}


window.ExperimentalScene = (function () {
    "use strict";
    
    function Scene() {
        /* Declare any class and instance vars unique to this scene, here. */
        FCScene.call(this);
        var scene = this;
        
        scene.meshes = {};
        scene.texColours = [];
        
        scene.nextLocation = _mkGridAssigner(3, 5, 0, 0, -2);
        scene.nextColour = _mkColourFetcher(scene);
        
        scene.cameras = {
            cam1: {
                position: {x:0.4, y:1, z:1.6},
                orientation: {x:0.22, y:2.68}
            }
        };
    }
    
    Scene.prototype = Object.create(FCScene.prototype);
    
    Scene.prototype.setupPrereqs = function () {
        var scene = this;
        var prereqPromises = [];
        return new Promise(function (resolve, reject) {

            /* Load textures */
            var textures = [
                {src: '//assets.meta4vr.net/texture/concrete01.jpg', label: 'concrete01'}
            ];
            for (var i=0; i<textures.length; i++) {
                var myTex = textures[i];
                prereqPromises.push(scene.addTextureFromImage(myTex.src, myTex.label));
            }
            
            /* Build solid colour textures */
            var texColors = [
                {hex: '#00007f', label: 'navy'},
                {hex: '#0000ff', label: 'blue'},
                {hex: '#007f7f', label: 'teal'},
                {hex: '#ffa500', label: 'orange'},
                {hex: '#00ff00', label: 'lime'},
                {hex: '#9900ff', label: 'purplle'},
                {hex: '#4169e1', label: 'royalblue'},
                {hex: '#191970', label: 'dodgerblue'},
                {hex: '#007f00', label: 'green'},
                {hex: '#00ff7f', label: 'springgreen'},
                {hex: '#00ffff', label: 'cyan'},
                {hex: '#20b2aa', label: 'lightseagreen'},
                {hex: '#228b22', label: 'forestgreen'},
                {hex: '#2e8b57', label: 'seagreen'},
                {hex: '#ff0000', label: 'red'},
                {hex: '#ffff00', label: 'yellow'},
                {hex: '#ff00ff', label: 'magenta'},
                {hex: '#000000', label: 'black'},
                {hex: '#888888', label: 'gray'},
                {hex: '#ffffff', label: 'white'}
            ];
            for (var i=0; i<texColors.length; i++) {
                var myTexColor = texColors[i];
                scene.texColours.push(scene.addTextureFromColor(myTexColor, myTexColor.label));
            }
                        
            /* Load meshes */
            var meshes = [
                {src: '//assets.meta4vr.net/mesh/obj/sys/vive/controller/ctrl_lowpoly_body.obj', label: 'controller'}
            ];
            for (var i=0; i<meshes.length; i++) {
                var myMesh = meshes[i];
                prereqPromises.push(new Promise(function (resolve, reject) {
                    if (myMesh.src.endsWith('.obj')) {
                        FCShapeUtils.loadObj(myMesh.src)
                        .then(function (mesh) {
                            scene.meshes[myMesh.label] = mesh;
                            resolve();
                        })
                    };
                    
                }))
            }
        
            /* Load shaders */
            var shaders = [
                {srcFs: '//assets.meta4vr.net/shader/basic.fs', srcVs: '//assets.meta4vr.net/shader/basic.vs', label: 'basic'},
                {srcFs: '//assets.meta4vr.net/shader/diffuse2.fs', srcVs: '//assets.meta4vr.net/shader/diffuse2.vs', label: 'diffuse'}
            ];
            for (var i=0; i<shaders.length; i++) {
                var myShader = shaders[i];
                prereqPromises.push(scene.addShaderFromUrlPair(myShader.srcVs, myShader.srcFs, myShader.label, {
                    position: 0,
                    texCoord: 1,
                    vertexNormal: 2                
                }));
            }
            
            /* Wait for everything to finish and resolve() */
            Promise.all(prereqPromises).then(function () {
                resolve();
            });
            
        })
        
    }
    
    Scene.prototype.teleportUserToCursor = function () {
        var curs = this.getObjectByLabel('cursor');
        this.moveRaftAndPlayerTo(curs.pos);
    }
    
    
    Scene.prototype.setupScene = function () {
        var scene = this;
        var DEG=360/(2*Math.PI);
        var _hidden_beneath_floor = {x:0, y:-3.5, z:0};
        
        console.log('setting up');
        
        /* Cursor */
        var cursor = new FCShapes.SimpleCuboid(
            {x:1, y:1, z:1},
            {w: 0.3, h:0.3, d:0.3},
            null,
            {label: 'cursor', shaderLabel: 'diffuse', textureLabel: 'gray'}
        );
        cursor.behaviours.push(function (drawable, timePoint) {
            drawable.currentOrientation = {x:0.0, y:Math.PI*2*(timePoint/7000), z:0.0};
        });
        scene.addObject(cursor);
        
        
        /* Floor */
        var floor = new FCShapes.WallShape(
            {x: 0, z: 0, y: -0.02},
            {minX: -20, maxX: 20, minY: -20, maxY: 20},
            {x:270/DEG, y:0/DEG, z:0/DEG},
            {label: 'floor', textureLabel: 'concrete01', shaderLabel: 'diffuse', segmentsX: 10, segmentsY: 10}
        );
        var floorCollider = new FCUtil.PlanarCollider({planeNormal:[0, 0, -1], pointOnPlane:[0,0,0]}, floor, null);
        floorCollider.callback = function (dat) {
            var c = scene.getObjectByLabel('cursor');
            c.pos.x = dat.collisionPoint[0];
            c.pos.y = dat.collisionPoint[1];
            c.pos.z = dat.collisionPoint[2];
        }
        scene.addObject(floor);
        
        /* Raft */
        var stageExtent = {
            x: scene.stageParams.sizeX / 2,
            z: scene.stageParams.sizeZ / 2
        };
        console.log(scene.stageParams);
        scene.addObject(new FCShapes.WallShape(
            {x: 0, z: 0, y: 0},
            {minX: -1*stageExtent.x, maxX: stageExtent.x, minY: -1*stageExtent.z, maxY: stageExtent.z},
            {x:270/DEG, y:0/DEG, z:0/DEG},
            {label: 'raft', textureLabel: 'royalblue', shaderLabel: 'diffuse', segmentsX: 1, segmentsY: 1}
        ));
        
        /* Controllers */
        var ctrlInfo = {
            size: {scale:1},
            greenColor: scene.addTextureFromColor({r:0.2, g:0.9, b:0.6}),
            blueColor: scene.addTextureFromColor({r:0.2, g:0.6, b:0.9})
        };
        
        var buttonHandler = function (gamepadIdx, btnIdx, btnStatus, sector, myButton, extra) {
            if (btnStatus != 'up') {
                if (btnIdx == '2' && btnStatus == 'pressed') {
                    scene.teleportUserToCursor();
                }
                
            }
        };
        
        var ctrl0 = new FCShapes.MeshShape(
            scene.meshes.controller,
            _hidden_beneath_floor, /* Hide it under the floor. This position will be overridden */
            ctrlInfo.size,
            null,
            {
                shaderLabel: 'diffuse',
                texture: ctrlInfo.greenColor,
                groupLabel: 'controllerTrackers'
            }
        );
        ctrl0.behaviours.push(FCUtil.makeGamepadTracker(scene, 0, buttonHandler));
        ctrl0.behaviours.push(FCUtil.makeControllerRayProjector(scene, 0, [floorCollider]));
        
        scene.addObject(ctrl0);
        
        var ctrl1 = new FCShapes.MeshShape(
            scene.meshes.controller,
            _hidden_beneath_floor, /* Hide it under the floor. This position will be overridden */
            ctrlInfo.size,
            null,
            {
                shaderLabel: 'diffuse',
                texture: ctrlInfo.blueColor,
                groupLabel: 'controllerTrackers'
            }
        );
        ctrl1.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, buttonHandler));
        // ctrl1.behaviours.push(FCUtil.makeControllerRayProjector(scene, 1, [floorCollider]));
        
        scene.addObject(ctrl1);
        
        var quarterTurn = {x:0, y:Math.PI/2, z:0};
        
        var cyl = new FCShapes.CylinderShape(scene.nextLocation(), {radius:0.2, height:3}, null, {shaderLabel:'diffuse', texture:scene.nextColour()});
        scene.addObject(cyl);
        
        scene.addLatheWithPoints(3, [0,1]);
        
        scene.addLatheWithPoints(3, [0.2, 0.3, 0.2, 1, 0]);
                
        scene.addLatheWithPoints(1, [0, 0.4, 0.4, 0.4, 0]);
        
        scene.addLatheWithFunction(3, function (idx, count) {
            // return 0.3+(0.5*Math.sin(5*Math.PI*(idx/count)));
            return 0.6-(0.2*Math.sin(5*Math.PI*(idx/count)));
        });

        scene.addLatheWithFunction(3, function (idx, count) {
            return 0.3+(0.5*Math.sin(5*Math.PI*(idx/count)));
            // return 0.6-(0.2*Math.sin(5*Math.PI*(idx/count)));
        });
                
        scene.addLatheWithFunction(3, function (idx, count) {
            var fract = idx/count;
            if (fract < 0.5) return 0.2;
            else if (fract < 0.7) return 0.3;
            else return 0.4;
        });

        scene.addLatheWithFunction(2.5, function (idx, count) {
            var fract = idx/count;
            return Math.ceil((1-fract)*5)/7;
        });

        
        scene.addLatheWithFunction(3, function (idx, count) {
            var fract = idx/count;
            if (fract < 0.5) return 0.2;
            else if (fract < 0.7) {
                return fract;
            }
            else return 0.4;
        });
        
        scene.addLatheWithFunction(3, function (idx, count) {
            var fract = idx/count;
            if (fract < 0.2) return fract;
            else if (fract < 0.3) return 0.2;
            else if (fract < 0.4) return fract;
            else if (fract < 0.5) return 0.2;
            else if (fract < 0.6) return fract;
            else if (fract < 0.7) return 0.2;
            else if (fract < 0.8) return fract;
            else if (fract < 0.9) return 0.2;
            else return fract;
        });
        
        scene.addLatheWithFunction(3, function (idx, count) {
            var fract = idx/count;
            if (fract < 0.5) {
                return 0.5*fract;
            }
            else {
                return 0.5*(1-fract);
            }
        });

    }
    
    Scene.prototype.clear = function () {
        this.removeObjectsInGroup('lathes');
        this.nextLocation = _mkGridAssigner(3, 5, 0, 0, -2);
    }
    
    Scene.prototype.addLatheWithPoints = function (height, profile) {
        var scene = this;
        var quarterTurn = {x:0, y:Math.PI/2, z:0};
        var lathe = new LatheShape(
            scene.nextLocation(),
            {height:height}, quarterTurn,
            {shaderLabel:'diffuse', texture:scene.nextColour(), groupLabel:'lathes',
            profile:profile}
        );
        scene.addObject(lathe);
    }
    
    Scene.prototype.addLatheWithFunction = function (height, sampler) {
        var scene = this;
        var quarterTurn = {x:0, y:Math.PI/2, z:0};
        var lathe = new LatheShape(
            scene.nextLocation(),
            {height:height}, quarterTurn,
            {shaderLabel:'diffuse', texture:scene.nextColour(), verticalSegmentCount:120, groupLabel:'lathes',
            profileSampler: sampler}
        );
        // lathe.drawMode = scene.gl.LINES;
        scene.addObject(lathe);
    }

    return Scene;
})();
