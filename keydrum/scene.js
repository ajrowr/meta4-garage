/* Building on Raycast selecter, we want to refine that code a bit and use it to build a keyboard thing. */
/* The keyboard thing will make a lot of use of co-planar colliders, IE whole sets of colliders on a single plane. */
/* Hopefully this exercise will grant a better structural understanding of how to factor things going forward. */


/* 
So how does this all tie together?
We create a sceneobject that represents the collision plane. However it's invisible, we're just using it for its 
transformation matrix :-|
Then we add a planar collider object which represents the collision plane and acts as a container for the 
collision boxes (which are defined later). It also has a configured distance from the controller at which it 
will process input (anything outside this distance is ignored).
We add a ray projector which is attached to the controller, gets given a list of colliders it is expected to 
interact with (in this case just the single keyboard one).
We create a KeyboardArbiter which will be used to coordinate the display, the keys and the backing store.
We then calculate coords for individual keycaps, and for each create a wall object with a text texture and 
push a collision box into the PlanarCollider with coords and a callback generated by the KeyboardArbiter.

Once all this is done we are ready to accept events.

*/


/* So much room for improvement.

Blatant issues:
- Action at a distance should be determined by the ray projector, not the collider.
- Having an individual drawable for every single keycap is just wrong and is a *serious* performance concern.
- Having to use an invisible keyplane so that everything else can borrow its matrix seems silly.


- Also we need to make sure we have a generalised solution for collision management, preferably in relation to
  drawables.


Solutions?

Keyboard object.
Accepts various things.
Maybe uses something like a delegate?
Draws itself and makes its own collision boxes.
Uses a grid system for layouts. Figure a way for things to define their grid behaviour.
Can handle a list of things, not just plain glyphs but anything
Builds keys as a single draw list of disjoint polys and generates a single texture with the keycaps
Builds and caches a collider on demand that can be used by any collision generator (w/ active/inactive toggle?)

new Keyboard(keydelegate, )

*/


var KeyboardArbiter = function (scene, backingStore, display, params) {
    var p = params || {};
    
    this.scene = scene;
    this.backingStore = backingStore;
    this.display = display;
    
    this.displayAutoManage = p.displayAutoManage || true;
    
    this.glyphs = 'abcd` zaq1 xsw2 cde3 vfr4 bgt5-nhy6-mju7-,ki8-.lo9-/;p0--------------------------';
    this.cbGlobalState = {};
}

KeyboardArbiter.prototype.updateDisplay = function () {
    var arbiter = this;
    var t = FCUtil.renderTextToTexture(arbiter.scene.gl, [
        {t: arbiter.backingStore.value}
    ], {canvasWidth: 500, canvasHeight: 300});
    arbiter.display.texture = t;
}

KeyboardArbiter.prototype.generateKeypressCallback = function (keyIdx) {
    var arbiter = this;
    console.log(keyIdx);
    var cb = function (ctx) {
        var glyphs = arbiter.glyphs;
        var s = arbiter.cbGlobalState;
        // return function (ctx) {
            var outGlyph = null;
            var myGlyph = glyphs[keyIdx];
            var currentTime = Date.now();
            if (myGlyph != s.currentGlyph || currentTime > s.pressedAt+200 ) {
                outGlyph = myGlyph;
                s.currentGlyph = myGlyph;
                s.pressedAt = currentTime;
            }
            // if (!s.pressedAt) {
            //     s.pressedAt()
            // }
            // console.log(idx);
            if (outGlyph) {
                console.log(keyIdx, outGlyph);
                // var elem = document.getElementById('output');
                var elem = arbiter.backingStore;
                elem.value = elem.value + outGlyph;
                if (ctx.gamepad) {
                    ctx.gamepad.vibrate(20);
                }
                
            }
        // }
        
        
        //
        //
        // arbiter.backingStore.value += arbiter.glyphs[keyIdx];
        console.log(keyIdx);
        arbiter.updateDisplay();
    }
    return cb;
}


/* We need a custom collider behaviour to add to (something) the drumhead, with these characteristics:
/* - detect when hand ray solution for plane is at a specific distance, not too close, not too far
/* - test point against all rects in the collider plane, this is how we implement "keys"
*/

