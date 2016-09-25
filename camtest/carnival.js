
/* This code (or something like it) will become part of (or a wrapper for) the framework. */
window.CARNIVAL = (function () {
    
    var Framework = function () {
        this.components = {};
        this._componentPromises = {};
        this._componentResolvers = {};
        
        this.core = {
            util: FCUtil,
            basicshapes: FCBasicShapes,
            meshtools: FCMeshTools,
            primitives: FCPrimitives,
            primitiveutils: FCPrimitiveUtils,
            feedtools: FCFeedTools,
            scene: FCScene,
            shapeutils: FCShapeUtils,
            shapes: FCShapes
        }
    }

    var dummy = function () {};
    
    Framework.prototype.showScene = dummy;
    Framework.prototype.addScene = dummy;
    Framework.prototype.startScene = dummy;
    // Framework.prototype.start = dummy;
    Framework.prototype.initVR = dummy;
    
    
    Framework.prototype.loadComponent = function (ident, url) {
        /* component will need to call CARNIVAL.registerComponent($ident, class) or something when it loads */
        /* ident eg net.meta4vr.vrcomponent.selectgrid */
        var framework = this;
        var loader = document.createElement('script');
        loader.src = url;
        var p = new Promise(function (resolve, reject) {
            framework._componentResolvers[ident] = resolve;
        });
        framework._componentPromises[ident] = p;
        document.head.appendChild(loader);
        return p;
        
    };
    
    Framework.prototype.registerComponent = function (componentIdent, klass) {
        console.log('registering component', componentIdent);
        this.components[componentIdent] = klass;
        var resolver = this._componentResolvers[componentIdent];
        if (resolver && resolver.call) resolver(klass);
    };
    
    
    /* ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- */
    
    Framework.prototype.start = function () {
        
        console.log('starting')
        "use strict";

        var PLAYER_HEIGHT = 1.82;

        var vrDisplay = null;
        var vrComponents = {display:null};
        var projectionMat = mat4.create();
        var viewMat = mat4.create();
        var poseMat = mat4.create();
        var standingPosition = vec3.create();
        var orientation = [0, 0, 0];
        var position = [0, 0, 0];


        // window.CARNIVAL = {};

        var error = function (err) {
            if (window.showError) {
                window.showError(err);
            }
            else {
                console.log(err);
            }
        }

        /* Haptics actuators seem to operate all the way down to 0.00026 but aren't very noticeable at that level. */


        var vrPresentButton = null;

        var ROTY = 0;

        var getCameraPos = function () {
            var poseOut = mat4.create();
            var standpos = vec3.create();
            var PLAYER_HEIGHT = 1.82;
            var pos = [0, 0, 0];
            var rot = quat.create();
            quat.rotateY(rot, rot, ROTY % (2*Math.PI));
            ROTY+=0.01;
            // var ori = [0, ((ROTY+=0.01)%Math.PI)-(Math.PI/2), 0, 1];
            vec3.add(standpos, pos, [0, PLAYER_HEIGHT, 0]);
            mat4.fromRotationTranslation(poseOut, rot, standpos);
            // console.log(ROTY);
            return poseOut;
        }

        var attachCameraToGamepad = function (gpIdx) {
            var poseGet = function () {
                var vrGamepads = FCUtil.getVRGamepads();
                if (vrGamepads[gpIdx] && vrGamepads[gpIdx].pose && vrGamepads[gpIdx].pose.position) {
                    var myGp = vrGamepads[gpIdx];
                    var gPose = myGp.pose;
                    var cameraTranslate = vec3.create();
                    cameraTranslate[0] = numericValueOfElement('cameraTranslateX');
                    cameraTranslate[1] = numericValueOfElement('cameraTranslateY');
                    cameraTranslate[2] = numericValueOfElement('cameraTranslateZ');
                    var cameraPos = vec3.create();
                    vec3.add(cameraPos, cameraTranslate, gPose.position);
                    var gpMat = mat4.create();
                    // var orientation = gPose.orientation;
                    // var position = gPose.
                    if (window.vrDisplay.stageParameters) {
                        // mat4.fromRotationTranslation(gpMat, gPose.orientation, gPose.position);
                        mat4.fromRotationTranslation(gpMat, gPose.orientation, cameraPos);
                        mat4.multiply(gpMat, vrDisplay.stageParameters.sittingToStandingTransform, gpMat);
                    }
                    return gpMat;
                }
                else {
                    return getCameraPos();
                }
            }
            return poseGet;
        }

        var attachSceneCamera = function (label) {
            var poseGet = function () {
                var scene = window.vrScene;
                var camMat = mat4.create();
                var myCam;
                if (scene && scene.cameras && scene.cameras[label]) {
                    myCam = scene.cameras[label];
                }
                else {
                    myCam = {
                        position: {x:0.4, y:1, z:-1.6},
                        orientation: {x:0.0, y:Math.PI}
                    };
                }
                var pos = vec3.fromValues(myCam.position.x, myCam.position.y, myCam.position.z);
                var rot = quat.create();
                quat.rotateY(rot, rot, myCam.orientation.y || 0.0);
                quat.rotateX(rot, rot, myCam.orientation.x || 0.0);
                mat4.fromRotationTranslation(camMat, rot, pos);
        
                return camMat;
            }
            return poseGet;
        }

        var numericValueOfElement = function (elemId, defaultValue) {
            try {
                return Number(document.getElementById(elemId).value);
            }
            catch (exc) {
                return defaultValue || 0.0;
            }
    
        }

        /* headsetBounds is left/top/width/height-down */
        /* canvasBounds is left/bottom/width/height-up */
        var doubleGridPorts = function (j) {
            var port = {};
            switch (j) {
            /* Left eye */
            case 0:
                port.headsetBounds = [0.0, 0.0, 0.5, 1.0];
                port.canvasBounds = [0.0, 0.0, 0.5, 1.0];
                break;
            /* Right eye */
            case 1:
                port.headsetBounds = [0.5, 0.0, 0.5, 1.0];
                port.canvasBounds = [0.5, 0.0, 0.5, 1.0];
                break;
            }
            return port;
        }

        var tripleGridPorts = function (j) {
            var port = {};
            switch (j) {
            /* Left eye */
            case 0:
                port.headsetBounds = [0.0, 0.0, 0.5, 0.5];
                port.canvasBounds = [0.0, 0.5, 0.5, 0.5];
                break;
            /* Right eye */
            case 1:
                port.headsetBounds = [0.5, 0.0, 0.5, 0.5];
                port.canvasBounds = [0.5, 0.5, 0.5, 0.5];
                break;
            /* Camera */
            case 2:
                port.headsetBounds = null;
                port.canvasBounds = [0.0, 0.0, 0.42, 0.5];
                break;
            }
            return port;
        }
        var port = tripleGridPorts;

        var viewports = {
            /* headsetBounds are in a format that vrDisplay.requestPresent() understands ie. top-down */
            /* canvasBounds are the same section but converted to canvas coords ie. bottom-up */
            /* one could probably be inferred from the other but I CBF right now */
            leftEye: {
                povLabel: 'left_eye',
                headsetBounds: port(0).headsetBounds,
                canvasBounds: port(0).canvasBounds,
                getEyeParameters: function () {return vrComponents.display && vrComponents.display.getEyeParameters('left');}
            },
            rightEye: {
                povLabel: 'right_eye',
                headsetBounds: port(1).headsetBounds,
                canvasBounds: port(1).canvasBounds,
                getEyeParameters: function () {return vrComponents.display && vrComponents.display.getEyeParameters('right');}
            },
            cam1: {
                povLabel: 'cam_1',
                headsetBounds: port(2).headsetBounds,
                canvasBounds: port(2).canvasBounds,
                getEyeParameters: function () {
                    return {
                        renderHeight: 1600,
                        renderWidth: 1512,
                        offset: [0,0,0],
                        fieldOfView: {
                            // upDegrees: 56.0,
                            // downDegrees: 56.0,
                            upDegrees: 40.0,
                            downDegrees: 40.0,
                            leftDegrees: 45.0,
                            rightDegrees: 45.0
                        }
                    };
                },
                // getPose: function () {return getCameraPos();}
                getPose: attachSceneCamera('cam1')
            },
            cam2: {
                povLabel: 'cam_2',
                headsetBounds: port(2).headsetBounds,
                canvasBounds: port(2).canvasBounds,
                // canvasBounds: [0.0, 0.0, 1.0, 0.5],
                getEyeParameters: function () {
                    return {
                        renderHeight: 1600,
                        renderWidth: 1512,
                        offset: [0,0,0],
                        fieldOfView: {
                            /// upDegrees: 56.0,
                            /// downDegrees: 56.0,
                            upDegrees: 32.0,
                            downDegrees: 32.0,
                            leftDegrees: 45.0,
                            rightDegrees: 45.0
                            // upDegrees: 32.0,
                            // downDegrees: 32.0,
                            // leftDegrees: 35.0,
                            // rightDegrees: 35.0
                    
                        }
                    };
                },
                getPose: attachCameraToGamepad(1)
            },
            cam3: {
                povLabel: 'cam_2',
                headsetBounds: port(2).headsetBounds,
                canvasBounds: port(2).canvasBounds,
                // canvasBounds: [0.0, 0.0, 1.0, 0.5],
                getEyeParameters: function () {
                    return {
                        renderHeight: 1600,
                        renderWidth: 1512,
                        offset: [0,0,0],
                        fieldOfView: {
                            /// upDegrees: 56.0,
                            /// downDegrees: 56.0,
                            upDegrees: numericValueOfElement('cameraUpDegrees'),
                            downDegrees: numericValueOfElement('cameraDownDegrees'),
                            leftDegrees: numericValueOfElement('cameraLeftDegrees'),
                            rightDegrees: numericValueOfElement('cameraRightDegrees')
                            // upDegrees: 32.0,
                            // downDegrees: 32.0,
                            // leftDegrees: 35.0,
                            // rightDegrees: 35.0
                    
                        }
                    };
                },
                getPose: attachCameraToGamepad(1)
            },
        };
        var activeViewports = [
            viewports.leftEye,
            viewports.rightEye,
            viewports.cam3
        ];

        var webglCanvas = document.getElementById('webgl-canvas');
        var gl = null;
        var scene = null;

        function initWebGL(preserveDrawingBuffer, stageParameters) {
            var glAttribs = {
                alpha: false,
                antialias: true,
                preserveDrawingBuffer: preserveDrawingBuffer
            };
            gl = webglCanvas.getContext("webgl", glAttribs);
            gl.clearColor(0.1, 0.4, 0.2, 1.0);
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.CULL_FACE);
    
            var sceneClass = window.sceneClass || FCScene;
            if (window.vrScene) {
                window.vrScene.init(gl, stageParameters);
                window.vrScene.setup();
                window.vrScene.isRendering = true;
            }

            window.addEventListener('resize', onResize, false);
            onResize();
            window.requestAnimationFrame(onAnimationFrame);
        }
        
        // var presentingMessage = document.getElementById("presenting-message"); //



        /* ---------------- */
        function onVRRequestPresent () {
          // This can only be called in response to a user gesture.
          vrDisplay.requestPresent([{ source: webglCanvas }]).then(function () {
            // Nothing to do because we're handling things in onVRPresentChange.
          }, function () {
            VRSamplesUtil.addError("requestPresent failed.", 2000);
          });
        }

        function onVRExitPresent () {
          vrDisplay.exitPresent().then(function () {
            // Nothing to do because we're handling things in onVRPresentChange.
          }, function () {
            VRSamplesUtil.addError("exitPresent failed.", 2000);
          });
        }

        function onVRPresentChange () {
          // When we begin or end presenting, the canvas should be resized to the
          // recommended dimensions for the display.
          onResize();

          if (vrDisplay.isPresenting) {
            if (vrDisplay.capabilities.hasExternalDisplay) {
              // Because we're not mirroring any images on an external screen will
              // freeze while presenting. It's better to replace it with a message
              // indicating that content is being shown on the VRDisplay.
              // presentingMessage.style.display = "block";

              // On devices with an external display the UA may not provide a way
              // to exit VR presentation mode, so we should provide one ourselves.
              // VRSamplesUtil.removeButton(vrPresentButton);
              // vrPresentButton = VRSamplesUtil.addButton("Exit VR", "E", "../cardboard64.png", onVRExitPresent);
            }
          } else {
            // If we have an external display take down the presenting message and
            // change the button back to "Enter VR".
            if (vrDisplay.capabilities.hasExternalDisplay) {
              // presentingMessage.style.display = "";

              // VRSamplesUtil.removeButton(vrPresentButton);
              // vrPresentButton = VRSamplesUtil.addButton("Enter VR", "E", "../cardboard64.png", onVRRequestPresent);
            }
          }
        }


        function onResize () {
          if (vrDisplay && vrDisplay.isPresenting) {
            // If we're presenting we want to use the drawing buffer size
            // recommended by the VRDevice, since that will ensure the best
            // results post-distortion.
            var leftEye = vrDisplay.getEyeParameters("left");
            var rightEye = vrDisplay.getEyeParameters("right");

            // For simplicity we're going to render both eyes at the same size,
            // even if one eye needs less resolution. You can render each eye at
            // the exact size it needs, but you'll need to adjust the viewports to
            // account for that.
            webglCanvas.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
            webglCanvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);
          } else {
            // We only want to change the size of the canvas drawing buffer to
            // match the window dimensions when we're not presenting.
            webglCanvas.width = webglCanvas.offsetWidth * window.devicePixelRatio;
            webglCanvas.height = webglCanvas.offsetHeight * window.devicePixelRatio;
          }
        }
        // window.addEventListener("resize", onResize, false);
        // onResize();

        function getPoseMatrix (out, pose) {
          orientation = pose.orientation;
          position = pose.position;
          if (!orientation) { orientation = [0, 0, 0, 1]; }
          if (!position) { position = [0, 0, 0]; }

          if (vrDisplay.stageParameters) {
            // If the headset provides stageParameters use the
            // sittingToStandingTransform to transform the pose into a space where
            // the floor in the center of the users play space is the origin.
            mat4.fromRotationTranslation(out, orientation, position);
            mat4.multiply(out, vrDisplay.stageParameters.sittingToStandingTransform, out);
          } else {
            // Otherwise you'll want to translate the view to compensate for the
            // scene floor being at Y=0. Ideally this should match the user's
            // height (you may want to make it configurable). For this demo we'll
            // just assume all human beings are 1.65 meters (~5.4ft) tall.
            vec3.add(standingPosition, position, [0, PLAYER_HEIGHT, 0]);
            mat4.fromRotationTranslation(out, orientation, standingPosition);
          }
        }


        function renderSceneView (poseInMat, eye, pov) {
          if (eye) {
            mat4.translate(viewMat, poseInMat, eye.offset);
            mat4.perspectiveFromFieldOfView(projectionMat, eye.fieldOfView, 0.1, 1024.0);
            mat4.invert(viewMat, viewMat);
          } else {
            mat4.perspective(projectionMat, Math.PI*0.4, webglCanvas.width / webglCanvas.height, 0.1, 1024.0);
            mat4.invert(viewMat, poseInMat);
          }

          if (window.vrScene) window.vrScene.render(projectionMat, viewMat, pov);
        }

        var FC_SCENE_MISSING=null;
        function onAnimationFrame (t) {
          // stats.begin();
          if (!gl) return;
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          if (!window.vrScene && FC_SCENE_MISSING === null) {
              FC_SCENE_MISSING = true;
              var err = 'No scene was found in window.vrScene';
              error(err);
          }

          if (vrDisplay) {
            // When presenting content to the VRDisplay we want to update at its
            // refresh rate if it differs from the refresh rate of the main
            // display. Calling VRDisplay.requestAnimationFrame ensures we render
            // at the right speed for VR.
            vrDisplay.requestAnimationFrame(onAnimationFrame);
    
            // var vrGamepads = [];
            // var gamepads = navigator.getGamepads();
            // for (var i=0; i<gamepads.length; ++i) {
            //     var gamepad = gamepads[i];
            //     if (gamepad && gamepad.pose) {
            //         vrGamepads.push(gamepad);
            //         for (var j=0; j < gamepad.buttons.length; ++j) {
            //             if (gamepad.buttons[j].pressed) {
            //                 console.log('Button '+j+' pressed');
            //                 console.debug(gamepad);
            //             }
            //         }
            //     }
            // }

            // As a general rule you want to get the pose as late as possible
            // and call VRDisplay.submitFrame as early as possible after
            // retrieving the pose. Do any work for the frame that doesn't need
            // to know the pose earlier to ensure the lowest latency possible.
            // ^^ observe this
            var pose = vrDisplay.getPose();
            getPoseMatrix(poseMat, pose);
    
            /* let's try relocating the player */
            /* If scene.playerLocation is updated, here's how we notice it */
            var ploc = window.vrScene && window.vrScene.playerLocation || {x:0, y:0, z:0};
            var trans = vec3.fromValues(ploc.x, ploc.y, ploc.z);
            var reloc = mat4.create();
            mat4.fromTranslation(reloc, trans);
            // console.debug(reloc);
            mat4.mul(poseMat, reloc, poseMat);
            /* ... */

            if (vrDisplay.isPresenting) {
        
                for (var i=0; i<activeViewports.length; i++) {
                    var myPort = activeViewports[i];
                    var cW = webglCanvas.width, cH = webglCanvas.height;
                    gl.viewport(myPort.canvasBounds[0]*cW, myPort.canvasBounds[1]*cH, myPort.canvasBounds[2]*cW, myPort.canvasBounds[3]*cH);
                    renderSceneView(myPort.getPose && myPort.getPose() || poseMat, myPort.getEyeParameters(), myPort.povLabel);
                    // if (myPort.pose) {console.log(myPort.pose);}
                }
        
              // When presenting render a stereo view.
        
              //
              //
              // gl.viewport(0, 0, webglCanvas.width * 0.5, webglCanvas.height);
              // renderSceneView(poseMat, vrDisplay.getEyeParameters("left"), 'left_eye');
              //
              // gl.viewport(webglCanvas.width * 0.5, 0, webglCanvas.width * 0.5, webglCanvas.height);
              // renderSceneView(poseMat, vrDisplay.getEyeParameters("right"), 'right_eye');
              //
              // console.log(viewports.leftEye.getEyeParameters());

              // If we're currently presenting to the VRDisplay we need to
              // explicitly indicate we're done rendering and inform the
              // display which pose was used to render the current frame.
              vrDisplay.submitFrame(pose);
            } else {
              // When not presenting render a mono view that still takes pose into
              // account.
              gl.viewport(0, 0, webglCanvas.width, webglCanvas.height);
              renderSceneView(poseMat, null);
              // stats.renderOrtho();
            }
          } else {
            window.requestAnimationFrame(onAnimationFrame);

            // No VRDisplay found.
            gl.viewport(0, 0, webglCanvas.width, webglCanvas.height);
            mat4.perspective(projectionMat, Math.PI*0.4, webglCanvas.width / webglCanvas.height, 0.1, 1024.0);
            mat4.identity(viewMat);
            mat4.translate(viewMat, viewMat, [0, -PLAYER_HEIGHT, 0]);
            scene.render(projectionMat, viewMat);

            // stats.renderOrtho();
          }

          // stats.end();
        }

        if (navigator.getVRDisplays) {
          navigator.getVRDisplays().then(function (displays) {
            if (displays.length > 0) {
              vrDisplay = displays[0];
              window.vrDisplay = vrDisplay; /* TODO find a nicer way */
              vrComponents.display = vrDisplay;
      
              initWebGL(true, vrDisplay.stageParameters);
      
              // if (vrDisplay.stageParameters &&
              //     vrDisplay.stageParameters.sizeX > 0 &&
              //     vrDisplay.stageParameters.sizeZ > 0) {
              //         scene.
              //     }
      
              // VRSamplesUtil.addButton("Reset Pose", "R", null, function () { vrDisplay.resetPose(); });

              // Generally, you want to wait until VR support is confirmed and
              // you know the user has a VRDisplay capable of presenting connected
              // before adding UI that advertises VR features.
              if (vrDisplay.capabilities.canPresent) {}
                // vrPresentButton = VRSamplesUtil.addButton("Enter VR", "E", "../cardboard64.png", onVRRequestPresent);

              // The UA may kick us out of VR present mode for any reason, so to
              // ensure we always know when we begin/end presenting we need to
              // listen for vrdisplaypresentchange events.
              window.addEventListener('vrdisplaypresentchange', onVRPresentChange, false);
      
              /* Bounds are [leftOffset, topOffset, width, height] */
              /* This could be useful for multiplexing, eg if we want to have cameras */
              window.START_VR = function () {
                  vrDisplay.requestPresent([{ source: webglCanvas, leftBounds:viewports.leftEye.headsetBounds, rightBounds:viewports.rightEye.headsetBounds }]);
                  /* Check gamepads for pose */
                  var gamepads = FCUtil.getVRGamepads(true);
                  var poseMissing = false;
                  for (var i = 0; i < gamepads.length; i++) {
                      poseMissing = poseMissing || (gamepads[i].pose === undefined);
                  }
                  if (poseMissing) {
                      error('Gamepads were detected but are not reporting a pose. You probably need to enable Gamepad Extensions in about:flags . <a style="color:green;" href="http://meta4vr.net/setup/" target="_top">Click here for the solution</a>');
                  }
          
              }
              /* window.START_VR() needs to be called in response to a user gesture to activate */
      
      
              // });
              // console.debug(window.onload);
              // console.log(viewports.rightEye.bounds);
              /// [0.5,0.5,0.5,1.0]
              /// [0.5,0.5,0.5,0.5]
      
            } else {
              // VRSamplesUtil.addInfo("WebVR supported, but no VRDisplays found.", 3000);
            }
          });
        } else if (navigator.getVRDevices) {
          // VRSamplesUtil.addError("Your browser supports WebVR but not the latest version. See <a href='http://webvr.info'>webvr.info</a> for more info.");
        } else {
          // VRSamplesUtil.addError("Your browser does not support WebVR. See <a href='http://webvr.info'>webvr.info</a> for assistance.");
        }
        
        window.requestAnimationFrame(onAnimationFrame);
        
        
        
        
        
    }
    
    
    return new Framework();
    
    
})();



