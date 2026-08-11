import { Color, Vector2, Vector3 } from 'three'
import { EDGE_GLOW } from './palette.ts'

export const terrainUniforms = (ex: number) => ({
  fogColor: { value: new Color() },
  fogNear: { value: 1 },
  fogFar: { value: 2 },
  uSweepH: { value: 0 },
  uEx: { value: ex },
  uSunDir: { value: new Vector3(0, 1, 0) },
  uSunI: { value: 0 },
  uSunCol: { value: new Color(1, 1, 1) },
  uPkStart: { value: 0 },
  uPkSpan: { value: 0 },
})

export const riverUniforms = () => ({
  uTime: { value: 0 },
  fogColor: { value: new Color() },
  fogNear: { value: 1 },
  fogFar: { value: 2 },
})

export const edgeUniforms = () => ({
  tDepth: { value: null },
  res: { value: new Vector2(1, 1) },
  near: { value: 2 },
  far: { value: 1500000 },
  fogNear: { value: 1 },
  fogFar: { value: 2 },
  edgeColor: { value: new Color(EDGE_GLOW) },
  strength: { value: 1.0 },
})
