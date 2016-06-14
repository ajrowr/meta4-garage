window.ExperimentalScene = (function () {
    "use strict";
    
    function Scene() {
        /* Declare any class and instance vars unique to this scene, here. */
        FCScene.call(this);
        
        this.pointerVec = [0,1,0];
        this.pointerOrigin = {x:0, y:0, z:0};
        
        this.axisBases = {
            x: 1, y: 1, z: 1
        };
        
        this.axisBaseOpts = [];
        for (var i=-1; i<2; i++) {
            for (var j=-1; j<2; j++) {
                for (var k=-1; k<2; k++) {
                    this.axisBaseOpts.push({x:i, y:j, z:k});
                }
            }
        }
        this.axisBaseSelected = 0;
        
        this.axisBase = null; /* use to override presents */
        
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
        scene.addObject(new FCShapes.WallShape(
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
        scene.addObject(new FCShapes.WallShape(
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
        
        /* Make some supplemental axial thingies */
        var lrg = 0.7, sml = 0.03;
        var trX = new FCShapes.SimpleCuboid(_hidden_beneath_floor, {w:lrg, h:sml, d:sml}, null, {textureLabel:'red', shaderLabel:'diffuse'});
        trX.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, null));
        scene.addObject(trX);
        var trY = new FCShapes.SimpleCuboid(_hidden_beneath_floor, {w:sml, h:lrg, d:sml}, null, {textureLabel:'green', shaderLabel:'diffuse'});
        trY.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, null));
        scene.addObject(trY);
        var trZ = new FCShapes.SimpleCuboid(_hidden_beneath_floor, {w:sml, h:sml, d:lrg}, null, {textureLabel:'mediumblue', shaderLabel:'diffuse'});
        trZ.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, null));
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
        ctrl1.behaviours.push(makeControllerRayReporter(scene, 1));
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
                drawable.pos = {
                    x:origin.x + (vec[0] * offsetFactor), 
                    y:origin.y + (vec[1] * offsetFactor), 
                    z:origin.z + (vec[2] * offsetFactor)
                };
            });
            return newCube;
        }
        
        for (var i=-10; i<10; i++) {
            var nc = mkCube(scene, i/10.0);
            scene.addObject(nc);
        }
        
        
    }

    return Scene;
})();
