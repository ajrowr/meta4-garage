
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
        this.latest = null;
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
                scene.latest = o;
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
        
        
        var cfgs = {
            n1: {
                pos: {x:0.5, y:0, z:1.8},
                sz: {scale:0.01},
                rotate: true
            },
            n2: {
                sz: {scale:0.002},
                pos: {x:0.0, y:0.0, z:3}
            },
            n3: {
                pos: {x:0.5, y:0, z:2.0},
                rotate: true
                
            },
            n3n: {
                pos: {x:0.5, y:0, z:2.0},
                rotate: true
                
            },
            n4: {
                sz: {scale:0.01},
                pos: {x:0.5, y:0, z:2.8},
                rotate: true
            },
            n5: {
                rotate: true,
                pos: {x:0, y:0, z:2.75},
                sz: {scale: 0.016}
            },
            n6: {
                rotate: true,
                pos: {x:0, y:0, z:2.75},
                sz: {scale: 0.012}
            },
            m1: {
                sz: {scale: 0.2},
                pos: {x:0, y:1, z:2},
                rotate: true
            },
            n9: {
                sz: {scale:0.01},
                pos: {x:0.5, y:0, z:2.8},
                rotate: true
            },
            n14: {
                sz: {scale:0.002},
                pos: {x:0.5, y:-1, z:2.0},
                rotate: true,
                meshLimit: 366780
            },
            n14a: {
                sz: {scale:0.001},
                pos: {x:0.5, y:0, z:2.0},
                rotate: true
            },
            n16: {
                sz: {scale:0.01},
                pos: {x:0.5, y:0, z:2.8},
                rotate: true
            },
            n17: {
                sz: {scale:0.002},
                pos: {x:1, y:-0.64, z:1.0},
                rotate: false,
                ori: {x:0, y:Math.PI, z:0}
            },
            n10: {
                sz: {scale: 0.01},
                pos: {x:0, y:4, z:5},
                rotate: true
            },
            s1: {
                sz: {scale: 0.02},
                pos: {x:0, y:0, z:5},
                ori: {x:0, y:1.62, z:0}
                // rotate: true
            },
            ql1: {
                sz: {scale: 0.02},
                pos: {x:0, y:0, z:5},
                ori: {x:0, y:Math.PI, z:0}                
            },
            nym1: {
                sz: {scale: 0.13},
                pos: {x:0, y:3, z:5},
                ori: {x:0, y:Math.PI, z:0}                
            },
            
            default: {
                sz: {scale: 0.5},
                pos: {x:0, y:1, z:5},
                rotate: true
            }
            
        }
        
        // var configs = {};
        var addCfg = function (label, path, params) {
            scene.objConfigs[label] = {label: label, path: path, params: params};
        }
        
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
        
        OBJ.downloadMeshes({
            // n1: 'almost_nude.obj', // 21mb, good but incomplete +
            // n10: 'bust_of_android_girl.obj', // 2.4mb and geniunely fucking excellent
            // n14a: 'nude_woman__alt9.obj', //
            // n17: 'sexy_girl__alt3.obj',
            // n3: 'woman.obj',
            // bg1: 'beach_girl.obj',
            // n5: 'kneeling.obj', // 21.3mb, good but incomplete +
            // n14: 'nude_woman.obj', // 17.7mb partial, no normals ~
            // n16: 'Talia.obj', //1.4mb good but no normals ~
            // nym1: 'nymph_in_shell_hires.obj',
            // s1: 'satyr.obj',
            // ql1: 'qilinsongbao.obj',
            body1: 'body.obj',
            // m1: 'suzanne.obj' // 79kb monkey

            // n1: 'almost_nude__alt2.obj', // 21mb, good but incomplete +
            // n9: 'Dangerous_girl.obj', // 2.7mb, really good ++
            // n10: 'bust_of_android_girl__alt2.obj', // 2.4mb and geniunely fucking excellent
            // n14a: 'nude_woman.obj', //
            // n17: 'sexy_girl.obj',
            // n3: 'woman__alt4.obj',
            // n3n: 'woman__alt_n3.obj',
            // n4: 'girl_in_stockings.obj', // 2.4mb, good ++
            // n5: 'kneeling__alt2.obj', // 21.3mb, good but incomplete +

            // n6: 'pregnant.obj', // 17mb, good but incomplete +
            // n7: 'nude_art.obj', // 29mb freakout --
            // n8: 'girl.obj', // 56mb freakout --
            // n11: 'woman_body.obj', // 5.9mb partial dismembered -
            // n12: 'nude_on_stand.obj', // 6.4mb set limit to 110310 for a point cloud
            // n13: 'photoshoot.obj', // 13mb trainwreck --
            // n15: 'girl_2.obj', //24mb nup --
        }, function (meshes) {
            var which = 'body1';
            console.debug(meshes);
            window.MESHES = meshes;
            var myMesh = meshes[which];
            var myCfg = cfgs[which] || cfgs.default;
            window.MESHLIMIT = myCfg.meshLimit || Infinity;
            OBJ.initMeshBuffers(scene.gl, myMesh);
            var mdl = new LoaderObj(myMesh, myCfg.pos, myCfg.sz, myCfg.ori, {label:'sculpture', shaderLabel: 'diffuse', textureLabel:'forestgreen'});
            window.MDL = mdl;
            if (myCfg.rotate) {
                mdl.behaviours.push(function (drawable, timePoint) {
                    drawable.currentOrientation = {x:0.0, y:Math.PI*2*(timePoint/7000), z:0.0};
                });
            }
            // window.MESHLIMIT=0;
            // window.setInterval(function (){window.MESHLIMIT+=3000;}, 50);
            scene.addObject(mdl);
        })
        
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
            translate: {x:0.00, y:0, z:0.0},
            size: {scale:0.01},
            rotate: {x:0/DEG, y:0/DEG, z:0/DEG}, 
            greenColor: scene.addTextureFromColor({r:0.2, g:0.9, b:0.6}),
            blueColor: scene.addTextureFromColor({r:0.2, g:0.6, b:0.9})
        };
        
        
        var buttonHandler = function (gamepadIndex, btnIdx, btnStatus, sector, myButton, extra) {
            if (btnIdx == '0' && btnStatus == 'held') {
                if (sector == 'n') {
                    scene.latest.scaleFactor *= 1.005;
                }
                else if (sector == 's') {
                    scene.latest.scaleFactor *= 0.995;
                }
                else if (sector == 'w') {
                    scene.latest.orientation.y += 0.2/DEG;
                }
                else if (sector == 'e') {
                    scene.latest.orientation.y -= 0.2/DEG;
                }
            }
            // console.log(btnIdx, btnStatus, sector);
        }
        
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
        scene.addObject(ctrl1);
        
    }

    return Scene;
})();
