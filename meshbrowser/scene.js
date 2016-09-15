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
    this.children = children || [];
    this.scene = scene;
    var p = params || {};
    this.inheritedMatrix = p.matrix;
}

ObjContainer.prototype.addChild = function (child) {
    if (this.inheritedMatrix) {
        child.inheritedMatrix = this.inheritedMatrix;
    }
    this.children.push(child);
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

var AppMode = function (scene, label, params) {
    var p = params || {};
    this.label = label;
    this.scene = scene;
    this.lights = p.lights;
    this.enterFunction = p.enterFunction;
    this.exitFunction = p.exitFunction;
    this.associatedElementKeys = p.associatedElementKeys;
    
    this.statusTextureLabel = p.statusTextureLabel;
}

AppMode.prototype.enter = function () {
    if (this.enterFunction) this.enterFunction.call(this);
}

AppMode.prototype.exit = function () {
    if (this.exitFunction) this.exitFunction.call(this);
}

AppMode.prototype.distribute = function (fn) {
    for (var i=0; i<this.associatedElementKeys.length; i++) {
        var elem = this.scene[this.associatedElementKeys[i]];
        fn(elem);
    }
}

AppMode.prototype.getElement = function (key) {
    return this.scene[key];
} /* kinda fast & loose.. */

/*__*/


window.ExperimentalScene = (function () {
    "use strict";

    /* Declare any class and instance vars unique to this scene, here. */
    /* The constructor is perfect for declaring the prerequisites of a scene for autoloading, and setting */
    /* variables that don't depend on other things. */
    /* There is a separate phase of setup (namely setupScene) for things that *do* depend on other things. */
    /* Scene setup goes like this: */
    /* - This constructor is called */
    /* - loadPrerequisites is called. This iterates through scene.prerequisites and <...>, ensuring that the <...> */
    /* - setupPrerequisites is called. <expand on this> */
    /* - setupScene is called. It has access to all of the prerequisities that have been loaded in previous */
    /*   stages of the setup, so this is where you should actually construct the scene itself. */
    /* */
    var Scene = function() {
        FCScene.call(this);
        // this.meshes = {};
        
        this.modelList = null;
                
        this.currentItem = {
            model: null,
            idx: null
        };
        this.previewObject = null;
                
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
               // {label: 'controller', src: '//assets.meta4vr.net/mesh/obj/sys/vive/controller/ctrl_lowpoly_body.obj'}
               {label: 'controller_body', src: '/assets/mesh/sys/vive/controller/vr_controller_lowpoly/body.obj'},
               {label: 'controller_button_menu', src: '/assets/mesh/sys/vive/controller/vr_controller_lowpoly/button.obj'},
               {label: 'controller_button_sys', src: '/assets/mesh/sys/vive/controller/vr_controller_lowpoly/sys_button.obj'},
               {label: 'controller_trigger', src: '/assets/mesh/sys/vive/controller/vr_controller_lowpoly/trigger.obj'},
               {label: 'controller_grip_l', src: '/assets/mesh/sys/vive/controller/vr_controller_lowpoly/l_grip.obj'},
               {label: 'controller_grip_r', src: '/assets/mesh/sys/vive/controller/vr_controller_lowpoly/r_grip.obj'}
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
            brightBlueBackfill: {
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
            },
            dimAmbient: {
                ambient: [0.2, 0.2, 0.2]
            },
            brightWhiteFrontal: {
                position: [-0.3, 1.5, 1.5, 1],
                diffuse: [0.8, 0.8, 0.9]
            },
            dimYellowHighlight: {
                position: [1.0, 0.7, 1.6, 1],
                diffuse: [0.5, 0.5, 0.0]
            }
            
        }
                
        this.lights = [
            this.lightPool.plainWhiteAmbientOverhead, 
            this.lightPool.brightBlueBackfill, 
            this.lightPool.dimWhiteBackfill
        ];
        
        
        this.uiMode = 0;
        this.uiModes = [];
        
        /* Modes config. */
        /* Preview grid is always visible. folderGrid is mutex with the currentItem. */
        
        /* AppModes are self-contained and should not make any assumptions about what other modes */
        /* expect, require or provide. They provide a means for coordinating the various UI elements */
        /* installed in the scene and they don't know when, how or in what order they will be activated; */
        /* so they should entirely manage their own expectations and tidy up after themselves. */
        /* enterFunctions ensure that everything is as the mode expects to operate. */
        /* exitFunctions ensure that everything is tidied up ready for the next mode. */
        /* Note that doing things like (eg) setting something invisible in one mode exit and */
        /* then immediately setting the same thing visible in the next mode enter ARE FINE because */
        /* an animation frame won't be requested in between, so there should be no flicker :) */
        /* Corollary: if a mode needs something, it should show it on enter and hide it on exit. */
        /* Modes should not have to hide things on the off chance that they are currently being displayed. */
        /* Rule of thumb - anything the mode does in its enter() function should be undone in its exit(). */        
        
        /* Show the folder and preview grids, hide the current item */
        this.uiModes.push(new AppMode(this, 'MODE_FOLDER_SELECT', {
            statusTextureLabel: 'blue',
            associatedElementKeys: ['folderGrid'],
            lights: [
                this.lightPool.plainWhiteAmbientOverhead, 
                this.lightPool.brightBlueBackfill, 
                this.lightPool.dimWhiteBackfill
            ],
            enterFunction: function () {
                var current = this.getElement('currentItem');
                if (current.model) {
                    current.model.hidden = true;
                }
                // this.getElement('previewGrid').setVisible(true);
                this.getElement('folderGrid').setVisible(true);
                this.getElement('folderGrid').focus();
                this.scene.lights = this.lights;
                this.scene.updateLighting();
            },
            exitFunction: function () {
                this.getElement('folderGrid').setVisible(false);
                this.getElement('folderGrid').blur();
            }
        }));
        
        this.uiModes.push(new AppMode(this, 'MODE_PREVIEW_SELECT', {
            statusTextureLabel: 'green',
            lights: [
                this.lightPool.plainWhiteAmbientOverhead, 
                this.lightPool.brightBlueBackfill, 
                this.lightPool.dimWhiteBackfill
            ],
            enterFunction: function () {
                var current = this.getElement('currentItem');
                if (current.model) {
                    current.model.hidden = false;
                }
                this.getElement('previewGrid').focus();
                this.scene.lights = this.lights;
                this.scene.updateLighting();
            },
            exitFunction: function () {
                var current = this.getElement('currentItem');
                if (current.model) {
                    current.model.hidden = true;
                }
                this.getElement('previewGrid').blur();
            }
        }));
        
        this.uiModes.push(new AppMode(this, 'MODE_OBJ_ROT_SCALE', {
            statusTextureLabel: 'white', 
            // lights: [
            //     {
            //                     position: [0.6, 1.5, 2.0, 1.0],
            //                     ambient: [0.21, 0.21, 0.21],
            //                     diffuse: [0.6, 0.8, 0.45],
            //                     specular: [0.0, 0.0, 0.0]
            //                 },
            //                 {
            //                                 position: [-0.6, 1.5, 2.0, 1.0],
            //                                 ambient: [0.21, 0.21, 0.21],
            //                                 diffuse: [0.8, 0.6, 0.45],
            //                                 specular: [0.0, 0.0, 0.0]
            //                             }
            // ],
            lights: [this.lightPool.dimAmbient, this.lightPool.brightWhiteFrontal, this.lightPool.dimYellowHighlight],
            enterFunction: function () {
                var current = this.getElement('currentItem');
                if (current.model) {
                    current.model.hidden = false;
                }
                this.getElement('previewGrid').distributeToDisplayItems(function (o,p) {o.textureLabel='gray';});
                this.scene.lights = this.lights;
                this.scene.updateLighting();
            },
            exitFunction: function () {
                var current = this.getElement('currentItem');
                if (current.model) {
                    current.model.hidden = true;
                }
                this.getElement('previewGrid').distributeToDisplayItems(function (o,p) {o.textureLabel='white';});
            }
            
            
        }));
        
        
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
                },
                text: {
                    orientation: {x:0, y:0, z:0}
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
                },
                text: {
                    orientation: {x:0, y:180/DEG, z:0}
                }
            }
        };
        this.uiLayout = this.uiLayouts.LAYOUT_DESK;
        
        this.previews = [];
        this.previewIdx = 0;
        
        this.fontGlyphUrlFormat = '//meshbase.meta4vr.net/_typography/lato-bold/glyph_@@.obj'
        
        // this.modelFolder = 'statuary';
        this.modelFolder = '';
        this.startPageNumber = 0;
        if (window.location.hash) {
            var hashParts = window.location.hash.slice(1).split(':');
            this.modelFolder = hashParts[0];
            this.startPageNumber = hashParts[1] && Number(hashParts[1]) || 0;
            
        }
        
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
    
    /*_ Content handling _*/
    
    /* Grids will be constructed once each and then re-used for different content */
    Scene.prototype.buildPreviewGrid = function () {
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
    
    Scene.prototype.buildFolderGrid = function () {
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
        scene.updateHash();
        
        /* TODO remove items from scene.previews when changing */
        /* TODO consider caching preview meshes */
        var currentPreviews = scene.getObjectsInGroup('previews');
        for (var i=0; i<currentPreviews.length; i++) {
            scene.removeObject(currentPreviews[i], true);
        }
        
        var myItems = grid.getDataForCurrentRange();
        if (!grid.specialSelection) grid.setCaret();
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
                        grid.setDisplayItemAtIndex(newPrev, modelIdx);
                        // grid.gridItems[modelIdx]=newPrev;
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
        /* TODO I'm not really happy with this, I'd like to be able to remove the containers rather than the individual glyphs */
        var glyphs = scene.getObjectsInGroup('folderlist');
        for (var i=0; i<glyphs.length; i++) {
            scene.removeObject(glyphs[i]);
        }
        
        var myFolders = grid.getDataForCurrentRange();
        grid.setCaret();
        for (var i=0; i<myFolders.length; i++) {
            var myFolder = myFolders[i];
            var myInf = {folder: myFolders[i], idx: i, placement: grid.getPlacementForGridPosition(i)};
            var exec = function (inf, idx) {
                scene.addText(
                    inf.folder.label, inf.placement.location, 
                    scene.uiLayout.text.orientation,
                    {groupLabel:'folderlist', scale: 0.4}
                )
                .then(function (cluster) {
                    // textCluster = cluster;
                    // grid.gridItems[idx] = cluster;
                    grid.setDisplayItemAtIndex(cluster, idx);
                })
            }(myInf, i);
            
        }
        
    }
    
    Scene.prototype.getActiveGrid = function (folder) {
        var mode = this.uiModes[this.uiMode];
        if (mode.label == 'MODE_PREVIEW_SELECT') return this.previewGrid;
        else if (mode.label == 'MODE_FOLDER_SELECT') return this.folderGrid;
        
    }
    
    Scene.prototype.showFolder = function (folder, page) {
        var scene = this;
        if (!page) page = 0;
        // console.log(scene);
        return new Promise(function (resolve, reject) {
            console.log('Showing folder', folder);
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
                scene.modelFolder = folder;
                scene.previewGrid.setData(remoteInf.files);
                var perPage = scene.uiLayout.grid.rows*scene.uiLayout.grid.columns;
                scene.updatePreviews(page*perPage, perPage);
            
                // scene.showFolderGrid(remoteInf.folders);
                var dests = [];
                // console.log(remoteInf);
                if (remoteInf.parent) {
                    dests.push(remoteInf.parent);
                }
                scene.folderGrid.setData(dests.concat(remoteInf.folders));
                scene.updateFolders(0, 10);
            
                // scene.activeGrid = scene.previewGrid;
            
                // scene.showPreviews(remoteInf.files);
                scene.updateHash();
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
        
        scene.showFractionComplete(0);
        
        var progressUpdater = function (messageInf) {
            if (messageInf.status == 'progress' && messageInf.type == 'download') {
                scene.showFractionComplete(0.5*messageInf.value);
            }
            else if (messageInf.status == 'progress' && messageInf.type == 'parse') {
                scene.showFractionComplete(0.5+(0.5*messageInf.value));
            }
        }
        FCShapeUtils.loadMesh(scene.modelUrlFormat.replace('@@', itemInf.name), null, progressUpdater)
        .then(function (mesh) {
            scene.showFractionComplete(1);
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
                    // console.log(xh.response);
                    scene.modelList = xh.response;
                    resolve(xh.response);
                }
            }
            xh.send();
            
        });
    }
    
    /*_ Controller & low-level UIX _*/

    Scene.prototype.updateHash = function () {
        window.location.hash = '#' + this.modelFolder + ':' + this.previewGrid.currentPage;
    }
        
    Scene.prototype.showMenu = function () {
        
        
    }
    
    Scene.prototype.showFractionComplete = function (f) {
        var scene = this;
        scene.statusIndicator.shape.parameters.completion = f;
        scene.prepareObject(scene.statusIndicator);
    }
    
    /* We're making a new lathe each time, when we could probably just change the texture */
    Scene.prototype.showStatusIndicator = function (tex) {
        var scene = this;
        if (scene.statusIndicator) {
            scene.removeObject(scene.statusIndicator);
        }
        var pacmanShapeSampler = function (i, n, p) {
            var fract = i/n;
            // console.log(p);
            if (fract<(1-p.completion||0)) return [0,0];
            var ang = 2*Math.PI*(fract);
            return [Math.cos(ang), Math.sin(ang)];
        }
        var siConfig = {
            materialLabel:'matteplastic', texture: tex, label:'statusIndicator',
            samplerType: 'BeveledExtrudeSampler',
            shape: {
                pointCount: 40, sampler: pacmanShapeSampler, parameters:{completion:1}
            }
        };
        var si = new FCShapes.LatheExtruderShape(
            null, {height: 0.01, scale:0.02},
            null, siConfig
        );
        si.behaviours.push(FCUtil.makeGamepadTracker(scene, 0, null));
        si.translation.z = 0.05;
        scene.addObject(si);
        scene.statusIndicator = si;
    }
    
    /* If idx is not set, increment */
    Scene.prototype.setUIMode = function (idx) {
        var scene = this;
        
        var prevMode = scene.uiModes[scene.uiMode];
        prevMode.exit();
        
        if (idx === null || idx === undefined) {
            scene.uiMode = ++scene.uiMode%scene.uiModes.length;
        }
        else {
            scene.uiMode = 0; //??
        }
        
        var newMode = scene.uiModes[scene.uiMode];
        scene.showStatusIndicator(scene.textures[newMode.statusTextureLabel]);
        newMode.enter();
        
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

    Scene.prototype.handleButton_MODE_OBJ_ROT_SCALE = function (btnIdx, btnStatus, sector, myButton, extra) {
        var scene = this;
        var myObj = scene.previewObject || scene.currentItem && scene.currentItem.model;
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
    
    /* Buttons are - 0: trackpad, 1: trigger 2: grip, 3: menu */
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
            
            
            var uiMode = scene.uiModes[scene.uiMode].label;
            var handler = scene['handleButton_'+uiMode];
            if (handler) {
                return handler.call(scene, btnIdx, btnStatus, sector, myButton, extra);
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
            scene.meshes.controller_body,
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
            scene.meshes.controller_body,
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

        /* Display initial item which is a questionmark aka glyph 63 */
        FCShapeUtils.loadMesh(scene.fontGlyphUrlFormat.replace('@@', 63))
        .then(function (mesh) {
            var layout = scene.uiLayout;
            var glyph = new FCShapes.MeshShape(mesh, layout.itemDisplay.pos, {scale:1.5}, null, {materialLabel:'matteplastic', textureLabel:'skin_2'});
            glyph.rotation = layout.text.orientation; /* sometimes we want to rotate instead of orient */
            glyph.hidden = true;
            scene.currentItem.model = glyph;
            scene.currentItem.idx = -1;
            scene.addObject(glyph);
        });
        
        
        scene.showFolder(scene.modelFolder, scene.startPageNumber)
        .then(function () {
            // scene.activeGrid = scene.folderGrid;
            scene.setUIMode(0);
        })
        
        
        // scene.showStatusIndicator(scene.textures.white);
        scene.showStatusIndicator(scene.textures[scene.uiModes[scene.uiMode].statusTextureLabel]);
        
        /* A gamepadTracker is just a behaviour function bound to a specific controller and with an optional */
        /* button handler. Since they are stateless and get given everything they need on every call, they are */
        /* reusable (as long as there's no button handler!) */
        /* So for convenience we add a pair of generic ones for all the things that want to track controller. */
        scene.t0 = FCUtil.makeGamepadTracker(scene, 0, null);
        scene.t1 = FCUtil.makeGamepadTracker(scene, 1, null);
        
        /* TODO I really want to be able to make text track controllers plz!! */
        /* ... easier said than done tho ... */
        /* You'll need to either attach the behaviour to all the glyphs, or fially get around to having */
        /* an inheritedMatrix handled by a containers. */
        /* The latter would be preferable, having to attach behaviours to all glyphs could have performance */
        /* cost but inherited matrixes on the group would actually be useful */
        
        /* OK we've got matriculated containers now, that's nice. */
        /* but there's still more to do ... */
        /* */
        
        var controllerChromeItems = [
            scene.meshes.controller_button_menu,
            scene.meshes.controller_button_sys,
            scene.meshes.controller_grip_l,
            scene.meshes.controller_grip_r,
            scene.meshes.controller_trigger,
        ];
        scene.addMeshObjectsWithBehaviour(controllerChromeItems, {materialLabel:'matteplastic', groupLabel:'controllerChrome'}, scene.t0);
        
        /* Maybe add a mechanism for scene behaviours? */
        
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
            var newContainer = new ObjContainer(null, scene, {matrix:mat});
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
                    // glyph.inheritedMatrix = mat;
                    newContainer.addChild(glyph);
                    // scene.addObject(glyph);
                    glyphobjs.push(glyph);
                    xOffset += meshInfo.maxX*1.2*scale;
            
                }
                scene.addObjects(newContainer.children); /* TODO ? */
                resolve(newContainer);
                // resolve(new ObjContainer(glyphobjs, scene));
            });
            
        })
    }
    

    /*_ Utils _*/
    
    /* Helpful for debugging lights */
    Scene.prototype.showLights = function () {
        var lamps = [];
        this.removeObjectsInGroup('lamps');
        for (var i=0; i<this.lights.length; i++) {
            var myLight = this.lights[i];
            if (!(myLight.diffuse && myLight.position)) continue;
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
    
    /* This is mainly for batch-adding controller chrome items. So it's not very sophisticated */
    /* Note that because all the chrome items use a shared params object, changing it for one will change it for all! */
    /* This may be a useful property or it may be just the opposite. */
    Scene.prototype.addMeshObjectsWithBehaviour = function (meshes, params, behaviour) {
        var scene = this;
        for (var i=0; i<meshes.length; i++) {
            var m = meshes[i];
            var o = new FCShapes.MeshShape(m, null, null, null, params);
            o.behaviours.push(behaviour);
            scene.addObject(o);
        }
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
                    scene._meshCache[meshPath] = mesh;
                    resolve(mesh);
                });
            }
            
        })
    }
    
    

    return Scene;
})();
