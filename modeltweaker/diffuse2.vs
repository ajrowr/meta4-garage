attribute highp vec3 aVertexPosition;
attribute highp vec2 aTextureCoord;
attribute highp vec3 aVertexNormal;
// out vec3 lightIntensity;

// uniform vec4 lightPosition; // in eye coords
// uniform vec3 Kd;            // diffuse reflect
// uniform vec3 Ld;            // light source intensn


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

void main(void) {
    gl_Position = projectionMat * modelViewMat * vec4(aVertexPosition, 1.0);
    vTextureCoord = aTextureCoord;

    highp vec4 transformedNormal = normalMat * vec4(aVertexNormal, 1.0);
    
    highp vec3 ambientLight = vec3(0.2, 0.2, 0.2);
    highp vec4 pointLightPos = vec4(0.0, 3.0, 1.0, 1.0);
    highp vec3 pointLightColor = vec3(1.0, 1.0, 1.0);
    highp vec3 Kd = vec3(1.0, 1.0, 1.0);
    
    // vec3 tnorm = normalize(normalMat * aVertexNormal);
    /// vec4 eyeCoords = modelViewMat * vec4(aVertexPosition, 1.0);
    vec4 eyeCoords = modelMat * vec4(aVertexPosition, 1.0);
    vec3 s = normalize(vec3(pointLightPos - eyeCoords));
    vLighting = ambientLight + (pointLightColor * Kd * max(dot(s, transformedNormal.xyz), 0.0));
    
    
    // highp vec3 directionalLightColor = vec3(0.809, 0.809, 0.809);
    // highp vec3 directionalVector = vec3(0.85, 0.8, 0.75);
    // highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
    // vLighting = ambientLight + (directionalLightColor * directional);
    
    
    
    vColor = baseColor; /* Deprecated */
    
}



