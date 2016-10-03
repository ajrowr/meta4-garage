
CARNIVAL.registerComponent('net.meta4vr.vrui.text.glyphtext', function () {
    var superclass = CARNIVAL.primitive.Container;
    
    var TextChunk = function (params, behaviours) {
        var p = params || {};
        superclass.call(this, p.position || {x:0, y:0, z:0}, null, p.orientation || {x:0, y:0, z:0}, p);
        
        this.text = p.text;
        this.textureLabel = this.textureLabel || 'white';
        this.materialLabel = this.materialLabel || 'matteplastic';
        this.fontTag = p.fontTag || 'lato-bold';
        
        this.glyphPath = '//meshbase.meta4vr.net/_typography/@F@/glyph_@@.obj'.replace('@F@', this.fontTag);
    }
    
    TextChunk.prototype = Object.create(superclass.prototype);
    
    TextChunk.prototype.prepare = function () {
        var textContainer = this;
        return new Promise(function (resolve, reject) {
            var glyphPromises = [];
            var xOffset = 0;
            for (var i=0; i<textContainer.text.length; i++) {
                // var glyph;
                // var meshPath = '//meshbase.meta4vr.net/_typography/lato-bold/glyph_'+textContainer.text.charCodeAt(i)+'.obj';
                var chrCode = textContainer.text.charCodeAt(i);
                if (chrCode == 32) {
                    glyphPromises.push(new Promise(function (resolve, reject){resolve(null);}));
                    continue;
                }
                var meshPath = textContainer.glyphPath.replace('@@', chrCode);
                // glyphPromises.push(CARNIVAL.core.shapeutils.loadMesh(meshPath));
                glyphPromises.push(CARNIVAL.mesh.load(meshPath));
            }
            Promise.all(glyphPromises).then(function (meshes) {
                for (var i=0; i<meshes.length; i++) {
                    var mesh = meshes[i];
                    if (mesh == null) {
                        xOffset += 0.3*textContainer.scale;
                        continue;
                    }
                    var meshInfo = CARNIVAL.mesh.analyse(mesh);
                    var glyph = new CARNIVAL.mesh.Mesh(mesh, {x:xOffset, y:0, z:0}, {scale:textContainer.scale}, null,
                                {materialLabel:textContainer.materialLabel, textureLabel:textContainer.textureLabel});
                    textContainer.addChild(glyph);
                    xOffset += meshInfo.maxX*1.2*textContainer.scale;
            
                }
                resolve(textContainer);
                // scene.addObject(textContainer);
            });
            
        })
        
    }
    
    
    return TextChunk;
    
}())