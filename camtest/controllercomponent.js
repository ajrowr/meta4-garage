
CARNIVAL.registerComponent('net.meta4vr.vrui.sys.controller.vive_lowpoly', function () {
    var superclass = CARNIVAL.core.primitives.Container;
    
    var ControllerChrome = function (params, behaviours) {
        superclass.call(this, null, null, null, params);
        var ctrl = this;
        var prepped = null;
        // ctrl.invisible = true; /* Marking this as invisible prevents the engine from trying to draw it, while still allowing the children to be drawn */

        var p = params || {};
        ctrl.materialLabel = p.materialLabel || 'matteplastic';
        ctrl.textureLabel = p.textureLabel || 'white';
        ctrl.altTextureLabel = p.altTextureLabel || ctrl.textureLabel;

        // ctrl.meshInfo = [
        //     {label: 'controller_body', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/body.obj'},
        //     {label: 'controller_button_menu', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/button.obj'},
        //     {label: 'controller_button_sys', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/sys_button.obj'},
        //     {label: 'controller_trigger', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/trigger.obj'},
        //     {label: 'controller_trackpad', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/trackpad.obj'},
        //     {label: 'controller_grip_l', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/l_grip.obj'},
        //     {label: 'controller_grip_r', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/r_grip.obj'}
        // ];
        
        for (var i = 0; i < behaviours.length; i++) {
            ctrl.behaviours.push(behaviours[i]);
        }
        
        var parts = ['controller_body', 'controller_button_menu', 'controller_button_sys', 'controller_trigger', 'controller_trackpad', 'controller_grip_l', 'controller_grip_r'];
        for (var i = 0; i < parts.length; i++) {
            var piecemesh = ctrl.resources[parts[i]].mesh;
            var piece = new CARNIVAL.core.shapes.MeshShape(piecemesh, {x:0, y:0, z:0}, {scale:1.0}, null, {
                materialLabel:'matteplastic', textureLabel:(i==0 && ctrl.textureLabel) || ctrl.altTextureLabel
            });
            ctrl.addChild(piece);
        }

        // for (var i=0; i<chromeMeshes.length; i++) {
        //     var part = new CARNIVAL.core.shapes.MeshShape(chromeMeshes[i], {x:0, y:0, z:0}, {scale:1.0}, null, {materialLabel:'matteplastic', textureLabel:textureLabel});
        //     this.addChild(part);
        // }
        // this.behaviours.push(tracker);
        
    }

    ControllerChrome.prototype = Object.create(superclass.prototype);

    ControllerChrome.prototype._requisites = {
        meshes: [
            {label: 'controller_body', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/body.obj'},
            {label: 'controller_button_menu', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/button.obj'},
            {label: 'controller_button_sys', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/sys_button.obj'},
            {label: 'controller_trigger', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/trigger.obj'},
            {label: 'controller_trackpad', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/trackpad.obj'},
            {label: 'controller_grip_l', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/l_grip.obj'},
            {label: 'controller_grip_r', src: '//assets.meta4vr.net/mesh/sys/vive/controller/vr_controller_lowpoly/r_grip.obj'}
        ]
    }
    
    // ControllerChrome.prototype._prepare = function () {
    //     var ctrl = this;
    //
    //     var meshPromises = [];
    //     for (var i = 0; i < ctrl.meshInfo.length; i++) {
    //         var myMesh = ctrl.meshInfo[i];
    //         meshPromises.push(CARNIVAL.core.shapeutils.loadMesh(myMesh.src));
    //     }
    //     return new Promise(function (resolve, reject) {
    //         Promise.all(meshPromises).then(function (loadedMeshes) {
    //             for (var i = 0; i < loadedMeshes.length; i++) {
    //                 var myMesh = loadedMeshes[i];
    //                 var part = new CARNIVAL.core.shapes.MeshShape(myMesh, {x:0, y:0, z:0}, {scale:1.0}, null, {materialLabel:'matteplastic', textureLabel:ctrl.textureLabel});
    //                 ctrl.addChild(part);
    //                 // console.log(myMesh);
    //             }
    //             resolve();
    //         });
    //     });
    //
    // }
    
    
    return ControllerChrome;
    
}());