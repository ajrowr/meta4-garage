CARNIVAL.registerComponent('net.meta4vr.meshbasemesh', function () {
    
    var drawableclass = CARNIVAL.mesh.Mesh2;
    
    var MeshbaseMesh = function (params) {
        CARNIVAL.component.Component.call(this, params, drawableclass);
        this.drawable.mesh = null;
        
        var cfg = (params || {}).config || {};
        var input = (params || {}).input || {};
        
        this.loadPreview = cfg.loadPreview;
        this.meshPath = cfg.meshPath;
        
        this.meshbasePreviewURL = '//meshbase.meta4vr.net/mesh/@@?mode=grade';
        this.meshbaseMeshURL = '//meshbase.meta4vr.net/mesh/@@?mode=mesh';
        
        // this.modelListUrlFormat = '//meta4vr.net/meshbase/mesh/@@?mode=detail';
        
        
        
    };
    
    MeshbaseMesh.prototype = Object.create(CARNIVAL.component.Component.prototype);
    
    MeshbaseMesh.prototype.prepare = function () {
        var self = this;
        
        return new Promise(function(resolve, reject) {
            var meshUrl = (self.loadPreview && self.meshbasePreviewURL || self.meshbaseMeshURL).replace('@@', self.meshPath);
            CARNIVAL.mesh.load(meshUrl)
            .then(function (mesh) {
                self.drawable.mesh = mesh;
                resolve(self);
            });
        })
    };
    
    MeshbaseMesh.prototype.meta = {
        ident: 'net.meta4vr.meshbasemesh'
    };
    
    return MeshbaseMesh;
    
}());