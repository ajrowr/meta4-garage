window.ExperimentalScene = (function () {
    "use strict";
    
    function Scene() {
        /* Declare any class and instance vars unique to this scene, here. */
        FCScene.call(this);
        
        this.pointerVec = [0,1,0];
        this.pointerOrigin = {x:0, y:0, z:0};
        this.pointOfInterest = null;
        
        this.axisBases = {
            x: 1, y: 1, z: 1
        };
        
        this.axisBaseOpts = [
            {x:0, y:0, z:1},
            {x:0, y:1, z:0},
            {x:1, y:0, z:0},
        ];
        // for (var i=-1; i<2; i++) {
        //     for (var j=-1; j<2; j++) {
        //         for (var k=-1; k<2; k++) {
        //             this.axisBaseOpts.push({x:i, y:j, z:k});
        //         }
        //     }
        // }
        this.axisBaseSelected = 0;
        
        this.axisBase = null; /* use to override presents */
        
        this.debugInfo = {
            colliders: {}
        }; /* Put everything in here */
        
    }
    
    Scene.prototype = Object.create(FCScene.prototype);
    
    Scene.prototype.setupPrereqs = function () {
        var scene = this;
        var prereqPromises = [];
        return new Promise(function (resolve, reject) {

            var textures = [
                {src: '../assets/concrete01.jpg', label: 'concrete01'}
            ];
            
            var texColors = [
                {hex: '#4169e1', label: 'royalblue'},
                {hex: '#c0c0c0', label: 'silver'},
                {hex: '#ffd700', label: 'gold'},
                {hex: '#008000', label: 'green'},
                {hex: '#0000cd', label: 'mediumblue'},
                {hex: '#0000ff', label: 'blue'},
                {hex: '#afeeee', label: 'paleturquoise'},
                {hex: '#4682b4', label: 'steelblue'},
                {hex: '#9370db', label: 'mediumpurple'},
                {hex: '#ff0000', label: 'red'},
                {hex: '#ffa500', label: 'orange'}
            ]
        
            var models = [
                {src: '../assets/controlleresque.stl', label: 'controlleresque'}
            ];
        
            var shaders = [
                {srcFs: '../assets/basic.fs', srcVs: '../assets/basic.vs', label: 'basic'},
                {srcFs: '../assets/diffuse2.fs', srcVs: '../assets/diffuse2.vs', label: 'diffuse'}
            ];
        
            for (var i=0; i<textures.length; i++) {
                var myTex = textures[i];
                prereqPromises.push(scene.addTextureFromImage(myTex.src, myTex.label));
            }
        
            for (var i=0; i<models.length; i++) {
                var myModel = models[i];
                prereqPromises.push(scene.addModelSource(myModel.src, myModel.label));
            }
        
            for (var i=0; i<shaders.length; i++) {
                var myShader = shaders[i];
                prereqPromises.push(scene.addShaderFromUrlPair(myShader.srcVs, myShader.srcFs, myShader.label, {
                    position: 0,
                    texCoord: 1,
                    vertexNormal: 2                
                }));
            }
            
            for (var i=0; i<texColors.length; i++) {
                var myTexColor = texColors[i];
                scene.addTextureFromColor(myTexColor, myTexColor.label);
            }
            
            Promise.all(prereqPromises).then(function () {
                resolve();
            });
            
        })
        
        
        
        
    }
    
    Scene.prototype.setupScene = function () {
        var scene = this;
        var DEG=360/(2*Math.PI);
        var _hidden_beneath_floor = {x:0, y:-3.5, z:0};
        
        console.log('setting up');
        
        /* Floor */
        scene.addObject(new FCBasicShapes.WallShape(
            {x: 0, z: 0, y: -0.02},
            {minX: -20, maxX: 20, minY: -20, maxY: 20},
            {x:270/DEG, y:0/DEG, z:0/DEG},
            {label: 'floor', textureLabel: 'concrete01', shaderLabel: 'diffuse', segmentsX: 10, segmentsY: 10}
        ));
        
        /* Raft */
        var stageExtent = {
            x: scene.stageParams.sizeX / 2,
            z: scene.stageParams.sizeZ / 2
        };
        console.log(scene.stageParams);
        scene.addObject(new FCBasicShapes.WallShape(
            {x: 0, z: 0, y: 0},
            {minX: -1*stageExtent.x, maxX: stageExtent.x, minY: -1*stageExtent.z, maxY: stageExtent.z},
            {x:270/DEG, y:0/DEG, z:0/DEG},
            {label: 'raft', textureLabel: 'royalblue', shaderLabel: 'diffuse', segmentsX: 1, segmentsY: 1}
        ));
        
        /* Controllers */
        var ctrlInfo = {
            src: scene.modelSources.controlleresque,
            translate: {x:0.00, y:-0.016, z:0.15},
            size: {scale:0.01},
            rotate: {x:0/DEG, y:180/DEG, z:90/DEG}, 
            greenColor: scene.addTextureFromColor({r:0.2, g:0.9, b:0.6}),
            blueColor: scene.addTextureFromColor({r:0.2, g:0.6, b:0.9})
        };
        
        var ctrl0 = new FCShapes.LoaderShape(
            ctrlInfo.src,
            _hidden_beneath_floor, /* Hide it under the floor. This position will be overridden */
            ctrlInfo.size,
            null,
            {
                shaderLabel: 'diffuse',
                texture: ctrlInfo.greenColor,
                groupLabel: 'controllerTrackers'
            }
        );
        ctrl0.translation = ctrlInfo.translate;
        ctrl0.rotation = ctrlInfo.rotate;
        ctrl0.behaviours.push(FCUtil.makeGamepadTracker(scene, 0, null));
        scene.addObject(ctrl0);
        
        /* Augment blue tracker with something to report to the pointer vec */
        var ctrl1 = new FCShapes.SimpleCuboid(
            // ctrlInfo.src,
            _hidden_beneath_floor, /* Hide it under the floor. This position will be overridden */
            // ctrlInfo.size,
            {w:0.10, h:0.10, d:0.10},
            null,
            {
                shaderLabel: 'diffuse',
                texture: ctrlInfo.blueColor,
                groupLabel: 'controllerTrackers'
            }
        );
        // ctrl1.translation = ctrlInfo.translate;
        // ctrl1.rotation = ctrlInfo.rotate;
        
        var axisSelect = function (gpIdx, btnIdx, btnStatus, tpSector) {
            if (btnStatus == 'released') {
                if (btnIdx == 0 && btnStatus == 'released' && tpSector == 'w') {
                    scene.axisBaseSelected--;
                }
                if (btnIdx == 0 && btnStatus == 'released' && tpSector == 'e') {
                    scene.axisBaseSelected++;
                }
                var myAx = scene.axisBaseOpts[scene.axisBaseSelected];
                console.log('Axis base is %f, %f, %f', myAx.x, myAx.y, myAx.z);
                

            }
        }
        
        ctrl1.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, axisSelect));
        
        var makeRayReporterButtonHandler = function (myScene, gpIdx) {
            var bh = function (gpIdx, btnIdx, buttonStatus, tpSector, buttonRaw, extra) {
                if (btnIdx == 3 && buttonStatus == 'pressed') {
                    var dbgInf = {
                        debugInfo: scene.debugInfo,
                        pointer: {vec: scene.pointerVec, origin: scene.pointerOrigin}
                    };
                    console.log(dbgInf);
                    
                }
                if (btnIdx == 1 && buttonStatus == 'released') {
                    // console.log(btnIdx, extra);
                    
                    var myGp = extra.gamepad;
                    var gPose = myGp.pose;
                    var gpMat = mat4.create();
                    
                    if (window.vrDisplay.stageParameters) {
                        mat4.fromRotationTranslation(gpMat, gPose.orientation, gPose.position);
                        mat4.multiply(gpMat, vrDisplay.stageParameters.sittingToStandingTransform, gpMat);
                    
                        var ploc = scene.playerLocation;
                        var trans = vec3.fromValues(ploc.x, ploc.y, ploc.z);
                        var reloc = mat4.create();
                        mat4.fromTranslation(reloc, trans);
                        mat4.mul(gpMat, reloc, gpMat);
                    
                    }
                    
                    /* ok so that's all the transforms done... now try and extract what we actually wanted */
                    /* - namely, the origin and vector */

                    /* Trans is fine */
                    var finalTrans = vec3.create();
                    mat4.getTranslation(finalTrans, gpMat);
                    scene.pointerOrigin = {x: finalTrans[0], y: finalTrans[1], z: finalTrans[2]};
                    
                    var myAxisBase = scene.axisBase || scene.axisBaseOpts[scene.axisBaseSelected];
                    var axes = vec3.fromValues(myAxisBase.x, myAxisBase.y, myAxisBase.z);
                    
                    var roQuat = quat.create();
                    mat4.getRotation(roQuat, gpMat);
                    vec3.transformQuat(axes, axes, roQuat);
                    scene.pointerVec = [axes[0], axes[1], axes[2]];
                    
                    
                }
                // console.log()
            }
            return bh;
        }
        
        
        /* Make some supplemental axial thingies, put a ray reporter on one of them */
        var lrg = 0.7, sml = 0.03;
        var trX = new FCShapes.SimpleCuboid(_hidden_beneath_floor, {w:lrg, h:sml, d:sml}, null, {textureLabel:'red', shaderLabel:'diffuse'});
        trX.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, null));
        scene.addObject(trX);
        var trY = new FCShapes.SimpleCuboid(_hidden_beneath_floor, {w:sml, h:lrg, d:sml}, null, {textureLabel:'green', shaderLabel:'diffuse'});
        trY.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, null));
        scene.addObject(trY);
        var trZ = new FCShapes.SimpleCuboid(_hidden_beneath_floor, {w:sml, h:sml, d:lrg}, null, {textureLabel:'mediumblue', shaderLabel:'diffuse'});
        trZ.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, makeRayReporterButtonHandler(scene, 1)));
        scene.addObject(trZ);
        
        
        
        var makeControllerRayReporter = function (scene, gpId) {
            var reporter = function (drawable, timePoint) {
                var vrGamepads = FCUtil.getVRGamepads();
                // console.log('Got ', vrGamepads.length, 'VR gamepads from ', gamepads.length, 'total gamepads');
                if (vrGamepads.length && vrGamepads[gpId]) {
                    var myGp = vrGamepads[gpId];
                    var gPose = myGp.pose;
                    var gpMat = mat4.create();
                    
                    if (window.vrDisplay.stageParameters) {
                        mat4.fromRotationTranslation(gpMat, gPose.orientation, gPose.position);
                        mat4.multiply(gpMat, vrDisplay.stageParameters.sittingToStandingTransform, gpMat);
                    
                        var ploc = scene.playerLocation;
                        var trans = vec3.fromValues(ploc.x, ploc.y, ploc.z);
                        var reloc = mat4.create();
                        mat4.fromTranslation(reloc, trans);
                        mat4.mul(gpMat, reloc, gpMat);
                    
                    }
                    
                    /* ok so that's all the transforms done... now try and extract what we actually wanted */
                    /* - namely, the origin and vector */

                    /* Trans is fine */
                    var finalTrans = vec3.create();
                    mat4.getTranslation(finalTrans, gpMat);
                    scene.pointerOrigin = {x: finalTrans[0], y: finalTrans[1], z: finalTrans[2]};
                    
                    /* It's the orientation that's giving grief :-| */
                    
                    /* this doesn't work */
                    // var axisAngles = vec3.create();
                    // quat.getAxisAngle(axisAngles, gPose.orientation);
                    // scene.pointerVec[0] = Math.cos(axisAngles[0]);
                    // scene.pointerVec[1] = Math.sin(axisAngles[1]);
                    
                    var myAxisBase = scene.axisBase || scene.axisBaseOpts[scene.axisBaseSelected];
                    var axes = vec3.fromValues(myAxisBase.x, myAxisBase.y, myAxisBase.z);

                    /* try: transforming a normalised unit vector by the quat. */
                    // vec3.normalize(axes, axes);
                    // vec3.transformQuat(axes, axes, gPose.orientation);
                    // scene.pointerVec = [axes[0], axes[1], axes[2]];
                    //
                    // document.getElementById('readoutX').value = scene.pointerVec[0];
                    // document.getElementById('readoutY').value = scene.pointerVec[1];
                    // document.getElementById('readoutZ').value = scene.pointerVec[2];
                    /* nope. */
                    
                    /* Try: decomposing quat to axisAngles */
                    // var axisOut = vec3.create();
                    // var ang = quat.getAxisAngle(axisOut, gPose.orientation);
                    // scene.pointerVec = [axisOut[0], axisOut[1], axisOut[2]];
                    //
                    // document.getElementById('readoutX').value = axisOut[0];
                    // document.getElementById('readoutY').value = axisOut[1];
                    // document.getElementById('readoutZ').value = axisOut[2];
                    // document.getElementById('readoutExtra').value = ang;
                    /* nope. */
                    
                    /* try: extracting the quat from final gpMat and using that */
                    /* Think I've already tried this but what the hey */
                    var roQuat = quat.create();
                    mat4.getRotation(roQuat, gpMat);
                    vec3.transformQuat(axes, axes, roQuat);
                    scene.pointerVec = [axes[0], axes[1], axes[2]];
                    /* OMG YES IT WORKED */
                    /* OMG OMG OMG OMG OMG OMG OMG OMG OMG */
                    
                    
                }
            }
            return reporter;
        }
        
        var makeControllerRayReporter2 = function (myScene, gpIdx) {
            var reporter = function (drawable, timePoint) {
                
                var vrGamepads = FCUtil.getVRGamepads();
                // console.log('Got ', vrGamepads.length, 'VR gamepads from ', gamepads.length, 'total gamepads');
                if (vrGamepads.length && vrGamepads[gpIdx]) {
                    var myGp = vrGamepads[gpIdx];
                    var gPose = myGp.pose;
                    var gpMat = mat4.create();
                    
                    if (window.vrDisplay.stageParameters) {
                        mat4.fromRotationTranslation(gpMat, gPose.orientation, gPose.position);
                        mat4.multiply(gpMat, vrDisplay.stageParameters.sittingToStandingTransform, gpMat);
                    
                        var ploc = scene.playerLocation;
                        var trans = vec3.fromValues(ploc.x, ploc.y, ploc.z);
                        var reloc = mat4.create();
                        mat4.fromTranslation(reloc, trans);
                        mat4.mul(gpMat, reloc, gpMat);
                    
                    }
                    
                    /* ok so that's all the transforms done... now try and extract what we actually wanted */
                    /* - namely, the origin and vector */

                    /* Trans is fine */
                    var finalTrans = vec3.create();
                    mat4.getTranslation(finalTrans, gpMat);
                    scene.pointerOrigin = {x: finalTrans[0], y: finalTrans[1], z: finalTrans[2]};
                    
                    var myAxisBase = scene.axisBase || scene.axisBaseOpts[scene.axisBaseSelected];
                    var axes = vec3.fromValues(myAxisBase.x, myAxisBase.y, myAxisBase.z);
                    
                    var roQuat = quat.create();
                    mat4.getRotation(roQuat, gpMat);
                    vec3.transformQuat(axes, axes, roQuat);
                    // scene.pointerVec = [axes[0], axes[1], axes[2]];
                    scene.pointerVec = vec3.fromValues(axes[0], axes[1], axes[2]);
                }
            }
            return reporter;
        }
        
        
        // ctrl1.behaviours.push(makeControllerRayReporter2(scene, 1));
        scene.addObject(ctrl1);
        
        /* Add a bunch of cubes that track the pointer vector */
        var mkCube = function (myScene, offsetFactor) {
            var newCube = new FCShapes.SimpleCuboid(
                _hidden_beneath_floor,
                {w:0.05, d:0.05, h:0.05},
                null,
                {textureLabel: (offsetFactor < 0 ? 'paleturquoise' : 'mediumpurple'), shaderLabel: 'diffuse', groupLabel: 'pointerCubes'}
            );
            newCube.behaviours.push(function (drawable, timePoint) {
                var vec = myScene.pointerVec;
                var origin = myScene.pointerOrigin;
                var pOI = myScene.pointOfInterest;
                if (pOI && Math.abs(offsetFactor) >= Math.abs(pOI)) {
                    drawable.textureLabel = 'green';
                }
                else {
                    drawable.textureLabel = (offsetFactor > 0 ? 'mediumpurple' : 'paleturquoise');
                }
                drawable.pos = {
                    x:origin.x + (vec[0] * offsetFactor), 
                    y:origin.y + (vec[1] * offsetFactor), 
                    z:origin.z + (vec[2] * offsetFactor)
                };
            });
            return newCube;
        }
        
        for (var i=-10; i<10; i++) {
            var nc = mkCube(scene, i/6.0);
            scene.addObject(nc);
        }
        
        
        
        /* What next. Add a cube that changes colour when we point at it? */
        /* We can make this a fairly basic implementation for now and improve / refactor later */
        /* So let's base some kind of collider on the cube's front face? */
        var colliderCube = new FCShapes.SimpleCuboid(
            {x:1, y:1, z:2},
            {w:0.5, h:0.5, d:0.5},
            null,
            {textureLabel:'orange', shaderLabel: 'diffuse', label: 'colliderCube'}
        );
        
        var mkCollisionTester = function (scene, planeNormalValues, pointOnPlaneValues, collisionSquare) {
            var collisionTester = function (drawable, timePoint) {
                var planeNormal = vec3.fromValues(planeNormalValues[0], planeNormalValues[1], planeNormalValues[2]);// vec3 n
                var pointOnPlane =  vec3.fromValues(pointOnPlaneValues[0],pointOnPlaneValues[1],pointOnPlaneValues[2]);// vec3 p0
                var rayOrigin = vec3.fromValues(scene.pointerOrigin.x, scene.pointerOrigin.y, scene.pointerOrigin.z); // vec3 l0
                var rayVector =  vec3.create();                 // vec3 l
                var pointOfInterest = null;                     // float t
                
                vec3.normalize(rayVector, scene.pointerVec);
                vec3.normalize(planeNormal, planeNormal);
                
                var denom = vec3.dot(planeNormal, rayVector);
                // console.log(denom);
                // document.getElementById('readoutA').value = denom;
                // if (denom > 0.0001) {
                var pointvray = vec3.create();
                vec3.subtract(pointvray, pointOnPlane, rayOrigin);
                var pointOfInterest = vec3.dot(pointvray, planeNormal) / denom;
                // console.log(denom, pointOfInterest);
                // document.getElementById('readoutB').value = pointOfInterest;
                // var gcubes = vrScene.getObjectsInGroup('pointerCubes');
                scene.pointOfInterest = pointOfInterest;
                
                scene.collisionPoint = null;
                /* top, left, bottom, right in xy. not sure how to handle in 3d yet */
                if (collisionSquare) {
                    /* So, point of interest is the distance along the ray at which the ray/plane intersection occurs. */
                    /* So we trace that and see if it's inside the square. */
                    var poi = scene.pointOfInterest, pntrVec = scene.pointerVec, pntrOrig = scene.pointerOrigin;
                    var coll = [
                        pntrOrig.x + (poi*pntrVec[0]), 
                        pntrOrig.y + (poi*pntrVec[1]), 
                        pntrOrig.z + (poi*pntrVec[2])
                    ];
                    if (coll[0] > collisionSquare.left && coll[0] < collisionSquare.right
                    && coll[1] > collisionSquare.bottom && coll[1] < collisionSquare.top) {
                        document.getElementById('readoutC').value = 'collision detected!';
                    }
                    else {
                        document.getElementById('readoutC').value = 'no collision detected';
                    }
                    scene.collisionPoint = coll;
                    
                }
                
                // }
            }
            return collisionTester;
        }
        
        var findCollision = function (planeNormalValues, pointOnPlaneValues, collisionRect, pointerOrigin, pointerVec) {
            /* If collisionSquare is set {left: right: top: bottom:} then find collision with the square.
            /* If not set find collision with the plane.
            */
            var planeNormal = vec3.fromValues(planeNormalValues[0], planeNormalValues[1], planeNormalValues[2]);// vec3 n
            var pointOnPlane =  vec3.fromValues(pointOnPlaneValues[0],pointOnPlaneValues[1],pointOnPlaneValues[2]);// vec3 p0
            var rayOrigin = vec3.fromValues(pointerOrigin.x, pointerOrigin.y, pointerOrigin.z); // vec3 l0
            var rayVector =  vec3.create();                 // vec3 l
            var pointOfInterest = null;                     // float t
            
            /* pointOfInterest represents the distance along the vector at which collision occurs with the plane. */
            vec3.normalize(rayVector, pointerVec);
            vec3.normalize(planeNormal, planeNormal);
            
            var denom = vec3.dot(planeNormal, rayVector);
            var pointVsRay = vec3.create();
            vec3.subtract(pointVsRay, pointOnPlane, rayOrigin);
            var pointOfInterest = vec3.dot(pointVsRay, planeNormal) / denom;
            
            if (collisionRect) {
                var coll = [
                    pointerOrigin.x + (pointOfInterest*rayVector[0]), 
                    pointerOrigin.y + (pointOfInterest*rayVector[1]), 
                    pointerOrigin.z + (pointOfInterest*rayVector[2])
                ];
                
                if (coll[0] > collisionRect.left && coll[0] < collisionRect.right
                && coll[1] > collisionRect.bottom && coll[1] < collisionRect.top) {
                    return pointOfInterest;
                }
                else {
                    return null;
                }
            }
            
            return pointOfInterest; /* If it's not really colliding this could be a huge number. Maybe we set a ceiling? */
            
        }
        
        // colliderCube.behaviours.push(mkCollisionTester(scene, [0,0,-1], [1,1,2], {left:0.5, top: 1.5, bottom: 1, right: 1.5}));
        // scene.addObject(colliderCube);


        /* Just like findCollision except now we're trying to deal with 3d coords for collisionRect */
        var findCollision3d = function (planeNormalValues, pointOnPlaneValues, collisionBox, pointerOrigin, pointerVec, debugObj) {
            /* If collisionSquare is set {left: right: top: bottom:} then find collision with the square.
            /* If not set find collision with the plane.
            */
            var planeNormal = vec3.fromValues(planeNormalValues[0], planeNormalValues[1], planeNormalValues[2]);// vec3 n
            var pointOnPlane =  vec3.fromValues(pointOnPlaneValues[0],pointOnPlaneValues[1],pointOnPlaneValues[2]);// vec3 p0
            var rayOrigin = vec3.fromValues(pointerOrigin.x, pointerOrigin.y, pointerOrigin.z); // vec3 l0
            var rayVector =  vec3.create();                 // vec3 l
            var pointOfInterest = null;                     // float t
            
            /* pointOfInterest represents the distance along the vector at which collision occurs with the plane. */
            vec3.normalize(rayVector, pointerVec);
            vec3.normalize(planeNormal, planeNormal);
            
            var denom = vec3.dot(planeNormal, rayVector);
            var pointVsRay = vec3.create();
            vec3.subtract(pointVsRay, pointOnPlane, rayOrigin);
            var pointOfInterest = vec3.dot(pointVsRay, planeNormal) / denom;
            
            
            if (collisionBox) {
                var coll = [
                    pointerOrigin.x + (pointOfInterest*rayVector[0]), 
                    pointerOrigin.y + (pointOfInterest*rayVector[1]), 
                    pointerOrigin.z + (pointOfInterest*rayVector[2])
                ];
                
                /* Don't rely on these to be the left, right, top etc. They're just abstract concepts */
                var colLeft, colRght, colTop, colBtm, colFrnt, colBack;
                colLeft = Math.min(collisionBox.bottomLeft[0], collisionBox.topRight[0]);
                colRght = Math.max(collisionBox.bottomLeft[0], collisionBox.topRight[0]);
                colBtm = Math.min(collisionBox.bottomLeft[1], collisionBox.topRight[1]);
                colTop = Math.max(collisionBox.bottomLeft[1], collisionBox.topRight[1]);
                colFrnt = Math.min(collisionBox.bottomLeft[2], collisionBox.topRight[2]);
                colBack = Math.max(collisionBox.bottomLeft[2], collisionBox.topRight[2]);
                colFrnt -= 0.001; /* Feather it by a couple of mm so we (hopefully) don't fall prey to rounding errors */
                colBack += 0.001;
                
                // console.log(colLeft, colRght, colTop, colBtm, colFrnt, colBack);
                // console.log(coll);
                // console.log(colLeft, colRght, colTop, colBtm, colFrnt, colBack);
                // console.log(coll);

                /* DEBUG */
                if (debugObj) {
                    debugObj.pointOfInterest = pointOfInterest;
                    debugObj.collisionBoxInf = {
                        x: [colLeft, coll[0], colRght],
                        y: [colBtm, coll[1], colTop],
                        z: [colFrnt, coll[2], colBack],
                        collisionPoint: coll
                    };
                }


                if (false) {
                    console.log('x:', colLeft, coll[0], colRght);
                    console.log('y:', colBtm, coll[1], colTop);
                    console.log('z:', colFrnt, coll[2], colBack);
                }
                
                if ((colLeft <= coll[0] && coll[0] <= colRght) 
                && (colBtm  <= coll[1] && coll[1] <= colTop)
                && (colFrnt <= coll[2] && coll[2] <= colBack)
                && pointOfInterest <= 0
                ) {
                     // console.log('yep');
                     return pointOfInterest;
                }
                else {
                    // console.log('nope');
                    return null;
                }
                // if (coll[0] > collisionRect.left && coll[0] < collisionRect.right
                // && coll[1] > collisionRect.bottom && coll[1] < collisionRect.top) {
                //     return pointOfInterest;
                // }
                // else {
                //     return null;
                // }
            }
            
            /* We're temporarily uninterested in the noCollisionBox case */
            // return pointOfInterest; /* If it's not really colliding this could be a huge number. Maybe we set a ceiling? */
            
        }
        
        
        var P = FCPrimitives;
        var FlatColliderShape = function (pos, size, rotate, params, scene) {
            P.Drawable.call(this, pos, size, rotate, params);
            var shape = this;
            /* We may need to engage in some chicanery here. */
            /* size is w, h */
            /* Normally we wouldn't use pos for such things as it's an input to the xform matrix. But this is 
            /* an experiment. :) 
            */
            
            /* Calculate collider rect coords from given params. */
            /* This is a weak technique because we're not creating something associated with the shape; 
            /* rather, we're creating something that just happens to be in the same location.
            /* But if the shape moves or reorients.... we're stuffed.
            /* TODO: transform collider rect by any active matrices */
            var halfW = this.size.w / 2;
            var halfH = this.size.h / 2;
            
            this.sceneRef = scene;
            this.colliderRectCoords = {
                left: pos.x - halfW,
                bottom: pos.y - halfH,
                right: pos.x + halfW,
                top: pos.y + halfH
            };
            this.planeNormal = [0,0,-1];
            this.pointOnPlane = [pos.x + halfW, pos.y + halfH, pos.z];
            this.colliderV1 = {
                rect: {
                    left: pos.x - halfW,
                    bottom: pos.y - halfH,
                    right: pos.x + halfW,
                    top: pos.y + halfH
                },
                normal: [0,0,-1],
                pointOnPlane: [pos.x + halfW, pos.y + halfH, pos.z]
            }
                        
            var findCollisionV1 = function (drawable, timePoint) {
                var c = shape.colliderV1;
                var pntrVec = shape.sceneRef.pointerVec, pntrOrig = shape.sceneRef.pointerOrigin;
                var coll = findCollision(c.normal, c.pointOnPlane, c.rect, pntrOrig, pntrVec);
                // document.getElementById('readoutD').value = coll;
                // poi = scene.pointOfInterest,
                if (coll) {
                    shape.textureLabel = 'red';
                }
                else {
                    shape.textureLabel = 'gold';
                }
            }
            
            // this.behaviours.push(findCollisionV1);
            
            
            /* The goal for v2 is to define the collider in the exact same terms as the object, and then apply transforms
            /* in the same way in order to find the collidable surface.
            */
            
            this.colliderV2 = {
                rect: {
                    // left: 0 - halfW,
                    // bottom: 0 - halfH,
                    // right: 0 + halfW,
                    // top: 0 + halfH

                    // bottomleft: [0-halfW, 0-halfH, 0],
                    // topright: [halfW, halfH, 0]
                    
                    bottomLeft: vec3.fromValues(0-halfW, 0-halfH, 0),
                    topRight: vec3.fromValues(halfW, halfH, 0)
                },
                normal: vec3.fromValues(0,0,-1),
                pointOnPlane: vec3.fromValues(halfW, halfH, 0)
            }
            
            var findCollisionV2 = function (drawable, timePoint) {
                var c = shape.colliderV2;
                var pntrVec = shape.sceneRef.pointerVec, pntrOrig = shape.sceneRef.pointerOrigin;
                var debugObj = {};
                
                
                /* Transform everything but the pointer by our transform matrix */
                var transmat = shape.transformationMatrix();
                var rectBL = vec3.clone(c.rect.bottomLeft);
                vec3.transformMat4(rectBL, rectBL, transmat);
                document.getElementById('readoutB').value = rectBL;
                
                var rectTR = vec3.clone(c.rect.topRight);
                vec3.transformMat4(rectTR, rectTR, transmat);
                document.getElementById('readoutC').value = rectTR;
                
                /* Normal */
                var quW = quat.create();
                var orien = drawable.currentOrientation || drawable.orientation;
                quat.rotateX(quW, quW, orien.x);
                quat.rotateY(quW, quW, orien.y);
                quat.rotateZ(quW, quW, orien.z);
                
                var norm = vec3.clone(c.normal);
                vec3.transformQuat(norm, norm, quW);
                // vec3.transformMat4(norm, norm, transmat);
                // vec3.rotate
                document.getElementById('readoutA').value = norm;
                
                var pOP = vec3.clone(c.pointOnPlane);
                vec3.transformMat4(pOP, pOP, transmat);
                
                var coll = findCollision3d(norm, pOP, {bottomLeft: rectBL, topRight: rectTR}, pntrOrig, pntrVec, debugObj);
                document.getElementById('readoutD').value = coll;
                // console.log(coll);
                // poi = scene.pointOfInterest,
                if (coll) {
                    shape.textureLabel = 'red';
                }
                else {
                    shape.textureLabel = 'gold';
                }
                
                scene.debugInfo.colliders[drawable.label] = debugObj;
            }
            
            this.behaviours.push(findCollisionV2);
            
            
        }
        
        FlatColliderShape.prototype = Object.create(P.Drawable.prototype);
        FlatColliderShape.prototype.divulge = function () {
            /* This shape starts out in xy with a normal of z- */
            var poly = new P.Poly();
            poly.normal(0,0,-1);
            var xlo, ylo, xhi, yhi, z, A, B, C, D;
            var halfW = this.size.w / 2;
            var halfH = this.size.h / 2;
            xlo = 0 - halfW;
            xhi = 0 + halfW;
            ylo = 0 - halfH;
            yhi = 0 + halfH;
            z = 0;
            A = P.mkVert(xlo, ylo, z);
            B = P.mkVert(xhi, ylo, z);
            C = P.mkVert(xhi, yhi, z);
            D = P.mkVert(xlo, yhi, z);
            poly.add(A, P.tex.bl, B, P.tex.br, C, P.tex.tr);
            poly.add(A, P.tex.bl, C, P.tex.tr, D, P.tex.tl);
            
            return {indices: poly.indices, vertices: poly.verts};
        }
        
        if (true) {
            var flatC1 = new FlatColliderShape(
                {x: 2, y: 1, z: 2},
                {w: 1, h:1},
                {x:0, y:180/DEG, z:0}, 
                {textureLabel: 'gold', shaderLabel: 'diffuse', groupLabel: 'colliders', label:'c1'},
                scene
            );
            scene.addObject(flatC1);
        }
        

        if (true) {
            var flatC2 = new FlatColliderShape(
                {x: -4, y: 3, z: 2},
                {w: 2, h:1},
                {x:0, y:180/DEG, z:0},
                {textureLabel: 'gold', shaderLabel: 'diffuse', groupLabel: 'colliders', label:'c2'},
                scene
            );
            scene.addObject(flatC2);
        }

        if (true) {
            var flatC3 = new FlatColliderShape(
                {x: -4, y: 3, z: -3},
                {w: 2, h:1},
                {x:0, y:45/DEG, z:0},
                {textureLabel: 'gold', shaderLabel: 'diffuse', groupLabel: 'colliders', label:'c3'},
                scene
            );
            scene.addObject(flatC3);
        }

        
    }

    return Scene;
})();
