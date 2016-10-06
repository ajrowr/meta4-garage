CARNIVAL.registerComponent('net.meta4vr.textboard', function () {
    
    /*
    Params:
    textScale
    backgroundColor
    width
    height
    textLines
    transparentBackground
    */
    
    /*
    There are some subtleties when using transparent backgrounds.
    The shader discards fragments with alpha <0.9, so you need to set the alpha value of the bg to something less than that.
    The canvas rendering uses a blend function that dithers between the foreground color and the background color, including the relative alpha values. 
    By setting the background alpha slightly below 0.9 you should get a slight outline around the text of the background color. This is quite visually
    pleasing and has the side effect of antialiasing the text somewhat.
    If you set the alpha too low, your outline will end up black or nonexistent which can make the text look pretty choppy.
    */
    
    /* 
    Note also that there seems to be something of a performance cost to using a shader that discards a lot of fragments, as in the case of transparent
    backgrounds. Not sure why this is :-|
    */
    
    /*
    Known issues:
    reset() is kinda quirky when dealing with transparent backgrounds
    Transparent backgrounds generally have a few quirks. Best to use them sparingly.
    */
    
    var superclass = CARNIVAL.shape.Rectangle;
    
    var TextBoard = function (params) {
        var p = params || {};
        this.size = {maxX: p.width || 2, maxY: p.height || 2};
        superclass.call(this, 
            p.position || {x:0, y:0, z:0}, 
            this.size, 
            p.orientation || {x:0, y:0, z:0}, 
            {segmentsX:1, segmentsY:1, textureLabel:'orange', materialLabel:'matteplastic'}
        );
        this.textScale = p.textScale || 1; // Use this to scale the text
        this.canvasScale = p.canvasScale || 200; // generally better not to mess with this
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvasScale * this.size.maxX;
        this.canvas.height = this.canvasScale * this.size.maxY;
        this.ctx = this.canvas.getContext('2d');
        this.initialTextLines = p.textLines || [];
        this.transparentBackground = p.transparentBackground || false;
        if (this.transparentBackground) {
            this.shaderLabel = 'basic'; /* TODO make a special shader for this */
        }
        
        this.backgroundColor = p.backgroundColor || (this.transparentBackground && 'rgba(0,0,255,0.89)' || 'rgba(0,0,255,1)');
        var fslh = this.calculateFontSizeAndLineHeight(this.canvasScale, this.textScale);
        this.boardRenderState = {
            font: p.font || 'Arial',
            fontSize: p.fontSize || fslh.fontSize,
            lineHeight: p.lineHeight || fslh.lineHeight,
            textColor: p.textColor || 'white',
            // backgroundColor: p.backgroundColor || 'blue',
            leftMargin: p.leftMargin || 4,
            topMargin: p.topMargin || 4
            
        };
        this.cursor = null;
        this.tex = null;
        
    };
    
    TextBoard.prototype = Object.create(superclass.prototype);
    
    TextBoard.prototype.calculateFontSizeAndLineHeight = function (canvasScale, textScale) {
        return {
            fontSize: textScale * (canvasScale/5),
            lineHeight: textScale * (canvasScale/4.8)
        }
    }
    
    TextBoard.prototype.clear = function (color, suppressUpdate) {
        color = color || this.backgroundColor;
        // this.ctx.fillStyle = 'black';
        // this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (!suppressUpdate) this.updateTexture();
    }
    
    TextBoard.prototype.reset = function () {
        /* Just clearing the canvas doesn't work properly when we're using transparent backgrounds */
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvasScale * this.size.maxX;
        this.canvas.height = this.canvasScale * this.size.maxY;
        this.ctx = this.canvas.getContext('2d');
        this.cursor = null;
        this.clear();
        // this.textLines = [];
    }
    
    TextBoard.prototype.getTexture = function () {
        var gl = CARNIVAL.engine.gl;
        this.tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return this.tex;
    }

    TextBoard.prototype.updateTexture = function () {
        var gl = CARNIVAL.engine.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
        
    }
    
    TextBoard.prototype.renderTextLines = function (textLines) {
        var board = this;
        var rstate = board.boardRenderState;
        var text = null;
        if (!board.cursor) board.cursor = {x:rstate.leftMargin, y:rstate.topMargin};
        for (var i = 0; i < textLines.length; i++) {
            var line = textLines[i];
            rstate.font = line.font || rstate.font;
            rstate.fontSize = line.fontSize || rstate.fontSize;
            rstate.textColor = line.textColor || rstate.textColor;
            rstate.backgroundColor = line.backgroundColor || rstate.backgroundColor;
            rstate.lineHeight = line.lineHeight || rstate.lineHeight;
            rstate.leftMargin = line.leftMargin || rstate.leftMargin;
            rstate.topMargin = line.topMargin || rstate.topMargin;
            
            text = line.text || null;
            
            if (text) {
                
                // var ctx = board.canvas.getContext('2d');
                board.ctx.fillStyle = rstate.textColor;
                board.ctx.font = "@S@px @F@".replace('@S@', rstate.fontSize).replace('@F@', rstate.font);
                console.log('drawing text', text, board.cursor.x, board.cursor.y+rstate.fontSize)
                board.ctx.fillText(text, board.cursor.x, board.cursor.y+rstate.fontSize);
                board.cursor.y += rstate.lineHeight;
                
                
            }
            
        }
        board.updateTexture();
    }
    
    TextBoard.prototype.prepare = function () {
        var board = this;
        board.texture = board.getTexture();
        board.clear(board.backgroundColor, true);
        if (board.initialTextLines.length) {
            board.renderTextLines(board.initialTextLines);
        }
        // board.updateTexture();
        return new Promise(function (resolve, reject) {
            resolve(board);
        });
    }
    
    return TextBoard;
    
}());