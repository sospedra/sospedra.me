'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link, { LinkBack } from 'services/link'
import Shell from 'services/shell'
import { useTheme } from 'services/theme'
import { match, P } from 'ts-pattern'
import css from './camera.module.css'
import { developInstantFilmCanvas } from './instant-film'

const PHOTO_SIZE = 1200
const DEVELOP_DURATION = 1450

type CameraState = 'error' | 'ready' | 'requesting'
type PrintState = 'idle' | 'printing' | 'ready'

type CameraFault = {
  detail: string
  title: string
}

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: 'user',
    height: { ideal: PHOTO_SIZE },
    width: { ideal: PHOTO_SIZE },
  },
}

function stopStream(stream: MediaStream | null) {
  for (const track of stream?.getTracks() ?? []) {
    track.stop()
  }
}

function cameraFault(error: unknown): CameraFault {
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

function captureSquare(
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

function formatCaptureTime(date: Date) {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

function revealMobileActions(element: HTMLElement, motionAllowed: boolean) {
  if (!window.matchMedia('(max-width: 820px)').matches) return
  if (element.getBoundingClientRect().bottom <= window.innerHeight - 16) return

  element.scrollIntoView({
    behavior: motionAllowed ? 'smooth' : 'auto',
    block: 'end',
  })
}

export default function CameraView() {
  const { fxMode, osReducedMotion } = useTheme()
  const [cameraState, setCameraState] = useState<CameraState>('requesting')
  const [fault, setFault] = useState<CameraFault | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [capturedAt, setCapturedAt] = useState<Date | null>(null)
  const [printState, setPrintState] = useState<PrintState>('idle')
  const [captureId, setCaptureId] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const photoActionsRef = useRef<HTMLDivElement>(null)
  const shutterRef = useRef<HTMLButtonElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const photoUrlRef = useRef<string | null>(null)
  const requestIdRef = useRef(0)
  const captureIdRef = useRef(0)
  const developTimerRef = useRef<number | null>(null)
  const motionAllowed = fxMode === 'full' && !osReducedMotion

  const clearDevelopTimer = useCallback(() => {
    if (developTimerRef.current === null) return
    window.clearTimeout(developTimerRef.current)
    developTimerRef.current = null
  }, [])

  const replacePhoto = useCallback((nextUrl: string | null) => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    photoUrlRef.current = nextUrl
    setPhotoUrl(nextUrl)
  }, [])

  const requestCamera = useCallback(async () => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    stopStream(streamRef.current)
    streamRef.current = null
    setFault(null)
    setCameraState('requesting')

    if (!navigator.mediaDevices?.getUserMedia) {
      setFault({
        title: 'Camera unavailable',
        detail:
          'This browser does not expose camera access. Try a current browser over HTTPS.',
      })
      setCameraState('error')
      return
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)
      if (requestIdRef.current !== requestId) {
        stopStream(stream)
        return
      }

      const video = videoRef.current
      if (!video) {
        stopStream(stream)
        return
      }

      streamRef.current = stream
      video.srcObject = stream
      await video.play().catch(() => {
        // The loaded-data handler will mark the feed ready when playback starts.
      })
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        setCameraState('ready')
      }
    } catch (error) {
      if (requestIdRef.current !== requestId) return
      setFault(cameraFault(error))
      setCameraState('error')
    }
  }, [])

  useEffect(() => {
    // Cache revival restarts effects after cleanup; do not retain a revoked URL.
    setPhotoUrl(null)
    setCapturedAt(null)
    setPrintState('idle')
    // Defer acquisition so React's development effect replay cancels the
    // first scheduled request instead of opening the camera twice.
    const requestTimer = window.setTimeout(() => {
      void requestCamera()
    }, 0)

    return () => {
      window.clearTimeout(requestTimer)
      requestIdRef.current += 1
      captureIdRef.current += 1
      clearDevelopTimer()
      stopStream(streamRef.current)
      streamRef.current = null
      if (photoUrlRef.current) {
        URL.revokeObjectURL(photoUrlRef.current)
        photoUrlRef.current = null
      }
    }
  }, [clearDevelopTimer, requestCamera])

  useEffect(() => {
    const photoActions = photoActionsRef.current
    if (printState !== 'ready' || !photoActions) return

    const frame = window.requestAnimationFrame(() => {
      revealMobileActions(photoActions, motionAllowed)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [motionAllowed, printState])

  const finishDeveloping = useCallback(() => {
    clearDevelopTimer()
    setPrintState('ready')
  }, [clearDevelopTimer])

  const takePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const nextCaptureId = captureIdRef.current + 1
    if (
      cameraState !== 'ready' ||
      printState === 'printing' ||
      !video ||
      !canvas ||
      !captureSquare(video, canvas, nextCaptureId)
    ) {
      return
    }

    clearDevelopTimer()
    captureIdRef.current = nextCaptureId
    setCaptureId(nextCaptureId)
    setPrintState('printing')

    canvas.toBlob(
      (blob) => {
        if (captureIdRef.current !== nextCaptureId) return
        if (!blob) {
          setPrintState(photoUrlRef.current ? 'ready' : 'idle')
          return
        }
        const nextPhotoUrl = URL.createObjectURL(blob)
        replacePhoto(nextPhotoUrl)
        setCapturedAt(new Date())

        if (!motionAllowed) {
          finishDeveloping()
          return
        }

        developTimerRef.current = window.setTimeout(
          finishDeveloping,
          DEVELOP_DURATION,
        )
      },
      'image/jpeg',
      0.92,
    )
  }, [
    cameraState,
    clearDevelopTimer,
    finishDeveloping,
    motionAllowed,
    printState,
    replacePhoto,
  ])

  const resetPhoto = () => {
    clearDevelopTimer()
    captureIdRef.current += 1
    replacePhoto(null)
    setCapturedAt(null)
    setPrintState('idle')
    window.requestAnimationFrame(() => shutterRef.current?.focus())
  }

  const liveMessage =
    cameraState === 'requesting'
      ? 'Requesting camera access.'
      : cameraState === 'error'
        ? `${fault?.title ?? 'Camera unavailable'}.`
        : printState === 'printing'
          ? 'Photo captured. Developing your instant picture.'
          : printState === 'ready'
            ? 'Photo developed and ready to download.'
            : 'Camera ready. Press the red shutter to take a photo.'

  const telemetryStatus =
    cameraState === 'ready'
      ? printState === 'printing'
        ? 'DEVELOPING'
        : 'LIVE'
      : cameraState === 'requesting'
        ? 'TUNING'
        : 'OFFLINE'

  return (
    <Shell className={css.frame} shellClassName={css.shell}>
      <header className={css.rail}>
        <Link url='/' className={css.homeLink}>
          <LinkBack>Home</LinkBack>
        </Link>
        <p className={css.telemetry}>
          <span>CAM-01</span>
          <span aria-hidden='true'>/</span>
          <span data-active={cameraState === 'ready' ? 'true' : 'false'}>
            {telemetryStatus}
          </span>
        </p>
      </header>

      <section className={css.workspace} aria-labelledby='camera-title'>
        <div className={css.intro}>
          <p className={css.eyebrow}>Midnight I/O · instant relay</p>
          <h1 id='camera-title'>Camera</h1>
          <p className={css.lede}>
            A tiny photo booth inside the machine. Look into the top-right
            mirror, press the shutter, and wait for the chemistry.
          </p>

          <div className={css.privacy}>
            <span aria-hidden='true' className={css.privacyLed} />
            <p>
              <strong>Local signal only.</strong> Your stream is never uploaded
              or recorded. The captured frame lives in this tab unless you
              download it.
            </p>
          </div>

          <dl className={css.instructions}>
            <div>
              <dt>01</dt>
              <dd>Allow camera access</dd>
            </div>
            <div>
              <dt>02</dt>
              <dd>Frame yourself in the mirror</dd>
            </div>
            <div>
              <dt>03</dt>
              <dd>Press the red shutter</dd>
            </div>
          </dl>
        </div>

        <div
          className={css.booth}
          data-has-photo={photoUrl ? 'true' : 'false'}
          data-print-state={printState}
        >
          <div
            className={css.machine}
            data-camera-state={cameraState}
            data-print-state={printState}
          >
            <div className={css.cameraRig}>
              <div className={css.cameraShadow} aria-hidden='true' />

              <div className={css.camera}>
                <div className={css.cameraTop}>
                  <div className={css.flash} aria-hidden='true'>
                    <span className={css.shutterFlash} />
                  </div>
                  <div className={css.timer} aria-hidden='true' />
                  <div className={css.sensor} aria-hidden='true' />
                  <div className={css.opticsPlate} aria-hidden='true' />

                  <div className={css.lens} aria-hidden='true'>
                    <div className={css.lensGlass} />
                  </div>

                  {/* aria-disabled keeps focus while printing */}
                  <button
                    ref={shutterRef}
                    type='button'
                    className={css.shutter}
                    aria-disabled={
                      cameraState !== 'ready' || printState === 'printing'
                    }
                    aria-label='Take a photo'
                    onClick={takePhoto}
                  >
                    <span className={css.shutterWell} aria-hidden='true'>
                      <span className={css.shutterStem}>
                        <span className={css.shutterCap} />
                      </span>
                    </span>
                  </button>

                  <div className={css.viewfinder}>
                    <div className={css.viewfinderGlass}>
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        aria-label='Mirrored live camera preview'
                        onCanPlay={() => setCameraState('ready')}
                        onLoadedData={() => setCameraState('ready')}
                      />
                      <span
                        className={css.viewfinderReflection}
                        aria-hidden='true'
                      />

                      {cameraState !== 'ready' && (
                        <span className={css.viewfinderBack} aria-hidden='true'>
                          {cameraState === 'requesting' ? '···' : '!'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={css.filmRatchetHousing} aria-hidden='true'>
                    <div className={css.filmRatchet} />
                  </div>
                  <div className={css.power} aria-hidden='true' />
                  <div className={css.cameraTitle} aria-hidden='true'>
                    Midnight I/O
                  </div>
                </div>

                <div className={css.cameraBottom}>
                  <div className={css.feedRailHousing} aria-hidden='true'>
                    <div className={css.feedRail}>
                      <div className={css.feedCarriage} />
                    </div>
                  </div>
                  <div className={css.printer} aria-hidden='true' />
                  <div className={css.labels} aria-hidden='true'>
                    <div className={css.rainbow} />
                    <div className={css.logo}>Sospedroid</div>
                    <div className={css.cameraType}>CAM-01 · LOCAL</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={css.outputDock}>
            <div className={css.outputHeader} aria-hidden='true'>
              <span>Chemistry bay</span>
              <span>Output / 01</span>
            </div>

            <div className={css.printBay}>
              {photoUrl ? (
                <figure
                  key={captureId}
                  className={css.print}
                  aria-label='Your developed instant picture'
                >
                  <div className={css.photoSurface}>
                    <img
                      src={photoUrl}
                      alt='Your mirrored camera portrait'
                      draggable={false}
                    />
                    <span className={css.developWash} aria-hidden='true' />
                  </div>
                  <figcaption>
                    <span>midnight / {String(captureId).padStart(2, '0')}</span>
                    <time dateTime={capturedAt?.toISOString()}>
                      {capturedAt
                        ? formatCaptureTime(capturedAt)
                        : 'developing'}
                    </time>
                  </figcaption>
                </figure>
              ) : (
                <div className={css.paperGuide} aria-hidden='true'>
                  <span>Awaiting exposure</span>
                </div>
              )}
            </div>

            <div className={css.controlDeck}>
              <p
                className={css.liveStatus}
                aria-live='polite'
                aria-atomic='true'
              >
                {liveMessage}
              </p>

              {cameraState === 'error' && (
                <div className={css.errorPanel}>
                  <p>{fault?.detail}</p>
                  <button
                    type='button'
                    className={css.deckButton}
                    onClick={() => void requestCamera()}
                  >
                    <span>Retry camera</span>
                  </button>
                </div>
              )}

              {photoUrl && printState === 'ready' && (
                <div ref={photoActionsRef} className={css.photoActions}>
                  <button
                    type='button'
                    className={css.deckButton}
                    data-tone='neutral'
                    onClick={resetPhoto}
                  >
                    <span>Try again</span>
                  </button>
                  <a
                    className={css.deckButton}
                    data-tone='pink'
                    href={photoUrl}
                    download={`midnight-photo-${captureId}.jpg`}
                  >
                    <span>Download photo</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <canvas ref={canvasRef} className={css.captureCanvas} hidden />
    </Shell>
  )
}
