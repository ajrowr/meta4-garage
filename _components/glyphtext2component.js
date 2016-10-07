CARNIVAL.registerComponent('net.meta4vr.glyphtext', function () {
    
    var drawableclass = CARNIVAL.primitive.Container;
    
    var GlyphText = function (params) {
        CARNIVAL.component.Component.call(this, params, drawableclass);
        
        var cfg = (params || {}).config || {};
        var input = (params || {}).input || {};
        
        this.fontTag = cfg.fontTag || 'lato-bold';
        this.text = input.text;
        this.glyphPath = '//meshbase.meta4vr.net/_typography/@F@/glyph_@@.obj'.replace('@F@', this.fontTag);
        
    };
    
    GlyphText.prototype = Object.create(CARNIVAL.component.Component.prototype);
    
    GlyphText.prototype.prepare = function () {
        var textContainer = this;
        return new Promise(function (resolve, reject) {
            var glyphPromises = [];
            var xOffset = 0;
            for (var i=0; i<textContainer.text.length; i++) {
                var chrCode = textContainer.text.charCodeAt(i);
                if (chrCode == 32) {
                    glyphPromises.push(new Promise(function (resolve, reject){resolve(null);}));
                    continue;
                }
                var meshPath = textContainer.glyphPath.replace('@@', chrCode);
                glyphPromises.push(CARNIVAL.mesh.load(meshPath));
            }
            Promise.all(glyphPromises).then(function (meshes) {
                for (var i=0; i<meshes.length; i++) {
                    var mesh = meshes[i];
                    if (mesh == null) {
                        xOffset += 0.3*textContainer.drawable.scale;
                        continue;
                    }
                    var meshInfo = CARNIVAL.mesh.analyse(mesh);
                    var glyph = new CARNIVAL.mesh.Mesh(mesh, {x:xOffset, y:0, z:0}, {scale:textContainer.drawable.scale}, null,
                                {materialLabel:textContainer.drawable.materialLabel, textureLabel:textContainer.drawable.textureLabel});
                    textContainer.drawable.addChild(glyph);
                    xOffset += meshInfo.maxX*1.2*textContainer.drawable.scale;
            
                }
                resolve(textContainer);
            });
            
        })
    };
    
    GlyphText.prototype.meta = {
        ident: 'net.meta4vr.glyphtext'
    };
    
    return GlyphText;
    
}());