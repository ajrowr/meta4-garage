var DEG=360/(2*Math.PI);


/* Grid items are the things currently being displayed and are drawables */
/* Data items are the backing store of generic whatevers to which the grid items map. */
/* Think of the set of grid items as a movable "window" onto the data items */
var SelectGrid = function (params) {
    var p = params || {};
    this.scale = p.scale || 1;
    this.perRow = p.perRow || 10;
    this.rowHeight = p.rowHeight || 1;
    this.offset = {x:p.offset.x||0.0, y:p.offset.y||0.0, z:p.offset.z||0.0};
    
    this.rows = p.rows || 4;
    this.columns = p.columns || 8;
    
    this._arrangingIdx = 0;
    
    this.currentRange = {
        start:0, length: 32, end:32
    }
    this.selectedIdx = 0;
    this.selectCaret = {row:1,column:1};
    this.dataItems = []
    this.gridItems = [];
    this.specialSelection = null;
    this.specialItems = {PAGE_LEFT: null, PAGE_RIGHT: null};
    
}

SelectGrid.prototype.setRange = function (rStart, rLength) {
    if (rLength == null) {
        rLength = this.currentRange.length;
    }
    this.currentRange = {
        start: rStart,
        length: rLength,
        end: Math.min(rStart+rLength, this.dataItems.length)
    };
    this._arrangingIdx = 0;
    return this.currentRange;
}

SelectGrid.prototype.changePage = function (rel) {
    if (rel==1) {
        this.setRange(this.currentRange.end);
    }
    else if (rel==-1) {
        this.setRange(Math.max(0, this.currentRange.start - this.currentRange.length))
    }
    console.log(this.currentRange);
}

SelectGrid.prototype.setData = function (items) {
    this.dataItems = items;
    this.setRange(0);
}

SelectGrid.prototype.getDataForCurrentRange = function () {
    return this.dataItems.slice(this.currentRange.start, this.currentRange.end);
}

SelectGrid.prototype.getSelectedIndex = function () {
    if (this.specialSelection) return null;
    else return (this.columns * this.selectCaret.row) + this.selectCaret.column;
}

SelectGrid.prototype.getGridItemForSelection = function () {
    if (this.specialSelection) return this.specialItems[this.specialSelection];
    else return this.gridItems[this.getSelectedIndex()];
}

SelectGrid.prototype.getDataForSelection = function () {
    if (this.specialSelection) return null;
    var gridIdx = this.getSelectedIndex();
    return this.dataItems[this.currentRange.start + gridIdx];
}

SelectGrid.prototype.getDataIndexForGridIndex = function (gridIdx) {
    return this.currentRange.start + gridIdx;
}



SelectGrid.prototype.getPlacementForGridPosition = function (gridIdx) {
    // console.log(gridIdx);
    var grid = this;
    var row = Math.floor(gridIdx / grid.perRow);
    var idxInRow = gridIdx % grid.perRow;
    var itemAngle = Math.PI+(((Math.PI)/grid.perRow) * idxInRow);
    return {
        location: {
            x: grid.offset.x+(1.3 * this.scale * Math.cos(itemAngle)),
            y: grid.offset.y+(row * grid.rowHeight),
            z: grid.offset.z+(0.6*(this.scale * Math.sin(itemAngle))),
        },
        orientation: {
            x: 0,
            y: -1*itemAngle,
            z: 0
        }
    }
    
}

// SelectGrid.prototype.interactWithCurrentSelection = function (interaction) {
//
// }

SelectGrid.prototype.moveSelectCaret = function (direction) {

    /* Deselect current */
    var currentSelection;
    if (this.specialSelection) {
        currentSelection = this.specialItems[this.specialSelection];
    }
    else {
        currentSelection = this.gridItems[this.getSelectedIndex()];
    }
    if (currentSelection) currentSelection.interact('deselect');

    switch (direction) {
    case 'UP':
        this.selectCaret.row++;
        break;
    case 'DOWN':
        this.selectCaret.row--;
        break;
    case 'LEFT':
        this.selectCaret.column--;
        break;
    case 'RIGHT':
        this.selectCaret.column++;
        break;
    }
    
    
    
    /* Check bounds */
    this.specialSelection = null;
    if (this.selectCaret.row <= -1) this.selectCaret.row = 0;
    if (this.selectCaret.row >= this.rows) this.selectCaret.row = this.rows - 1;
    if (this.selectCaret.column < -1) this.selectCaret.column = -1;
    if (this.selectCaret.column > this.columns) this.selectCaret.column = this.columns;
    if (this.selectCaret.column == -1) this.specialSelection = 'PAGE_LEFT';
    if (this.selectCaret.column == this.columns) this.specialSelection = 'PAGE_RIGHT';
    
    /* Highlight new selection */
    var newSelection;
    if (this.specialSelection) {
        newSelection = this.specialItems[this.specialSelection];
    }
    else {
        newSelection = this.gridItems[this.getSelectedIndex()];
    }
    newSelection.interact('select');
    
}