/* AssociatedObject is optional but very useful. If defined, the collider will use AssociatedObject's
/* transformations on itself.
*/
var PlanarCollider = function (planeDescription, associatedObject, params) {
    // var collider = this;
    var p = params || {};
    var desc = planeDescription;
    this.planeNormal = vec3.fromValues(desc.planeNormal[0], desc.planeNormal[1], desc.planeNormal[2]);
    this.planePoint = vec3.fromValues(desc.pointOnPlane[0], desc.pointOnPlane[1], desc.pointOnPlane[2]);
    this.associatedObject = associatedObject;
    this.bracketDistanceMin = p.bracketDistanceMin || 0;   /* Discard collisions outside of  */
    this.bracketDistanceMax = p.bracketDistanceMax || 100; /*  0-100m by default             */
    this.features = []; /* List of things to be tested in the plane */
    this.collisionBoxes = [];
}



PlanarCollider.prototype.findRayCollision = function (testRayOrigin, testRayVec, bracketDist, ctxObj, debugObj) {
    var collider = this;
    var brkt = bracketDist || {};
    var bracketMax = brkt.max || 100;
    var bracketMin = brkt.min || -100;
    /* First, test if the ray collides with the plane in between the bracket distances. */
    /* If that collision exists, then test against the individual collisionBox features. */
    /* If collisionBox is set then find collision with the box.
    */
    
    var rayOrigin = vec3.fromValues(testRayOrigin.x, testRayOrigin.y, testRayOrigin.z); // vec3 l0
    var rayVector =  vec3.create();                 // vec3 l
    var pointOfInterest = null;                     // float t
    
    /* Set up the plane params and transform as necessary */
    var planeNormal = vec3.clone(collider.planeNormal);
    var pointOnPlane = vec3.clone(collider.planePoint);
    var transmat = null;
    if (collider.associatedObject) {
        var drawable = collider.associatedObject;
        transmat = drawable.transformationMatrix();
        
        var quW = quat.create();
        var orien = drawable.currentOrientation || drawable.orientation;
        quat.rotateX(quW, quW, orien.x);
        quat.rotateY(quW, quW, orien.y);
        quat.rotateZ(quW, quW, orien.z);
        vec3.transformQuat(planeNormal, planeNormal, quW);
        
        vec3.transformMat4(pointOnPlane, pointOnPlane, transmat);
    }
    
    /* pointOfInterest represents the distance along the vector at which collision occurs with the plane. */
    vec3.normalize(rayVector, testRayVec);
    vec3.normalize(planeNormal, planeNormal);
    
    var denom = vec3.dot(planeNormal, rayVector);
    var pointVsRay = vec3.create();
    vec3.subtract(pointVsRay, pointOnPlane, rayOrigin);
    var pointOfInterest = vec3.dot(pointVsRay, planeNormal) / denom;
    
    if (!(bracketMin <= pointOfInterest && pointOfInterest <= bracketMax)) return; 
    
    if (collider.collisionBoxes) {
        var collisionPoint = [
            testRayOrigin.x + (pointOfInterest*rayVector[0]), 
            testRayOrigin.y + (pointOfInterest*rayVector[1]), 
            testRayOrigin.z + (pointOfInterest*rayVector[2])
        ];
        for (var i=0; i<collider.collisionBoxes.length; i++) {
            var cbox = collider.collisionBoxes[i];
            var boxBL = vec3.clone(cbox.bottomLeft);
            var boxTR = vec3.clone(cbox.topRight);
            vec3.transformMat4(boxBL, boxBL, transmat);
            vec3.transformMat4(boxTR, boxTR, transmat);
            
            /* Don't rely on these to be the left, right, top etc. They're just abstract concepts */
            var colLeft, colRght, colTop, colBtm, colFrnt, colBack;
            colLeft = Math.min(boxBL[0], boxTR[0]);
            colRght = Math.max(boxBL[0], boxTR[0]);
            if (colRght - colLeft < 0.001) {
                colLeft -= 0.002;
                colRght += 0.002;
            }
            colBtm = Math.min(boxBL[1], boxTR[1]);
            colTop = Math.max(boxBL[1], boxTR[1]);
            if (colTop - colBtm < 0.001) {
                colBtm -= 0.002;
                colTop += 0.002;
            }
            colFrnt = Math.min(boxBL[2], boxTR[2]);
            colBack = Math.max(boxBL[2], boxTR[2]);
            if (colBack - colFrnt < 0.001) {
                colFrnt -= 0.002;
                colBack += 0.002;
            }
            
            if ((colLeft <= collisionPoint[0] && collisionPoint[0] <= colRght) 
            && (colBtm  <= collisionPoint[1] && collisionPoint[1] <= colTop)
            && (colFrnt <= collisionPoint[2] && collisionPoint[2] <= colBack)
            && pointOfInterest <= 0) {
                 // console.log('yep');
                 if (cbox.callback) {
                     cbox.callback(ctxObj); /* TODO what to put in here? */
                 }
                 return {idx: i, poi: pointOfInterest};
            }
            
            
        }
        
        /* DEBUG */
        if (debugObj) {
            debugObj.pointOfInterest = pointOfInterest;
            debugObj.collisionBoxInf = {
                x: [colLeft, collisionPoint[0], colRght],
                y: [colBtm, collisionPoint[1], colTop],
                z: [colFrnt, collisionPoint[2], colBack],
                collisionPoint: collisionPoint
            };
        }

        // if ((colLeft <= coll[0] && coll[0] <= colRght)
        // && (colBtm  <= coll[1] && coll[1] <= colTop)
        // && (colFrnt <= coll[2] && coll[2] <= colBack)
        // && pointOfInterest <= 0
        // ) {
        //      // console.log('yep');
        //      return pointOfInterest;
        // }
        // else {
        //     // console.log('nope');
        //     return null;
        // }
    }
    
}


