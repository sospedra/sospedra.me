import type { Bitmap } from './raster.ts'

// mspaint has no alpha channel: opened images composite onto white
export const openPng = async (file: File): Promise<Bitmap | null> => {
  try {
    const image = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, image.width, image.height)
    ctx.drawImage(image, 0, 0)
    const pixels = ctx.getImageData(0, 0, image.width, image.height)
    return { data: pixels.data, width: image.width, height: image.height }
  } catch {
    return null
  }
}

export const savePng = (canvas: HTMLCanvasElement): Promise<boolean> =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false)
        return
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'untitled.png'
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 0)
      resolve(true)
    }, 'image/png')
  })
