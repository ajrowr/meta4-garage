
var parseMesh = function (objectData) {
    
    /*
     The OBJ file format does a sort of compression when saving a model in a
     program like Blender. There are at least 3 sections (4 including textures)
     within the file. Each line in a section begins with the same string:
       * 'v': indicates vertex section
       * 'vn': indicates vertex normal section
       * 'f': indicates the faces section
       * 'vt': indicates vertex texture section (if textures were used on the model)
     Each of the above sections (except for the faces section) is a list/set of
     unique vertices.

     Each line of the faces section contains a list of
     (vertex, [texture], normal) groups
     Some examples:
         // the texture index is optional, both formats are possible for models
         // without a texture applied
         f 1/25 18/46 12/31
         f 1//25 18//46 12//31

         // A 3 vertex face with texture indices
         f 16/92/11 14/101/22 1/69/1

         // A 4 vertex face
         f 16/92/11 40/109/40 38/114/38 14/101/22

     The first two lines are examples of a 3 vertex face without a texture applied.
     The second is an example of a 3 vertex face with a texture applied.
     The third is an example of a 4 vertex face. Note: a face can contain N
     number of vertices.

     Each number that appears in one of the groups is a 1-based index
     corresponding to an item from the other sections (meaning that indexing
     starts at one and *not* zero).

     For example:
         `f 16/92/11` is saying to
           - take the 16th element from the [v] vertex array
           - take the 92nd element from the [vt] texture array
           - take the 11th element from the [vn] normal array
         and together they make a unique vertex.
     Using all 3+ unique Vertices from the face line will produce a polygon.

     Now, you could just go through the OBJ file and create a new vertex for
     each face line and WebGL will draw what appears to be the same model.
     However, vertices will be overlapped and duplicated all over the place.

     Consider a cube in 3D space centered about the origin and each side is
     2 units long. The front face (with the positive Z-axis pointing towards
     you) would have a Top Right vertex (looking orthogonal to its normal)
     mapped at (1,1,1) The right face would have a Top Left vertex (looking
     orthogonal to its normal) at (1,1,1) and the top face would have a Bottom
     Right vertex (looking orthogonal to its normal) at (1,1,1). Each face
     has a vertex at the same coordinates, however, three distinct vertices
     will be drawn at the same spot.

     To solve the issue of duplicate Vertices (the `(vertex, [texture], normal)`
     groups), while iterating through the face lines, when a group is encountered
     the whole group string ('16/92/11') is checked to see if it exists in the
     packed.hashindices object, and if it doesn't, the indices it specifies
     are used to look up each attribute in the corresponding attribute arrays
     already created. The values are then copied to the corresponding unpacked
     array (flattened to play nice with WebGL's ELEMENT_ARRAY_BUFFER indexing),
     the group string is added to the hashindices set and the current unpacked
     index is used as this hashindices value so that the group of elements can
     be reused. The unpacked index is incremented. If the group string already
     exists in the hashindices object, its corresponding value is the index of
     that group and is appended to the unpacked indices array.
     */
    var verts = [], vertNormals = [], textures = [], unpacked = {};
    // unpacking stuff
    unpacked.verts = [];
    unpacked.norms = [];
    unpacked.textures = [];
    unpacked.hashindices = {};
    unpacked.indices = [];
    unpacked.index = 0;
    // array of lines separated by the newline
    var lines = objectData.split('\n');

    var VERTEX_RE = /^v\s/;
    var NORMAL_RE = /^vn\s/;
    var TEXTURE_RE = /^vt\s/;
    var FACE_RE = /^f\s/;
    var WHITESPACE_RE = /\s+/;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var elements = line.split(WHITESPACE_RE);
      elements.shift();

      if (VERTEX_RE.test(line)) {
        // if this is a vertex
        verts.push.apply(verts, elements);
      } else if (NORMAL_RE.test(line)) {
        // if this is a vertex normal
        vertNormals.push.apply(vertNormals, elements);
      } else if (TEXTURE_RE.test(line)) {
        // if this is a texture
        textures.push.apply(textures, elements);
      } else if (FACE_RE.test(line)) {
        // if this is a face
        /*
        split this face into an array of vertex groups
        for example:
           f 16/92/11 14/101/22 1/69/1
        becomes:
          ['16/92/11', '14/101/22', '1/69/1'];
        */
        var quad = false;
        for (var j = 0, eleLen = elements.length; j < eleLen; j++){
            // Triangulating quads
            // quad: 'f v0/t0/vn0 v1/t1/vn1 v2/t2/vn2 v3/t3/vn3/'
            // corresponding triangles:
            //      'f v0/t0/vn0 v1/t1/vn1 v2/t2/vn2'
            //      'f v2/t2/vn2 v3/t3/vn3 v0/t0/vn0'
            if(j === 3 && !quad) {
                // add v2/t2/vn2 in again before continuing to 3
                j = 2;
                quad = true;
            }
            if(elements[j] in unpacked.hashindices){
                unpacked.indices.push(unpacked.hashindices[elements[j]]);
            }
            else{
                /*
                Each element of the face line array is a vertex which has its
                attributes delimited by a forward slash. This will separate
                each attribute into another array:
                    '19/92/11'
                becomes:
                    vertex = ['19', '92', '11'];
                where
                    vertex[0] is the vertex index
                    vertex[1] is the texture index
                    vertex[2] is the normal index
                 Think of faces having Vertices which are comprised of the
                 attributes location (v), texture (vt), and normal (vn).
                 */
                var vertex = elements[ j ].split( '/' );
                /*
                 The verts, textures, and vertNormals arrays each contain a
                 flattend array of coordinates.

                 Because it gets confusing by referring to vertex and then
                 vertex (both are different in my descriptions) I will explain
                 what's going on using the vertexNormals array:

                 vertex[2] will contain the one-based index of the vertexNormals
                 section (vn). One is subtracted from this index number to play
                 nice with javascript's zero-based array indexing.

                 Because vertexNormal is a flattened array of x, y, z values,
                 simple pointer arithmetic is used to skip to the start of the
                 vertexNormal, then the offset is added to get the correct
                 component: +0 is x, +1 is y, +2 is z.

                 This same process is repeated for verts and textures.
                 */
                // vertex position
                unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 0]);
                unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 1]);
                unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 2]);
                // vertex textures
                if (textures.length) {
                  unpacked.textures.push(+textures[(vertex[1] - 1) * 2 + 0]);
                  unpacked.textures.push(+textures[(vertex[1] - 1) * 2 + 1]);
                }
                // vertex normals
                unpacked.norms.push(+vertNormals[(vertex[2] - 1) * 3 + 0]);
                unpacked.norms.push(+vertNormals[(vertex[2] - 1) * 3 + 1]);
                unpacked.norms.push(+vertNormals[(vertex[2] - 1) * 3 + 2]);
                // add the newly created vertex to the list of indices
                unpacked.hashindices[elements[j]] = unpacked.index;
                unpacked.indices.push(unpacked.index);
                // increment the counter
                unpacked.index += 1;
            }
            if(j === 3 && quad) {
                // add v0/t0/vn0 onto the second triangle
                unpacked.indices.push( unpacked.hashindices[elements[0]]);
            }
        }
      }
    }
    
    meshData = {
        vertices: unpacked.verts,
        vertexNormals: unpacked.norms,
        textures: unpacked.textures,
        indices: unpacked.indices
    };
    // this.vertices = unpacked.verts;
    // this.vertexNormals = unpacked.norms;
    // this.textures = unpacked.textures;
    // this.indices = unpacked.indices;
    // return out;
    
  }


  var LoaderThing = function () {
      var loader = this;
      this.req = new XMLHttpRequest();
      this.getMesh = function (meshUrl) {
          return new Promise(function (resolve, reject) {
              loader.req.onreadystatechange = function () {
                  if (loader.req.readyState === 4) {
                      resolve({data:loader.req.responseText, status:loader.req.status});
                  }
              }
              loader.req.open('GET', meshUrl, true);
              loader.req.send();
              
          })
      }
      this.getMesh2 = function (meshUrl, callback) {
          loader.req.onreadystatechange = function () {
              if (loader.req.readyState === 4) {
                  callback(loader.req.responseText, loader.req.status);
              }
          }
          loader.req.open('GET', meshUrl, true);
          loader.req.send();
          
      }
  }

