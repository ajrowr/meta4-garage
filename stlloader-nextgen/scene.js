

/**
 * @author aleeper / http://adamleeper.com/
 * @author mrdoob / http://mrdoob.com/
 * @author gero3 / https://github.com/gero3
 *
 * Description: A THREE loader for STL ASCII files, as created by Solidworks and other CAD programs.
 *
 * Supports both binary and ASCII encoded files, with automatic detection of type.
 *
 * Limitations:
 *  Binary decoding supports "Magics" color format (http://en.wikipedia.org/wiki/STL_(file_format)#Color_in_binary_STL).
 *  There is perhaps some question as to how valid it is to always assume little-endian-ness.
 *  ASCII decoding assumes file is UTF-8. Seems to work for the examples...
 *
 * Usage:
 *  var loader = new THREE.STLLoader();
 *  loader.load( './models/stl/slotted_disk.stl', function ( geometry ) {
 *    scene.add( new THREE.Mesh( geometry ) );
 *  });
 *
 * For binary STLs geometry might contain colors for vertices. To use it:
 *  // use the same code to load STL as above
 *  if (geometry.hasColors) {
 *    material = new THREE.MeshPhongMaterial({ opacity: geometry.alpha, vertexColors: THREE.VertexColors });
 *  } else { .... }
 *  var mesh = new THREE.Mesh( geometry, material );
 */

var P = FCPrimitives


var P = FCPrimitives;
var shapeTypes = {};

var parseSTLSource = function (srcLines, scale) {
    scale = scale || 1.0;
    var poly = new P.Poly();
    var rxNormal = new RegExp('\\s*facet normal ([\\d\.-]+) ([\\d\.-]+) ([\\d\.-]+)');
    var rxVertex = new RegExp('\\s*vertex ([\\d\.-]+) ([\\d\.-]+) ([\\d\.-]+)');
    var rxEndFacet = new RegExp('\\s*endfacet\\s*');
    var norm, myVert, verts=[], inFacet=false, vertIdx=0;
    for (var i=0; i<srcLines.length; i++) {
        var myLine = srcLines[i];
        // console.log(myLine);
        if (norm = rxNormal.exec(myLine)) {
            poly.normal(Number(norm[1]), Number(norm[2]), Number(norm[3]));
            vertIdx=0;
            inFacet = true;
        }
        else if (myVert = rxVertex.exec(myLine)) {
            verts[vertIdx] = P.mkVert(Number(myVert[1])*scale, Number(myVert[2])*scale, Number(myVert[3])*scale);
            vertIdx++;
        }
        else if (rxEndFacet.exec(myLine)) {
            poly.add(verts[0], P.tex.no, verts[1], P.tex.no, verts[2], P.tex.no);
            vertIdx = 0;
            inFacet = false;
            verts = [];
        }
    }
    return {indices: poly.indices, vertices: poly.verts};
}



