varying vec3 vColor; varying vec3 vNormal;
varying vec3 vWorldPos; varying float vFogZ;
void main(){
  vColor = color;
  vNormal = normalize(normalMatrix * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFogZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}
