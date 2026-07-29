'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import css from './calibration.module.css'

const STAGE_WIDTH = 1541
const STAGE_HEIGHT = 1020
const X_LABELS = Array.from({ length: 16 }, (_, index) => index * 100)
const Y_LABELS = Array.from({ length: 10 }, (_, index) => (index + 1) * 100)

type Marker = {
  height: number
  id: string
  label: string
  points: Array<{ x: number; y: number }> | null
  rotation: number
  width: number
  x: number
  y: number
}

type PointerPosition = {
  markerId: string | null
  x: number
  y: number
}

const markerFromElement = (
  element: HTMLElement,
  stageRect: DOMRect,
): Marker | null => {
  const id = element.dataset.calibrationId?.trim()
  if (!id) return null

  const rect = element.getBoundingClientRect()
  const clippingViewport =
    element.dataset.calibrationKind === 'track'
      ? element.closest<HTMLElement>('[data-calibration-id="H21"]')
      : null
  if (clippingViewport) {
    const viewportRect = clippingViewport.getBoundingClientRect()
    if (rect.bottom <= viewportRect.top || rect.top >= viewportRect.bottom) {
      return null
    }
  }
  const scaleX = STAGE_WIDTH / stageRect.width
  const scaleY = STAGE_HEIGHT / stageRect.height
  const rotation = Number(element.dataset.calibrationRotation ?? 0)

  if (Number.isFinite(rotation) && rotation !== 0) {
    const styles = window.getComputedStyle(element)
    const widthPixels = Number.parseFloat(styles.width)
    const heightPixels = Number.parseFloat(styles.height)
    const centerX = (rect.left + rect.right) / 2
    const centerY = (rect.top + rect.bottom) / 2
    const radians = (rotation * Math.PI) / 180
    const cosine = Math.cos(radians)
    const sine = Math.sin(radians)
    const points = [
      [-widthPixels / 2, -heightPixels / 2],
      [widthPixels / 2, -heightPixels / 2],
      [widthPixels / 2, heightPixels / 2],
      [-widthPixels / 2, heightPixels / 2],
    ].map(([offsetX, offsetY]) => {
      const screenX = centerX + offsetX * cosine - offsetY * sine
      const screenY = centerY + offsetX * sine + offsetY * cosine
      return {
        x: (screenX - stageRect.left) * scaleX,
        y: (screenY - stageRect.top) * scaleY,
      }
    })
    const width = widthPixels * scaleX
    const height = heightPixels * scaleY
    const localCenterX = (centerX - stageRect.left) * scaleX
    const localCenterY = (centerY - stageRect.top) * scaleY

    return {
      height,
      id,
      label: element.dataset.calibrationLabel?.trim() ?? '',
      points,
      rotation,
      width,
      x: localCenterX - width / 2,
      y: localCenterY - height / 2,
    }
  }

  return {
    height: rect.height * scaleY,
    id,
    label: element.dataset.calibrationLabel?.trim() ?? '',
    points: null,
    rotation: 0,
    width: rect.width * scaleX,
    x: (rect.left - stageRect.left) * scaleX,
    y: (rect.top - stageRect.top) * scaleY,
  }
}

const fixed = (value: number): string => value.toFixed(2)

