import cn from 'clsx'
import root from './camera.module.css'
import type { CameraFault, CameraState, PrintState } from './camera-capture'
import controls from './camera-control-deck.module.css'
import css from './camera-output-dock.module.css'

function formatCaptureTime(date: Date) {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

type OutputDockProps = {
  cameraState: CameraState
  captureId: number
  capturedAt: Date | null
  fault: CameraFault | null
  liveMessage: string
  photoActionsRef: React.RefObject<HTMLDivElement | null>
  photoUrl: string | null
  printState: PrintState
  requestCamera: () => Promise<void>
  resetPhoto: () => void
}

export function OutputDock({
  cameraState,
  captureId,
  capturedAt,
  fault,
  liveMessage,
  photoActionsRef,
  photoUrl,
  printState,
  requestCamera,
  resetPhoto,
}: OutputDockProps) {
  return (
    <div className={css.outputDock}>
      <div className={css.outputHeader} aria-hidden='true'>
        <span>Chemistry bay</span>
        <span>Output / 01</span>
      </div>

      <div className={css.printBay}>
        {photoUrl ? (
          <figure
            key={captureId}
            className={cn(css.print, root.print)}
            aria-label='Your developed instant picture'
          >
            <div className={css.photoSurface}>
              <img
                src={photoUrl}
                alt='Your mirrored camera portrait'
                draggable={false}
              />
              <span
                className={cn(css.developWash, root.developWash)}
                aria-hidden='true'
              />
            </div>
            <figcaption>
              <span>midnight / {String(captureId).padStart(2, '0')}</span>
              <time dateTime={capturedAt?.toISOString()}>
                {capturedAt ? formatCaptureTime(capturedAt) : 'developing'}
              </time>
            </figcaption>
          </figure>
        ) : (
          <div className={css.paperGuide} aria-hidden='true'>
            <span>Awaiting exposure</span>
          </div>
        )}
      </div>

      <div className={cn(controls.controlDeck, root.controlDeck)}>
        <p
          className={controls.liveStatus}
          aria-live='polite'
          aria-atomic='true'
        >
          {liveMessage}
        </p>

        {cameraState === 'error' && (
          <div className={controls.errorPanel}>
            <p>{fault?.detail}</p>
            <button
              type='button'
              className={cn(controls.deckButton, root.deckButton)}
              onClick={() => void requestCamera()}
            >
              <span>Retry camera</span>
            </button>
          </div>
        )}

        {photoUrl && printState === 'ready' && (
          <div ref={photoActionsRef} className={controls.photoActions}>
            <button
              type='button'
              className={cn(controls.deckButton, root.deckButton)}
              data-tone='neutral'
              onClick={resetPhoto}
            >
              <span>Try again</span>
            </button>
            <a
              className={cn(controls.deckButton, root.deckButton)}
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
  )
}