var x = 0;
var meshData = null;

onmessage = function (message) {
    console.log('Worker got message', message);
    // postMessage('hello');
    
    var loader = new LoaderThing();
    var meshSrc = '//assets.meta4vr.net/mesh/obj/content/buddha_10k.obj';
    // var meshSrc = '//assets.meta4vr.net/mesh/obj/content/bacchante.obj';
    // loader.getMesh(meshSrc)
    // .then(function (obj) {
    //     if (obj.status == 200) {
    //         var meshdata = parseMesh(obj.data);
    //         console.log(meshdata.indices.length);
    //     }
    // });
    
    console.log(x);
    // console.log(msgDat);
    // self.x = 1;
    
    if (message.data.op == 'load_mesh') {
        // loader.getMesh2(meshSrc, function (dat, status) {
        //     if (status == 200) {
        //         meshData = parseMesh(dat);
        //         console.log(meshData.indices.length);
        //     }
        // });
        
        loader.getMesh(message.data.src)
        .then(function (obj) {
            if (obj.status == 200) {
                parseMesh(obj.data);
                console.log(meshData.indices.length);
                postMessage({status:'mesh_loaded'});
            }
            else {
                console.log('Problem loading mesh, status:', obj.status);
            }
        });

        
    }
    else if (message.data.op == 'get') {
        var stash = {status: 'here_you_go'};
        var xfer = function (dat, key, typ) {
            var buf = new ArrayBuffer(dat.length*4);
            var tmp = new typ(dat);
            var viu = new typ(buf);
            viu.set(tmp);
            // console.log(dat);
            // console.log(tmp);
            // console.log(viu);
            console.log(key);
            stash[key] = buf;
        }
        
        // var vertsBuf = new ArrayBuffer(meshData.vertices.length*4);
        // var vertsView = new Uint32Array(vertsBuf).set(new Uint32Array(meshData.vertices));
        // console.log(target);
        xfer(meshData.vertices, 'vertices', Float32Array);
        xfer(meshData.vertexNormals, 'normals', Float32Array);
        xfer(meshData.textures, 'texCoords', Float32Array);
        xfer(meshData.indices, 'indices', Uint32Array);
        console.log(stash);
        // var a = new ArrayBuffer(1);
        // var b = new ArrayBuffer(2);
        // var c = new ArrayBuffer(3);
        // postMessage({vertices: vertsBuf, a:a, b:b, c:c}, [a,b,c, vertsBuf]);
        postMessage(stash, [stash.vertices, stash.normals, stash.texCoords, stash.indices]);
    }
    
}