export default function CalibrationOverlay() {
  const rootRef = useRef<HTMLDivElement>(null)
  const patternPrefix = useId().replaceAll(':', '')
  const [markers, setMarkers] = useState<Marker[]>([])
  const [pointer, setPointer] = useState<PointerPosition | null>(null)

  const measure = useCallback(() => {
    const stage = rootRef.current?.parentElement
    if (!stage) return

    const stageRect = stage.getBoundingClientRect()
    if (stageRect.width === 0 || stageRect.height === 0) return

    setMarkers(
      Array.from(
        stage.querySelectorAll<HTMLElement>('[data-calibration-id]'),
      ).flatMap((element) => {
        const marker = markerFromElement(element, stageRect)
        return marker ? [marker] : []
      }),
    )
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const stage = root?.parentElement
    if (!root || !stage) return

    let animationFrame = 0
    const scheduleMeasure = () => {
      if (animationFrame) return
      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0
        measure()
      })
    }
    const updatePointer = (event: PointerEvent) => {
      const stageRect = stage.getBoundingClientRect()
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-calibration-id]')

      setPointer({
        markerId: target?.dataset.calibrationId?.trim() || null,
        x: Math.min(
          STAGE_WIDTH,
          Math.max(
            0,
            ((event.clientX - stageRect.left) / stageRect.width) * STAGE_WIDTH,
          ),
        ),
        y: Math.min(
          STAGE_HEIGHT,
          Math.max(
            0,
            ((event.clientY - stageRect.top) / stageRect.height) * STAGE_HEIGHT,
          ),
        ),
      })
      scheduleMeasure()
    }
    const clearPointer = () => setPointer(null)
    const mutationObserver = new MutationObserver((records) => {
      if (records.every((record) => root.contains(record.target))) return
      scheduleMeasure()
    })
    const resizeObserver = new ResizeObserver(scheduleMeasure)

    stage.addEventListener('pointermove', updatePointer)
    stage.addEventListener('pointerleave', clearPointer)
    stage.addEventListener('scroll', scheduleMeasure, true)
    mutationObserver.observe(stage, {
      attributeFilter: ['data-calibration-id', 'style'],
      attributes: true,
      childList: true,
      subtree: true,
    })
    resizeObserver.observe(stage)
    scheduleMeasure()

    return () => {
      cancelAnimationFrame(animationFrame)
      stage.removeEventListener('pointermove', updatePointer)
      stage.removeEventListener('pointerleave', clearPointer)
      stage.removeEventListener('scroll', scheduleMeasure, true)
      mutationObserver.disconnect()
      resizeObserver.disconnect()
    }
  }, [measure])

  const activeMarker =
    pointer?.markerId === null
      ? null
      : (markers.find((marker) => marker.id === pointer?.markerId) ?? null)
  const pointerDetails = activeMarker
    ? `${activeMarker.id} ${activeMarker.label}  ${fixed(activeMarker.x)},${fixed(activeMarker.y)}  ${fixed(activeMarker.width)}×${fixed(activeMarker.height)}${activeMarker.rotation ? `  rot=${activeMarker.rotation}deg` : ''}`
    : null
  const pointerChipWidth = pointerDetails ? 520 : 178
  const pointerChipHeight = pointerDetails ? 42 : 24
  const pointerChipX = pointer
    ? Math.min(STAGE_WIDTH - pointerChipWidth, pointer.x + 12)
    : 0
  const pointerChipY = pointer
    ? Math.min(
        STAGE_HEIGHT - pointerChipHeight,
        Math.max(0, pointer.y - pointerChipHeight - 10),
      )
    : 0
  const minorPatternId = `${patternPrefix}-music-grid-minor`
  const majorPatternId = `${patternPrefix}-music-grid-major`

  return (
    <div ref={rootRef} className={css.overlay} aria-hidden='true'>
      <svg
        className={css.svg}
        viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
        preserveAspectRatio='none'
      >
        <title>Music calibration grid</title>
        <defs>
          <pattern
            id={minorPatternId}
            width='20'
            height='20'
            patternUnits='userSpaceOnUse'
          >
            <path className={css.minorLine} d='M 20 0 H 0 V 20' />
          </pattern>
          <pattern
            id={majorPatternId}
            width='100'
            height='100'
            patternUnits='userSpaceOnUse'
          >
            <rect width='100' height='100' fill={`url(#${minorPatternId})`} />
            <path className={css.majorLine} d='M 100 0 H 0 V 100' />
          </pattern>
        </defs>

        <rect
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          fill={`url(#${majorPatternId})`}
        />
        <rect
          className={css.stageBoundary}
          x='0'
          y='0'
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
        />

        <g className={css.axisLabels}>
          {X_LABELS.map((value) => (
            <text key={`x-${value}`} x={value === 0 ? 5 : value} y='17'>
              {value}
            </text>
          ))}
          {Y_LABELS.map((value) => (
            <text key={`y-${value}`} x='5' y={value - 5}>
              {value}
            </text>
          ))}
          <text x={STAGE_WIDTH - 8} y='35' textAnchor='end'>
            X 1541
          </text>
          <text x='5' y={STAGE_HEIGHT - 7}>
            Y 1020
          </text>
        </g>

        <g>
          {markers.map((marker) => {
            const isPanel = marker.id.startsWith('P')
            const markerText = `${marker.id} ${marker.label}`.trim()
            const chipWidth = Math.min(
              180,
              Math.max(36, markerText.length * 7.2 + 12),
            )
            const chipX = Math.min(
              STAGE_WIDTH - chipWidth,
              Math.max(0, marker.x),
            )
            const chipY =
              marker.y >= 18
                ? marker.y - 18
                : Math.min(STAGE_HEIGHT - 18, marker.y)

            return (
              <g key={marker.id}>
                {marker.points ? (
                  <polygon
                    className={isPanel ? css.panelOutline : css.hitboxOutline}
                    points={marker.points
                      .map((point) => `${point.x},${point.y}`)
                      .join(' ')}
                  />
                ) : (
                  <rect
                    className={isPanel ? css.panelOutline : css.hitboxOutline}
                    x={marker.x}
                    y={marker.y}
                    width={marker.width}
                    height={marker.height}
                  />
                )}
                <rect
                  className={isPanel ? css.panelChip : css.hitboxChip}
                  x={chipX}
                  y={chipY}
                  width={chipWidth}
                  height='18'
                />
                <text className={css.markerLabel} x={chipX + 6} y={chipY + 13}>
                  {markerText}
                </text>
              </g>
            )
          })}
        </g>

        {pointer ? (
          <g>
            <line
              className={css.crosshair}
              x1={pointer.x}
              y1='0'
              x2={pointer.x}
              y2={STAGE_HEIGHT}
            />
            <line
              className={css.crosshair}
              x1='0'
              y1={pointer.y}
              x2={STAGE_WIDTH}
              y2={pointer.y}
            />
            <circle
              className={css.crosshairPoint}
              cx={pointer.x}
              cy={pointer.y}
              r='4'
            />
            <rect
              className={css.pointerChip}
              x={pointerChipX}
              y={pointerChipY}
              width={pointerChipWidth}
              height={pointerChipHeight}
            />
            <text
              className={css.pointerLabel}
              x={pointerChipX + 8}
              y={pointerChipY + 16}
            >
              X {fixed(pointer.x)} · Y {fixed(pointer.y)}
            </text>
            {pointerDetails ? (
              <text
                className={css.pointerDetail}
                x={pointerChipX + 8}
                y={pointerChipY + 34}
              >
                {pointerDetails}
              </text>
            ) : null}
          </g>
        ) : null}
      </svg>
    </div>
  )
}