/* Tests a ray against this plane. 
*/
// PlanarCollider.prototype.testRay = function (ray) {
//
// }









var makeControllerRayProjector = function (scene, gpId, colliders) {
    var projector = function (drawable, timePoint) {
        var vrGamepads = FCUtil.getVRGamepads();
        // console.log('Got ', vrGamepads.length, 'VR gamepads from ', gamepads.length, 'total gamepads');
        if (vrGamepads.length && vrGamepads[gpId]) {
            var myGp = vrGamepads[gpId];
            var gPose = myGp.pose;
            var gpMat = mat4.create();
            
            var myPointerOrigin, myPointerVector;
            
            if (window.vrDisplay.stageParameters) {
                mat4.fromRotationTranslation(gpMat, gPose.orientation, gPose.position);
                mat4.multiply(gpMat, vrDisplay.stageParameters.sittingToStandingTransform, gpMat);
            
                var ploc = scene.playerLocation;
                var trans = vec3.fromValues(ploc.x, ploc.y, ploc.z);
                var reloc = mat4.create();
                mat4.fromTranslation(reloc, trans);
                mat4.mul(gpMat, reloc, gpMat);
            
            }

            var finalTrans = vec3.create();
            mat4.getTranslation(finalTrans, gpMat);
            myPointerOrigin = {x: finalTrans[0], y: finalTrans[1], z: finalTrans[2]};
            
            var axes = vec3.fromValues(0, 0, 1);

            var roQuat = quat.create();
            mat4.getRotation(roQuat, gpMat);
            vec3.transformQuat(axes, axes, roQuat);
            myPointerVector = [axes[0], axes[1], axes[2]];
            
            scene.pointerVec = myPointerVector;
            scene.pointerOrigin = myPointerOrigin;
            
            if (colliders) {
                for (var i=0; i<colliders.length; i++) {
                    var collider = colliders[i];
                    // console.log(myPointerOrigin, myPointerVector);
                    var context = {gamepad: myGp};
                    var d = collider.findRayCollision(myPointerOrigin, myPointerVector, {min:-0.6, max:-0.5}, context);
                    if (d) {
                        // console.log(d, collider.collisionBoxes[d.idx]);
                        
                        // myGp.vibrate(20); /* TODO find somewhere else for this to live! */
                        updateReadout('D', d.idx);
                    
                    }
                
                }
                
            }
        }
    }
    return projector;
}






