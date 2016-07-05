
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
            
            prereqPromises.push(new Promise(function (resolve, reject) {
                OBJ.downloadMeshes({
                    ctrl: 'body.obj'
                }, function (objs) {
                    OBJ.initMeshBuffers(scene.gl, objs.ctrl);
                    scene.meshes = objs;
                    resolve();
                })
                
            }));
            
            Promise.all(prereqPromises).then(function () {
                resolve();
            });
            
        })
        
        
        
        
    }
    
    Scene.prototype.loadObj = function (path, label) {
        var scene = this;
        return new Promise(function (resolve, reject) {
            OBJ.downloadMeshes({
                obj: path
            }, function (objs) {
                OBJ.initMeshBuffers(scene.gl, objs.obj);
                scene.meshes[label] = objs.obj;
                resolve(objs.obj);
            })
        })
    }
    
    Scene.prototype.easyObj = function (path, label, params) {
        var p = params || {};
        var scene = this;
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
                scene.addObject(o);
                scene.current = o;
                resolve(o);
            });
            
        })
    }
    
    Scene.prototype.quickAdd = function (label, params, suffix) {
        /* Suffix is handy for loading lowpoly versions */
        var scene = this;
        var myCfg = scene.objConfigs[label];
        var p = params || myCfg.params || {};
        var objpath = myCfg.path;
        if (suffix) {
            objpath = objpath.replace('.obj', '_'+suffix+'.obj');
        }
        return scene.easyObj(objpath, myCfg.label, p);
    }
    
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
        
        var addCfg = function (label, path, params) {
            scene.objConfigs[label] = {label: label, path: path, params: params};
        }
        
        
        // if (myCfg.rotate) {
        //     mdl.behaviours.push(function (drawable, timePoint) {
        //         drawable.currentOrientation = {x:0.0, y:Math.PI*2*(timePoint/7000), z:0.0};
        //     });
        // }
        
        
        addCfg('nymph_in_shell', 'obj/nymph_in_shell.obj', {scale:0.11, y:2.25, z:3.5, ry:180/DEG, textureLabel:'concrete01'});
        addCfg('android-bust', 'obj/bust_of_android_girl.obj', {scale: 0.0016, y: 1.3});
        addCfg('beachgirl', 'obj/beach_girl.obj', {scale:0.43, ry:-3.41, z:3});
        addCfg('satyr', 'obj/satyr.obj', {scale:0.02, x:2, y:0, z:4, ry:-3.96});
        addCfg('qilinsongbao', 'obj/qilinsongbao.obj', {scale: 0.014, ry:-3.32, z:3});
        addCfg('hostess', 'obj/woman.obj', {scale:1.0, ry:180/DEG});
        addCfg('mermaid', 'obj/mermaid.obj', {scale:0.005, ry: 2.27, z:2.5});
        addCfg('nude-classical', 'obj/nude_classical_1.obj', {scale:0.127, ry:0.687});
        addCfg('nude-figure', 'obj/figure_posing_nude.obj', {scale:0.028, ry:2.39});
        addCfg('nude-vanille', 'obj/nude_vanille.obj', {scale:0.014, ry:2.71});
        addCfg('nude-standing', 'obj/nude_woman.obj', {scale: 0.001});
        addCfg('nude-reclining', 'obj/nude_reclining.obj', {scale: 0.002, y:-0.65, z:1.8, ry:180/DEG});
        addCfg('nude-kneeling', 'obj/kneeling.obj', {scale:0.013, ry:2.1/RAD});
        addCfg('nude-almost', 'obj/almost_nude.obj', {scale:0.01, ry:2.9});
                
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
            size: {scale:0.01},
            rotate: {x:0/DEG, y:0/DEG, z:0/DEG}, 
            greenColor: scene.addTextureFromColor({r:0.2, g:0.9, b:0.6}),
            blueColor: scene.addTextureFromColor({r:0.2, g:0.6, b:0.9})
        };
        
        var teleportUserToCursor = function () {
            var curs = scene.getObjectByLabel('cursor');
            scene.moveRaftAndPlayerTo(curs.pos);
        }
        
        
        var buttonHandler = function (gamepadIndex, btnIdx, btnStatus, sector, myButton, extra) {
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
            else if (btnIdx == '2' && btnStatus == 'pressed') {
                teleportUserToCursor();
            }
            else if (btnStatus == 'pressed') {
                console.log('Button idx', btnIdx, 'pressed.');
            }
        }
        
        // var rayProjector = FCUtil.makeControllerRayProjector(scene, gpIdx, sceneColliders)
        
        var ctrl0 = new LoaderObj(
            scene.meshes['ctrl'],
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
        
        var ctrl1 = new LoaderObj(
            scene.meshes['ctrl'],
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
        
    }

    return Scene;
})();
