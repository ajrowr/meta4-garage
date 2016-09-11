


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
            cam1_: {
                position: {x:0.4, y:1, z:1.6},
                orientation: {x:0.22, y:2.68}
            },
            cam1: {
                position: {x:0, y:1.5, z:2},
                orientation: {x:0, y:0, z:0}
            }
        };
        
        this.lightPool = {
            plainWhiteAmbientOverhead: {
                position: [0.0, 2.0, 1.0, 1.0],
                ambient: [0.5, 0.5, 0.5],
                diffuse: [1.8, 0.8, 0.7],
                specular: [0.0, 0.0, 0.0]
            },
            plainWhiteAmbientOverhead2: {
                position: [2.0, 1.0, 2.0, 1.0],
                ambient: [0.5, 0.5, 0.5],
                diffuse: [0.8, 0.8, 1.7],
                specular: [0.0, 0.0, 0.0]
            },
            blueBackfill: {
                position: [0.0, 3.0, 3.0, 1.0],
                ambient: [0.0, 0.0, 0.0],
                diffuse: [0.2, 0.2, 0.8],
                specular: [0.0, 0.0, 0.0]
            },
            dimWhiteBackfill: {
                position: [0.0, 3.0, -5.0, 1.0],
                ambient: [0.0, 0.0, 0.0],
                diffuse: [0.2, 0.2, 0.2],
                specular: [0.0, 0.0, 0.0]
            }
            
        }
                
        this.lights = [
            this.lightPool.plainWhiteAmbientOverhead,
            this.lightPool.plainWhiteAmbientOverhead2,
            this.lightPool.blueBackfill,
            this.lightPool.dimWhiteBackfill
        ];
        
        this.prerequisites = {
            shaders: [
                /* Basic is very simple and doesn't take lighting into account */
                {label: 'basic', 
                 srcVertexShader: '//assets.meta4vr.net/shader/basic.vs', 
                 srcFragmentShader: '//assets.meta4vr.net/shader/basic.fs'},
                
                /* Diffuse is a fairly straightforward shader; static directional lights = no setup required and nearly */
                /* impossible to break */
                {label: 'diffuse', 
                 srcVertexShader: '//assets.meta4vr.net/shader/diffuse2.vs', 
                 srcFragmentShader: '//assets.meta4vr.net/shader/diffuse2.fs'},
                
                /* ADS is Ambient Diffuse Specular; a fairly flexible & decent quality shader which supports */
                /* up to 7 positional lights, and materials. Needs to be setup correctly tho otherwise you */
                /* won't see much of anything. All the materials and lights are configured with ADS in mind. */
                /* NB. specular doesn't work properly yet (see ads_v1.vs for explanation) so YMMV. */
                {label: 'ads',
                 srcVertexShader: '//assets.meta4vr.net/shader/ads_v1.vs', 
                 srcFragmentShader: '//assets.meta4vr.net/shader/ads_v1.fs'}
            ],
            meshes: [
               {label: 'controller', src: '//assets.meta4vr.net/mesh/obj/sys/vive/controller/ctrl_lowpoly_body.obj'}
            ],
            materials: [
                {label: 'concrete', textureLabel: 'concrete01', shaderLabel: 'ads', ambient:[1,1,1], diffuse:[0.5,0.5,0.5]},
                {label: 'matteplastic', textureLabel: 'white', shaderLabel: 'ads', ambient:[0,0,0], diffuse:[0.8, 0.8, 0.8]}
            ],
            colors: [
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
                {hex: '#ffe0bd', label: 'skin_1'},
                {hex: '#ffcd94', label: 'skin_2'},
                {hex: '#eac086', label: 'skin_3'},
                {hex: '#ffad60', label: 'skin_4'},
                {hex: '#000000', label: 'black'},
                {hex: '#888888', label: 'gray'},
                {hex: '#ffffff', label: 'white'}
            ],
            textures: [
                {label: 'concrete01', src: '//assets.meta4vr.net/texture/concrete01.jpg'}
            ]
        }
        
        
        
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
            
            for (var i=0; i<scene.prerequisites.colors.length; i++) {
                var colorLabel = scene.prerequisites.colors[i].label;
                var myTexColor = scene.textures[colorLabel];
                scene.texColours.push(myTexColor);
            }
            
            /* Build solid colour textures */
            // var texColors = [
            //     {hex: '#00007f', label: 'navy'},
            //     {hex: '#0000ff', label: 'blue'},
            //     {hex: '#007f7f', label: 'teal'},
            //     {hex: '#ffa500', label: 'orange'},
            //     {hex: '#00ff00', label: 'lime'},
            //     {hex: '#9900ff', label: 'purplle'},
            //     {hex: '#4169e1', label: 'royalblue'},
            //     {hex: '#191970', label: 'dodgerblue'},
            //     {hex: '#007f00', label: 'green'},
            //     {hex: '#00ff7f', label: 'springgreen'},
            //     {hex: '#00ffff', label: 'cyan'},
            //     {hex: '#20b2aa', label: 'lightseagreen'},
            //     {hex: '#228b22', label: 'forestgreen'},
            //     {hex: '#2e8b57', label: 'seagreen'},
            //     {hex: '#ff0000', label: 'red'},
            //     {hex: '#ffff00', label: 'yellow'},
            //     {hex: '#ff00ff', label: 'magenta'},
            //     {hex: '#000000', label: 'black'},
            //     {hex: '#888888', label: 'gray'},
            //     {hex: '#ffffff', label: 'white'}
            // ];
            // for (var i=0; i<texColors.length; i++) {
            //     var myTexColor = texColors[i];
            //     scene.texColours.push(scene.addTextureFromColor(myTexColor, myTexColor.label));
            // }
                        
            // /* Load meshes */
            // var meshes = [
            //     {src: '//assets.meta4vr.net/mesh/obj/sys/vive/controller/ctrl_lowpoly_body.obj', label: 'controller'}
            // ];
            // for (var i=0; i<meshes.length; i++) {
            //     var myMesh = meshes[i];
            //     prereqPromises.push(new Promise(function (resolve, reject) {
            //         if (myMesh.src.endsWith('.obj')) {
            //             FCShapeUtils.loadObj(myMesh.src)
            //             .then(function (mesh) {
            //                 scene.meshes[myMesh.label] = mesh;
            //                 resolve();
            //             })
            //         };
            //
            //     }))
            // }
            //
            // /* Load shaders */
            // var shaders = [
            //     {srcFs: '//assets.meta4vr.net/shader/basic.fs', srcVs: '//assets.meta4vr.net/shader/basic.vs', label: 'basic'},
            //     {srcFs: '//assets.meta4vr.net/shader/diffuse2.fs', srcVs: '//assets.meta4vr.net/shader/diffuse2.vs', label: 'diffuse'}
            // ];
            // for (var i=0; i<shaders.length; i++) {
            //     var myShader = shaders[i];
            //     prereqPromises.push(scene.addShaderFromUrlPair(myShader.srcVs, myShader.srcFs, myShader.label, {
            //         position: 0,
            //         texCoord: 1,
            //         vertexNormal: 2
            //     }));
            // }
            
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
            // {label: 'floor', textureLabel: 'concrete01', shaderLabel: 'diffuse', segmentsX: 10, segmentsY: 10}
            {label: 'floor', materialLabel:'concrete', segmentsX: 10, segmentsY: 10}
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
        
        /* Buttons are - 0: trackpad, 1: trigger 2: grip, 3: menu */
        var buttonHandler = function (gamepadIdx, btnIdx, btnStatus, sector, myButton, extra) {
            if (btnStatus != 'up') {
                if (btnIdx == '2' && btnStatus == 'pressed') {
                    scene.teleportUserToCursor();
                }
                if (btnIdx == '0' && sector == 'n' && btnStatus == 'pressed') {
                    // console.log(scene);
                    if (scene.pie === undefined) scene.pie = 0;
                    var o = scene.getObjectByLabel('experiment3');
                    scene.pie += 0.1;
                    scene.pie %= 1;
                    o.shape.parameters.completion = scene.pie; 
                    scene.prepareObject(o);
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
        
        /* Why is this not lit correctly?? */
        var les = new LatheExtruderShape({x:3,y:1,z:0}, {height: 0.5, scale:0.5}, {x:0.5*Math.PI, y:0, z:0}, {
                materialLabel:'matteplastic', texture:scene.textures.white, 
                label:'experiment1', groupLabel:'experiment', 
                // profileSampler:function (i,n) {return i>=n && 0.00000001 || 1},
                shapePoints: [[-1,0.55], [0,0.55], [0,1], [1,0], [0,-1], [0,-0.55], [-1,-0.55]].reverse()
        });
        // les.drawMode = 1;
        les.behaviours.push(function (drawable, timePoint) {drawable.orientation.z = Math.PI*timePoint/9700;})
        scene.addObject(les);
        
        var prism = new LatheExtruderShape({x:3, y:0, z:2}, {height: 1.5, scale:1}, null,
             {materialLabel:'matteplastic', label:'experiment2', groupLabel:'experiment', samplerType: 'BeveledExtrudeSampler', shapePoints: [[1,1],[0,0],[1,0]]}
        );
        scene.addObject(prism);

        var pacmanShapeSampler = function (i, n, p) {
            var fract = i/n;
            console.log(p);
            if (fract<=(1-p.completion||0)) return [0,0];
            var ang = 2*Math.PI*(fract);
            return [Math.cos(ang), Math.sin(ang)];
        }
        var pacman = new LatheExtruderShape({x:0, y:0, z:2}, {height: 0.5, scale:0.4}, null,
             {materialLabel:'matteplastic', label:'experiment3', groupLabel:'experiment', samplerType: 'BeveledExtrudeSampler',
                 shape: {pointCount: 40, sampler: pacmanShapeSampler, parameters:{completion:0.4}}
             }
        );
        scene.addObject(pacman);
        
        scene.showLights();
    }
    
    Scene.prototype.showLights = function () {
        var lamps = [];
        for (var i=0; i<this.lights.length; i++) {
            var myLight = this.lights[i];
            var tex = this.addTextureFromColor({r:myLight.diffuse[0], g:myLight.diffuse[1], b:myLight.diffuse[2]});
            var c = new FCShapes.SimpleCuboid(
                {x:myLight.position[0], y:myLight.position[1], z:myLight.position[2]},
                {w:0.3, h:0.3, d:0.3},
                null, {texture:tex, shaderLabel:'basic', groupLabel:'lamps'}
            );
            lamps.push(c);
            this.addObject(c);
        }
        return lamps;
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
            // {shaderLabel:'diffuse', texture:scene.nextColour(), groupLabel:'lathes',
            {materialLabel:'matteplastic', texture:scene.nextColour(), groupLabel:'lathes',
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
            // {shaderLabel:'diffuse', texture:scene.nextColour(), verticalSegmentCount:120, groupLabel:'lathes',
            {materialLabel:'matteplastic', texture:scene.nextColour(), verticalSegmentCount:120, groupLabel:'lathes',
            profileSampler: sampler}
        );
        // lathe.drawMode = scene.gl.LINES;
        scene.addObject(lathe);
    }

    return Scene;
})();
