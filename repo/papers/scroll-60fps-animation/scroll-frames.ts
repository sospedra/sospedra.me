import { clamp } from 'es-toolkit'
import { VBODY_ID } from 'services/shell'

const size = { width: 2560, height: 1440 }
export const frameMax = 174

const LANDSCAPE_WIDTH_SCALE = 1
const PORTRAIT_WIDTH_SCALE = 2

export const createFrameRoute = (frame: number) => {
  return `/papers/fireworks/${frame.toString().padStart(3, '0')}.jpg`
}

export const createVirtualImage = () => {
  const image = new Image()

  image.src = createFrameRoute(1)
  image.width = size.width
  image.height = size.height

  return image
}

export const prepareCanvas = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d')
  canvas.width = size.width
  canvas.height = size.height

  if (context) context.imageSmoothingQuality = 'high'

  return context
}

export const createAspectRatio = () => {
  const width = document.documentElement.clientWidth
  const height = document.documentElement.clientHeight
  return width > height ? LANDSCAPE_WIDTH_SCALE : PORTRAIT_WIDTH_SCALE
}

export const createDraw = (
  context: CanvasRenderingContext2D | null,
  image: HTMLImageElement,
  aspect: number,
) => {
  return () => {
    context?.drawImage(image, 0, 0, size.width * aspect, size.height)
  }
}

export const createScrollListener = (
  onFrame: (frame: number) => void,
): (() => void) => {
  const vbody = document.getElementById(VBODY_ID)
  if (!vbody) return () => {}

  const onScroll = () => {
    const maxScrollTop = vbody.scrollHeight - window.innerHeight
    if (maxScrollTop <= 0) return
    const scrollFraction = vbody.scrollTop / maxScrollTop
    onFrame(clamp(Math.floor(scrollFraction * frameMax), 0, frameMax))
  }

  vbody.addEventListener('scroll', onScroll)
  return () => vbody.removeEventListener('scroll', onScroll)
}
