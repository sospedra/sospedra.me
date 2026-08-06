'use client'

import cn from 'clsx'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import Link, { LinkBack } from 'services/link'
import Shell from 'services/shell'
import { useTheme } from 'services/theme'
import css from './camera.module.css'
import {
  CAMERA_CONSTRAINTS,
  type CameraFault,
  type CameraState,
  cameraFault,
  captureSquare,
  type PrintState,
  stopStream,
} from './camera-capture'
import { CameraChassis } from './camera-chassis'
import lead from './camera-intro.module.css'
import { OutputDock } from './camera-output-dock'
import bay from './camera-output-dock.module.css'

const DEVELOP_DURATION = 1450

function aimPrintAtSlot(figure: HTMLElement, mouth: DOMRect) {
  figure.style.animation = 'none'
  figure.style.transform = 'none'
  const card = figure.getBoundingClientRect()
  figure.style.animation = ''
  figure.style.transform = ''
  const centeredLeft = mouth.left + (mouth.width - card.width) / 2
  figure.style.setProperty('--print-source-x', `${centeredLeft - card.left}px`)
  figure.style.setProperty('--print-source-y', `${mouth.top - 8 - card.top}px`)
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
  const mouthRectRef = useRef<DOMRect | null>(null)
  const photoActionsRef = useRef<HTMLDivElement>(null)
  const printRef = useRef<HTMLElement>(null)
  const printerRef = useRef<HTMLDivElement>(null)
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

  useLayoutEffect(() => {
    if (printState !== 'printing') return
    mouthRectRef.current = printerRef.current?.getBoundingClientRect() ?? null
  }, [printState])

  useLayoutEffect(() => {
    if (printState !== 'printing' || !photoUrl) return
    const figure = printRef.current
    const mouth = mouthRectRef.current
    if (!figure || !mouth) return
    aimPrintAtSlot(figure, mouth)
  }, [printState, photoUrl])

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
        <div className={lead.intro}>
          <p className={lead.eyebrow}>Midnight I/O · instant relay</p>
          <h1 id='camera-title'>Camera</h1>
          <p className={lead.lede}>
            A tiny photo booth inside the machine. Look into the top-right
            mirror, press the shutter, and wait for the chemistry.
          </p>

          <div className={lead.privacy}>
            <span aria-hidden='true' className={lead.privacyLed} />
            <p>
              <strong>Local signal only.</strong> Your stream is never uploaded
              or recorded. The captured frame lives in this tab unless you
              download it.
            </p>
          </div>

          <dl className={lead.instructions}>
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
          className={cn(css.booth, bay.booth)}
          data-has-photo={photoUrl ? 'true' : 'false'}
          data-print-state={printState}
        >
          <CameraChassis
            cameraState={cameraState}
            printState={printState}
            printerRef={printerRef}
            setCameraState={setCameraState}
            shutterRef={shutterRef}
            videoRef={videoRef}
            takePhoto={takePhoto}
          />

          <OutputDock
            cameraState={cameraState}
            captureId={captureId}
            capturedAt={capturedAt}
            fault={fault}
            liveMessage={liveMessage}
            photoActionsRef={photoActionsRef}
            photoUrl={photoUrl}
            printRef={printRef}
            printState={printState}
            requestCamera={requestCamera}
            resetPhoto={resetPhoto}
          />
        </div>
      </section>

      <canvas ref={canvasRef} className={css.captureCanvas} hidden />
    </Shell>
  )
}
