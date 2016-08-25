
var P = FCPrimitives;
var LoaderObj = function (mesh, pos, size, rotate, params) {
    this.mesh = mesh;
    var sz = size || {};
    this.scaleFactor = sz.scale || 1.0;
    P.Drawable.call(this, pos, size, rotate, params);
}

LoaderObj.prototype = Object.create(P.Drawable.prototype);

LoaderObj.prototype.divulge = function () {
    return {};
}




window.ExperimentalScene = (function () {
    "use strict";
    
    function Scene() {
        /* Declare any class and instance vars unique to this scene, here. */
        FCScene.call(this);
        
        this.objConfigs = {};
        this.current = null;
        
        this.modelGroups = {
            general: {
                items: []
            },
        };
        this.uiMode = -1;
        this.uiState = {};
        
        this.previewModel = null;
        this.previewModelIdx = 0;
        
        this.templatesList = [];
        
        this.uiModeButtonHandler = function () {};
        
        this.currentTemplate = null; // { base: previewSuffix: actualSuffix: }
        
        this.assetPrefix = '//assets.meta4vr.net/mesh/obj/content/';
        
    }
    
    Scene.prototype = Object.create(FCScene.prototype);
        
    Scene.prototype.incrementUIMode = function () {
        var scene = this;
        var DEG=360/(2*Math.PI);
        var RAD=1;
        
        scene.uiMode += 1;
        scene.uiMode %= 3;
        
        scene.removeObjectsInGroup('uiChrome');
        
        console.log('Switching UI to mode', scene.uiMode);
        
        /* Choosing models */
        /* Trackpad left/right to select */
        /* Trigger to place */
        if (scene.uiMode == 0) {
            scene.showPreviewModel(scene.previewModelIdx);
            scene.uiModeButtonHandler = function (gamepadIndex, btnIdx, btnStatus, sector, myButton, extra) {
                if (btnIdx == '0' && btnStatus == 'pressed') {
                    scene.previewModelIdx = (scene.previewModelIdx + 1) % scene.templatesList2.length;
                    scene.showPreviewModel(scene.previewModelIdx)
                }
                else if (btnIdx == '1' && btnStatus == 'pressed') {
                    var curs = scene.getObjectByLabel('cursor');

                    // var tmpl = scene.templatesList[scene.previewModelIdx];
                    // var tmplCfg = scene.objConfigs[tmpl.base];
                    // var scaleFactor = tmplCfg.params.scale;
                    
                    var tmpl = scene.templatesList2[scene.previewModelIdx];
                    var scaleFactor = 0.1;
                    
                    var loc = {x: curs.pos.x, y: 0, z: curs.pos.z};
                    var placeholder2;
                    scene.loadMesh(scene._getSuffixedPath(tmpl, tmpl.previewSuffix), tmpl.label+'__preview')
                    .then(function (mesh) {
                        placeholder2 = new FCShapes.MeshShape(
                            mesh, loc,
                            {scale: 0.07},
                            null,
                            {shaderLabel:'diffuse', textureLabel:'yellow'}
                        );
                        // placeholder2.drawMode = scene.gl.LINES;
                        scene.addObject(placeholder2);
                    });
                    
                    var theObj;
                    scene.loadMesh(scene._getSuffixedPath(tmpl, tmpl.actualSuffix), tmpl.label)
                    .then(function (mesh) {
                        theObj = new FCShapes.MeshShape(
                            mesh, loc,
                            {scale: 0.07},
                            null,
                            {shaderLabel:'diffuse', textureLabel:'green'}
                        );
                        scene.removeObject(placeholder2);
                        scene.addObject(theObj);
                        scene.current = theObj;
                    });
                    
                }
            }
        }
        /* Size, pos and rotate */
        /* Trackpad left/right to rotate, up/down to scale */
        /* Trigger to reposition */
        else if (scene.uiMode == 1) {
            
            
            scene.uiModeButtonHandler = function (gamepadIndex, btnIdx, btnStatus, sector, myButton, extra) {
                if (btnIdx == '0' && btnStatus == 'held') {
                    if (sector == 'n') {
                        scene.current.scaleFactor *= 1.005;
                    }
                    else if (sector == 's') {
                        scene.current.scaleFactor *= 0.995;
                    }
                    else if (sector == 'w') {
                        scene.current.orientation.y += 0.6/DEG;
                    }
                    else if (sector == 'e') {
                        scene.current.orientation.y -= 0.6/DEG;
                    }
                }
                else if (btnIdx == '1' && btnStatus=='pressed'){
                    var curs = scene.getObjectByLabel('cursor');
                    scene.current.pos = {
                        x: curs.pos.x,
                        y: scene.current.pos.y,
                        z: curs.pos.z
                    };
                }
                else if (btnStatus == 'pressed') {
                    console.log('Button idx', btnIdx, 'pressed.');
                }
            }
            
            
            
        }
        /* Colour */
        /* Trackpad left/right to choose colour */
        /* Trigger to paint */
        else if (scene.uiMode == 2) {
            
            
            scene.uiModeButtonHandler = function (gamepadIndex, btnIdx, btnStatus, sector, myButton, extra) {
                
            }
            
        }
        
        /* Select things */
        else if (scene.uiMode == 3) {
            
        }
        

    }
    
    Scene.prototype.setupPrereqs = function () {
        var scene = this;
        var prereqPromises = [];
        return new Promise(function (resolve, reject) {

            var textures = [
                {src: '../assets/concrete01.jpg', label: 'concrete01'}
            ];
            
            var texColors = [
                {hex: '#000000', label: 'black'},
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
                
                // {hex: '', label: ''},
                // {hex: '', label: ''},
                // {hex: '', label: ''},
                // {hex: '', label: ''},
                {hex: '#ffffff', label: 'white'}
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
                        
            Promise.all(prereqPromises).then(function () {
                resolve();
            });
            
        })
        
        
        
        
    }
    
    Scene.prototype.loadMesh = function (path, label) {
        var scene = this;
        return new Promise(function (resolve, reject) {
            if (scene.meshes[label]) {
                console.log('Returning cached mesh', label);
                resolve(scene.meshes[label]);
            }
            else {
                FCShapeUtils.loadObj(path)
                .then(function(mesh) {
                    console.log('Loaded mesh', label, 'from', path);
                    scene.meshes[label] = mesh;
                    resolve(mesh);
                });
                
            }
        })
    }
    
    
    Scene.prototype.showPreviewModel = function (idx) {
        var scene = this;
        var tmpl = scene.templatesList2[idx];
        var scaleFactor = 0.01;
        
        var newPreview;
        scene.loadMesh(scene._getSuffixedPath(tmpl, tmpl.previewSuffix), tmpl.label + '__preview')
        .then(function (mesh) {
            if (scene.previewModel) {
                scene.removeObject(scene.previewModel);
            }
            
            newPreview = new FCShapes.MeshShape(mesh, null, {scale:0.01}, null, {shaderLabel:'diffuse', textureLabel:'green'});
            newPreview.translation.y = 0.00;
            newPreview.translation.z = -0.04;
            newPreview.rotation.x = -1.101;
            newPreview.groupLabel = 'uiChrome';
            newPreview.behaviours.push(FCUtil.makeGamepadTracker(scene, 0, null));
            scene.addObject(newPreview);
            scene.previewModel = newPreview;
            
        });
        
        
    }
    
    
    
    Scene.prototype._getSuffixedPath = function (cfg, suffix) {
        var scene = this;
        var objpath = scene.assetPrefix + cfg.base;
        if (suffix) {
            objpath = objpath.replace('.obj', '_'+suffix+'.obj');
        }
        return objpath;
    }
    
    // console.log('To easily load an unconfigured obj, ')
    
    Scene.prototype.del = function (labelOrObj) {
        if (labelOrObj.pos) {
            this.removeObject(labelOrObj);
        }
        else {
            this.removeObject(this.getObjectByLabel(labelOrObj));
        }
    }
    
    Scene.prototype.setupScene = function () {
        var scene = this;
        var DEG=360/(2*Math.PI);
        var RAD=1;
        var _hidden_beneath_floor = {x:0, y:-3.5, z:0};
        
        console.log('setting up');
        
        // Goldfish http://3dmag.org/en/market/download/item/2098/
        
        
        // http://3dmag.org/en/market/tag/18/
                
        scene.templatesList2 = [
            {base: 'buddha.obj', label: 'buddha', previewSuffix:'10k', actualSuffix:'100k'},
            {base: 'goldfish.obj', label: 'goldfish', previewSuffix:'25k', actualSuffix:'100k'},
            {base: 'mingdog.obj', label: 'mingdog', previewSuffix:'10k', actualSuffix:'100k'},
        ]
        
        /* Let's revamp the loader but let's not do it just now */
        // scene.modelsList = [
        //     {label: 'goldfish-statue', group: 'sculpture', meshbase: '/assets/obj/content/goldfish.obj'}
        // ]
        
        /* Floor */
        var floor = new FCShapes.WallShape(
            {x: 0, z: 0, y: -0.02},
            {minX: -20, maxX: 20, minY: -20, maxY: 20},
            {x:270/DEG, y:0/DEG, z:0/DEG},
            {label: 'floor', textureLabel: 'concrete01', shaderLabel: 'diffuse', segmentsX: 10, segmentsY: 10}
        );
        /* Quirk here - we have to give the plane normal of the thing we're aligned with BEFORE it is rotated into place? */
        var floorCollider = new FCUtil.PlanarCollider({planeNormal:[0, 0, -1], pointOnPlane:[0,0,0]}, floor, null);
        floorCollider.callback = function (dat) {
            // console.log(dat);
            updateReadout('A', dat.collisionPoint[0]);
            updateReadout('B', dat.collisionPoint[1]);
            updateReadout('C', dat.collisionPoint[2]);
            var c = scene.getObjectByLabel('cursor');
            c.pos.x = dat.collisionPoint[0];
            c.pos.y = dat.collisionPoint[1];
            c.pos.z = dat.collisionPoint[2];
        }
        scene.addObject(floor);
        
        
        /* Cursor */
        var cursor = new FCShapes.SimpleCuboid(
            // scene.cursorOrigin,
            {x:0, y:0, z:0},
            {w: 0.3, h:0.3, d:0.3},
            null,
            {label: 'cursor', shaderLabel: 'diffuse', texture: scene.addTextureFromColor({r:0.6, g:0.6, b: 0.6})}
        );
        // cursor.behaviours.push(function (drawable, timePoint) {
        //     drawable.currentOrientation = {x:0.0, y:Math.PI*2*(timePoint/7000), z:0.0};
        // });
        scene.addObject(cursor);
        
        
        
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
            translate: {x:0.00, y:0, z:0.0},
            size: {scale:1.0},
            rotate: {x:0/DEG, y:0/DEG, z:0/DEG}, 
            greenColor: scene.addTextureFromColor({r:0.2, g:0.9, b:0.6}),
            blueColor: scene.addTextureFromColor({r:0.2, g:0.6, b:0.9})
        };
        
        var teleportUserToCursor = function () {
            var curs = scene.getObjectByLabel('cursor');
            scene.moveRaftAndPlayerTo(curs.pos);
        }
        
        var buttonHandler = function (gamepadIndex, btnIdx, btnStatus, sector, myButton, extra) {
            // if (btnStatus == 'held') {
            //     console.log(btnIdx);
            // }
            if (btnStatus == 'pressed' && btnIdx == '3') {
                scene.incrementUIMode();
            }
            else if (btnIdx == '2' && btnStatus == 'pressed') {
                teleportUserToCursor();
            }
            else {
                return scene.uiModeButtonHandler(gamepadIndex, btnIdx, btnStatus, sector, myButton, extra);
            }
            
        }
        
        
        // var buttonHandler = function (gamepadIndex, btnIdx, btnStatus, sector, myButton, extra) {
        //     if (btnIdx == '0' && btnStatus == 'held') {
        //         if (sector == 'n') {
        //             scene.current.scaleFactor *= 1.005;
        //         }
        //         else if (sector == 's') {
        //             scene.current.scaleFactor *= 0.995;
        //         }
        //         else if (sector == 'w') {
        //             scene.current.orientation.y += 0.6/DEG;
        //         }
        //         else if (sector == 'e') {
        //             scene.current.orientation.y -= 0.6/DEG;
        //         }
        //     }
        //     else if (btnIdx == '1' && btnStatus=='pressed'){
        //         var curs = scene.getObjectByLabel('cursor');
        //         scene.current.pos = {
        //             x: curs.pos.x,
        //             y: scene.current.pos.y,
        //             z: curs.pos.z
        //         };
        //     }
        //     else if (btnIdx == '2' && btnStatus == 'pressed') {
        //         teleportUserToCursor();
        //     }
        //     else if (btnStatus == 'pressed') {
        //         console.log('Button idx', btnIdx, 'pressed.');
        //     }
        // }
        
        // var rayProjector = FCUtil.makeControllerRayProjector(scene, gpIdx, sceneColliders)
        
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
        ctrl0.translation = ctrlInfo.translate;
        ctrl0.rotation = ctrlInfo.rotate;
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
        ctrl1.translation = ctrlInfo.translate;
        ctrl1.rotation = ctrlInfo.rotate;
        ctrl1.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, buttonHandler));
        // ctrl1.behaviours.push(FCUtil.makeControllerRayProjector(scene, 1, [floorCollider]));
        scene.addObject(ctrl1);
        
        
        
        scene.incrementUIMode();
        
    }
    

    return Scene;
})();
