CARNIVAL.registerComponent('net.meta4vr.picboard', function () {
    
    var drawableclass = CARNIVAL.shape.SegmentedRectangle;
    
    var PicBoard = function (params) {
        /* We'll be calculating these later once we have info about the image dimensions */
        /* targetHeight, targetWidth, scale are gotten from cfg */
        this._explicitSize = {};
        // this._explicitSize = function (s) {return {
        //         width: 1,
        //         height: 1,
        //         depth: 0,
        //         scale: 1
        // }}(params.draw && params.draw.size || {});

        CARNIVAL.component.Component.call(this, params, drawableclass);
        
        var cfg = (params || {}).config || {};
        var input = (params || {}).input || {};
        
        this.src = cfg.src || null;
        this.dataSource = cfg.dataSource || null;
        this.dataIndex = cfg.dataIndex || -1; /* -1 means random */
        
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
            else {
                console.log('No usable dimension factors were found for picboard.');
            }
            
        })(cfg);
        
        
        
        // this.boardscale = p.scale || (1/1000);
        // this.
        
    };
    
    PicBoard.prototype = Object.create(CARNIVAL.component.Component.prototype);
    
    PicBoard.prototype.prepare = function () {
        var picboard = this;
        
        var showPic = function (src) {
            return new Promise(function (resolve, reject) {
                CARNIVAL._postRenderTasks.push(function () { /* I'm not sure the postRenderTasks thing is helping but at least it doesn't seem to hurt */
                    CARNIVAL.texture.fromImage(src, 'sunrise')
                    .then(function (texinf) {
                        picboard.drawable.texture = texinf.texture;
                        var dims = picboard._calcDims(texinf.width, texinf.height);
                        picboard.drawable.maxX = dims.w; /* TODO this breaks encapsulation :-| maybe like, drawable.setSize()? */
                        picboard.drawable.maxY = dims.h;
                        resolve(picboard);
                    });
                    
                })
            });
        }
        
        if (picboard.dataSource) {
            return new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.responseType = 'json';
                xhr.addEventListener('load', function (evt) {
                    if (xhr.status == 200) {
                        // console.log(xhr.response);
                        var itemsList = xhr.response.pics;
                        var r;
                        if (picboard.dataIndex < 0) r = Math.floor(Math.random()*itemsList.length);
                        else r = picBoard.dataIndex;
                        showPic(itemsList[r].src).then(function () {
                            console.log(itemsList[r].src);
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


    };
    
    PicBoard.prototype.meta = {
        ident: 'net.meta4vr.picboard'
    };
    
    return PicBoard;
    
}());