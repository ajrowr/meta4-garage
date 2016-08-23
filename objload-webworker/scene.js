

var _buildBuffer = function( gl, type, data, itemSize ){
    var buffer = gl.createBuffer();
    var arrayView = type === gl.ARRAY_BUFFER ? Float32Array : Uint32Array;
    gl.bindBuffer(type, buffer);
    gl.bufferData(type, new arrayView(data), gl.STATIC_DRAW);
    buffer.itemSize = itemSize;
    buffer.numItems = data.length / itemSize;
    return buffer;
}

var _initMeshBuffers = function( gl, mesh ){
    mesh.normalBuffer = _buildBuffer(gl, gl.ARRAY_BUFFER, mesh.vertexNormals, 3);
    mesh.textureBuffer = _buildBuffer(gl, gl.ARRAY_BUFFER, mesh.textures, 2);
    mesh.vertexBuffer = _buildBuffer(gl, gl.ARRAY_BUFFER, mesh.vertices, 3);
    mesh.indexBuffer = _buildBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, mesh.indices, 1);
}

var _deleteMeshBuffers = function( gl, mesh ){
    gl.deleteBuffer(mesh.normalBuffer);
    gl.deleteBuffer(mesh.textureBuffer);
    gl.deleteBuffer(mesh.vertexBuffer);
    gl.deleteBuffer(mesh.indexBuffer);
}


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
    }
    
    Scene.prototype = Object.create(FCScene.prototype);
    
    
    Scene.prototype.loadObj = function (path, label) {
        var scene = this;
        return new Promise(function (resolve, reject) {
            if (scene.meshes[label]) {
                resolve(scene.meshes[label]);
            }
            else {
                OBJ.downloadMeshes({
                    obj: path
                }, function (objs) {
                    console.log('downloaded; initialising');
                    OBJ.initMeshBuffers(scene.gl, objs.obj);
                    scene.meshes[label] = objs.obj;
                    resolve(objs.obj);
                })
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
    
    
    
    Scene.prototype.setupPrereqs = function () {
        var scene = this;
        var prereqPromises = [];
        return new Promise(function (resolve, reject) {

            var textures = [
                {src: '//assets.meta4vr.net/texture/concrete01.jpg', label: 'concrete01'}
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
                {src: '//assets.meta4vr.net/mesh/stl/controlleresque.stl', label: 'controlleresque'}
            ];
        
            var shaders = [
                {srcFs: '//assets.meta4vr.net/shader/basic.fs', srcVs: '//assets.meta4vr.net/shader/basic.vs', label: 'basic'},
                {srcFs: '//assets.meta4vr.net/shader/diffuse2.fs', srcVs: '//assets.meta4vr.net/shader/diffuse2.vs', label: 'diffuse'}
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
            
            
            prereqPromises.push(new Promise(function (resolve, reject) {
                OBJ.downloadMeshes({
                    ctrl: '//assets.meta4vr.net/mesh/obj/ctrl_lowpoly_body.obj'
                }, function (objs) {
                    _initMeshBuffers(scene.gl, objs.ctrl);
                    scene.meshes = objs;
                    resolve();
                })
                
            }));
            
            
            for (var i=0; i<texColors.length; i++) {
                var myTexColor = texColors[i];
                scene.addTextureFromColor(myTexColor, myTexColor.label);
            }
            
            Promise.all(prereqPromises).then(function () {
                resolve();
            });
            
        })
        
        
    }


    
    Scene.prototype.meshParseWorker = function () {
        var worker = new window.Worker('webworker_meshparse.js');
        
        // var arraybuf = new ArrayBuffer(1);
        
        worker.onmessage = function (m) {
            console.log('Got message from worker:', m);
        }
        return worker;
    }
    
    Scene.prototype.loadMeshWithWorker = function (url) {
        // var defaultMeshUrl = '//assets.meta4vr.net/mesh/obj/ctrl_lowpoly_body.obj';
        var defaultMeshUrl = '//assets.meta4vr.net/mesh/obj/content/buddha_100k.obj';
        var meshUrl = url || defaultMeshUrl;
        return new Promise(function (resolve, reject) {
            var worker = new window.Worker('webworker_meshparse.js');
            worker.onmessage = function (msg) {
                if (msg.data.status == 'mesh_loaded') {
                    worker.postMessage({op:'get'});
                }
                else if (msg.data.status == 'here_you_go') {
                    resolve(msg.data);
                }
            };
            worker.postMessage({op:'load_mesh', src:meshUrl});
            
        })
    }

    Scene.prototype.loadMesh = function (url) {
        var scene = this;
        scene.loadMeshWithWorker(url)
        .then(function (objdat) {
            var mesh = {
                // vertices: Array.prototype.slice.call(new Float32Array(objdat.vertices)),
                // textures: Array.prototype.slice.call(new Float32Array(objdat.texCoords)),
                // vertexNormals: Array.prototype.slice.call(new Float32Array(objdat.normals)),
                // indices: Array.prototype.slice.call(new Uint32Array(objdat.indices))
                vertices: new Float32Array(objdat.vertices),
                textures: new Float32Array(objdat.texCoords),
                vertexNormals: new Float32Array(objdat.normals),
                indices: new Uint32Array(objdat.indices)
            };
            _initMeshBuffers(scene.gl, mesh);
            scene.THE_MESH = mesh;
            console.log('mesh is loaded');
            var theObj = new LoaderObj(
                mesh, 
                {x:0, y:1, z:2.5}, {scale: 0.03}, 
                {x:0, y:Math.PI, z:0}, 
                {shaderLabel:'diffuse', textureLabel: 'forestgreen', label:'AThing'});
            scene.THE_OBJ = theObj;
            scene.addObject(theObj);
        })
    }
    
    Scene.prototype.addBuddha = function () {
        var scene = this;
        // var src = '//assets.meta4vr.net/mesh/obj/content/bacchante.obj';
        var src = '//assets.meta4vr.net/mesh/obj/content/buddha_10k.obj';
        scene.easyObj(src, 'buddha', {x:0, y:1, z:2.5, ry:Math.PI});
    }
    
    Scene.prototype.setupScene = function () {
        var scene = this;
        var DEG=360/(2*Math.PI);
        var _hidden_beneath_floor = {x:0, y:-1.5, z:0};
        
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
            // src: scene.modelSources.controlleresque,
            translate: {x:0.00, y:0, z:0.0},
            size: {scale:1.0},
            rotate: {x:0/DEG, y:0/DEG, z:0/DEG}, 
            greenColor: scene.addTextureFromColor({r:0.2, g:0.9, b:0.6}),
            blueColor: scene.addTextureFromColor({r:0.2, g:0.6, b:0.9})
        };
        
        var buttonHandler = function (gamepadIdx, btnIdx, btnStatus, sector, myButton, extra) {
            // if (btnStatus != 'up') {
            //     console.log('Button idx', btnIdx, 'on controller', gamepadIdx, 'was', btnStatus);
            //     if (btnIdx == 0) {
            //         console.log('Sector', sector);
            //     }
            // }
            
            if (btnStatus == 'pressed' && btnIdx == 0) {
                scene.addBuddha();
            }
        };
        
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
        // ctrl0.behaviours.push(FCUtil.makeControllerRayProjector(scene, 0, [floorCollider]));
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
