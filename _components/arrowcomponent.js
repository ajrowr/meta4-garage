
CARNIVAL.registerComponent('net.meta4vr.vrcomponents.arrow', function () {
    var superclass = CARNIVAL.shape.LatheExtruder;
    
    var Arrow = function (pos, size) {
        var p = {
            materialLabel: 'matteplastic',
            textureLabel: 'white',
            shapePoints: [[-1,0.55], [0,0.55], [0,1], [1,0], [0,-1], [0,-0.55], [-1,-0.55]].reverse()
        }
        
        superclass.call(this, pos, size, null, p);
        
    }
    
    Arrow.prototype = Object.create(superclass.prototype);
    
    return Arrow;
    
}());


/* add something that fulfils the promise when multiple components were added? */
