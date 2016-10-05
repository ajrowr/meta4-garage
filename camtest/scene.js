
/* 
"Concrete" refers to the scene subclass created by the developer.
"Framework" refers to things in the framework which you shouldn't override :)

Initialisation procedure for a Scene:
- User code sets window.vrScene to a new instance of the Scene class
-   concrete scene constructor is run
-   concrete constructor MUST do CARNIVAL.core.scene.call(this) to call the framework scene constructor!
-   constructor completes its various tasks, mostly setting up basic instance data which will be used by later stages of the setup
- FCEngine is loaded by the HTML (eg <script src="/fc_engine.js"), and looks for the scene as window.vrScene
-   calls framework method init(), passing it the GL instance and (if applicable) the stage parameters
-   calls framework method setup() method
-       calls framework method loadPrerequisites(), which autoloads items configured in scene.prerequisites 
-       calls optional concrete method setPrereqs(), which handles any other tasks which must be entirely completed prior to scene setup. This must
        return a promise that will resolve once its job is done; the next steps will not begin until this promise resolves.
-       calls concrete method setupScene(), which actually builds the scene. setupScene can rely on all prerequisites loaded in the previous steps
        being available. You can use asynchronous constructs in setupScene, eg to load JSON feeds and other remote resources; the idea is to get 
        the basic scene visible as quick as possible; having things that "pop into" the scene is generally preferable to making the user wait a 
        long time before seeing anything.
*/

var CubeContainer = function (pos, size, rotate, params) {
    CARNIVAL.primitive.Container.call(this, pos, size, rotate, params);
    this.invisible = false;
}

CubeContainer.prototype = Object.create(CARNIVAL.primitive.Container.prototype);

CubeContainer.prototype.divulge = CARNIVAL.shape.Cuboid.prototype.divulge;