var STLLoader = function ( ) {

    // this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

STLLoader.prototype = {

	constructor: STLLoader,

    // load: function ( url, onLoad, onProgress, onError ) {
    //
    //     var scope = this;
    //
    //     var loader = new THREE.XHRLoader( scope.manager );
    //     loader.setResponseType( 'arraybuffer' );
    //     loader.load( url, function ( text ) {
    //
    //         onLoad( scope.parse( text ) );
    //
    //     }, onProgress, onError );
    //
    // },

	parse: function ( data ) {

		var isBinary = function () {

			var expect, face_size, n_faces, reader;
			reader = new DataView( binData );
			face_size = ( 32 / 8 * 3 ) + ( ( 32 / 8 * 3 ) * 3 ) + ( 16 / 8 );
			n_faces = reader.getUint32( 80, true );
			expect = 80 + ( 32 / 8 ) + ( n_faces * face_size );

			if ( expect === reader.byteLength ) {

				return true;

			}

			// some binary files will have different size from expected,
			// checking characters higher than ASCII to confirm is binary
			var fileLength = reader.byteLength;
			for ( var index = 0; index < fileLength; index ++ ) {

				if ( reader.getUint8( index, false ) > 127 ) {

					return true;

				}

			}

			return false;

		};

		var binData = this.ensureBinary( data );

		return isBinary()
			? this.parseBinary( binData )
			: this.parseASCII( this.ensureString( data ) );

	},

	parseBinary: function ( data ) {

		var reader = new DataView( data );
		var faces = reader.getUint32( 80, true );

		var r, g, b, hasColors = false, colors;
		var defaultR, defaultG, defaultB, alpha;

		// process STL header
		// check for default color in header ("COLOR=rgba" sequence).

		for ( var index = 0; index < 80 - 10; index ++ ) {

			if ( ( reader.getUint32( index, false ) == 0x434F4C4F /*COLO*/ ) &&
				( reader.getUint8( index + 4 ) == 0x52 /*'R'*/ ) &&
				( reader.getUint8( index + 5 ) == 0x3D /*'='*/ ) ) {

				hasColors = true;
				colors = new Float32Array( faces * 3 * 3 );

				defaultR = reader.getUint8( index + 6 ) / 255;
				defaultG = reader.getUint8( index + 7 ) / 255;
				defaultB = reader.getUint8( index + 8 ) / 255;
				alpha = reader.getUint8( index + 9 ) / 255;

			}

		}

		var dataOffset = 84;
		var faceLength = 12 * 4 + 2;

		var offset = 0;

        // var geometry = new THREE.BufferGeometry();
        var geometry = {};

		var vertices = new Float32Array( faces * 3 * 3 );
		var normals = new Float32Array( faces * 3 * 3 );
        
        var polys = new P.Poly();

		for ( var face = 0; face < faces; face ++ ) {

			var start = dataOffset + face * faceLength;
			var normalX = reader.getFloat32( start, true );
			var normalY = reader.getFloat32( start + 4, true );
			var normalZ = reader.getFloat32( start + 8, true );
            
            polys.normal(normalX, normalY, normalZ);

			if ( hasColors ) {

				var packedColor = reader.getUint16( start + 48, true );

				if ( ( packedColor & 0x8000 ) === 0 ) {

					// facet has its own unique color

					r = ( packedColor & 0x1F ) / 31;
					g = ( ( packedColor >> 5 ) & 0x1F ) / 31;
					b = ( ( packedColor >> 10 ) & 0x1F ) / 31;

				} else {

					r = defaultR;
					g = defaultG;
					b = defaultB;

				}

			}
            
            var polyverts = [];
			for ( var i = 1; i <= 3; i ++ ) {

				var vertexstart = start + i * 12;

				vertices[ offset ] = reader.getFloat32( vertexstart, true );
				vertices[ offset + 1 ] = reader.getFloat32( vertexstart + 4, true );
				vertices[ offset + 2 ] = reader.getFloat32( vertexstart + 8, true );
                
                polyverts.push(P.mkVert(vertices[offset], vertices[offset+1], vertices[offset+2]));

				normals[ offset ] = normalX;
				normals[ offset + 1 ] = normalY;
				normals[ offset + 2 ] = normalZ;

				if ( hasColors ) {

					colors[ offset ] = r;
					colors[ offset + 1 ] = g;
					colors[ offset + 2 ] = b;

				}

				offset += 3;

			}
            polys.add(polyverts[0], P.tex.no, polyverts[1], P.tex.no, polyverts[2], P.tex.no);

		}

        // geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
        // geometry.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
        
        geometry.vertices = vertices;
        geometry.normals = normals;

        // if ( hasColors ) {
        //
        //     geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
        //     geometry.hasColors = true;
        //     geometry.alpha = alpha;
        //
        // }

        // return geometry;
        return {indices: polys.indices, vertices: polys.verts};

	},

	parseASCII: function ( data ) {

		var geometry, length, normal, patternFace, patternNormal, patternVertex, result, text;
        // geometry = new THREE.Geometry();
        geometry = {vertices: [], faces: []};
		patternFace = /facet([\s\S]*?)endfacet/g;
        
        var polys = new P.Poly();
        
		while ( ( result = patternFace.exec( data ) ) !== null ) {
            var faceVerts = [];

			text = result[ 0 ];
			patternNormal = /normal[\s]+([\-+]?[0-9]+\.?[0-9]*([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+/g;

			while ( ( result = patternNormal.exec( text ) ) !== null ) {

                // normal = [ parseFloat( result[ 1 ] ), parseFloat( result[ 3 ] ), parseFloat( result[ 5 ] ) ];
                
                polys.normal(parseFloat( result[ 1 ] ), parseFloat( result[ 3 ] ), parseFloat( result[ 5 ] ));

			}

			patternVertex = /vertex[\s]+([\-+]?[0-9]+\.?[0-9]*([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+/g;

			while ( ( result = patternVertex.exec( text ) ) !== null ) {

                // geometry.vertices.push( [ parseFloat( result[ 1 ] ), parseFloat( result[ 3 ] ), parseFloat( result[ 5 ] ) ] );
                
                faceVerts.push(P.mkVert(parseFloat( result[ 1 ] ), parseFloat( result[ 3 ] ), parseFloat( result[ 5 ] )));
                
			}

            // length = geometry.vertices.length;

            // geometry.faces.push( new THREE.Face3( length - 3, length - 2, length - 1, normal ) );
            // geometry.faces.push( [ length - 3, length - 2, length - 1, normal ] );
            
            polys.add(faceVerts[0], P.tex.no, faceVerts[1], P.tex.no, faceVerts[2], P.tex.no);

		}

        // geometry.computeBoundingBox();
        // geometry.computeBoundingSphere();
        
        return {indices: polys.indices, vertices: polys.verts};
        
        // return geometry;

	},

	ensureString: function ( buf ) {

		if ( typeof buf !== "string" ) {

			var array_buffer = new Uint8Array( buf );
			var strArray = [];
			for ( var i = 0; i < buf.byteLength; i ++ ) {

				strArray.push(String.fromCharCode( array_buffer[ i ] )); // implicitly assumes little-endian

			}
			return strArray.join('');

		} else {

			return buf;

		}

	},

	ensureBinary: function ( buf ) {

		if ( typeof buf === "string" ) {

			var array_buffer = new Uint8Array( buf.length );
			for ( var i = 0; i < buf.length; i ++ ) {

				array_buffer[ i ] = buf.charCodeAt( i ) & 0xff; // implicitly assumes little-endian

			}
			return array_buffer.buffer || array_buffer;

		} else {

			return buf;

		}

	}

};





window.ExperimentalScene = (function () {
    "use strict";
    
    function Scene() {
        /* Declare any class and instance vars unique to this scene, here. */
        FCScene.call(this);
        this.meshes = {};
    }
    
    Scene.prototype = Object.create(FCScene.prototype);
    
    Scene.prototype.setupPrereqs = function () {
        var scene = this;
        var prereqPromises = [];
        return new Promise(function (resolve, reject) {

            /* Load textures */
            var textures = [
                {src: '//assets.meta4vr.net/texture/concrete01.jpg', label: 'concrete01'}
            ];
            for (var i=0; i<textures.length; i++) {
                var myTex = textures[i];
                prereqPromises.push(scene.addTextureFromImage(myTex.src, myTex.label));
            }
            
            /* Build solid colour textures */
            var texColors = [
                {hex: '#00007f', label: 'navy'},
                {hex: '#0000ff', label: 'blue'},
                {hex: '#007f00', label: 'green'},
                {hex: '#007f7f', label: 'teal'},
                {hex: '#00ff00', label: 'lime'},
                {hex: '#00ff7f', label: 'springgreen'},
                {hex: '#00ffff', label: 'cyan'},
                {hex: '#00ffff', label: 'aqua'},
                {hex: '#191970', label: 'dodgerblue'},
                {hex: '#20b2aa', label: 'lightseagreen'},
                {hex: '#228b22', label: 'forestgreen'},
                {hex: '#2e8b57', label: 'seagreen'},
                {hex: '#4169e1', label: 'royalblue'},
                {hex: '#ff0000', label: 'red'},
                {hex: '#ff00ff', label: 'magenta'},
                {hex: '#ffa500', label: 'orange'},
                {hex: '#ffff00', label: 'yellow'},
                {hex: '#000000', label: 'black'},
                {hex: '#888888', label: 'gray'},
                {hex: '#ffffff', label: 'white'}
            ];
            for (var i=0; i<texColors.length; i++) {
                var myTexColor = texColors[i];
                scene.addTextureFromColor(myTexColor, myTexColor.label);
            }
                        
            /* Load meshes */
            var meshes = [
                {src: '//assets.meta4vr.net/mesh/obj/sys/vive/controller/ctrl_lowpoly_body.obj', label: 'controller'}
            ];
            for (var i=0; i<meshes.length; i++) {
                var myMesh = meshes[i];
                prereqPromises.push(new Promise(function (resolve, reject) {
                    if (myMesh.src.endsWith('.obj')) {
                        FCShapeUtils.loadObj(myMesh.src)
                        .then(function (mesh) {
                            scene.meshes[myMesh.label] = mesh;
                            resolve();
                        })
                    };
                    
                }))
            }
        
            /* Load shaders */
            var shaders = [
                {srcFs: '//assets.meta4vr.net/shader/basic.fs', srcVs: '//assets.meta4vr.net/shader/basic.vs', label: 'basic'},
                {srcFs: '//assets.meta4vr.net/shader/diffuse2.fs', srcVs: '//assets.meta4vr.net/shader/diffuse2.vs', label: 'diffuse'}
            ];
            for (var i=0; i<shaders.length; i++) {
                var myShader = shaders[i];
                prereqPromises.push(scene.addShaderFromUrlPair(myShader.srcVs, myShader.srcFs, myShader.label, {
                    position: 0,
                    texCoord: 1,
                    vertexNormal: 2                
                }));
            }
            
            /* Wait for everything to finish and resolve() */
            Promise.all(prereqPromises).then(function () {
                resolve();
            });
            
        })
        
    }
    
    Scene.prototype.teleportUserToCursor = function () {
        var curs = this.getObjectByLabel('cursor');
        this.moveRaftAndPlayerTo(curs.pos);
    }
    
    Scene.prototype.setupScene = function () {
        var scene = this;
        var DEG=360/(2*Math.PI);
        var _hidden_beneath_floor = {x:0, y:-3.5, z:0};
        
        console.log('setting up');
        
        /* Cursor */
        var cursor = new FCShapes.SimpleCuboid(
            _hidden_beneath_floor,
            {w: 0.3, h:0.3, d:0.3},
            null,
            {label: 'cursor', shaderLabel: 'diffuse', textureLabel: 'red'}
        );
        /* Make the cursor revolve slowly */
        cursor.behaviours.push(function (drawable, timePoint) {
            drawable.currentOrientation = {x:0.0, y:Math.PI*2*(timePoint/7000), z:0.0};
        });
        scene.addObject(cursor);
        
        /* Floor */
        var floor = new FCShapes.WallShape(
            {x: 0, z: 0, y: -0.02},
            {minX: -20, maxX: 20, minY: -20, maxY: 20},
            {x:270/DEG, y:0/DEG, z:0/DEG},
            {label: 'floor', textureLabel: 'concrete01', shaderLabel: 'diffuse', segmentsX: 10, segmentsY: 10}
        );
        /* We use the floor collider to determine where the user is pointing their controller, and hence, */
        /* the location for the cursor. There are two stages to this, first is setting up the collider. */
        /* Note the planeNormal - this is the normal of the floor *before it is rotated into position*. */
        /* Basically any planar collider has to match the original state of an object before that object */
        /* is transformed. */
        /* This is perhaps counterintuitive and may change. Colliders generally are not as easy to use, yet, */
        /* as I would like. */
        var floorCollider = new FCUtil.PlanarCollider({planeNormal:[0, 0, -1], pointOnPlane:[0,0,0]}, floor, null);
        floorCollider.callback = function (dat) {
            var c = scene.getObjectByLabel('cursor');
            c.pos.x = dat.collisionPoint[0];
            c.pos.y = dat.collisionPoint[1];
            c.pos.z = dat.collisionPoint[2];
        }
        scene.addObject(floor);
        
        /* Raft */
        var stageExtent = {
            x: scene.stageParams.sizeX / 2,
            z: scene.stageParams.sizeZ / 2
        };
        console.log(scene.stageParams);
        scene.addObject(new FCShapes.WallShape(
            {x: 0, z: 0, y: 0},
            {minX: -1*stageExtent.x, maxX: stageExtent.x, minY: -1*stageExtent.z, maxY: stageExtent.z},
            {x:270/DEG, y:0/DEG, z:0/DEG},
            {label: 'raft', textureLabel: 'royalblue', shaderLabel: 'diffuse', segmentsX: 1, segmentsY: 1}
        ));
        
        /* Controllers */
        var ctrlInfo = {
            size: {scale:1},
            greenColor: scene.addTextureFromColor({r:0.2, g:0.9, b:0.6}),
            blueColor: scene.addTextureFromColor({r:0.2, g:0.6, b:0.9})
        };
        
        /* Button handler for the controllers. The default button handler does 2 things: */
        /* 1). teleport to cursor location when grip button is pressed */
        /* 2). Output button status info when any button is pressed */
        var buttonHandler = function (gamepadIdx, btnIdx, btnStatus, sector, myButton, extra) {
            if (btnStatus != 'up') {
                console.log('Button idx', btnIdx, 'on controller', gamepadIdx, 'was', btnStatus);
                if (btnIdx == 0) {
                    console.log('Sector', sector);
                }
                if (btnIdx == '2' && btnStatus == 'pressed') {
                    scene.teleportUserToCursor();
                }
            }
        };
        
        /* Controller models are added just like any model in the scene; to make them track the controller, */
        /* a special behaviour is added. */
        /* Controller 0 (the green one) also has command of the cursor (having the cursor track both controllers */
        /* can get pretty weird pretty quickly). */
        /* This is the 2nd stage of the 2-stage process mentioned earlier. The cursor projects a ray which is */
        /* configured to interact with a set of colliders, in this case the floorCollider, which has a callback */
        /* which receives info on the collisions that occur so that the cursor can be updated. */
        var ctrl0 = new FCShapes.MeshShape(
            scene.meshes.controller,
            _hidden_beneath_floor, /* Hide it under the floor. This position will be overridden */
            ctrlInfo.size,
            null,
            {
                shaderLabel: 'diffuse',
                texture: ctrlInfo.greenColor,
                groupLabel: 'controllerTrackers'
            }
        );
        ctrl0.behaviours.push(FCUtil.makeGamepadTracker(scene, 0, buttonHandler));
        ctrl0.behaviours.push(FCUtil.makeControllerRayProjector(scene, 0, [floorCollider]));
        scene.addObject(ctrl0);
        
        var ctrl1 = new FCShapes.MeshShape(
            scene.meshes.controller,
            _hidden_beneath_floor, /* Hide it under the floor. This position will be overridden */
            ctrlInfo.size,
            null,
            {
                shaderLabel: 'diffuse',
                texture: ctrlInfo.blueColor,
                groupLabel: 'controllerTrackers'
            }
        );
        ctrl1.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, buttonHandler));
        scene.addObject(ctrl1);
        
        
        /* --- */
        
        // var stlSource = '../assets/controlleresque.stl';
        var stlSource = 'http://meshbase.io.codex.cx/mesher.pycg/The_Huntress.zip?mode=mesh'
        
        var HTTPLoader = function () {
            var loader = this;
            this.req = new XMLHttpRequest();
            this.getMesh = function (meshUrl, binary) {
                if (binary) this.req.responseType = 'arraybuffer';
                return new Promise(function (resolve, reject) {
                    loader.req.onreadystatechange = function () {
                        if (loader.req.readyState === 4) {
                            resolve({data:binary && loader.req.response || loader.req.responseText, 
                                    status:loader.req.status, 
                                    type:loader.req.getResponseHeader('Content-Type')
                            });
                        }
                    }
                    loader.req.open('GET', meshUrl, true);
                    loader.req.send();
                });
            }
        }
        
        var convertM4STLParse = function (parsed) {
            var vert = [], norm = [], tex = [];
            for (var i=0; i<parsed.vertices.length/8; i++) {
                var base = 8*i;
                vert.push(parsed.vertices[base]);
                vert.push(parsed.vertices[base+1]);
                vert.push(parsed.vertices[base+2]);
                tex.push(parsed.vertices[base+3]);
                tex.push(parsed.vertices[base+4]);
                norm.push(parsed.vertices[base+5]);
                norm.push(parsed.vertices[base+6]);
                norm.push(parsed.vertices[base+7]);
            }
        
            return {
                indices: parsed.indices,
                textures: tex,
                vertexNormals: norm,
                vertices: vert
            };
        }
        
        
        var httploader = new HTTPLoader();
        httploader.getMesh('../assets/controlleresque.stl')
        .then(function (dat) {
            // console.log(dat);
            // console.log(premesh);
            // var premesh = parseSTLSource(dat.data.split('\n'), 0.02);
            
            /* convert packed vertices/normal/tex to vert, normal, tex */
            
            
            // var mesh = convertM4STLParse(parseSTLSource(dat.data.split('\n'), 0.07));
            
            var parser = new STLLoader();
            var mesh = convertM4STLParse(parser.parseASCII(dat.data));
                        
            if (false) {
                var shape = new FCShapes.MeshShape(
                    mesh, {x:0, y:1, z:3}, {scale:0.11}, null, 
                    {shaderLabel:'diffuse', textureLabel:'green'}
                );
                scene.addObject(shape);
                console.log(mesh);
            }
            
            // {
            //     indices
            //     textures
            //     vertexNormals
            //     vertices
            // }
            
        });
        
        var httploader2 = new HTTPLoader();
        httploader2.getMesh('http://meshbase.io.codex.cx/mesher.pycg/fitgirl.zip?mode=mesh', true)
        .then(function (dat) {
            var parser = new STLLoader();
            var parsed = parser.parseBinary(dat.data);
            var mesh = convertM4STLParse(parsed);
            if (true) {
                var shape = new FCShapes.MeshShape(
                    mesh, {x:0, y:1, z:3}, {scale:0.01}, null, 
                    {shaderLabel:'diffuse', textureLabel:'orange'}
                );
                scene.addObject(shape);
                console.log(mesh);
            }
            
        })
        
    
    
    
    
    
    }

    return Scene;
})();
