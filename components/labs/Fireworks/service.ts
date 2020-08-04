const size = { width: 2560, height: 1440 }
export const frameMax = 174

export const createFrameRoute = (frame: number) => {
  return `/papers/fireworks/${frame.toString().padStart(3, '0')}.webp`
}

export const createVirtualImage = () => {
  const image = new Image()

  image.src = createFrameRoute(1)
  image.width = size.width
  image.height = size.height

  return image
}

export const createCanvasContext = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d')
  canvas.width = size.width
  canvas.height = size.height

  if (context) context.imageSmoothingQuality = 'high'

  return context
}

export const createAspectRatio = () => {
  const width = document.documentElement.clientWidth
  const height = document.documentElement.clientHeight
  return width > height ? 1 : 2
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

export const createScrollListener = (clbk: (frame: number) => void) => {
  const $vbody = document.querySelector('#vbody')

  $vbody?.addEventListener('scroll', () => {
    const scrollTop = $vbody.scrollTop
    const maxScrollTop = $vbody.scrollHeight - window.innerHeight
    const scrollFraction = scrollTop / maxScrollTop
    const frame = Math.min(frameMax, Math.floor(scrollFraction * frameMax))

    clbk(frame)
  })
}
