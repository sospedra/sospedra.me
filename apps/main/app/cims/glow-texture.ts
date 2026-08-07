import { CanvasTexture } from 'three'
import { type GlowStops, MARKER_GLOW } from './palette.ts'

export const radialGlowTexture = (stops: GlowStops): CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const g = canvas.getContext('2d')
  if (g) {
    const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    for (const [offset, color] of stops) gradient.addColorStop(offset, color)
    g.fillStyle = gradient
    g.fillRect(0, 0, 64, 64)
  }
  return new CanvasTexture(canvas)
}

export const markerGlowTexture = (): CanvasTexture =>
  radialGlowTexture(MARKER_GLOW)
