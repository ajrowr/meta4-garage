
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
    Framework.prototype.start = dummy;
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
        this._componentResolvers[componentIdent](klass);
    };
    
    return new Framework();
    
    
    
})();