window.ExperimentalScene = (function () {
    "use strict";
    
    function Scene() {
        /* Declare any class and instance vars unique to this scene, here. */
        FCScene.call(this);
        this.meshes = {};
        
        this.modelList = null;
                
        this.currentItem = {
            model: null,
            idx: null
        }
        
        this.uiMode = 0;
        this.uiModes = [
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
            cam1: {
                position: {x:0, y:1.5, z:1.5},
                orientation: {x:0, y:0, z:0}
            }
        }
        
        this.prerequisites = {
            shaders: [],
            meshes: [],
            textures: [],
            
        }
        
        this.previews = [];
        this.previewIdx = 0;
        
        this.modelListUrlFormat = 'http://meshbase.meta4vr.net/mesh/@@?mode=detail';
        this.modelListUrl = 'http://meshbase.meta4vr.net/mesh/incoming?mode=detail';
        // this.modelPreviewUrlFormat = 'http://meshbase.io.codex.cx/mesher.pycg/@@?mode=preview';
        this.modelPreviewUrlFormat = 'http://meshbase.meta4vr.net/mesh/@@?mode=grade';
        this.modelUrlFormat = 'http://meshbase.meta4vr.net/mesh/@@?mode=mesh';
        this.statusIndicator = null;
        
        this.previewGrid = null;
    }
    
    Scene.prototype = Object.create(FCScene.prototype);
    
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
    
    Scene.prototype.showFolders = function () {
        var scene = this;
        var foldersList = scene.modelList.folders || [];
        for (var i=0; i<foldersList.length; i++) {
            var myFolder = foldersList[i];
            var boardLoc = {x:0, y:0, z:-3};
            var boardOri = {x:0, y:Math.PI, z:0};
            FCUtils.createTextBoard(myFolder.label, boardLoc, null, boardOri, {
                canvasColor: 'white',
                textColor: 'black',
                fontSize: '40',
                font: 'arial',
                groupLabel: 'folderBoards'
            })
            .then(function (newBoard) {
                /* Set up colliders */
                /* Add to scene */
            })
        }
    }
    
    /* Form meshes which are kind enough to be previewable, show the previews */
    Scene.prototype.setupPreviews = function (rangeStart, rangeLength) {
        var scene = this;
        var prevIdx = 0;
        if (!scene.previewGrid) {
            scene.previewGrid = new SelectGrid(
                {rowHeight: 0.6, perRow: 8, offset:{z:-0.3*scene.stageParams.sizeZ}}
            );
            scene.previewGrid.setData(scene.modelList.files);
            
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
                    scene.setupPreviews(null);
                };
                return arrowActivate;
            };
            var arrowPosLeft = {x:-0.6*scene.stageParams.sizeX, y:1.3, z:-0.3*scene.stageParams.sizeZ};
            var arrowPosRight = {x:arrowPosLeft.x*-1, y:arrowPosLeft.y, z:arrowPosLeft.z};
        
            var arrowLeft = new FCShapes.LatheExtruderShape(
                arrowPosLeft, arrowSize, {x:0.5*Math.PI, y:Math.PI, z:0}, 
                arrowParams
            );
            arrowLeft.interactions['select'] = arrowSelect;
            arrowLeft.interactions['deselect'] = arrowDeselect;
            arrowLeft.interactions['activate'] = mkArrowActivate(-1);
            scene.previewGrid.specialItems.PAGE_LEFT = arrowLeft;

            var arrowRight = new FCShapes.LatheExtruderShape(
                arrowPosRight, arrowSize, {x:0.5*Math.PI, y:0, z:0}, 
                arrowParams
            );
            arrowRight.interactions['select'] = arrowSelect;
            arrowRight.interactions['deselect'] = arrowDeselect;
            arrowRight.interactions['activate'] = mkArrowActivate(1);
            scene.previewGrid.specialItems.PAGE_RIGHT = arrowRight;

            scene.addObject(arrowLeft);
            scene.addObject(arrowRight);
            
        }
        var grid = scene.previewGrid;
        /* If rangeStart is null, the grid was configured elsewhere */
        if (rangeStart != null) {
            grid.setRange(rangeStart, rangeLength);
        }
        
        /* TODO remove items from scene.previews when changing */
        /* TODO consider caching preview meshes */
        var currentPreviews = scene.getObjectsInGroup('previews');
        for (var i=0; i<currentPreviews.length; i++) {
            scene.removeObject(currentPreviews[i], true);
        }
        
        // console.log(grid.currentRange);
        // var myItems = scene.modelList.files.slice(grid.currentRange.start, grid.currentRange.end);
        var myItems = grid.getDataForCurrentRange();
        // for (var i=grid.currentRange.start || 0; i<grid.currentRange.end; i++) {
        // for (var i=0; i<16; i++) {
        for (var i=0; i<myItems.length; i++) {
            var myInf = myItems[i];
            // if (myInf.previews) {
                var previewUrl = scene.modelPreviewUrlFormat.replace('@@', myInf.name);
                var modelName = myInf.name;
                // console.log(modelName);
                var nowt = function (previuUrl, modelInf, modelIdx) {
                    FCShapeUtils.loadMesh(previuUrl)
                    .then(function (mesh) {
                        // var inf = FCMeshTools.analyseMesh(mesh);
                        // FCMeshTools.shuntMesh(mesh, inf.suggestedTranslate); //<<< it would be better to do this in Blender!
                        // var placement = grid.nextPlacement();
                        var placement = grid.getPlacementForGridPosition(modelIdx);
                        // var newPrev = new FCShapes.MeshShape(mesh, {x:3+(0.7*prevIdx++), y:0, z:0}, {scale: inf.suggestedScale*0.4}, null, {shaderLabel:'diffuse', textureLabel:'white', groupLabel:'previews'});
                        var newPrev = new FCShapes.MeshShape(mesh, placement.location, {scale:0.25}, placement.orientation,
                            {shaderLabel:modelIdx % 2 && 'ads' || 'diffuse', textureLabel:'white', groupLabel:'previews'}
                        );
                        newPrev.metadata.name = modelInf.name;
                        newPrev.metadata.gridIdx = modelIdx;
                        newPrev.metadata.dataIdx = grid.getDataIndexForGridIndex(modelIdx);
                        newPrev.interactions['select'] = function (drawable, p) {
                            drawable.textureLabel = 'cyan';
                            console.log(grid.getDataForSelection());
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
                        // console.log(modelInf.name);
                        // scene.previews.push({model:newPrev, name:modelInf.name});
                        scene.previews.push(newPrev);
                        grid.gridItems[modelIdx]=newPrev;
                        // console.log(grid.items);
                    });
                    
                }(previewUrl, myInf, i);
            // }
        }
    }
    
    Scene.prototype.showItemWithIndex = function (idx, previewMesh) {
        var scene = this;
        if (scene.currentItem.model) {
            scene.removeObject(scene.currentItem.model, true);
        }
        var itemInf = scene.modelList.files[idx];
        var previewObj;
        if (previewMesh) {
            previewObj = new FCShapes.MeshShape(previewMesh, null, {scale:0.9}, 
                                        null, {shaderLabel:'diffuse', textureLabel:'skin_1'});
            scene.addObject(previewObj);
        }
        
        scene.showMessage([
            'Loading '+itemInf.name, 
            'Size: ' + Math.round((itemInf.size||0)/1000) + ' kbytes',
            'Index '+idx
        ]);
        
        FCShapeUtils.loadMesh(scene.modelUrlFormat.replace('@@', itemInf.name))
        .then(function (mesh) {
            var newObj = new FCShapes.MeshShape(mesh, null, {scale:0.9}, null, {shaderLabel:'diffuse', textureLabel:'skin_2'});
            if (previewObj) {
                scene.removeObject(previewObj);
            }
            scene.addObject(newObj);
            scene.currentItem.model = newObj;
            scene.currentItem.idx = idx;
        })
        .catch(function (msg) {
            scene.showMessage([msg]);
        });
    }
    
    Scene.prototype.loadModelList = function () {
        var scene = this;
        return new Promise(function (resolve, reject) {
            var xh = new XMLHttpRequest();
            xh.open('GET', scene.modelListUrl, true);
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
                {hex: '#ffe0bd', label: 'skin_1'},
                {hex: '#ffcd94', label: 'skin_2'},
                {hex: '#eac086', label: 'skin_3'},
                {hex: '#ffad60', label: 'skin_4'},
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
                {srcFs: 'diffuse2.fs', srcVs: 'diffuse2.vs', label: 'diffuse'},
                {srcFs: 'ads_v1.fs', srcVs: 'ads_v1.vs', label: 'ads'}
            ];
            for (var i=0; i<shaders.length; i++) {
                var myShader = shaders[i];
                prereqPromises.push(new Promise(function (resolve, reject) {
                    scene.addShaderFromUrlPair(myShader.srcVs, myShader.srcFs, myShader.label, {
                        position: 0,
                        texCoord: 1,
                        vertexNormal: 2
                    })
                    .then(function (shaderInfo) {
                        console.log('Compiled shader ' + shaderInfo.label);
                        if (shaderInfo.label == 'ads') {
                            shaderInfo.program.use();
                            console.log(shaderInfo.program.uniform);
                            /* Set up scene lights */
                            // var ads = this.shaders.ads;
                            var u = shaderInfo.program.uniform;
                            scene.gl.uniform3fv(u['material.Ambient'], [1.0, 1.0, 1.0]);
                            scene.gl.uniform3fv(u['material.Diffuse'], [0.8, 0.8, 0.8]);
                            scene.gl.uniform3fv(u['material.Specular'], [1.0, 1.0, 1.0]);
                            scene.gl.uniform1f(u['material.Shininess'], 0.8);

                            scene.gl.uniform4fv(u['lights[1].Position'], [0.0, 3.0, 1.0, 1.0]);
                            scene.gl.uniform3fv(u['lights[1].Ambient'], [0.1, 0.1, 0.1]);
                            scene.gl.uniform3fv(u['lights[1].Diffuse'], [0.8, 0.8, 0.8]);
                            scene.gl.uniform3fv(u['lights[1].Specular'], [0.0, 0.0, 0.0]);
                            
                            scene.gl.uniform4fv(u['lights[2].Position'], [0.0, 3.0, 5.0, 1.0]);
                            scene.gl.uniform3fv(u['lights[2].Ambient'], [0.0, 0.0, 0.0]);
                            scene.gl.uniform3fv(u['lights[2].Diffuse'], [0.2, 0.2, 0.8]);
                            scene.gl.uniform3fv(u['lights[2].Specular'], [0.0, 0.0, 0.0]);
                            
                            scene.gl.uniform4fv(u['lights[3].Position'], [0.0, 3.0, -5.0, 1.0]);
                            scene.gl.uniform3fv(u['lights[3].Ambient'], [0.0, 0.0, 0.0]);
                            scene.gl.uniform3fv(u['lights[3].Diffuse'], [0.2, 0.2, 0.2]);
                            scene.gl.uniform3fv(u['lights[3].Specular'], [0.0, 0.0, 0.0]);
                            
                            // scene.gl.uniform4fv(u['lights[2].Position'], []);
                            // scene.gl.uniform3fv(u['lights[2].Ambient'], []);
                            // scene.gl.uniform3fv(u['lights[2].Diffuse'], []);
                            // scene.gl.uniform3fv(u['lights[2].Specular'], []);
                            
                            
                            
                        }
                        resolve();
                    })
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
        
    Scene.prototype.interactWithSelection = function (interaction, params) {
        var scene = this;
        // var idx = scene.previewGrid.getSelectedIndex();
        var obj = scene.previewGrid.getGridItemForSelection();
        // if (idx == null) {
        //
        // }
        // var obj = scene.previews[idx];
        obj.interact(interaction, params);
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
    
    Scene.prototype.handleButton_MODE_OBJ_ROT_SCALE = function (btnIdx, btnStatus, sector, myButton, extra) {
        var scene = this;
        if (btnIdx == 0 && btnStatus == 'held') {
            if (sector == 'n') {
                scene.currentItem.model.scaleFactor *= 1.005;
            }
            else if (sector == 's') {
                scene.currentItem.model.scaleFactor *= 0.995;
            }
            else if (sector == 'w') {
                scene.currentItem.model.orientation.y += 0.6/DEG;
            }
            else if (sector == 'e') {
                scene.currentItem.model.orientation.y -= 0.6/DEG;
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
                    case 'MODE_PREVIEW_SELECT':
                        if (btnStatus == 'released') {
                            if (sector == 'e' || sector == 'w') {
                                scene.previewUpdated(sector=='e' && 1 || sector=='w' && -1);
                            }
                            else if (sector == 'n') {
                                scene.chooseCurrentPreview();
                            }
                        }
                        break;
                    case 'MODE_OBJ_ROT_SCALE':
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
            if (scene.autoLoadIdx) scene.loadModelAtIndex(scene.autoLoadIdx);
            scene.setupPreviews(0, 32);
        });
        
        // scene.showStatusIndicator(scene.textures.white);
        scene.showStatusIndicator(scene.textures[scene.uiModes[scene.uiMode].statusTexLabel])
        
    }
    
    
    Scene.prototype.grabCurrentObject = function (gamepadIdx) {
        var scene = this;
        /* The initial translation values here are applying the exact opposite of the hand position. */
        /* When the behaviour is assigned, it will start updating the object's position directly to */
        /* match that of the controller (ie. the player's hand location) so we need to pre-emptively */
        /* cancel those out to keep the object's position from suddenly changing as it is grabbed. */
        
        /* orrrrr you could just set it to the origin? (relative to raft pos) */
        
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
