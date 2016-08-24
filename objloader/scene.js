
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

                    // scene.quickAdd(tmpl.base, {scale:scaleFactor, x:curs.pos.x, z: curs.pos.z, y:tmplCfg.params.y}, null, false)
                    
                    /* Add a placeholder */
                    var placeholder = new FCShapes.LatheShape(
                        {x:curs.pos.x, y:0, z:curs.pos.z}, 
                        {height:0.5, profile:[0, 0.2, 0.2, 0.2, 0]}, null, 
                        {shaderLabel:'diffuse', textureLabel:'yellow', segmentCount:50}
                    );
                    scene.addObject(placeholder);
                    

                    scene.quickAdd2(tmpl, {x:curs.pos.x, y:0, z:curs.pos.z}, tmpl.actualSuffix, false)
                    .then(function (obj) {
                        scene.removeObject(placeholder);
                        scene.addObject(obj);
                        scene.current = obj;
                    })
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
            
            
            
            // prereqPromises.push(new Promise(function (resolve, reject) {
            //     OBJ.downloadMeshes({
            //         ctrl: '/assets/obj/ctrl_lowpoly_body.obj'
            //     }, function (objs) {
            //         OBJ.initMeshBuffers(scene.gl, objs.ctrl);
            //         scene.meshes = objs;
            //         resolve();
            //     })
            //
            // }));
            
            Promise.all(prereqPromises).then(function () {
                resolve();
            });
            
        })
        
        
        
        
    }
    
    Scene.prototype.loadObj = function (path, label) {
        var scene = this;
        return new Promise(function (resolve, reject) {
            if (scene.meshes[label]) {
                resolve(scene.meshes[label]);
            }
            else {
                FCShapeUtils.loadObj(path)
                .then(function(mesh) {
                    scene.meshes[label] = mesh;
                    resolve(mesh);
                });
                
                // OBJ.downloadMeshes({
                //     obj: path
                // }, function (objs) {
                //     OBJ.initMeshBuffers(scene.gl, objs.obj);
                //     scene.meshes[label] = objs.obj;
                //     resolve(objs.obj);
                // })
            }
        })
    }
    
    Scene.prototype.easyObj = function (path, label, params, addToScene) {
        var p = params || {};
        var scene = this;
        if (addToScene === undefined) {
            addToScene = true;
        }
        // var DEG=360/(2*Math.PI);
        return new Promise(function (resolve, reject) {
            scene.loadObj(path, label).then(function (mesh) {
                var o = new LoaderObj(
                    mesh,
                    {x: p.x || 0, y: p.y || 0, z: p.z || 2},
                    {scale: p.scale || 0.05},
                    {x: p.rx || 0, y: p.ry || 0, z: p.rz || 0},
                    {shaderLabel: p.shaderLabel || 'diffuse', 
                     textureLabel: p.textureLabel || 'forestgreen', 
                     label: label || p.label || path}
                );
                if (p.rotate) {
                    // ...
                }
                if (addToScene) {
                    scene.addObject(o);
                    scene.current = o;
                }
                resolve(o);
            });
            
        })
    }
    
    Scene.prototype.ezObj = function (fname, label, params) {
        if (!label) label = fname;
        var scene = this;
        var path;
        if (fname.indexOf('://') >= 0) {
            path = fname;
        }
        else {
            path = '/assets/obj/content/'+fname;
        }
        scene.easyObj(path, label, params)
        .then(function (obj) {
            scene.current = obj;
        });
        
    }
    
    Scene.prototype.setObjPair = function (fnameBase, suffix1, suffix2) {
    }
    
    
    Scene.prototype.quickLoad = function (label, params, suffix) {
        
    }
    
    Scene.prototype.quickAdd = function (label, params, suffix, addToScene) {
        /* Suffix is handy for loading lowpoly versions */
        var scene = this;
        var myCfg = scene.objConfigs[label];
        var p = params || myCfg.params || {};
        var objpath = myCfg.path;
        if (suffix) {
            objpath = objpath.replace('.obj', '_'+suffix+'.obj');
        }
        return scene.easyObj(objpath, myCfg.label+(suffix?'_'+suffix:''), p, addToScene);
    }
    
    Scene.prototype.quickAdd2 = function (cfg, params, suffix, addToScene) {
        var scene = this;
        var p = cfg.params || params || {};
        // var objpath = '/assets/obj/content/'+cfg.base;
        var objpath = scene.assetPrefix + cfg.base;
        if (suffix) {
            objpath = objpath.replace('.obj', '_'+suffix+'.obj');
        }
        return scene.easyObj(objpath, cfg.label+(suffix?'_'+suffix:''), p, addToScene);
        
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
        
        
        scene.templatesList = [
            {base: 'android-bust'},
            {base: 'mermaid', previewSuffix:'20k'},
            {base: 'beachgirl', previewSuffix: '20k'},
            {base: 'satyr', previewSuffix: '10k'},
            {base: 'qilinsongbao', previewSuffix: '10k'},
            {base: 'nymph-in-shell', previewSuffix:'10k'},
            {base: 'hostess', previewSuffix: '10k'},
                            
                
            // {base: 'nude-almost', previewSuffix:'10k'},
            // {base: 'nude-classical', previewSuffix: '3k'},
            // {base: 'nude-figure', previewSuffix: '20k'},
            // {base: 'nude-vanille'},
            // {base: 'nude-standing', previewSuffix: '10k'},
            // {base: 'nude-reclining', previewSuffix: '10k'},
            // {base: 'nude-kneeling', previewSuffix: '10k'},
        ];
        
        scene.templatesList2 = [
            {base: 'buddha.obj', label: 'buddha', previewSuffix:'10k', actualSuffix:'100k'},
            // {base: 'html5bot.obj', label: 'html5bot', previewSuffix:'5k', actualSuffix:'100k'},
            {base: 'goldfish.obj', label: 'goldfish', previewSuffix:'25k', actualSuffix:'100k'},
            // {base: 'tiptoes.obj', label: 'tiptoes', previewSuffix:'10k', actualSuffix:'100k'},
            {base: 'android_girl_bust.obj', label: 'android_girl', previewSuffix:'10k', actualSuffix:''},
            // {base: '.obj', label: '', previewSuffix:'10k', actualSuffix:'100k'},
            // {base: '.obj', label: '', previewSuffix:'10k', actualSuffix:'100k'},
            // {base: '.obj', label: '', previewSuffix:'10k', actualSuffix:'100k'},
            // {base: '.obj', label: '', previewSuffix:'10k', actualSuffix:'100k'},
            {base: 'mingdog.obj', label: 'mingdog', previewSuffix:'10k', actualSuffix:'100k'},
            // {base: 'satyr.obj', label: 'satyr', previewSuffix:'10k', actualSuffix:'100k'},
            // {base: 'nymph_in_shell.obj', label: 'nymph_in_shell', previewSuffix:'10k', actualSuffix:'100k'}
            
            
        ]
        
        /* Let's revamp the loader but let's not do it just now */
        // scene.modelsList = [
        //     {label: 'goldfish-statue', group: 'sculpture', meshbase: '/assets/obj/content/goldfish.obj'}
        // ]
        
        var addCfg = function (label, path, params) {
            scene.objConfigs[label] = {label: label, path: path, params: params};
            var whichGrp;
            if (label.indexOf('nude') == 0) {
                whichGrp = 'nude';
            }
            else {
                whichGrp = 'general';
            }
            var myGrp = scene.modelGroups[whichGrp];
            // myGrp.items.push()
        }
        
        
        // if (myCfg.rotate) {
        //     mdl.behaviours.push(function (drawable, timePoint) {
        //         drawable.currentOrientation = {x:0.0, y:Math.PI*2*(timePoint/7000), z:0.0};
        //     });
        // }
        
        
        addCfg('nymph-in-shell', '/assets/obj/content/nymph_in_shell.obj', {scale:0.11, y:2.25, z:3.5, ry:180/DEG, textureLabel:'concrete01'});
        addCfg('android-bust', '/assets/obj/content/bust_of_android_girl.obj', {scale: 0.0016, y: 1.3});
        addCfg('satyr', '/assets/obj/content/satyr.obj', {scale:0.02, x:2, y:0, z:4, ry:-3.96});
        addCfg('qilinsongbao', '/assets/obj/content/qilinsongbao.obj', {scale: 0.014, ry:-3.32, z:3});
        addCfg('hostess', '/assets/obj/content/woman.obj', {scale:1.0, ry:180/DEG});
        addCfg('mermaid', '/assets/obj/content/mermaid.obj', {scale:0.005, ry: 2.27, z:2.5});

        // addCfg('beachgirl', '/assets/obj/content/beach_girl.obj', {scale:0.43, ry:-3.41, z:3});
        // addCfg('nude-classical', '/assets/obj/content/nude_classical_1.obj', {scale:0.127, ry:0.687});
        // addCfg('nude-figure', '/assets/obj/content/figure_posing_nude.obj', {scale:0.028, ry:2.39});
        // addCfg('nude-vanille', '/assets/obj/content/nude_vanille.obj', {scale:0.014, ry:2.71});
        // addCfg('nude-standing', '/assets/obj/content/nude_woman.obj', {scale: 0.001});
        // addCfg('nude-reclining', '/assets/obj/content/nude_reclining.obj', {scale: 0.002, y:-0.65, z:1.8, ry:180/DEG});
        // addCfg('nude-kneeling', '/assets/obj/content/kneeling.obj', {scale:0.013, ry:2.1/RAD});
        // addCfg('nude-almost', '/assets/obj/content/almost_nude.obj', {scale:0.01, ry:2.9});

        var contentdir = '/assets/obj/content/';
        // addCfg('', contentdir+'');
        // addCfg('', contentdir+'');
        // addCfg('', contentdir+'');
        // addCfg('', contentdir+'');
                
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
    
    Scene.prototype.showPreviewModel = function (idx) {
        var scene = this;
        var tmpl = scene.templatesList2[idx];
        // var tmplCfg = scene.objConfigs[tmpl.base];
        // console.log(tmpl, tmplCfg);
        // console.log(tmplCfg.params.scale);
        // var previewFactor = 9.0;
        // var scaleFactor = tmplCfg.params.scale/previewFactor;
        var scaleFactor = 0.01;
        scene.quickAdd2(tmpl, {scale: scaleFactor}, tmpl.previewSuffix, false)
        .then(function (obj) {
            if (scene.previewModel) {
                scene.removeObject(scene.previewModel);
            }
            // var ytrans = 0.07+((tmplCfg.params.y || 0) / previewFactor);
            // console.log(ytrans);
            // obj.translation.y = 0.01+(tmplCfg.params.y * tmplCfg.params.scale);
            // obj.translation.y = 0.05;
            
            // obj.translation.y = ytrans - 0.1;
            obj.translation.y = 0.00;
            obj.translation.z = -0.04;
            obj.rotation.x = -1.101;
            obj.groupLabel = 'uiChrome';
            obj.behaviours.push(FCUtil.makeGamepadTracker(scene, 0, null));
            scene.addObject(obj);
            scene.previewModel = obj;
        })
        
    }

    return Scene;
})();
