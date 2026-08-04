'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import css from './geo-map.module.css'
import { MapStatusBar, MapZoomControls } from './map-controls'
import readout from './map-controls.module.css'
import type { GeoMapFeedback, GeoMapLabels } from './map-labels'
import { MapPlot } from './map-plot'
import {
  broadRegion,
  connectionSegments,
  coordinateToWorldPoint,
} from './map-projection'
import { viewBoxFor } from './map-viewport'
import type { GeoCoordinate } from './model'
import { useMapGestures } from './use-map-gestures'

export type { GeoMapFeedback, GeoMapLabels } from './map-labels'

const ANNOUNCEMENT_DELAY_MS = 220

export type GeoMapProps = {
  locale: 'en' | 'es'
  labels: GeoMapLabels
  prompt?: string
  disabled?: boolean
  selectedCoordinate: GeoCoordinate | null
  onSelectedCoordinateChange: (coordinate: GeoCoordinate) => void
  onSubmit: (coordinate: GeoCoordinate) => void
  feedback?: GeoMapFeedback
}

export default function GeoMap({
  locale,
  labels,
  prompt,
  disabled = false,
  selectedCoordinate,
  onSelectedCoordinateChange,
  onSubmit,
  feedback,
}: GeoMapProps) {
  const selectionLocked = disabled || Boolean(feedback)
  const {
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    releasePointer,
    setViewport,
    submitSelection,
    svgRef,
    viewport,
    zoomTo,
  } = useMapGestures({
    disabled,
    feedback: Boolean(feedback),
    onSelectedCoordinateChange,
    onSubmit,
    selectedCoordinate,
    selectionLocked,
  })
  const [announcement, setAnnouncement] = useState('')
  const descriptionId = useId()
  const liveRegionId = useId()

  const viewBox = viewBoxFor(viewport)
  const selectedPoint = selectedCoordinate
    ? coordinateToWorldPoint(selectedCoordinate)
    : null
  const answerPoint = feedback
    ? coordinateToWorldPoint(feedback.answerCoordinate)
    : null
  const segments =
    selectedCoordinate && feedback
      ? connectionSegments(selectedCoordinate, feedback.answerCoordinate)
      : []

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      }),
    [locale],
  )
  const distanceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', {
        maximumFractionDigits: 0,
      }),
    [locale],
  )

  const describeCoordinate = (coordinate: GeoCoordinate) => {
    const latitudeDirection = coordinate.latitude < 0 ? 'S' : 'N'
    const longitudeDirection =
      coordinate.longitude < 0 ? (locale === 'es' ? 'O' : 'W') : 'E'
    return `${labels.latitude} ${numberFormatter.format(
      Math.abs(coordinate.latitude),
    )}° ${latitudeDirection}, ${labels.longitude} ${numberFormatter.format(
      Math.abs(coordinate.longitude),
    )}° ${longitudeDirection}`
  }

  const positionText = selectedCoordinate
    ? `${labels.position}: ${describeCoordinate(selectedCoordinate)}. ${
        labels.regions[broadRegion(selectedCoordinate)]
      }. ${labels.zoom} ${numberFormatter.format(viewport.zoom)}×.`
    : labels.instructions
  const announcementText =
    feedback && selectedCoordinate
      ? `${labels.selectedPoint}: ${describeCoordinate(selectedCoordinate)}. ${
          labels.correctPoint
        }: ${describeCoordinate(feedback.answerCoordinate)}. ${
          labels.distance
        }: ${distanceFormatter.format(feedback.distanceKm)} ${
          labels.kilometres
        }.`
      : positionText

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setAnnouncement(announcementText),
      ANNOUNCEMENT_DELAY_MS,
    )
    return () => window.clearTimeout(timeout)
  }, [announcementText])

  return (
    <section
      className={css.mapPanel}
      data-disabled={disabled}
      data-selection-locked={selectionLocked}
      data-feedback={Boolean(feedback)}
    >
      <p id={descriptionId} className={readout.mapInstructions}>
        {labels.instructions}
      </p>

      <div className={css.mapStage}>
        {prompt && (
          <p className={css.mapPromptBanner} aria-hidden='true'>
            {prompt}
          </p>
        )}
        <span className={css.mapProjectionTag}>{labels.projection}</span>

        <MapPlot
          answerPoint={answerPoint}
          descriptionId={descriptionId}
          disabled={disabled}
          handleKeyDown={handleKeyDown}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
          labels={labels}
          liveRegionId={liveRegionId}
          releasePointer={releasePointer}
          segments={segments}
          selectedCoordinate={selectedCoordinate}
          selectedPoint={selectedPoint}
          svgRef={svgRef}
          viewBox={viewBox}
          viewport={viewport}
        />

        <MapZoomControls
          disabled={disabled}
          labels={labels}
          numberFormatter={numberFormatter}
          setViewport={setViewport}
          viewport={viewport}
          zoomTo={zoomTo}
        />
      </div>

      <MapStatusBar
        distanceFormatter={distanceFormatter}
        feedback={feedback}
        labels={labels}
        positionText={positionText}
        selectedCoordinate={selectedCoordinate}
        selectionLocked={selectionLocked}
        submitSelection={submitSelection}
      />

      <p
        id={liveRegionId}
        className={readout.mapLiveRegion}
        aria-live='polite'
        aria-atomic='true'
      >
        {announcement}
      </p>
    </section>
  )
}
