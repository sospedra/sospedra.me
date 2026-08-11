attribute float aDist;
varying float vDist; varying float vFogZ;
void main(){
  vDist = aDist;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFogZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}
