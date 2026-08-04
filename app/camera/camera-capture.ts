import { match, P } from 'ts-pattern'
import { developInstantFilmCanvas } from './instant-film'

const PHOTO_SIZE = 1200

export type CameraState = 'error' | 'ready' | 'requesting'
export type PrintState = 'idle' | 'printing' | 'ready'

export type CameraFault = {
  detail: string
  title: string
}

export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: 'user',
    height: { ideal: PHOTO_SIZE },
    width: { ideal: PHOTO_SIZE },
  },
}

export function stopStream(stream: MediaStream | null) {
  for (const track of stream?.getTracks() ?? []) {
    track.stop()
  }
}

export function cameraFault(error: unknown): CameraFault {
  if (!window.isSecureContext) {
    return {
      title: 'Secure connection required',
      detail:
        'Camera access only works over HTTPS or on localhost. Open the secure version of this page and try again.',
    }
  }

  const name = error instanceof DOMException ? error.name : null
  return match(name)
    .with(P.union('NotAllowedError', 'SecurityError'), () => ({
      title: 'Camera access blocked',
      detail:
        'Allow camera access in your browser settings, then retry. Nothing is uploaded.',
    }))
    .with(P.union('NotFoundError', 'OverconstrainedError'), () => ({
      title: 'No camera found',
      detail:
        'Connect a camera or enable one in your device settings, then try again.',
    }))
    .with(P.union('NotReadableError', 'AbortError'), () => ({
      title: 'Camera is busy',
      detail:
        'Another app may be using the camera. Close it, wait a moment, and retry.',
    }))
    .otherwise(() => ({
      title: 'Camera signal lost',
      detail:
        'The browser could not start the camera. Check its permissions and try again.',
    }))
}

export function captureSquare(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  seed: number,
): boolean {
  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  if (!sourceWidth || !sourceHeight) return false

  const cropSize = Math.min(sourceWidth, sourceHeight)
  const sourceX = (sourceWidth - cropSize) / 2
  const sourceY = (sourceHeight - cropSize) / 2
  const context = canvas.getContext('2d')
  if (!context) return false

  canvas.width = PHOTO_SIZE
  canvas.height = PHOTO_SIZE
  context.save()
  context.translate(PHOTO_SIZE, 0)
  context.scale(-1, 1)
  context.drawImage(
    video,
    sourceX,
    sourceY,
    cropSize,
    cropSize,
    0,
    0,
    PHOTO_SIZE,
    PHOTO_SIZE,
  )
  context.restore()
  developInstantFilmCanvas(context, PHOTO_SIZE, PHOTO_SIZE, seed)
  return true
}
