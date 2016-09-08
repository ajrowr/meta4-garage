/*_ Wishlist _*/
/*
    - loading indicator
    - folders
    - tutorial / help
    - disable arrow when no more things available
    - better mode indicator
    - be able to rotate preview model while mesh is loading
    - constrain max mesh
    - mesh sizes in json detail?
    - mesh spam if 2nd preview is requested too quickly
*/

var DEG=360/(2*Math.PI);

/*__*/
/* An ObjContainer is a simple thing for managing a set of objects. */
/* How do we want to use this? consider it fundamental to the construction? or add things to it after */
/* Mainly want to use it for behaviours and interactions but ... mandate may expand */
var ObjContainer = function (children, scene, params) {
    this.children = children;
    this.scene = scene;
}

ObjContainer.prototype.distribute = function (fn) {
    for (var i=0; i<this.children.length; i++) {
        fn(this.children[i]);
    }
}

ObjContainer.prototype.interact = function (type, params) {
    if (type == 'select') {
        this.distribute(function (d) {d.textureLabel='cyan';});
    }
    else if (type == 'deselect') {
        this.distribute(function (d) {d.textureLabel='white';});
    }
    else if (type == 'activate') {
        console.log(params.data);
        this.scene.showFolder(params.data.path);
    }
        
}

/*__*/


