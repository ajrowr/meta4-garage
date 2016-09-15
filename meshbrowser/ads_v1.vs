
#define LIGHT_COUNT 8

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

uniform bool useExperimentalLightingModel; /* Experimental */

uniform highp mat4 modelViewMat;
uniform highp mat4 modelMat;
uniform highp mat4 projectionMat;
uniform highp mat4 normalMat;
uniform LightInfo lights[LIGHT_COUNT];
uniform MaterialInfo material;
uniform int lightCount;

varying highp vec2 vTextureCoord;
varying highp vec3 vLighting;

vec3 ads(LightInfo light, MaterialInfo mat, vec4 pos, vec3 norm) {
    vec3 s = normalize(vec3(light.Position - pos));
    vec3 v = normalize(vec3(-pos));
    vec3 r = reflect(-s, norm);
    return light.Ambient * mat.Ambient +
            light.Diffuse * (mat.Diffuse * max(dot(s, norm), 0.0)) +
            light.Specular * (mat.Specular * pow(max(dot(r, v), 0.0), max(0.00001, mat.Shininess)));
}

void main(void) {
    gl_Position = projectionMat * modelViewMat * vec4(aVertexPosition, 1.0);
    vTextureCoord = aTextureCoord;
    
    // mat4 viewingMat = modelMat;
    mat4 viewingMat;
    
    /* Normally the modelViewMatrix would be used in lighting calculations. However that turns out not to be */
    /* quite so great for VR where the user's window on the world is much more dynamic - using the MVM, things */
    /* just look wrong. So we use the modelMatrix instead for calculating lighting - however this */
    /* ends up being pretty useless when it comes to doing anything specular :-| */
    /* Using the MVM, on the other hand, specular looks pretty fantastic for individual models - as long as you */
    /* don't move your head too much! And it seems to position the lights wrong and generally just messes things /*
    /* up for the overall scene. */
    /* So we probably want to use a custom matrix that incorporates certain aspects of the user's viewpoint */
    /* but not all of them. Maybe a "flattened" MVM that disregards certain rotation axes? Research is ongoing. */
    /* Meanwhile if you want to use specular on something try activating the useExperimentalLightingModel uniform. */
    /* But be prepared for weirdness. */
    bool forceExperimentalLightingModel = false;
    if (useExperimentalLightingModel || forceExperimentalLightingModel) {
        viewingMat = modelViewMat;
    } 
    else {
        viewingMat = modelMat;
    }
    
    highp vec4 transformedNormal = normalMat * vec4(aVertexNormal, 1.0);
    vec4 eyeCoords = viewingMat * vec4(aVertexPosition, 1.0);
    
    vec3 L = vec3(0.0);
    for (int i=0; i<LIGHT_COUNT; i++) {
        L += ads(lights[i], material, eyeCoords, transformedNormal.xyz);
    }
    
    vLighting = L;
    
    
}



