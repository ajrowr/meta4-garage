CARNIVAL.registerComponent('net.meta4vr.picboard', function () {
    var superclass = CARNIVAL.shape.Rectangle;
    
    var PicBoard = function (params) {
        var p = params || {};
        this.size = {maxX:1, maxY:1}; /* We'll be updating this later */
        this.boardscale = p.scale || (1/1000);
        superclass.call(this, p.position || {x:0, y:0, z:0}, this.size, p.orientation || {x:0, y:0, z:0}, {segmentsX:1, segmentsY:1, materialLabel:p.materialLabel || 'matteplastic'});
        
        this.dataSource = p.dataSource || null;
        this.dataIndex = p.dataIndex || -1; /* -1 means random */
        this.src = p.src || null;
        this.shaderLabel = p.shaderLabel || null; /* Since we may sometimes want to use an alternate shader */
        
        this._calcDims = (function (par) {
            if (par.targetHeight) {
                return function (w,h) {var p = par.targetHeight / h; return {
                    w:p*w,
                    h:p*h
                }}
            }
            else if (par.targetWidth) {
                return function (w,h) {var p = par.targetWidth / w; return {
                    w:p*w,
                    h:p*h
                }}
            }
            else if (par.scale) {
                return function (w,h) {return {
                    w: w*par.scale,
                    h: h*par.scale
                }}
            }
        })(p);
    }
    
    PicBoard.prototype = Object.create(superclass.prototype);
    
    PicBoard.prototype.prepare = function () {
        var picboard = this;
        
        var showPic = function (src) {
            return new Promise(function (resolve, reject) {
                CARNIVAL.texture.fromImage(src, 'sunrise')
                .then(function (texinf) {
                    picboard.texture = texinf.texture;
                    var dims = picboard._calcDims(texinf.width, texinf.height);
                    picboard.maxX = dims.w;
                    picboard.maxY = dims.h;
                    resolve(picboard);
                });
            });
        }
        
        if (picboard.dataSource) {
            return new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.responseType = 'json';
                xhr.addEventListener('load', function (evt) {
                    if (xhr.status == 200) {
                        console.log(xhr.response);
                        var itemsList = xhr.response.pics;
                        var r;
                        if (picboard.dataIndex < 0) r = Math.floor(Math.random()*itemsList.length);
                        else r = picBoard.dataIndex;
                        showPic(itemsList[r].src).then(function () {
                            resolve(picboard);
                        });
                    }
                    else {
                        
                    }
                });
                xhr.open('GET', picboard.dataSource, true);
                xhr.send();
                
            })
        }
        else {
            return showPic(picboard.src);
        }
        
    }
    
    return PicBoard;


}())
