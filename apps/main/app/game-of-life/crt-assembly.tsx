import css from './crt-assembly.module.css'
import crtOverlay from './crt-overlay.module.css'
import type { LifeState } from './engine'
import { LifeCanvas, type LifeCanvasUi } from './life-canvas'
import {
  formatCount,
  METER_SEGMENTS,
  meterLevel,
  padGeneration,
  Screw,
} from './life-instruments'

export const CrtAssembly = ({
  canvas,
  running,
  seedName,
  state,
  status,
}: {
  canvas: LifeCanvasUi
  running: boolean
  seedName: string
  state: LifeState
  status: string
}) => {
  const liveLevel = meterLevel(state.cells.size, 8)
  const churnLevel = meterLevel(state.birthsCount + state.deathsCount, 8)

  return (
    <section className={css.crtAssembly} aria-label='Life field display'>
      <div className={css.crtBezel}>
        <Screw position='nw' />
        <Screw position='ne' />
        <Screw position='sw' />
        <Screw position='se' />
        <div className={css.crtGlass} data-running={running ? 'true' : 'false'}>
          <LifeCanvas canvas={canvas} />
          <div className={css.scanlines} aria-hidden='true' />
          <div className={crtOverlay.targetReticle} aria-hidden='true'>
            <i />
            <i />
          </div>
          <div
            className={crtOverlay.edgeMeter}
            data-side='left'
            aria-hidden='true'
          >
            {METER_SEGMENTS.slice(0, 8).map((segment, index) => (
              <i key={segment} data-on={index < liveLevel ? 'true' : 'false'} />
            ))}
          </div>
          <div
            className={crtOverlay.edgeMeter}
            data-side='right'
            aria-hidden='true'
          >
            {METER_SEGMENTS.slice(0, 8).map((segment, index) => (
              <i
                key={segment}
                data-on={index < churnLevel ? 'true' : 'false'}
              />
            ))}
          </div>
          <div
            className={`${crtOverlay.screenReadout} ${crtOverlay.screenReadoutTop}`}
          >
            <span>Life field / live plane</span>
            <span>{canvas.coordinateText}</span>
          </div>
          <div
            className={`${crtOverlay.screenReadout} ${crtOverlay.screenReadoutBottom}`}
          >
            <span>Gen {padGeneration(state.generation)}</span>
            <span>Pop {formatCount(state.cells.size)}</span>
            <span>{canvas.zoomText}</span>
            <span>B3 / S23</span>
          </div>
          <div className={crtOverlay.cellLegend} aria-hidden='true'>
            <span>
              <i /> live
            </span>
            <span>
              <i /> newborn
            </span>
          </div>
        </div>
      </div>
      <footer className={css.crtFooter} aria-hidden='true'>
        <span>Program / {seedName}</span>
        <i />
        <i />
        <i />
        <strong>{status}</strong>
      </footer>
    </section>
  )
}