window.ExperimentalScene = (function () {
    "use strict";
    
    var Scene = function() {
        /* Declare any class and instance vars unique to this scene, here. */
        FCScene.call(this);
        // this.meshes = {};
        
        this.modelList = null;
                
        this.currentItem = {
            model: null,
            idx: null
        }
        
        this.uiMode = 0;
        this.uiModes = [
            {mode: 'MODE_FOLDER_SELECT', statusTexLabel: 'blue'},
            {mode: 'MODE_PREVIEW_SELECT', statusTexLabel: 'green'},
            {mode: 'MODE_OBJ_ROT_SCALE', statusTexLabel: 'white'}
            // {mode: 'MODE_OBJ_ROT_JERK', statusTexLabel: 'blue'},
            // {mode: 'MODE_OBJ_FIX', statusTexLabel: 'orange'}
        ];
        
        this.trackpadMode = 0;
        this.trackpadModes = [
            {mode: 'MODE_PREVIEW_SELECT', statusTexLabel: 'green'},
            {mode: 'MODE_OBJ_ROT_SCALE', statusTexLabel: 'white'},
            {mode: 'MODE_OBJ_ROT_JERK', statusTexLabel: 'blue'},
            {mode: 'MODE_OBJ_FIX', statusTexLabel: 'orange'}
        ];
        
        this.cameras = {
            cam1x: {
                position: {x:0, y:1, z:-1.5},
                orientation: {x:0, y:Math.PI}
            },
            cam1y: {
                position: {x:0, y:1.5, z:1.5},
                orientation: {x:0, y:0, z:0}
            },
            cam1z: {
                position: {x:0, y:1.5, z:4.5},
                orientation: {x:0, y:0, z:0}
            },
            cam1: {
                position: {x:0, y:1.5, z:0},
                orientation: {x:0.5, y:Math.PI, z:0}
            }
        }
        
        /* Prerequisites are items that will be loaded before the scene setup. Scene setup will be */
        /* forced to wait until they finish loading, so anything fundamental to the initialization */
        /* of the scene should be considered a prerequisite. */
        /* Each of these will be mapped into scene.<thingtype>.<label> once built. */
        this.prerequisites = {
            shaders: [
                /* Basic is very basic and doesn't take lighting into account */
                {label: 'basic', 
                 srcVertexShader: '//assets.meta4vr.net/shader/basic.vs', 
                 srcFragmentShader: '//assets.meta4vr.net/shader/basic.fs'},
                /* Diffuse is a fairly basic shader; no setup required and nearly impossible to break */
                {label: 'diffuse', 
                 srcVertexShader: 'diffuse2.vs', 
                 srcFragmentShader: 'diffuse2.fs'},
                /* ADS is Ambient Diffuse Specular; a fairly flexible shader which supports up to 7 positional */
                /* lights, and materials. */
                {label: 'ads',
                 srcVertexShader: 'ads_v1.vs', 
                 srcFragmentShader: 'ads_v1.fs'}
            ],
            meshes: [
               {label: 'controller', src: '//assets.meta4vr.net/mesh/obj/sys/vive/controller/ctrl_lowpoly_body.obj'}
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
            ],
            materials: [
                {label: 'concrete', textureLabel: 'concrete01', shaderLabel: 'ads', ambient:[1,1,1], diffuse:[0.5,0.5,0.5]},
                {label: 'matteplastic', textureLabel: 'white', shaderLabel: 'ads', ambient:[0,0,0], diffuse:[0.8, 0.8, 0.8]}
            ]
            
        }
        
        this.lightPool = {
            plainWhiteAmbientOverhead: {
                position: [0.0, 3.0, 1.0, 1.0],
                ambient: [0.5, 0.5, 0.5],
                diffuse: [0.8, 0.8, 0.7],
                specular: [0.0, 0.0, 0.0]
            },
            blueBackfill: {
                position: [0.0, 3.0, 5.0, 1.0],
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
            this.lightPool.blueBackfill, 
            this.lightPool.dimWhiteBackfill
        ];
        
        this.uiLayouts = {
            LAYOUT_STANDING: {
                grid: {
                    rows: 4,
                    columns: 8,
                    previewScale: 0.25,
                    rowHeight: 0.6,
                    offsetZ: function (sp) {return -0.3*sp.sizeZ;},
                    ellipseScale: {width:1.3, depth:-0.6},
                    itemPosition: function (sp, perRow, idxInRow) {return Math.PI+(((Math.PI)/grid.perRow) * idxInRow);},
                    itemOrientation: function (sp, idxInRow) {}
                },
                arrowDisposition: function (sp) {
                    return {
                        L: {
                            pos: {x:-0.6*sp.sizeX, y:1.3, z:-0.3*sp.sizeZ},
                            ori: {x:0.5*Math.PI, y:Math.PI, z:0}
                        },
                        R: {
                            pos: {x:0.6*sp.sizeX, y:1.3, z:-0.3*sp.sizeZ},
                            ori: {x:0.5*Math.PI, y:0, z:0}
                        }
                    }
                },
                itemDisplay: {
                    pos: {x:0, y:0, z:0},
                    scale: 0.9
                }
            },
            LAYOUT_DESK: {
                grid: {
                    rows: 3,
                    columns: 6,
                    previewScale: 0.35,
                    rowHeight: 0.9,
                    offsetZ: function (sp) {return 1.3*sp.sizeZ;},
                    ellipseScale: {width:1.3, depth:0.6},
                    itemPosition: function (sp, perRow, idxInRow) {return ((Math.PI)/perRow) * idxInRow;},
                    itemOrientation: function (sp, idxInRow) {}
                },
                arrowDisposition: function (sp) {
                    return {
                        R: {
                            pos: {x:-0.6*sp.sizeX, y:1.3, z:1.3*sp.sizeZ},
                            ori: {x:0.5*Math.PI, y:Math.PI, z:0}
                        },
                        L: {
                            pos: {x:0.6*sp.sizeX, y:1.3, z:1.3*sp.sizeZ},
                            ori: {x:0.5*Math.PI, y:0, z:0}
                        }
                    }
                },
                itemDisplay: {
                    pos: {x:0, y:0, z:2.5},
                    scale: 0.6
                }
            }
        };
        this.uiLayout = this.uiLayouts.LAYOUT_DESK;
        
        this.previews = [];
        this.previewIdx = 0;
        
        this.fontGlyphUrlFormat = '//meshbase.meta4vr.net/_typography/lato-bold/glyph_@@.obj'
        
        // this.modelFolder = 'statuary';
        this.modelFolder = '';
        
        this.modelListUrlFormat = '//meshbase.meta4vr.net/mesh/@@?mode=detail';
        this.modelPreviewUrlFormat = '//meshbase.meta4vr.net/mesh/@@?mode=grade';
        this.modelUrlFormat = '//meshbase.meta4vr.net/mesh/@@?mode=mesh';
        this.statusIndicator = null;
        
        this.previewGrid = null;
        this.folderGrid = null;
        this.activeGrid = null;
        
        this._meshCache = {};
    }
    
    Scene.prototype = Object.create(FCScene.prototype);
    
    /* Grids will be constructed once each and then re-used for different content */
    Scene.prototype.buildPreviewGrid = function (X) {
        var scene = this;
        var layout = scene.uiLayout;
        var prevIdx = 0;
        
        
        scene.previewGrid = new SelectGrid(
            // {rowHeight: 0.6, perRow: 8, offset:{z:1.3*scene.stageParams.sizeZ}}
            {rowHeight: layout.grid.rowHeight, perRow: layout.grid.columns,
                rows: layout.grid.rows, columns: layout.grid.columns, 
                ellipseScale: layout.grid.ellipseScale,
             offset:{z:layout.grid.offsetZ(scene.stageParams)}}
        );
        
        var arrowSize = {height: 0.1, scale:0.2};
        var arrowParams = {
            shaderLabel:'diffuse', texture:scene.textures.white, 
            groupLabel:'uiChrome', 
            shapePoints: [[-1,0.55], [0,0.55], [0,1], [1,0], [0,-1], [0,-0.55], [-1,-0.55]].reverse(),
            samplerType: 'BeveledExtrudeSampler'
        };
        var arrowSelect = function (drawable, p) {
            drawable.texture = scene.textures.cyan;
        };
        var arrowDeselect = function (drawable, p) {
            drawable.texture = scene.textures.white;
        };
        var mkArrowActivate = function (rel) {
            var arrowActivate = function (drawable, p) {
                scene.previewGrid.changePage(rel);
                scene.updatePreviews(null);
            };
            return arrowActivate;
        };
        
        var arrowDisp = scene.uiLayout.arrowDisposition(scene.stageParams);
        
        var arrowLeft = new FCShapes.LatheExtruderShape(
            arrowDisp.L.pos, arrowSize, arrowDisp.L.ori, 
            arrowParams
        );
        arrowLeft.interactions['select'] = arrowSelect;
        arrowLeft.interactions['deselect'] = arrowDeselect;
        arrowLeft.interactions['activate'] = mkArrowActivate(-1);
        scene.previewGrid.specialItems.PAGE_LEFT = arrowLeft;

        var arrowRight = new FCShapes.LatheExtruderShape(
            arrowDisp.R.pos, arrowSize, arrowDisp.R.ori, 
            arrowParams
        );
        arrowRight.interactions['select'] = arrowSelect;
        arrowRight.interactions['deselect'] = arrowDeselect;
        arrowRight.interactions['activate'] = mkArrowActivate(1);
        scene.previewGrid.specialItems.PAGE_RIGHT = arrowRight;

        scene.addObject(arrowLeft);
        scene.addObject(arrowRight);
            
        //////
        // scene.previewGrid.setData(scene.modelList.files);
        
    }
    
    Scene.prototype.buildFolderGrid = function (X) {
        var scene = this;
        var layout = scene.uiLayout;
        /* Configure grid */
        var grid = new SelectGrid({
            rowHeight: 0.25, perRow: 1,
            rows: 10, columns: 1, 
            offset: {z:layout.grid.offsetZ(scene.stageParams)-0.35, y:0.3}
        });
        
        scene.folderGrid = grid;
        
    }
    
    Scene.prototype.updatePreviews = function (rangeStart, rangeLength) {
        var scene = this;
        var grid = scene.previewGrid;
        var layout = scene.uiLayout;
        /* If rangeStart is null, the grid was configured elsewhere */
        if (rangeStart != null) {
            grid.setRange(rangeStart, rangeLength);
        }
        if (grid.currentRange.isStart) grid.specialItems.PAGE_LEFT.hidden = true;
        else grid.specialItems.PAGE_LEFT.hidden = false;
        if (grid.currentRange.isEnd) grid.specialItems.PAGE_RIGHT.hidden = true;
        else grid.specialItems.PAGE_RIGHT.hidden = false;
        
        /* TODO remove items from scene.previews when changing */
        /* TODO consider caching preview meshes */
        var currentPreviews = scene.getObjectsInGroup('previews');
        for (var i=0; i<currentPreviews.length; i++) {
            scene.removeObject(currentPreviews[i], true);
        }
        
        var myItems = grid.getDataForCurrentRange();
        for (var i=0; i<myItems.length; i++) {
            var myInf = myItems[i];
                var previewUrl = scene.modelPreviewUrlFormat.replace('@@', myInf.name);
                var modelName = myInf.name;
                var nowt = function (previuUrl, modelInf, modelIdx) {
                    FCShapeUtils.loadMesh(previuUrl)
                    .then(function (mesh) {
                        var placement = grid.getPlacementForGridPosition(modelIdx);
                        var newPrev = new FCShapes.MeshShape(mesh, placement.location, 
                                            {scale:layout.grid.previewScale}, placement.orientation,
                                            {materialLabel:'matteplastic', textureLabel:'white', groupLabel:'previews'}
                        );
                        newPrev.metadata.name = modelInf.name;
                        newPrev.metadata.gridIdx = modelIdx;
                        newPrev.metadata.dataIdx = grid.getDataIndexForGridIndex(modelIdx);
                        newPrev.interactions['select'] = function (drawable, p) {
                            drawable.textureLabel = 'cyan';
                            var inf = grid.getDataForSelection();
                            scene.showMessage([inf.name, Math.round(inf.size/100000)/10+' mb']);
                            
                            drawable.behaviours.push(function (dr, timePoint) {
                                dr.orientation = {x:0,y:Math.PI*(timePoint/1700), z:0};
                            });
                        }
                        newPrev.interactions['deselect'] = function (drawable, p) {
                            drawable.textureLabel = 'white';
                            drawable.behaviours = [];
                        }
                        newPrev.interactions['activate'] = function (drawable, p) {
                            scene.showItemWithIndex(drawable.metadata.dataIdx, mesh);
                        }
                        scene.addObject(newPrev);
                        scene.previews.push(newPrev);//??
                        grid.gridItems[modelIdx]=newPrev;
                    });
                    
                }(previewUrl, myInf, i);
            // }
        }
        // scene.activeGrid = grid;
        
    }
    
    Scene.prototype.updateFolders = function (rangeStart, rangeEnd) {
        var scene = this;
        var grid = scene.folderGrid;
        grid.setRange(rangeStart, rangeEnd);
        
        /* Remove existing */
        /* TODO I'm not really happy with this, I'd like to remove the containers rather than the individual glyphs */
        var glyphs = scene.getObjectsInGroup('folderlist');
        for (var i=0; i<glyphs.length; i++) {
            scene.removeObject(glyphs[i]);
        }
        
        var myFolders = grid.getDataForCurrentRange();
        for (var i=0; i<myFolders.length; i++) {
            var myFolder = myFolders[i];
            var myInf = {folder: myFolders[i], idx: i, placement: grid.getPlacementForGridPosition(i)};
            console.log(myInf);
            // var textCluster;
            var exec = function (inf, idx) {
                scene.addText(
                    inf.folder.label, inf.placement.location, 
                    {x:90/DEG, y:0, z:180/DEG}, 
                    {groupLabel:'folderlist', scale: 0.4}
                )
                .then(function (cluster) {
                    // textCluster = cluster;
                    grid.gridItems[idx] = cluster;
                })
            }(myInf, i);
            
        }
        
    }
    
    Scene.prototype.getActiveGrid = function (folder) {
        var mode = this.uiModes[this.uiMode];
        if (mode.mode == 'MODE_PREVIEW_SELECT') return this.previewGrid;
        else if (mode.mode == 'MODE_FOLDER_SELECT') return this.folderGrid;
        
    }
    
    Scene.prototype.showFolder = function (folder) {
        var scene = this;
        // console.log(scene);
        return new Promise(function (resolve, reject) {
            console.log('Showing', folder);
            /* Grid construction - NB this will be done in scene setup */
            if (!scene.previewGrid) scene.buildPreviewGrid();
            if (!scene.folderGrid) scene.buildFolderGrid();
        
            /* Remove previous grids */
            /* Load the folder info via XHR */
            /* Show the title of this folder */
            /* Show the list of folders available from here in the folderGrid */
            /* Show the items in this folder in the previewGrid */
            // var scene = this;
            scene.loadModelList(folder)
            .then(function (remoteInf) {
                scene.previewGrid.setData(remoteInf.files);
                scene.updatePreviews(0, scene.uiLayout.grid.rows*scene.uiLayout.grid.columns);
            
                // scene.showFolderGrid(remoteInf.folders);
                var dests = [];
                console.log(remoteInf);
                if (remoteInf.parent) {
                    dests.push(remoteInf.parent);
                }
                scene.folderGrid.setData(dests.concat(remoteInf.folders));
                scene.updateFolders(0, 10);
            
                // scene.activeGrid = scene.previewGrid;
            
                // scene.showPreviews(remoteInf.files);
                resolve();
            })
            
        })
    }
    
    Scene.prototype.showItemWithIndex = function (idx, previewMesh) {
        var scene = this;
        var layout = scene.uiLayout;
        if (scene.currentItem.model) {
            scene.removeObject(scene.currentItem.model, true);
        }
        var itemInf = scene.modelList.files[idx];
        var previewObj;
        if (previewMesh) {
            if (scene.previewObject) {
                scene.removeObject(scene.previewObject);
                scene.previewObject = null;
            }
            previewObj = new FCShapes.MeshShape(previewMesh, layout.itemDisplay.pos, {scale:layout.itemDisplay.scale}, 
                                        null, {materialLabel:'matteplastic', textureLabel:'skin_1'});
            scene.addObject(previewObj);
            scene.previewObject = previewObj;
        }
        
        scene.showMessage([
            'Loading '+itemInf.name, 
            'Size: ' + Math.round((itemInf.size||0)/1000) + ' kbytes',
            'Index '+idx
        ]);
        
        FCShapeUtils.loadMesh(scene.modelUrlFormat.replace('@@', itemInf.name))
        .then(function (mesh) {
            var s = scene.previewObject && scene.previewObject.scaleFactor || layout.itemDisplay.scale;
            var newObj = new FCShapes.MeshShape(mesh, layout.itemDisplay.pos, {scale:s}, 
                                null, {materialLabel:'matteplastic', textureLabel:'skin_2'});
            if (scene.previewObject) {
                newObj.orientation = scene.previewObject.orientation;
                scene.removeObject(scene.previewObject);
                scene.previewObject = null;
            }
            scene.addObject(newObj);
            scene.currentItem.model = newObj;
            scene.currentItem.idx = idx;
        })
        .catch(function (msg) {
            scene.showMessage([msg]);
        });
    }
    
    Scene.prototype.loadModelList = function (path) {
        var scene = this;
        var listUrl = scene.modelListUrlFormat.replace('@@', path);
        return new Promise(function (resolve, reject) {
            var xh = new XMLHttpRequest();
            xh.open('GET', listUrl, true);
            xh.responseType = 'json';
            xh.onreadystatechange = function () {
                if (xh.readyState == 4) {
                    console.log(xh.response);
                    scene.modelList = xh.response;
                    resolve(xh.response);
                }
            }
            xh.send();
            
        });
    }
    
    /*_ Controller & low-level UIX _*/
    
    Scene.prototype.showMenu = function () {
        
        
    }
    
    /* We're making a new lathe each time, when we could probably just change the texture */
    Scene.prototype.showStatusIndicator = function (tex) {
        var scene = this;
        if (scene.statusIndicator) {
            scene.removeObject(scene.statusIndicator);
        }
        var si = new FCShapes.LatheShape(
            null, {height: 0.01, profile:[0.02, 0.02, 0.01, 0]},
            null, {shaderLabel:'diffuse', texture:tex}
        );
        si.behaviours.push(FCUtil.makeGamepadTracker(scene, 0, null));
        si.translation.z = 0.05;
        scene.addObject(si);
        scene.statusIndicator = si;
    }
    
    /* If idx is not set, increment */
    Scene.prototype.setUIMode = function (idx) {
        var scene = this;
        if (idx === null || idx === undefined) {
            scene.uiMode = ++scene.uiMode%scene.uiModes.length;
        }
        else {
            scene.uiMode = 0;
        }
        var modeInf = scene.uiModes[scene.uiMode];
        scene.showStatusIndicator(scene.textures[modeInf.statusTexLabel]);
        
    }
        
    Scene.prototype.teleportUserToCursor = function () {
        var curs = this.getObjectByLabel('cursor');
        this.moveRaftAndPlayerTo(curs.pos);
    }
        
    Scene.prototype.interactWithSelection = function (interaction, params) {
        var scene = this;
        var item = scene.getActiveGrid().getSelectedItem();
        item.display.interact(interaction, {data:item.data});
        
        
    }
    
    Scene.prototype.handleButton_MODE_PREVIEW_SELECT = function (btnIdx, btnStatus, sector, myButton, extra) {
        var scene = this;
        if (btnIdx == 0 && btnStatus == 'pressed') {
            var selDir = (sector == 'w' && 'LEFT' || sector == 'e' && 'RIGHT' || 
                        sector == 'n' && 'UP' || sector == 's' && 'DOWN' || null);
            if (selDir) scene.previewGrid.moveSelectCaret(selDir);
        }
        else if (btnIdx == 1 && btnStatus == 'pressed') {
            scene.interactWithSelection('activate');
        }
    }

    Scene.prototype.handleButton_MODE_FOLDER_SELECT = function (btnIdx, btnStatus, sector, myButton, extra) {
        var scene = this;
        if (btnIdx == 0 && btnStatus == 'pressed') {
            var selDir = (sector == 'w' && 'LEFT' || sector == 'e' && 'RIGHT' || 
                        sector == 'n' && 'UP' || sector == 's' && 'DOWN' || null);
            if (selDir) scene.folderGrid.moveSelectCaret(selDir);
        }
        else if (btnIdx == 1 && btnStatus == 'pressed') {
            scene.interactWithSelection('activate');
        }
    }

    // Scene.prototype.handleButton_MODE_PREVIEW_SELECT = function (btnIdx, btnStatus, sector, myButton, extra) {
    //     var scene = this;
    //     if (btnIdx == 0 && btnStatus == 'pressed') {
    //         var selDir = (sector == 'w' && 'LEFT' || sector == 'e' && 'RIGHT' ||
    //                     sector == 'n' && 'UP' || sector == 's' && 'DOWN' || null);
    //         if (selDir) scene.activeGrid.moveSelectCaret(selDir);
    //     }
    //     else if (btnIdx == 1 && btnStatus == 'pressed') {
    //         scene.interactWithSelection('activate');
    //     }
    // }
    
    Scene.prototype.handleButton_MODE_OBJ_ROT_SCALE = function (btnIdx, btnStatus, sector, myButton, extra) {
        var scene = this;
        var myObj = scene.previewObject || scene.currentItem && scene.currentItem.model
        if (myObj && btnIdx == 0 && btnStatus == 'held') {
            if (sector == 'n') {
                myObj.scaleFactor *= 1.005;
            }
            else if (sector == 's') {
                myObj.scaleFactor *= 0.995;
            }
            else if (sector == 'w') {
                myObj.orientation.y += 0.6/DEG;
            }
            else if (sector == 'e') {
                myObj.orientation.y -= 0.6/DEG;
            }
            
        }
    }
    
    Scene.prototype.makeButtonHandler = function () {
        var scene = this;
        var buttonHandler = function (gamepadIdx, btnIdx, btnStatus, sector, myButton, extra) {
            /* Menu button always changes the UI mode */
            if (btnIdx == 3 && btnStatus == 'pressed') {
                scene.setUIMode(null);
                return;
            }
            else if (btnIdx == '2' && btnStatus == 'pressed') {
                scene.teleportUserToCursor();
            }
            
            
            var uiMode = scene.uiModes[scene.uiMode].mode; /* TODO calling it trackpadMode is outdated */
            var handler = scene['handleButton_'+uiMode];
            if (handler) {
                return handler.call(scene, btnIdx, btnStatus, sector, myButton, extra);
            }
        };
        return buttonHandler;
    }
    
    Scene.prototype.makeButtonHandler_v1 = function () {
        var scene = this;
        /* Button handler for the controllers. The default button handler does 2 things: */
        /* 1). teleport to cursor location when grip button is pressed */
        /* 2). Output button status info when any button is pressed */
        /* Buttons are - 0: trackpad, 1: trigger 2: grip, 3: menu */
        var buttonHandler = function (gamepadIdx, btnIdx, btnStatus, sector, myButton, extra) {
            if (btnStatus != 'up') {
                // console.log('Button idx', btnIdx, 'on controller', gamepadIdx, 'was', btnStatus);
                
                if (btnIdx == '0') {
                    var tpMode = scene.uiModes[scene.uiMode].mode;
                    if (sector == 'center' && btnStatus == 'released') {
                        scene.setUIMode(null);
                        return;
                    }
                    switch (tpMode) {
                    /* redacted */
                    case 'MODE_OBJ_ROT_JERK':
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
                    case 'MODE_OBJ_FIX':
                        /* Apply a hard transform to the mesh */
                        if (sector == 'n' && btnStatus == 'released') {
                            scene.showMessage(['Reloading mesh with transforms...']);
                            scene.loadModelAtIndex(scene.currentModelIdx, {turn:true});
                        }
                        /* Force synth of mesh normals */
                        else if (sector == 's' && btnStatus == 'released') {
                            scene.showMessage(['Reloading mesh with synthetic normals...']);
                            scene.loadModelAtIndex(scene.currentModelIdx, {synthNormals: true});
                        }
                        /* Wireframe mode */
                        else if (sector == 'w' && btnStatus == 'released') {
                            scene.currentObject.drawMode = 1;
                        }
                        break;
                    }
                    
                }
                /* redacted */
            }
        };
        return buttonHandler;
    }
    
    /*_ Scene init _*/
    
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
            {label: 'cursor', materialLabel:'matteplastic', textureLabel: 'red'}
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
            // {label: 'floor', textureLabel: 'concrete01', shaderLabel: 'diffuse', segmentsX: 10, segmentsY: 10}
            {label: 'floor', materialLabel: 'concrete', segmentsX: 10, segmentsY: 10}
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
        
        
        // scene.loadModelList(scene.modelFolder)
        // .then(function () {
        //     if (scene.autoLoadIdx) scene.loadModelAtIndex(scene.autoLoadIdx);
        //     scene.setupPreviews(0, scene.uiLayout.grid.rows*scene.uiLayout.grid.columns);
        // });
        
        scene.showFolder(scene.modelFolder)
        .then(function () {
            // scene.activeGrid = scene.folderGrid;
            scene.setUIMode(0);
        })
        
        
        
        // scene.showStatusIndicator(scene.textures.white);
        scene.showStatusIndicator(scene.textures[scene.uiModes[scene.uiMode].statusTexLabel])
        
    }
    
    Scene.prototype.setupPrereqs = function () {
        return new Promise(function (resolve, reject) {resolve();})
    }
    
    /*_ Text handling stuff _*/
    
    Scene.prototype.showMessage = function (texts) {
        var scene = this;
        var textBlocks = [];
        for (var i=0; i<texts.length; i++) {
            textBlocks.push({t:texts[i], color:'black', size:50});
        }
        FCUtil.makeTextBoard(scene, textBlocks, {x:2.5, y:1, z:0}, {y:1.5*Math.PI, x:0, z:0}, null, null, null, {canvasColor:'white'})
        .then(function (newBoard) {
            if (scene.displayBoard) {
                scene.removeObject(scene.displayBoard);
            }
            scene.displayBoard = newBoard;
            scene.addObject(newBoard);
        })
    }
    
    Scene.prototype._fetchMeshViaCache = function (meshPath) {
        var scene = this;
        return new Promise(function (resolve, reject) {
            if (scene._meshCache[meshPath]) {
                resolve(scene._meshCache[meshPath]);
            }
            else {
                FCShapeUtils.loadMesh(meshPath)
                .then(function (mesh) {
                    console.log('Stashing', meshPath);
                    scene._meshCache[meshPath] = mesh;
                    resolve(mesh);
                });
            }
            
        })
    }
    
    Scene.prototype.addText = function (textStr, basePos, baseOri, params) {
        var scene = this;
        var p = params || {};
        var groupLabel = p.groupLabel || 'letters';
        var materialLabel = p.materialLabel || 'matteplastic';
        var textureLabel = p.textureLabel || null;
        var scale = p.scale || 1.0;
        var rotQuat = quat.create();
        quat.rotateX(rotQuat, rotQuat, baseOri.x);
        quat.rotateY(rotQuat, rotQuat, baseOri.y);
        quat.rotateZ(rotQuat, rotQuat, baseOri.z);
        var transVec = vec3.fromValues(basePos.x, basePos.y, basePos.z);
        var mat = mat4.create();
        mat4.fromRotationTranslation(mat, rotQuat, transVec);
        
        return new Promise(function (resolve, reject) {
            var glyphPromises = [];
            var xOffset = 0;
            for (var i=0; i<textStr.length; i++) {
                var glyph;
                /* If it's a space, make an empty promise and then catch that on the other side */
                var chrCode = textStr.charCodeAt(i);
                if (chrCode == 32) {
                    glyphPromises.push(new Promise(function (resolve, reject) {resolve(null)}));
                    continue;
                }
                
                var meshPath = scene.fontGlyphUrlFormat.replace('@@', chrCode);/* */
                glyphPromises.push(scene._fetchMeshViaCache(meshPath));
            }
            Promise.all(glyphPromises).then(function (meshes) {
                var glyphobjs = [];
                for (var i=0; i<meshes.length; i++) {
                    var mesh = meshes[i];
                    
                    if (mesh === null) {
                        xOffset += 0.35*scale;
                        continue;
                    }
                    
                    var meshInfo = FCMeshTools.analyseMesh(mesh);
                    glyph = new FCShapes.MeshShape(mesh, {x:xOffset, y:0, z:0}, {scale:scale}, null,
                                {materialLabel:materialLabel, groupLabel:groupLabel, textureLabel: textureLabel});
                    glyph.inheritedMatrix = mat;
                    scene.addObject(glyph);
                    glyphobjs.push(glyph);
                    xOffset += meshInfo.maxX*1.2*scale;
            
                }
                resolve(new ObjContainer(glyphobjs, scene));
            });
            
        })
    }
    



    return Scene;
})();
