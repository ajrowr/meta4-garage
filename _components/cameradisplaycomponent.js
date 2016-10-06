

CARNIVAL.registerComponent('net.meta4vr.cameradummy', function () {
    
    var superclass = CARNIVAL.primitive.Container;
    var DEG = function (deg) {return deg*(Math.PI/180)};
    
    var CameraDummy = function (params) {
        var p = params || {};
        superclass.call(this, 
            p.position || {x:0, y:0, z:0}, 
            p.size || {}, 
            p.orientation || {x:0, y:0, z:0}, 
            {materialLabel:'matteplastic'}
        );
        this.projection = null;
        this.icon = null;
        
    };
    
    CameraDummy.prototype = Object.create(superclass.prototype);
    
    CameraDummy.prototype.prepare = function () {
        var camdummy = this;
        var camthingLength = 10;
        var camFov = CARNIVAL.engine.viewports.cam4.getEyeParameters().fieldOfView;
        var camthingAngle = DEG(Math.max(camFov.downDegrees, camFov.downDegrees, camFov.leftDegrees, camFov.rightDegrees));
        camdummy.projection = new CARNIVAL.shape.LatheExtruder(
            null, {height:camthingLength , scale: 1}, null, {
                shape: {
                    pointCount: 8,
                    sampler: CARNIVAL.shape.LatheExtruder.prototype.shapeSamplers.Circle() // << ugh so wordy TODO
                },
                profile: {
                    /* At max camthingLength we want the shape to be N degrees offset */
                    sampler: function (j,n) {
                        var frac = j/n;
                        var opp = camthingLength * Math.tan(camthingAngle);
                        // return 1;
                        // console.log(frac);
                        // return Math.random();
                        return frac * opp;
                    },
                    segmentCount: 5
                },
                materialLabel: 'matteplastic',
                textureLabel: 'orange'
            }
        );
        camdummy.projection.rotation = {x:DEG(270), y:0, z:0};
        camdummy.projection.drawMode = 1; //lines
        camdummy.addChild(camdummy.projection);
        
        camdummy.behaviours.push(function (drawable, timepoint) {
            /// var qq = quat.create();
            ///CARNIVAL.util.rotateMatrixBy({x:DEG(90)})
            /// quat.rotateX(qq, DEG(90));
            // var r1 = mat4.create();
            // mat4.fromXRotation(r1, DEG(270));
            // mat4.mul(r1, CARNIVAL.engine.viewports.cam4.getPose(), r1);
            drawable.injectedMatrix = CARNIVAL.engine.viewports.cam4.getPose();
            // console.log(drawable.matrix);
            // drawable.matrix = r1;
            
        })
        
        /* Hmm. Scale 0.1 worked well for this when it wasn't part of a container. But now it makes it very small. */
        /* The matrixes look okay. Sooo wtf!?!!? */
        /* Giving up for now, 0.3 looks fine and that's good enough for me */
        return new Promise(function (resolve, reject) {
            CARNIVAL.mesh.load('//meshbase.meta4vr.net/_typography/fontawesome/glyph_'+0xf030+'.obj')
            .then(function (mesh) {
                CARNIVAL.mesh.shunt(mesh, {x:-0.5351, y:-0.3237});
                camdummy.icon = new CARNIVAL.mesh.Mesh(mesh, null, {scale:0.3}, null, {materialLabel:'matteplastic', label:'camcam'});
                // camIcon.behaviours.push(function (drawable, timepoint) {
                //     drawable.matrix = CARNIVAL.engine.viewports.cam4.getPose();
                // });
                camdummy.addChild(camdummy.icon);
                resolve(camdummy);
            });
            
        })
        
    }
    
    return CameraDummy;
    
}());