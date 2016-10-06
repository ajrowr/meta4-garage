
CARNIVAL.registerComponent('net.meta4vr.vrcomponents.arrow', function () {
    var superclass = CARNIVAL.shape.LatheExtruder;
    
    var Arrow = function (params) {
        var p = params || {};
        this.size = p.size || {height: 0.1, scale:0.25};
        
        p.materialLabel = p.materialLabel || 'matteplastic';
        p.textureLabel = p.textureLabel || 'white';
        p.shapePoints = [[-1,0.55], [0,0.55], [0,1], [1,0], [0,-1], [0,-0.55], [-1,-0.55]].reverse();
        // var p = {
        //     materialLabel: 'matteplastic',
        //     textureLabel: 'white',
        //     shapePoints: [[-1,0.55], [0,0.55], [0,1], [1,0], [0,-1], [0,-0.55], [-1,-0.55]].reverse()
        // }
        superclass.call(this, p.position || {x:0, y:0, z:0}, this.size, p.orientation || {x:0, y:0, z:0}, p);
        
        
        // superclass.call(this, pos, size, null, p);
        
    }
    
    Arrow.prototype = Object.create(superclass.prototype);
    
    Arrow.prototype.prepare = function () {
        var arrow = this;
        return new Promise(function (resolve, reject) {resolve(arrow);});
    }
    
    
    return Arrow;
    
}());


/* add something that fulfils the promise when multiple components were added? */
