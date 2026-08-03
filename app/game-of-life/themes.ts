import type { CanvasPalette } from './canvas'

export const LIFE_CANVAS_PALETTE = {
  background: ['#3c5732', '#273d29', '#101812'],
  gridMinor: 'rgb(181 239 121 / 10%)',
  gridMajor: 'rgb(181 239 121 / 24%)',
  origin: 'rgb(228 73 47 / 38%)',
  survivor: '#b5ef79',
  newborn: '#f05b3d',
  survivorGlow: 'rgb(181 239 121 / 58%)',
  newbornGlow: 'rgb(240 91 61 / 72%)',
  survivorHighlight: 'rgb(240 255 208 / 52%)',
  newbornHighlight: 'rgb(255 215 125 / 64%)',
  hoverAlive: 'rgb(228 73 47 / 94%)',
  hoverDead: 'rgb(181 239 121 / 82%)',
  cursor: '#ffbd4a',
  running: '#e4492f',
} satisfies CanvasPalette
