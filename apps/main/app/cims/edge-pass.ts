import {
  AdditiveBlending,
  DepthTexture,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  type PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  UnsignedIntType,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import EDGE_FRAGMENT from './edge.frag'
import EDGE_VERTEX from './edge.vert'
import { edgeUniforms } from './shaders.ts'

export type EdgePass = {
  resize: () => void
  renderDepth: (scene: Scene, camera: PerspectiveCamera) => void
  composite: (
    camera: PerspectiveCamera,
    fogNear: number,
    fogFar: number,
  ) => void
  dispose: () => void
}

export const createEdgePass = (renderer: WebGLRenderer): EdgePass => {
  const fsScene = new Scene()
  const fsCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const material = new ShaderMaterial({
    uniforms: edgeUniforms(),
    vertexShader: EDGE_VERTEX,
    fragmentShader: EDGE_FRAGMENT,
    transparent: true,
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  })
  const quad = new PlaneGeometry(2, 2)
  fsScene.add(new Mesh(quad, material))
  const depthOverride = new MeshBasicMaterial()

  let target: WebGLRenderTarget | null = null

  const disposeTarget = () => {
    if (!target) return
    target.depthTexture?.dispose()
    target.dispose()
    target = null
  }

  const resize = () => {
    disposeTarget()
    const dp = renderer.getPixelRatio()
    const w = Math.floor(window.innerWidth * dp)
    const h = Math.floor(window.innerHeight * dp)
    target = new WebGLRenderTarget(w, h)
    target.depthTexture = new DepthTexture(w, h)
    target.depthTexture.type = UnsignedIntType
    material.uniforms.tDepth.value = target.depthTexture
    material.uniforms.res.value.set(w, h)
  }
  resize()

  const renderDepth = (scene: Scene, camera: PerspectiveCamera) => {
    if (!target) return
    camera.layers.set(1)
    scene.overrideMaterial = depthOverride
    renderer.setRenderTarget(target)
    renderer.render(scene, camera)
    scene.overrideMaterial = null
    camera.layers.enableAll()
    renderer.setRenderTarget(null)
  }

  const composite = (
    camera: PerspectiveCamera,
    fogNear: number,
    fogFar: number,
  ) => {
    material.uniforms.near.value = camera.near
    material.uniforms.far.value = camera.far
    material.uniforms.fogNear.value = fogNear
    material.uniforms.fogFar.value = fogFar
    renderer.autoClear = false
    renderer.render(fsScene, fsCamera)
    renderer.autoClear = true
  }

  const dispose = () => {
    disposeTarget()
    quad.dispose()
    material.dispose()
    depthOverride.dispose()
  }

  return { resize, renderDepth, composite, dispose }
}