window.ExperimentalScene = (function () {
    "use strict";
    
    var DEG = function (deg) {return deg*(Math.PI/180)}; /* Convert degrees to radians, very handy */
    
    function Scene() {
        CARNIVAL.scene.Scene.call(this); /* << Don't remove this! */ /* TODO */
        
        var scene = this; /* << Not compulsory but a good habit to have. Increases readability and makes life easier when dealing with a lot of Promises and other scope capturers */
        
        scene.prerequisites = {
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
                {label: 'controller_body', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/body.obj'},
                {label: 'controller_button_menu', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/button.obj'},
                {label: 'controller_button_sys', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/sys_button.obj'},
                {label: 'controller_trigger', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/trigger.obj'},
                {label: 'controller_trackpad', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/trackpad.obj'},
                {label: 'controller_grip_l', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/l_grip.obj'},
                {label: 'controller_grip_r', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/r_grip.obj'}
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
                {hex: '#000000', label: 'black'},
                {hex: '#888888', label: 'gray'},
                {hex: '#ffffff', label: 'white'},
                {r:0.2, g:0.9, b:0.6, label: 'controllerGreen'},
                {r:0.2, g:0.6, b:0.9, label: 'controllerBlue'}
                
            ],
            textures: [
                {label: 'concrete01', src: '//assets.meta4vr.net/texture/concrete01.jpg'}
            ],
            materials: [
                {label: 'concrete', textureLabel: 'concrete01', shaderLabel: 'ads', 
                    ambient:[1,1,1], diffuse:[0.5,0.5,0.5]},
                {label: 'matteplastic', textureLabel: 'white', shaderLabel: 'ads', 
                    ambient:[0,0,0], diffuse:[0.8, 0.8, 0.8]}
            ]
        }
        
        /* A good general pattern for lights is to have a bright white (or slightly yellow) diffuse one overhead of the scene origin
           (ie. the center of the player's starting stage) and then some dimmer, lower-set diffuse ones to
           illuminate the back sides of things. It really depends on where in the scene you expect the player to
           be spending their time.
           Ambient is not very useful in a low-texture environment as it washes out the polygons of any non-flat
           surfaces so it's best to save it for flat things like floors and walls.
        */
        scene.lightPool = {
            plainWhiteAmbientOverhead: { /* To be honest it's slightly yellow */
                position: [0.0, 3.0, 1.0, 1.0],
                ambient: [0.5, 0.5, 0.5],
                diffuse: [0.7, 0.7, 0.6],
                specular: [0.0, 0.0, 0.0]
            },
            red: {position: [0, 2, 0, 0], diffuse: [0.8, 0.0, 0.0]},
            green: {position: [2, 2, 0, 0], diffuse: [0.0, 0.8, 0.0]},
            blue: {position: [-2, 2, 0, 0], diffuse: [0.0, 0.0, 0.8]}
        }
        /* All specular components in the default lights are switched off due to the aforementioned */
        /* shader issues with specular. */
        
            
        scene.lights = [
            this.lightPool.plainWhiteAmbientOverhead,
            this.lightPool.red,
            this.lightPool.green,
            this.lightPool.blue
        ];
        /* If you ever want to change the lighting of the scene while it's rendering,
           call scene.updateLighting() after changing scene.lights - this will
           re-bind the lights to the shader uniforms.
           You can also bind specific lights to individual positions in the shader
           with scene.bindLightToShaderPosition(lightDef, shader, lightIdx).
           To bind a set of lights at once use scene.bindLightsToShader([lightDef, ...], shader). This
           replaces all current lights.
           To switch lights off you can provide a value of null to these methods.
           Note that lights don't need to be in the lightPool to use them - it's
           just for convenience. You can have lights be just as dynamic as you'd like,
           as long as the shader uniforms are kept up to date.
           
           Keep in mind that only certain shaders support lights and materials, none of this 
           will have any effect on the diffuse or basic shaders for instance.
           
           Occasionally we want things to track the motion of the controllers.
           To make this simple, we'll pre-configure behaviour functions to handle this, and place them
           in scene.trackers.
        */
        scene.trackers = {a:null, b:null};
        
        /* Toggle to show or hide the lights for debugging */
        scene.lightsShown = false;
        
        
    }
    
    Scene.prototype = Object.create(CARNIVAL.scene.Scene.prototype);
    
    Scene.prototype.setupPrereqs = function () {
        // return new Promise(function (resolve, reject) {resolve()});
        
        return new Promise(function (resolve, reject) {
            var promises = [];
            var comps = [
                {ident:'net.meta4vr.vrui.sys.controller.vive_lowpoly', src:'/_components/controllercomponent.js', label:'controller'},
                {ident:'net.meta4vr.vrcomponents.arrow', src:'/_components/arrowcomponent.js', label:'arrow'},
                {ident:'net.meta4vr.picboard', src:'/_components/picboardcomponent.js', label:'picboard'},
                // {ident:'', src:'', label:''},
                {ident:'net.meta4vr.textboard', src:'/_components/textboardcomponent.js', label:'textboard'},
                {ident:'net.meta4vr.vrui.text.glyphtext', src:'/_components/glyphtextcomponent.js', label:'glyphtext'}
            ];
            for (var i = 0; i < comps.length; i++) {
                var c = comps[i];
                promises.push(CARNIVAL.loadComponent(c.ident, c.src, c.label));
            }
            Promise.all(promises).then(function (things) {resolve()});
        });
        
        
    }
    
    /* Teleport user and their raft to the location of the cursor. */
    /* By default this is bound to the grip button on the controller. */
    Scene.prototype.teleportUserToCursor = function () {
        var curs = this.getObjectByLabel('cursor');
        this.moveRaftAndPlayerTo(curs.pos);
    }
    
    /* Helpful for debugging lights */
    /* Pass true to switch lights on, false to switch them off, or nothing (undefined) to toggle their state */
    /* By default this is bound to menu button on the controller. */
    Scene.prototype.showLights = function (state) {
        var lamps = [];
        state = state || (state === undefined && !this.lightsShown);
        this.lightsShown = state;
        this.removeObjectsInGroup('lamps');
        if (state) {
            for (var i=0; i<this.lights.length; i++) {
                var myLight = this.lights[i];
                if (!(myLight.diffuse && myLight.position)) continue;
                var tex = this.addTextureFromColor({r:myLight.diffuse[0], g:myLight.diffuse[1], b:myLight.diffuse[2]});
                var c = new CARNIVAL.shape.Cuboid(
                    {x:myLight.position[0], y:myLight.position[1], z:myLight.position[2]},
                    {w:0.3, h:0.3, d:0.3},
                    null, {texture:tex, shaderLabel:'basic', groupLabel:'lamps'}
                );
                lamps.push(c);
                this.addObject(c);
            }
        }
        return lamps;
    }
    
    Scene.prototype.setupScene = function () {
        var scene = this;
        var _hidden = function () {return {x:0, y:-100, z:0};} /* For things that get positioned dynamically eg cursor and controller trackers */
        
        console.log('Setting up scene...');
        
        /* Build the cursor */
        var cursor = new CARNIVAL.shape.Cuboid(
            _hidden(),
            {w: 0.3, h:0.3, d:0.3},
            null,
            {label: 'cursor', materialLabel:'matteplastic', textureLabel: 'red'}
        );
        /* Make the cursor revolve slowly */
        cursor.behaviours.push(function (drawable, timePoint) {
            drawable.currentOrientation = {x:0.0, y:Math.PI*2*(timePoint/7000), z:0.0};
        });
        scene.addObject(cursor);
        
        /* Build the floor */
        var floor = new CARNIVAL.shape.Rectangle(
            {x: 0, z: 0, y: -0.02},
            {minX: -20, maxX: 20, minY: -20, maxY: 20},
            {x:DEG(270), y:0, z:0},
            {label: 'floor', materialLabel:'concrete', segmentsX: 10, segmentsY: 10}
        );
        /* We use the floor collider to determine where the user is pointing their controller, and hence,
           the location for the cursor. There are two stages to this, first is setting up the collider.
           Note the planeNormal - this is the normal of the floor *before it is rotated into position*.
           Basically any planar collider has to match the original state of an object before that object
           is transformed.
           This is perhaps counterintuitive and may change. Colliders generally are not as easy to use, yet,
           as I would like.
        */
        var floorCollider = new CARNIVAL.util.PlanarCollider({planeNormal:[0, 0, -1], pointOnPlane:[0,0,0]}, floor, null); /* TODO */
        floorCollider.callback = function (dat) {
            // updateReadout('A', dat.POI);
            // updateReadout('B', dat.collisionPoint);
            /* POI (aka Point Of Interest) represents the distance along the ray vector that the collision was found.
               If it's positive, that means the collision occurred *behind* the controller, in other words the controller
               is facing *away* from the floor so we make the cursor invisible.
               When POI is negative that means the controller is facing towards the object of collision.
               Don't ask me why it's that way round, my grasp of the math involved is tenuous.
            */
            /* TODO consider clamping the cursor pos to the edges of the floor */
            var c = scene.getObjectByLabel('cursor');
            if (dat.POI < 0) {
                c.hidden = false;
                c.pos.x = dat.collisionPoint[0];
                c.pos.y = dat.collisionPoint[1];
                c.pos.z = dat.collisionPoint[2];
            }
            else {
                c.hidden = true;
            }
        }
        scene.addObject(floor);
        
        /* Build the raft.
           For room-scale apps, the Raft is the piece of floor that the player stands on, with bounds equal to the 
           player's pre-defined play area. It's usually worthwhile to show this visually.
           In the Carnival framework, our standard way of letting the player move further than their floor space is
           to relocate them and the raft via teleportation.
        */
        var stageExtent = {
            x: scene.stageParams.sizeX / 2,
            z: scene.stageParams.sizeZ / 2
        };
        console.log(scene.stageParams);
        scene.addObject(new CARNIVAL.shape.Rectangle(
            {x: 0, z: 0, y: 0},
            {minX: -1*stageExtent.x, maxX: stageExtent.x, minY: -1*stageExtent.z, maxY: stageExtent.z},
            {x:DEG(270), y:0, z:0},
            {label: 'raft', materialLabel: 'concrete', textureLabel: 'royalblue', segmentsX: 1, segmentsY: 1}
        ));
        
        /* === === === Controllers === === === */
        
        /* Button handler for the controllers. 
           The default button handler does these things:
           - Grip button: Teleport to cursor location
           - Menu button: Toggle showing/hiding the lights
           - Trigger: Dump to console the current location of the controller whose trigger was pressed
           - Any button: Output button status to console
        
           Buttons for Vive controller are - 0: trackpad, 1: trigger 2: grip, 3: menu
           Statuses are: pressed, released, up, held
           up means button is not pressed.
           pressed means the button transitioned from up to down.
           released means the button transitioned from down to up.
           held means the button started down and stayed down
        
           If the trackpad is involved, sector will be one of n, ne, e, se, s, sw, w, nw, center
           If you need more precision than that, consider writing a custom handler :)
           Buttonhandlers are called once per anim frame. 
        */
        var buttonHandler = function (gamepadIdx, btnIdx, btnStatus, sector, myButton, extra) {
            if (btnStatus != 'up') {
                /* Print status of buttons */
                console.log('Button idx', btnIdx, 'on controller', gamepadIdx, 'was', btnStatus); // << this gets annoying pretty quickly!
                
                /* Print trackpad sector info */
                if (btnIdx == 0) {
                    console.log('Sector', sector);
                }
                /* Dump controller location on trigger */
                else if (btnIdx == 1 && btnStatus == 'pressed') {
                    console.log(scene.playerSpatialState.hands[gamepadIdx].pos);
                    
                    
                    var vrGamepads = CARNIVAL.hardware.controller.getMotionControllers();
                    var myGp = vrGamepads[gamepadIdx];
                    var gPose = myGp.pose;
                    if (!(gPose && gPose.orientation && gPose.position)) return; /* Pose is missing or incomplete, not much we can do! */
                    var gpMat = mat4.create();
                    // var orientation = gPose.orientation;
                    // var position = gPose.
                    if (window.vrDisplay.stageParameters) {
                        mat4.fromRotationTranslation(gpMat, gPose.orientation, gPose.position);
                        mat4.multiply(gpMat, vrDisplay.stageParameters.sittingToStandingTransform, gpMat);
                    
                        var ploc = scene.playerLocation;
                        var trans = vec3.fromValues(ploc.x, ploc.y, ploc.z);
                        var reloc = mat4.create();
                        mat4.fromTranslation(reloc, trans);
                        mat4.mul(gpMat, reloc, gpMat);
                    
                    }
                    var pospos = vec3.create();
                    mat4.getTranslation(pospos, gpMat);
                    console.log(pospos);
                    
                    
                    
                    
                    if (gamepadIdx == 1) {
                        CARNIVAL._cameraLocked = !CARNIVAL._cameraLocked;
                    }
                }
                /* Teleport user */
                else if (btnIdx == 2 && btnStatus == 'pressed') {
                    scene.teleportUserToCursor();
                }
                /* Show/hide the scene lights */
                else if (btnIdx == 3 && btnStatus == 'pressed') {
                    scene.showLights();
                }
            }
        };
                
        /* Build a pair of simple trackers and add them to the scene for later re-use. */
        scene.trackers.a = CARNIVAL.hardware.controller.makeTracker(scene, 0, null);
        scene.trackers.b = CARNIVAL.hardware.controller.makeTracker(scene, 1, null);
        
        
        var addToScene = function (component) {
            scene.addObject(component);
        }
                
        var c0ButtonHandlingTracker = CARNIVAL.hardware.controller.makeTracker(scene, 0, buttonHandler);
        var c0Projector = CARNIVAL.hardware.controller.makeRayProjector(scene, 0, [floorCollider]);
        var c1ButtonHandlingTracker = CARNIVAL.hardware.controller.makeTracker(scene, 1, buttonHandler);
        new CARNIVAL.components.controller(
            {textureLabel:'orange', altTextureLabel:'white', groupLabel:'controllers'}, 
            [c0ButtonHandlingTracker, c0Projector]
        ).prepare().then(addToScene);
        new CARNIVAL.components.controller(
            {textureLabel:'royalblue', altTextureLabel:'white', groupLabel:'controllers'},
            // {texture:CARNIVAL.texture.fromColor({hex:'#0000ff'}), altTextureLabel:'white', groupLabel:'controllers'},
            [c1ButtonHandlingTracker]
        ).prepare().then(addToScene);
        
        /* Add a facebook icon from a FontAwesome glyph mesh. */
        /* The entire FontAwesome v4.6.3 glyphset is on meshbase, to get the hexcodes google "fontawesome cheat sheet" */
        CARNIVAL.mesh.load('//meshbase.meta4vr.net/_typography/fontawesome/glyph_'+0xf230+'.obj')
        .then(function (mesh) {
            var fbIcon = new CARNIVAL.mesh.Mesh(mesh, {x:-2.7, y:0.3, z:-3}, {scale:1.0}, null, {materialLabel:'matteplastic'});
            scene.addObject(fbIcon);
        });
        
        // var arrow = new CARNIVAL.components.arrow({x:0, y:0, z:2}, {height: 0.1, scale:0.25});
        var arrow = new CARNIVAL.components.arrow({position:{x:0, y:0, z:2}, size:{height: 0.1, scale:0.25}});
        scene.addObject(arrow);
        
        /* Some components need to be prepare()d before they can be added to the scene. */
        
        new CARNIVAL.components.glyphtext({
            text: '#virtualreality',
            position: {x:2, y:0.3, z:3},
            orientation: {x:0, y:DEG(180), z:0}
        }).prepare().then(addToScene);
        
        new CARNIVAL.components.glyphtext({
            text: '/meta4vr', 
            position: {x:-1.7, y:0.3, z:-3}, 
            orientation: {x:0, y:0, z:0}
        }).prepare().then(addToScene);
        
        
        
        var gd1 = new CubeContainer({x:2, y:0, z:1}, {w:0.5, h:0.5, d:0.5}, null, {materialLabel:'matteplastic'});
        // gd1.invisible = true;
        var gd1a = new CubeContainer({x:0, y:1, z:1}, {w:0.3, h:0.3, d:0.3}, null, {materialLabel:'matteplastic'});
        var gd1b = new CubeContainer({x:0, y:1, z:-1}, {w:0.3, h:0.3, d:0.3}, null, {materialLabel:'matteplastic'});
        var gd1c = new CubeContainer({x:0, y:1, z:0}, {w:0.3, h:0.3, d:0.3}, {x:0.2, y:0, z:0}, {materialLabel:'matteplastic'});
        var gd1c1 = new CubeContainer({x:0, y:1, z:0}, {w:0.3, h:0.3, d:0.3}, {x:0.5, y:0, z:0}, {materialLabel:'matteplastic'});
        var gd1c2 = new CubeContainer({x:0, y:1, z:0}, {w:0.3, h:0.3, d:0.3}, {x:-0.5, y:0, z:0}, {materialLabel:'matteplastic'});
        gd1.addChild(gd1a);
        gd1.addChild(gd1b);
        gd1.addChild(gd1c);
        gd1c.addChild(gd1c1);
        gd1c.addChild(gd1c2);
        // scene.sceneGraph = gd1;
        scene.addObject(gd1);
        
        var textboard = new CARNIVAL.components.textboard({
            position: {x:-3, y:0, z: 3},
            orientation: {x:0, y:DEG(180), z:0},
            width: 3,
            height: 2,
            // transparentBackground: true,
            // backgroundColor: 'rgba(127,127,127,0.89)',
            textLines: [
                {text:'hello'},
                {text:'how are you'},
                {text:'I am a text board'},
                {text:'how may I be of service?'},
                {font:'times new roman', textColor:'orange'},
                {text:'how are you'}
            ]
        });
        textboard.prepare().then(addToScene);
        window.TXB = textboard;
        
        
        /* Construct from JSON */
        var jj = {
            objects: [
                // {component:'textboard', parameters: {position:{x:1, y:1, z:-1}, orientation:{x:0, y:3.14, z:0}, textLines: [{text:'hi'}]}},
                {component:'picboard', parameters: {position:{x:2, y:3, z:3.5}, orientation:{x:0, y:3.14, z:0}, src:'http://domai.io.codex.cx/quick/sunrise1.jpg', targetHeight:4.0, shaderLabel:'basic'}}
            ]
        }
        
        for (var i = 0; i < jj.objects.length; i++) {
            var oinf = jj.objects[i];
            var o = new CARNIVAL.components[oinf.component](oinf.parameters);
            o.prepare().then(addToScene);
        }
        
        /* Construct from markup */
        var mksc = document.querySelector('c-scene');
        var elementMap = {
            'C-ARROW': CARNIVAL.components.arrow
        };
        if (mksc) {
            for (var i = 0; i < mksc.children.length; i++) {
                var thingelem = mksc.children[i];
                console.log(thingelem);
                var thingclass = elementMap[thingelem.tagName];
                console.log(thingclass);
                if (!thingclass) continue;
                
                var thinginf = {};
                var g = function (attrName, splitBy) {
                    var dat = thingelem.getAttribute(attrName);
                    if (splitBy && dat) {
                        dat = dat.split(splitBy);
                    }
                    return dat;
                }
                
                var posraw = g('position', ' ');
                if (posraw) thinginf.position = {x:posraw[0], y:posraw[1], z:posraw[2]};
                var oriraw = g('orientation', ' ');
                if (oriraw) thinginf.orientation = {x:oriraw[0], y:oriraw[1], z:oriraw[2]};
                var mlabelraw = g('material-label');
                if (mlabelraw) thinginf.materialLabel = mlabelraw;
                
                var obj = new thingclass(thinginf);
                console.log(thinginf);
                obj.prepare().then(addToScene);
            }
        }
        
        
        
        CARNIVAL.mesh.load('//meshbase.meta4vr.net/_typography/fontawesome/glyph_'+0xf030+'.obj')
        .then(function (mesh) {
            CARNIVAL.mesh.shunt(mesh, {x:-0.5351, y:-0.4637});
            var camIcon = new CARNIVAL.mesh.Mesh(mesh, {x:-2.7, y:0.3, z:-3}, {scale:0.1}, null, {materialLabel:'matteplastic', label:'camcam'});
            camIcon.behaviours.push(function (drawable, timepoint) {
                drawable.matrix = CARNIVAL.engine.viewports.cam4.getPose();
            })
            scene.addObject(camIcon);
        });


        // CARNIVAL.mesh.load('//meshbase.meta4vr.net/_typography/fontawesome/glyph_'+0xf06e+'.obj')
        CARNIVAL.mesh.load('//meshbase.meta4vr.net/_typography/fontawesome/glyph_'+0xf118+'.obj')
        .then(function (mesh) {
            CARNIVAL.mesh.shunt(mesh, {x:-0.5351, y:-0.4637});
            var eyecon = new CARNIVAL.mesh.Mesh(mesh, {x:-2.7, y:0.3, z:-3}, {scale:0.1}, null, {materialLabel:'matteplastic', label:'camcam'});
            eyecon.behaviours.push(function (drawable, timepoint) {
                drawable.matrix = CARNIVAL.engine.poseMat;
            })
            scene.addObject(eyecon);
        });
        
        
        /* Pose as physically captured from the camera, a vec3 and a quat */
        /* NOTE that this is nonsense in real world terms because it's pre-sittingToStanding transform */
        CARNIVAL.setCameraLockPose({
            // orientation: [0.022, 0.981, 0.002, 0.191],
            // position: [1.501, 0.141, -0.409]
            // position: [0.001, 0.141, -0.409]
            position: [-0.0198, 0.3344, 2.122],
            orientation: [0.0291, -0.921, 0.034, 0.3867]
        });
        CARNIVAL.setCameraParams({
            fov: {up:15, down:15, left:22.5, right:22.5},
            translate: {x:0, y:0, z:0},
            tilt: {x:0, y:180, z:0.0}
        })
        
        
        scene.where = {
            x:3
        };
        
        

    
    
    Scene.prototype.TESTvidInit = function (elem) {
        var elem = document.getElementById('videoElem');
        elem.addEventListener('canplaythrough', startVideo, true);
        elem.addEventListener('ended', videoDone, true);
        elem.preload = 'auto';
        elem.crossOrigin = 'anonymous';
        elem.src = 'http://domai.io.codex.cx/quick/olivia1.webm';
        
        var gl = CARNIVAL.engine.gl;
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        function updateTexture() {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, elem);
        }
        
        var intervalId = null;
        function startVideo() {
            elem.play();
            intervalId = window.setInterval(updateTexture, 15);
            
        }
        
        function videoDone() {
            window.clearInterval(intervalId);
        }
        
        return tex;
    }
    
    Scene.prototype.TESTimage = function (elem) {
        var scene = this;
        var gl = CARNIVAL.engine.gl;
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, elem);
        return tex;
    }


    return Scene;
})();
