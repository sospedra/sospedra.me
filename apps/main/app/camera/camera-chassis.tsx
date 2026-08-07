import cn from 'clsx'
import root from './camera.module.css'
import casing from './camera-body.module.css'
import type { CameraState, PrintState } from './camera-capture'
import css from './camera-chassis.module.css'
import film from './camera-film-transport.module.css'
import panel from './camera-instruments.module.css'
import optics from './camera-lens.module.css'
import release from './camera-shutter.module.css'
import finder from './camera-viewfinder.module.css'

type CameraChassisProps = {
  cameraState: CameraState
  printState: PrintState
  printerRef: React.RefObject<HTMLDivElement | null>
  setCameraState: React.Dispatch<React.SetStateAction<CameraState>>
  shutterRef: React.RefObject<HTMLButtonElement | null>
  videoRef: React.RefObject<HTMLVideoElement | null>
  takePhoto: () => void
}

export function CameraChassis({
  cameraState,
  printState,
  printerRef,
  setCameraState,
  shutterRef,
  videoRef,
  takePhoto,
}: CameraChassisProps) {
  return (
    <div
      className={cn(
        css.machine,
        panel.machine,
        film.machine,
        optics.machine,
        root.machine,
      )}
      data-camera-state={cameraState}
      data-print-state={printState}
    >
      <div className={css.cameraRig}>
        <div
          className={cn(css.cameraShadow, root.cameraShadow)}
          aria-hidden='true'
        />

        <div className={cn(css.camera, root.camera)}>
          <div className={casing.cameraTop}>
            <div className={panel.flash} aria-hidden='true'>
              <span className={panel.shutterFlash} />
            </div>
            <div className={panel.timer} aria-hidden='true' />
            <div className={panel.sensor} aria-hidden='true' />
            <div className={optics.opticsPlate} aria-hidden='true' />

            <div className={optics.lens} aria-hidden='true'>
              <div className={optics.lensGlass} />
            </div>

            {/* aria-disabled keeps focus while printing */}
            <button
              ref={shutterRef}
              type='button'
              className={cn(release.shutter, root.shutter)}
              aria-disabled={
                cameraState !== 'ready' || printState === 'printing'
              }
              aria-label='Take a photo'
              onClick={takePhoto}
            >
              <span className={release.shutterWell} aria-hidden='true'>
                <span className={cn(release.shutterStem, root.shutterStem)}>
                  <span className={release.shutterCap} />
                </span>
              </span>
            </button>

            <div className={finder.viewfinder}>
              <div className={finder.viewfinderGlass}>
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
                  className={finder.viewfinderReflection}
                  aria-hidden='true'
                />

                {cameraState !== 'ready' && (
                  <span className={finder.viewfinderBack} aria-hidden='true'>
                    {cameraState === 'requesting' ? '···' : '!'}
                  </span>
                )}
              </div>
            </div>

            <div className={film.filmRatchetHousing} aria-hidden='true'>
              <div className={cn(film.filmRatchet, root.filmRatchet)} />
            </div>
            <div className={cn(panel.power, root.power)} aria-hidden='true' />
            <div className={casing.cameraTitle} aria-hidden='true'>
              Midnight I/O
            </div>
          </div>

          <div className={casing.cameraBottom}>
            <div className={film.feedRailHousing} aria-hidden='true'>
              <div className={film.feedRail}>
                <div className={cn(film.feedCarriage, root.feedCarriage)} />
              </div>
            </div>
            <div ref={printerRef} className={film.printer} aria-hidden='true' />
            <div className={casing.labels} aria-hidden='true'>
              <div className={casing.rainbow} />
              <div className={casing.logo}>Sospedroid</div>
              <div className={casing.cameraType}>CAM-01 · LOCAL</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
