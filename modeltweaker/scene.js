var DEG=360/(2*Math.PI);

window.ExperimentalScene = (function () {
    "use strict";
    
    function Scene() {
        /* Declare any class and instance vars unique to this scene, here. */
        FCScene.call(this);
        this.meshes = {};
        
        this.modelList = null;
        
        this.currentObject = null;
        //21 isn't too bright but is sideways - looks basically right
        //39 is perfect
        //48 nice but dim
        //25 is a good example of broken
        //50 very nice example of broken and just generally very nice tbh
        //45?
        //4 -> towel
        this.currentModelIdx = 6;//null;
        this.autoLoadIdx = 6;
        
        this.uiMode = 0;
        
        this.trackpadMode = 0;
        
        this.cameras = {
            cam1: {
                position: {x:0, y:1, z:-1.5},
                orientation: {x:0, y:Math.PI}
            }
        }
        
        
    }
    
    Scene.prototype = Object.create(FCScene.prototype);
    
    Scene.prototype.loadModelList = function () {
        var scene = this;
        var modelListUrl = 'http://meshbase.io.codex.cx/mesher.pycg?mode=detail';
        return new Promise(function (resolve, reject) {
            var xh = new XMLHttpRequest();
            xh.open('GET', modelListUrl, true);
            xh.responseType = 'json';
            xh.onreadystatechange = function () {
                if (xh.readyState == 4) {
                    console.log(xh.response);
                    scene.modelList = xh.response;
                    resolve();
                }
            }
            xh.send();
            
        });
    }
    
    Scene.prototype.showMenu = function () {
        
        
    }
    
    Scene.prototype.synthesizeNormals = function (mesh) {
        /* Take 9 coords across 3 points, calculate direction vectors and dot products, overwrite the normals already there */
        var vv = mesh.vertices;
        var nn = mesh.vertexNormals;
        for (var i=0; i<vv.length/9; i++) {
            var baseIdx = 9*i;
            var v1 = vec3.fromValues(vv[baseIdx], vv[baseIdx+1], vv[baseIdx+2]);
            var v2 = vec3.fromValues(vv[baseIdx+3], vv[baseIdx+4], vv[baseIdx+5]);
            var v3 = vec3.fromValues(vv[baseIdx+6], vv[baseIdx+7], vv[baseIdx+8]);

            //
            // var vd1 = vec3.create();
            // vec3.sub(vd1, v1, v2);
            // var vd2 = vec3.create();
            // vec3.sub(vd2, v2, v3);
            // var norm = vec3.create();
            // vec3.cross(norm, vd1, vd2);
            //
            // var winding;
            // var c1 = vec3.create(), c2 = vec3.create(), c3 = vec3.create();
            // vec3.sub(c1, v2, v1);
            // vec3.sub(c2, v3, v1);
            // vec3.cross(c3, c1, c2);
            //

            // console.log(c3);
            // v2 - v1 X v3 - v1
            
            var X=0,Y=1,Z=2;
            
            var u = vec3.create();
            vec3.sub(u, v2, v1);
            var v = vec3.create();
            vec3.sub(v, v3, v1);
            var norm = vec3.create();
            // vec3.cross(norm, vd1, vd2);
            norm[X] = u[Y]*v[Z] - u[Z]*v[Y];
            norm[Y] = u[Z]*v[X] - u[X]*v[Z];
            norm[Z] = u[X]*v[Y] - u[Y]*v[X];
            
            
            var winding;
            var c1 = vec3.create(), c2 = vec3.create(), c3 = vec3.create();
            vec3.sub(c1, v2, v1);
            vec3.sub(c2, v3, v1);
            vec3.cross(c3, c1, c2);
            // console.log(c3)
            
            
            vec3.normalize(norm, c3);
            nn[baseIdx] = 1*norm[0];
            nn[baseIdx+1] = 1*norm[1];
            nn[baseIdx+2] = 1*norm[2];
            nn[baseIdx+3] = 1*norm[0];
            nn[baseIdx+4] = 1*norm[1];
            nn[baseIdx+5] = 1*norm[2];
            nn[baseIdx+6] = 1*norm[0];
            nn[baseIdx+7] = 1*norm[1];
            nn[baseIdx+8] = 1*norm[2];
        }
        
    }
    
    Scene.prototype.synthesizeNormals = function (mesh) {
        /* Take 9 coords across 3 points, calculate direction vectors and dot products, overwrite the normals already there */
        var vv = mesh.vertices;
        var vi = mesh.indices;
        var nn = mesh.vertexNormals;
        for (var i=0; i<vi.length/3; i++) {
            var baseIdx = 3*i;
            var idx1 = vi[baseIdx], idx2 = vi[baseIdx+1], idx3 = vi[baseIdx+2];
            
            var v1 = vec3.fromValues(vv[3*idx1], vv[(3*idx1)+1], vv[(3*idx1)+2]);
            var v2 = vec3.fromValues(vv[3*idx2], vv[(3*idx2)+1], vv[(3*idx2)+2]);
            var v3 = vec3.fromValues(vv[3*idx3], vv[(3*idx3)+1], vv[(3*idx3)+2]);

            //
            // var vd1 = vec3.create();
            // vec3.sub(vd1, v1, v2);
            // var vd2 = vec3.create();
            // vec3.sub(vd2, v2, v3);
            // var norm = vec3.create();
            // vec3.cross(norm, vd1, vd2);
            //
            // var winding;
            // var c1 = vec3.create(), c2 = vec3.create(), c3 = vec3.create();
            // vec3.sub(c1, v2, v1);
            // vec3.sub(c2, v3, v1);
            // vec3.cross(c3, c1, c2);
            //

            // console.log(c3);
            // v2 - v1 X v3 - v1
            
            var X=0,Y=1,Z=2;
            
            var u = vec3.create();
            vec3.sub(u, v2, v1);
            var v = vec3.create();
            vec3.sub(v, v3, v1);
            var norm = vec3.create();
            // vec3.cross(norm, vd1, vd2);
            norm[X] = u[Y]*v[Z] - u[Z]*v[Y];
            norm[Y] = u[Z]*v[X] - u[X]*v[Z];
            norm[Z] = u[X]*v[Y] - u[Y]*v[X];
            
            // var winding;
            // var c1 = vec3.create(), c2 = vec3.create(), c3 = vec3.create();
            // vec3.sub(c1, v2, v1);
            // vec3.sub(c2, v3, v1);
            // vec3.cross(c3, c1, c2);
            // console.log(c3)
            
            
            vec3.normalize(norm, norm);
            // console.log(norm);
            // nn[baseIdx] = 1*norm[0];
            // nn[baseIdx+1] = 1*norm[1];
            // nn[baseIdx+2] = 1*norm[2];
            // nn[baseIdx+3] = 1*norm[0];
            // nn[baseIdx+4] = 1*norm[1];
            // nn[baseIdx+5] = 1*norm[2];
            // nn[baseIdx+6] = 1*norm[0];
            // nn[baseIdx+7] = 1*norm[1];
            // nn[baseIdx+8] = 1*norm[2];
            
            var f = 1;
            nn[3*idx1] = f*norm[0]; nn[(3*idx1)+1] = f*norm[1]; nn[(3*idx1)+2] = f*norm[2];
            nn[3*idx2] = f*norm[0]; nn[(3*idx2)+1] = f*norm[1]; nn[(3*idx2)+2] = f*norm[2];
            nn[3*idx3] = f*norm[0]; nn[(3*idx3)+1] = f*norm[1]; nn[(3*idx3)+2] = f*norm[2];
        }
        
    }
    
    
    Scene.prototype.analyseMesh = function (mesh) {
        var minX=Infinity, minY=Infinity, minZ=Infinity;
        var maxX=-Infinity, maxY=-Infinity, maxZ=-Infinity;
        var vv = mesh.vertices;
        for (var i=0; i<vv.length/3; i++) {
            var baseIdx = i*3;
            var myX = vv[baseIdx], myY = vv[baseIdx+1], myZ = vv[baseIdx+2];
            minX = Math.min(minX, myX); maxX = Math.max(maxX, myX);
            minY = Math.min(minY, myY); maxY = Math.max(maxY, myY);
            minZ = Math.min(minZ, myZ); maxZ = Math.max(maxZ, myZ);
        }
        var xRange = maxX - minX, yRange = maxY - minY, zRange = maxZ - minZ;
        var fitInDimension = 2.0;
        var suggestedScale = Math.min(fitInDimension/xRange, fitInDimension/yRange, fitInDimension/zRange);
        
        var suggX = maxX - (xRange/2);
        var suggZ = maxZ - (zRange/2);
        
        var nn = mesh.vertexNormals;
        var normLengths = [];
        for (var i=0; i<nn.length/3; i++) {
            var baseIdx = i*3;
            // var myX = nn[baseIdx], myY = nn[baseIdx+1], myZ = nn[baseIdx+2];
            var norm = vec3.fromValues(nn[baseIdx], nn[baseIdx+1], nn[baseIdx+2]);
            normLengths.push(vec3.length(norm));
        }
        
        
        return {minX:minX, maxX:maxX, minY:minY, maxY:maxY, minZ:minZ, maxZ:maxZ, 
            suggestedScale:suggestedScale,
            normLengths: normLengths,
            suggestedScaledTranslate: {
                y: -1*(minY*suggestedScale),
                x: -1*suggX*suggestedScale,
                z: -1*suggZ*suggestedScale
            },
            suggestedTranslate: {
                y: -1*(minY),
                x: -1*suggX,
                z: -1*suggZ
            }
        };
    }
    
    /* Perform a "hard translate" on a mesh by applying a fixed shunt factor to its coords */
    Scene.prototype.shuntMesh = function (mesh, shunt) {
        console.log('Shunting', shunt)
        var vv = mesh.vertices;
        for (var i=0; i<vv.length/3; i++) {
            var baseIdx = i*3;
            vv[baseIdx] += shunt.x || 0.0;
            vv[baseIdx+1] += shunt.y || 0.0;
            vv[baseIdx+2] += shunt.z || 0.0;
        }
    }
    
    Scene.prototype.loadModelAtIndex = function (idx) {
        var scene = this;
        var modelInf = scene.modelList.files[idx];
        
        var meshUrl = 'http://meshbase.io.codex.cx/mesher.pycg/'+modelInf.name+'?mode=mesh';
        FCShapeUtils.loadMesh(meshUrl, modelInf.binary)
        .then(function (mesh) {
            console.log('Loaded', modelInf.name);
            if (scene.currentObject) {
                var cull = scene.currentObject;
                scene.removeObject(cull);
                if (cull.mesh) {
                    scene.gl.deleteBuffer(cull.mesh.vertexBuffer);
                    scene.gl.deleteBuffer(cull.mesh.indexBuffer);
                    scene.gl.deleteBuffer(cull.mesh.textureBuffer);
                    scene.gl.deleteBuffer(cull.mesh.normalBuffer);
                }
                
            }
            var inf = scene.analyseMesh(mesh);
            scene.shuntMesh(mesh, inf.suggestedTranslate);
            /* If the vert normals don't seem to be valid, try and synth them. Doesn't really work that well but at */
            /* least you should be able to get a rough idea of what you're looking at so it's arguably better than nothing */
            if (!mesh.vertexNormals[0]) {
                console.log('Mesh is missing normals, synthesizing..');
                scene.synthesizeNormals(mesh);
            }
            // scene.synthesizeNormals(mesh);
            console.log(inf);
            var halfTurnY = {x:0, y:Math.PI, z:0};
            scene.currentObject = new FCShapes.MeshShape(mesh, null, {scale:inf.suggestedScale}, null, {shaderLabel:'diffuse', textureLabel:'white'});
            // scene.currentObject.translation.y = inf.suggestedScaledTranslateY;
            // scene.currentObject.translation.x = inf.suggestedScaledTranslateX;
            // scene.currentObject.translation.z = inf.suggestedScaledTranslateZ;
            
            // scene.currentObject.enableDebug = true;
            // scene.currentObject.DEBUGGING = true;
            
            // scene.currentObject.scratchPad = {lastReportAt:0};
            // scene.currentObject.behaviours.push(function (drawable, timepoint) {
            //     if ((timepoint - drawable.scratchPad.lastReportAt) > 1000) {
            //         console.log(drawable.debug);
            //         drawable.scratchPad.lastReportAt = timepoint;
            //     }
            // });
            scene.addObject(scene.currentObject);
        });
        
    }
    
    Scene.prototype.loadNextModel = function () {
        var scene = this;
        if (!scene.modelList) return;
        if (scene.currentModelIdx === null) {
            scene.currentModelIdx = 0;
        }
        
        var idx = scene.currentModelIdx++;
        scene.loadModelAtIndex(idx);
        console.log('Loading model with idx', idx);
        
    }
    
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
                {hex: '#007f00', label: 'green'},
                {hex: '#007f7f', label: 'teal'},
                {hex: '#00ff00', label: 'lime'},
                {hex: '#00ff7f', label: 'springgreen'},
                {hex: '#00ffff', label: 'cyan'},
                {hex: '#00ffff', label: 'aqua'},
                {hex: '#191970', label: 'dodgerblue'},
                {hex: '#20b2aa', label: 'lightseagreen'},
                {hex: '#228b22', label: 'forestgreen'},
                {hex: '#2e8b57', label: 'seagreen'},
                {hex: '#4169e1', label: 'royalblue'},
                {hex: '#ff0000', label: 'red'},
                {hex: '#ff00ff', label: 'magenta'},
                {hex: '#ffa500', label: 'orange'},
                {hex: '#ffff00', label: 'yellow'},
                {hex: '#000000', label: 'black'},
                {hex: '#888888', label: 'gray'},
                {hex: '#ffffff', label: 'white'}
            ];
            for (var i=0; i<texColors.length; i++) {
                var myTexColor = texColors[i];
                scene.addTextureFromColor(myTexColor, myTexColor.label);
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
                {srcFs: 'diffuse2.fs', srcVs: 'diffuse2.vs', label: 'diffuse'}
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
    
    Scene.prototype.makeButtonHandler = function () {
        var scene = this;
        /* Button handler for the controllers. The default button handler does 2 things: */
        /* 1). teleport to cursor location when grip button is pressed */
        /* 2). Output button status info when any button is pressed */
        /* Buttons are - 0: trackpad, 1: trigger 2: grip, 3: menu */
        var buttonHandler = function (gamepadIdx, btnIdx, btnStatus, sector, myButton, extra) {
            if (btnStatus != 'up') {
                console.log('Button idx', btnIdx, 'on controller', gamepadIdx, 'was', btnStatus);
                
                if (btnIdx == '0') {
                    if (sector == 'center' && btnStatus == 'released') {
                        scene.trackpadMode = ++scene.trackpadMode%2;
                        return;
                    }
                    switch (scene.trackpadMode) {
                    case 0:
                        if (sector == 'n') {
                            scene.currentObject.scaleFactor *= 1.005;
                        }
                        else if (sector == 's') {
                            scene.currentObject.scaleFactor *= 0.995;
                        }
                        else if (sector == 'w') {
                            scene.currentObject.orientation.y += 0.6/DEG;
                        }
                        else if (sector == 'e') {
                            scene.currentObject.orientation.y -= 0.6/DEG;
                        }
                        break;
                    case 1:
                        if (sector == 'n' && btnStatus == 'released') {
                            scene.currentObject.orientation.x -= 15/DEG;
                        }
                        else if (sector == 's' && btnStatus == 'released') {
                            scene.currentObject.orientation.x += 15/DEG;
                        }
                        else if (sector == 'w' && btnStatus == 'released') {
                            scene.currentObject.orientation.z += 15/DEG;
                        }
                        else if (sector == 'e' && btnStatus == 'released') {
                            scene.currentObject.orientation.z -= 15/DEG;
                        }
                        break;
                    }
                    
                }
                
                /* Trigger pressed. "Grab" or "release" the current object and allow it to be repositioned */
                else if (btnIdx == '1') {
                    
                    if (btnStatus == 'pressed') {
                        scene.grabCurrentObject(gamepadIdx);
                    }
                    else if (btnStatus == 'released') {
                        scene.releaseCurrentObject();
                    }
                    
                    
                    
                }
                
                
                
                if (btnIdx == '2' && btnStatus == 'pressed') {
                    scene.teleportUserToCursor();
                }
                if (btnIdx == '3' && btnStatus == 'pressed') {
                    scene.loadNextModel()
                }
            }
        };
        return buttonHandler;
    }
    
    Scene.prototype.setupScene = function () {
        var scene = this;
        var DEG=360/(2*Math.PI);
        var _hidden_beneath_floor = {x:0, y:-3.5, z:0};
        
        console.log('setting up');
        
        /* Cursor */
        var cursor = new FCShapes.SimpleCuboid(
            _hidden_beneath_floor,
            {w: 0.3, h:0.3, d:0.3},
            null,
            {label: 'cursor', shaderLabel: 'diffuse', textureLabel: 'red'}
        );
        /* Make the cursor revolve slowly */
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
        /* We use the floor collider to determine where the user is pointing their controller, and hence, */
        /* the location for the cursor. There are two stages to this, first is setting up the collider. */
        /* Note the planeNormal - this is the normal of the floor *before it is rotated into position*. */
        /* Basically any planar collider has to match the original state of an object before that object */
        /* is transformed. */
        /* This is perhaps counterintuitive and may change. Colliders generally are not as easy to use, yet, */
        /* as I would like. */
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
        

        var buttonHandler = scene.makeButtonHandler();
        /* Controller models are added just like any model in the scene; to make them track the controller, */
        /* a special behaviour is added. */
        /* Controller 0 (the green one) also has command of the cursor (having the cursor track both controllers */
        /* can get pretty weird pretty quickly). */
        /* This is the 2nd stage of the 2-stage process mentioned earlier. The cursor projects a ray which is */
        /* configured to interact with a set of colliders, in this case the floorCollider, which has a callback */
        /* which receives info on the collisions that occur so that the cursor can be updated. */
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
        scene.addObject(ctrl1);
        
        
        scene.loadModelList()
        .then(function () {
            if (scene.autoLoadIdx)
            scene.loadModelAtIndex(scene.autoLoadIdx);
        });
        
        
    }
    
    
    Scene.prototype.grabCurrentObject = function (gamepadIdx) {
        var scene = this;
        /* The initial translation values here are applying the exact opposite of the hand position. */
        /* When the behaviour is assigned, it will start updating the object's position directly to */
        /* match that of the controller (ie. the player's hand location) so we need to pre-emptively */
        /* cancel those out to keep the object's position from suddenly changing as it is grabbed. */
        scene.objectIsGrabbed = true;
        var obj = scene.currentObject;
        var hand = scene.playerSpatialState.hands[gamepadIdx]; //<<< watch out for this
        // obj.translation.x += -1*hand.pos.x;
        // obj.translation.y += -1*hand.pos.y;
        // obj.translation.z += -1*hand.pos.z;


        // obj.rotation.x = -1*hand.ori.x;
        // obj.rotation.y = -1*hand.ori.y;
        // obj.rotation.z = -1*hand.ori.z;
        // obj.ori

        // obj.behaviours.push(FCUtil.makeGamepadTracker(scene, gamepadIdx));
        
        var mkTranslater = function (initial) {
            console.log(initial);
            var tFn = function (drawable, timepoint) {
                var hand = scene.playerSpatialState.hands[gamepadIdx];
                var mat = mat4.create();
                var trans = vec3.fromValues(hand.pos.x-initial.x, hand.pos.y-initial.y, hand.pos.z-initial.z);
                mat4.fromTranslation(mat, trans);
                drawable.matrix = mat;
            }
            return tFn;
        }
        
        obj.behaviours.push(mkTranslater({
            x:hand.pos.x, 
            y:hand.pos.y, 
            z:hand.pos.z}));
    }
    
    Scene.prototype.quatToEuler = function (quat) {
        
        var target = {};
        var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
        //
        // toEuler = function(target,order){
        //     order = order || "YZX";
 
            var heading, attitude, bank;
            // var x = this.x, y = this.y, z = this.z, w = this.w;
 
            // switch(order){
            // case "YZX":
                var test = x*y + z*w;
                if (test > 0.499) { // singularity at north pole
                    heading = 2 * Math.atan2(x,w);
                    attitude = Math.PI/2;
                    bank = 0;
                }
                if (test < -0.499) { // singularity at south pole
                    heading = -2 * Math.atan2(x,w);
                    attitude = - Math.PI/2;
                    bank = 0;
                }
                if(isNaN(heading)){
                    var sqx = x*x;
                    var sqy = y*y;
                    var sqz = z*z;
                    heading = Math.atan2(2*y*w - 2*x*z , 1 - 2*sqy - 2*sqz); // Heading
                    attitude = Math.asin(2*test); // attitude
                    bank = Math.atan2(2*x*w - 2*y*z , 1 - 2*sqx - 2*sqz); // bank
                }
            //     break;
            // default:
            //     throw new Error("Euler order "+order+" not supported yet.");
            // }
 
            target.y = heading;
            target.z = attitude;
            target.x = bank;
        // };
        return target;
        
    }
    
    
    Scene.prototype.releaseCurrentObject = function () {
        var scene = this;
        scene.objectIsGrabbed = false;
        var obj = scene.currentObject;
        obj.behaviours = [];
        
        /* While the object is "grabbed" (ie. has a tracker behaviour applied) its matrix is being updated */
        /* constantly with one derived from the gamepad matrix. Now that the object is "released" we need to */
        /* capture those values and write them back into the object's translation and rotation attribs. */
        
        var rot = quat.create();
        var tra = vec3.create();
        mat4.getRotation(rot, obj.matrix);
        mat4.getTranslation(tra, obj.matrix);
        
        obj.translation.x = tra[0];
        obj.translation.y = tra[1];
        obj.translation.z = tra[2];
        
        /* Turns out converting a quaternion to a set of angles is fraught with complexity. SO let's just */
        /* store the quat for later use. If you can't beat 'em, join 'em, right? */
        // obj.rotationQuaternion = rot;
        
        // var vvv = vec3.fromValues(1,1,1);
        // var a = quat.getAxisAngle(vvv, rot);
        //
        //
        //
        // vec3.transformQuat(vvv, vvv, rot);
        // console.log(vvv);
        
        var rvec = scene.quatToEuler(rot);
        console.log(rvec);
        // obj.rotation.x = rvec[0];
        // obj.rotation.y = rvec[1];
        // obj.rotation.z = rvec[2];
        
        obj.rotation.x = rvec.x;
        obj.rotation.y = rvec.y;
        obj.rotation.z = rvec.z;
        
        // obj.rotation.x = quat.getAxisAngle(vvv, rot);
        // obj.rotation.y = quat.getAxisAngle([0,1,0], rot);
        // obj.rotation.z = quat.getAxisAngle([0,0,1], rot);
        
        obj.matrix = null;
        
        // obj.translation.x = obj.translation.x + obj.pos.x;
        // obj.translation.y = obj.translation.y + obj.pos.y;
        // obj.translation.z = obj.translation.z + obj.pos.z;
        // obj.pos = {x:0, y:0, z:0};
    }



    return Scene;
})();