window.ExperimentalScene = (function () {
    "use strict";
    
    
    
    
    function Scene() {
        /* Declare any class and instance vars unique to this scene, here. */
        FCScene.call(this);
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
                {hex: '#4169e1', label: 'royalblue'},
                {hex: '#c0c0c0', label: 'silver'},
                {hex: '#ffd700', label: 'gold'},
                {hex: '#008000', label: 'green'},
                {hex: '#0000cd', label: 'mediumblue'},
                {hex: '#0000ff', label: 'blue'},
                {hex: '#afeeee', label: 'paleturquoise'},
                {hex: '#4682b4', label: 'steelblue'},
                {hex: '#9370db', label: 'mediumpurple'},
                {hex: '#ff0000', label: 'red'},
                {hex: '#ffa500', label: 'orange'}
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
            
            Promise.all(prereqPromises).then(function () {
                resolve();
            });
            
        })
        
        
        
        
    }
    
    Scene.prototype.setupScene = function () {
        var scene = this;
        var DEG=360/(2*Math.PI);
        var _hidden_beneath_floor = {x:0, y:-3.5, z:0};
        
        console.log('setting up');
        
        /* Floor */
        scene.addObject(new FCBasicShapes.WallShape(
            {x: 0, z: 0, y: -0.02},
            {minX: -20, maxX: 20, minY: -20, maxY: 20},
            {x:270/DEG, y:0/DEG, z:0/DEG},
            {label: 'floor', textureLabel: 'silver', shaderLabel: 'diffuse', segmentsX: 40, segmentsY: 40}
        ));
        
        /* Raft */
        var stageExtent = {
            x: scene.stageParams.sizeX / 2,
            z: scene.stageParams.sizeZ / 2
        };
        console.log(scene.stageParams);
        scene.addObject(new FCBasicShapes.WallShape(
            {x: 0, z: 0, y: 0},
            {minX: -1*stageExtent.x, maxX: stageExtent.x, minY: -1*stageExtent.z, maxY: stageExtent.z},
            {x:270/DEG, y:0/DEG, z:0/DEG},
            {label: 'raft', textureLabel: 'royalblue', shaderLabel: 'diffuse', segmentsX: 1, segmentsY: 1}
        ));
        
        /* Controllers */
        var ctrlInfo = {
            src: scene.modelSources.controlleresque,
            translate: {x:0.00, y:-0.016, z:0.15},
            size: {scale:0.01},
            rotate: {x:0/DEG, y:180/DEG, z:90/DEG}, 
            greenColor: scene.addTextureFromColor({r:0.2, g:0.9, b:0.6}),
            blueColor: scene.addTextureFromColor({r:0.2, g:0.6, b:0.9})
        };
        
        var ctrl0 = new FCShapes.LoaderShape(
            ctrlInfo.src,
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
        ctrl0.behaviours.push(FCUtil.makeGamepadTracker(scene, 0, null));
        scene.addObject(ctrl0);
        
        var ctrl1 = new FCShapes.LoaderShape(
            ctrlInfo.src,
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
        ctrl1.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, null));
        scene.addObject(ctrl1);
        


        
        /* Make our collider plane */
        /* Even though it's a renderable object, it's invisible. We're pretty much just using it as an anchor for the others */
        var cRows = 5, cCols = 15;
        var kbplane = new FCBasicShapes.WallShape(
            {x: 0, y:1, z: 2},
            {minX: -1, maxX: 1.5, minY:-0.5, maxY: 0.5},
            {x:55/DEG, y:180/DEG, z:0},
            {shaderLabel: 'diffuse', textureLabel: null, label: 'kbplane', segmentsX: cCols, segmentsY:cRows}
        
        );
        scene.addObject(kbplane);
        
        var colliderplane = new PlanarCollider(
            {
                planeNormal: [0, 0, -1], /* Untransformed */
                pointOnPlane: [0, 0, 0] /* This point gets transformed into the plane space so it's unusual to change this  */
            },
            kbplane,
            // {
            //     bracketDistanceMin: -0.6,
            //     bracketDistanceMax: -0.5
            // }
            null
        );
        window.cplane = colliderplane;
        
        // var glyphset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        // var glyphset = 'abcdefghijklmnopqrst`1234567890-=--JKLMNOPQRSTUVWXYZ';


        // var glyphset = 'abcd` zaq1 xsw2 cde3 vfr4 bgt5-nhy6-mju7-,ki8-.lo9-/;p0--------------------------';
        // var callbackGlobalState = {
        //     currentGlyph: null,
        //     pressedAt: null
        // };
        // var mkCallbacker = function (idx) {
        //     var glyphs = glyphset;
        //     var s = callbackGlobalState;
        //     return function (ctx) {
        //         var outGlyph = null;
        //         var myGlyph = glyphs[idx];
        //         var currentTime = Date.now();
        //         if (myGlyph != s.currentGlyph || currentTime > s.pressedAt+200 ) {
        //             outGlyph = myGlyph;
        //             s.currentGlyph = myGlyph;
        //             s.pressedAt = currentTime;
        //         }
        //         // if (!s.pressedAt) {
        //         //     s.pressedAt()
        //         // }
        //         // console.log(idx);
        //         if (outGlyph) {
        //             console.log(idx, outGlyph);
        //             var elem = document.getElementById('output');
        //             elem.value = elem.value + outGlyph;
        //             if (ctx.gamepad) {
        //                 ctx.gamepad.vibrate(20);
        //             }
        //
        //         }
        //     }
        // }
        
        var displayBoard = new FCBasicShapes.WallShape(
            {x:0, y:0, z: 3},
            {minX: -2, maxX: 2, minY: 1, maxY:3},
            {x:0, y: 180/DEG, z:0},
            {shaderLabel: 'diffuse', textureLabel: 'paleturquoise', segmentsX: 1, segmentsY: 1}
        );
        scene.addObject(displayBoard);
        
        
        
        var keyboardArbiter = new KeyboardArbiter(scene, document.getElementById('output'), displayBoard, null);
        
        
        /* Set up kb segments */
        var segW = (kbplane.size.maxX - kbplane.size.minX)/cCols;
        var segH = (kbplane.size.maxY - kbplane.size.minY)/cRows;
        for (var i=0; i<cCols; i++) {
            for (var j=0; j<cRows; j++) {
                var l = kbplane.size.minX + (i*segW) + (j*-0.06) + 0.01;
                var r = l+segW - 0.01;
                var b = (kbplane.size.minY + (j*segH)) + 0.01;
                var t = (b+segH) - 0.01;
                var glyphIdx = i*cRows + j;
                var cdat = {
                    bottomLeft: [l, b ,0],
                    topRight: [r, t, 0],
                    callback: keyboardArbiter.generateKeypressCallback(glyphIdx)
                }
                colliderplane.collisionBoxes.push(cdat);
                var tx = FCUtil.renderTextToTexture(scene.gl, [{t: keyboardArbiter.glyphs[glyphIdx]}], {canvasWidth: 64, canvasHeight: 64});
                var keyCap = new FCBasicShapes.WallShape(null, {minX: l, minY: b, maxX: r, maxY: t}, null, {shaderLabel: 'diffuse', texture: tx, segmentsX:1, segmentsY:1});
                keyCap.matrix = kbplane.transformationMatrix();
                scene.addObject(keyCap);
                // console.log(cdat);
            }
            
        }
        
        // colliderplane.collisionBoxes.push({bottomLeft:[-1, -0.5, 0], topRight:[0, 0, 0], callback: null});
        
        
        var statusCube = new FCShapes.SimpleCuboid(
            null,
            {w: 0.14, h:0.14, d:0.04},
            null,
            {shaderLabel: 'diffuse', textureLabel: 'red', label:'statusCube'}
        );
        scene.addObject(statusCube);
        
        
        var stickbead = new FCShapes.SimpleCuboid(
            null,
            {w: 0.07, h:0.07, d:0.07},
            null,
            {shaderLabel: 'diffuse', textureLabel: 'orange', label: 'stickbead'}
        );
        stickbead.translation = {x:0, y:0, z:-0.55};
        stickbead.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, null));
        stickbead.behaviours.push(makeControllerRayProjector(scene, 1, [colliderplane]));
        scene.addObject(stickbead);
        
        var stickstick = new FCBasicShapes.CylinderShape(null, {radius: 0.01, height:0.50}, null, {shaderLabel:'diffuse', textureLabel:'gold'});
        stickstick.rotation = {x:270/DEG, y:0, z:0};
        // stickstick.translation 
        stickstick.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, null));
        scene.addObject(stickstick);
        
        
        /* KeyboardArbiter */
        /* Kind of like a controller that joins a VRKeyboard and its backing store together.
        /* The backing store can be a TextArea or something that (partially) implements the same API.
        /* KeyboardArbiter is probably the thing responsible for generating the callbacks.
        /* Perhaps backing stores can be switched in mid-flight? this would mean that we can re-use a keyboard for
        /* multiple virtual text items.
        /* We probably also want to have a way of arbiting text backing stores -> textured boards.
        /* Does this do that??
        /* So it's a 3-way thing? backing store -> keyboard -> display
        */
        
        /* Really though, what is a keyboard but a collider plane with a bunch of callbacks.
        /* So - accept a backing store and a display and be ready to generate a bunch of kb cb's.
        */
        
        /* Option to have display be automatically generated, or at least automatically managed? */
        
        /* Boiler plate:
        /* THINGS HERE marker
        /* more colors
        /* shift to FCBasicShapes
        /*
        */
        
        
    }
    
    
    
    

    return Scene;
})();
