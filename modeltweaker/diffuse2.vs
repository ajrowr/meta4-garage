
struct LightInfo {
    vec4 Position;
    vec3 Ambient;
    vec3 Diffuse;
    vec3 Specular;
};

struct MaterialInfo {
    vec3 Ambient;
    vec3 Diffuse;
    vec3 Specular;
    float Shininess;
};


attribute highp vec3 aVertexPosition;
attribute highp vec2 aTextureCoord;
attribute highp vec3 aVertexNormal;
// out vec3 lightIntensity;

// uniform vec4 lightPosition; // in eye coords
// uniform vec3 Diffuse;            // diffuse reflect
// uniform vec3 Diffuse;            // light source intensn

uniform bool useExperimentalLightingModel; /* Experimental */

uniform highp mat4 modelViewMat;
uniform highp mat4 modelMat;
uniform highp mat4 projectionMat;
uniform highp mat4 normalMat;
uniform highp vec3 baseColor; /* Deprecated */
// uniform highp vec3 directionalLightVector;
// uniform highp vec3 directionalLight

// uniform highp vec3 pointLightPos;
// uniform highp vec3 pointLightColor;

varying highp vec2 vTextureCoord;
varying highp vec3 vLighting;

varying highp vec3 vColor; /* Deprecated */


vec3 ads(LightInfo light, MaterialInfo mat, vec4 pos, vec3 norm) {
    vec3 s = normalize(vec3(light.Position - pos));
    vec3 v = normalize(vec3(-pos));
    vec3 r = reflect(-s, norm);
    // vec3 Ambient = light.Ambient;
    // vec3 Diffuse = light.Diffuse;
    // vec3 Specular = light.Specular;
    return light.Ambient * mat.Ambient +
            light.Diffuse * (mat.Diffuse * max(dot(s, norm), 0.0)) +
            light.Specular * (mat.Specular * pow(max(dot(r, v), 0.0), mat.Shininess));
}

void main(void) {
    gl_Position = projectionMat * modelViewMat * vec4(aVertexPosition, 1.0);
    vTextureCoord = aTextureCoord;
    
    // mat4 viewingMat = modelMat;
    mat4 viewingMat;
    
    /* Normally the modelViewMatrix would be used in lighting calculations. However that turns out not to */
    /* quite so great for VR where the user's window on the world is much more dynamic - using the MVM, things */
    /* just look wrong. So we normally use the modelMatrix instead for calculating lighting - however this */
    /* ends up being pretty useless when it comes to doing anything specular :-| */
    /* Using the MVM, on the other hand, specular looks pretty fantastic for individual models - as long as you */
    /* don't move your head too much! And it seems to position the lights wrong and generally just messes things /*
    /* up for the overall scene. */
    /* So we probably want to use a custom matrix that incorporates certain aspects of the user's viewpoint */
    /* but not all of them. Like a "flattened" MVM. Research is ongoing. */
    bool forceExperimentalLightingModel = false;
    if (useExperimentalLightingModel || forceExperimentalLightingModel) {
        viewingMat = modelViewMat;
    } 
    else {
        viewingMat = modelMat;
    }
    
    // LightInfo light1;
    // light1.Position = vec4(0.0, 3.0, 1.0, 1.0);
    // light1.Ambient = vec3(0.2, 0.2, 0.2);
    // light1.Diffuse = vec3(0.8, 0.8, 0.8);
    // light1.Specular = vec3(0.0, 0.0, 0.0);
    LightInfo light1 = LightInfo(
        vec4(0.0, 3.0, 1.0, 1.0), 
        vec3(0.2, 0.2, 0.2), 
        vec3(0.8, 0.8, 0.8), 
        vec3(0.0, 0.0, 0.0)
    );
    
    LightInfo lights[3];
    lights[0] = LightInfo(
        vec4(0.0, 3.0, 1.0, 1.0), 
        vec3(0.1, 0.1, 0.1), 
        vec3(0.8, 0.8, 0.8), 
        vec3(0.0, 0.0, 0.0)
    );
    lights[1] = LightInfo(
        vec4(0.0, 3.0, 5.0, 1.0), 
        vec3(0.0, 0.0, 0.0), 
        vec3(0.2, 0.2, 0.8), 
        vec3(0.0, 0.0, 0.0)
    );
    lights[2] = LightInfo(
        vec4(0.0, 3.0, -5.0, 1.0), 
        vec3(0.0, 0.0, 0.0), 
        vec3(0.2, 0.2, 0.2), 
        vec3(0.0, 0.0, 0.0)
    );
    
    const int lightCount = 3;
    
    MaterialInfo material1;
    material1.Ambient = vec3(1.0, 1.0, 1.0);
    material1.Diffuse = vec3(0.8, 0.8, 0.8);
    material1.Specular = vec3(1.0, 1.0, 1.0);
    material1.Shininess = 0.8;
    
    // highp vec3 ambientLight = vec3(0.2, 0.2, 0.2);
    // highp vec4 pointLightPos = vec4(0.0, 3.0, 1.0, 1.0);
    // highp vec3 pointLightColor = vec3(1.0, 1.0, 1.0);
    // highp vec3 Diffuse = vec3(1.0, 1.0, 1.0); // surface reflectivity
    
    // vec3 tnorm = normalize(normalMat * aVertexNormal);
    /// vec4 eyeCoords = modelViewMat * vec4(aVertexPosition, 1.0);
    
    highp vec4 transformedNormal = normalMat * vec4(aVertexNormal, 1.0);
    vec4 eyeCoords = viewingMat * vec4(aVertexPosition, 1.0);
    // vec3 s = normalize(vec3(light1.Position - eyeCoords));
    //
    // vec3 v = normalize(-eyeCoords.xyz);
    // vec3 r = reflect(-s, transformedNormal.xyz);
    // vec3 ambient = light1.Ambient * material1.Ambient;
    // float sDotN = max(dot(s, transformedNormal.xyz), 0.0);
    // vec3 diffuse = light1.Diffuse * material1.Diffuse * sDotN;
    // vec3 spec = vec3(0.0);
    // if (sDotN > 0.0) {
    //     spec = light1.Specular * material1.Specular * pow(max(dot(r,v), 0.0), material1.Shininess);
    // }

    // vLighting = ambient + diffuse + spec;
    //
    // vLighting = ads(lights[0], material1, eyeCoords, transformedNormal.xyz)
    //             + ads(lights[1], material1, eyeCoords, transformedNormal.xyz);
    
    vec3 L = vec3(0.0);
    for (int i=0; i<lightCount; i++) {
        L += ads(lights[i], material1, eyeCoords, transformedNormal.xyz);
    }
    
    vLighting = L;
    //// vLighting = light1.Ambient + (light1.Diffuse * material1.Diffuse * max(dot(s, transformedNormal.xyz), 0.0));
    
    
    
    // highp vec3 directionalLightColor = vec3(0.809, 0.809, 0.809);
    // highp vec3 directionalVector = vec3(0.85, 0.8, 0.75);
    // highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
    // vLighting = ambientLight + (directionalLightColor * directional);
    
    
    
    vColor = baseColor; /* Deprecated */
    
}



