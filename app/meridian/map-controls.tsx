import geoControls from './geo-controls.module.css'
import css from './map-controls.module.css'
import type { GeoMapFeedback, GeoMapLabels } from './map-labels'
import {
  INITIAL_VIEWPORT,
  MAX_ZOOM,
  MIN_ZOOM,
  type Viewport,
  ZOOM_STEP,
} from './map-viewport'
import type { GeoCoordinate } from './model'

export function MapZoomControls({
  disabled,
  labels,
  numberFormatter,
  setViewport,
  viewport,
  zoomTo,
}: {
  disabled: boolean
  labels: GeoMapLabels
  numberFormatter: Intl.NumberFormat
  setViewport: (viewport: Viewport) => void
  viewport: Viewport
  zoomTo: (zoom: number) => void
}) {
  return (
    <fieldset className={css.mapZoomControls}>
      <legend className={css.mapControlLegend}>{labels.zoom}</legend>
      <button
        type='button'
        className={css.mapControlButton}
        disabled={disabled || viewport.zoom <= MIN_ZOOM}
        aria-label={labels.zoomOut}
        onClick={() => zoomTo(viewport.zoom / ZOOM_STEP)}
      >
        <span aria-hidden='true'>−</span>
        <span>{labels.zoomOut}</span>
      </button>
      <output className={css.mapZoomReadout} aria-label={labels.zoom}>
        {numberFormatter.format(viewport.zoom)}×
      </output>
      <button
        type='button'
        className={css.mapControlButton}
        disabled={disabled || viewport.zoom >= MAX_ZOOM}
        aria-label={labels.zoomIn}
        onClick={() => zoomTo(viewport.zoom * ZOOM_STEP)}
      >
        <span aria-hidden='true'>+</span>
        <span>{labels.zoomIn}</span>
      </button>
      <button
        type='button'
        className={css.mapRecenterButton}
        disabled={disabled}
        onClick={() => setViewport(INITIAL_VIEWPORT)}
      >
        <span aria-hidden='true'>⌂</span>
        <span>{labels.recenter}</span>
      </button>
    </fieldset>
  )
}

export function MapStatusBar({
  distanceFormatter,
  feedback,
  labels,
  positionText,
  selectedCoordinate,
  selectionLocked,
  submitSelection,
}: {
  distanceFormatter: Intl.NumberFormat
  feedback?: GeoMapFeedback
  labels: GeoMapLabels
  positionText: string
  selectedCoordinate: GeoCoordinate | null
  selectionLocked: boolean
  submitSelection: () => void
}) {
  return (
    <div className={css.mapStatusBar}>
      <p className={css.mapPosition}>{positionText}</p>
      {selectedCoordinate && !selectionLocked && (
        <button
          type='button'
          className={geoControls.secondaryButton}
          onClick={submitSelection}
        >
          <span>{labels.submit}</span>
          <span aria-hidden='true'>◉</span>
        </button>
      )}
      {feedback && (
        <p className={css.mapFeedback} role='status'>
          <span>{labels.distance}</span>
          <strong>
            {distanceFormatter.format(feedback.distanceKm)} {labels.kilometres}
          </strong>
        </p>
      )}
      <div className={css.mapLegend} aria-hidden='true'>
        <span data-marker='selected'>{labels.selectedPoint}</span>
        {feedback && <span data-marker='answer'>{labels.correctPoint}</span>}
      </div>
    </div>
  )
}
