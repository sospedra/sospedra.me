import createGlobe from 'cobe'
import { clamp } from 'es-toolkit'
import type React from 'react'
import { useEffect } from 'react'
import { createCompassPainter } from './globe-dials'
import type {
  buildArcs,
  buildMarkers,
  TravelGlobePalette,
} from './globe-markers'
import {
  createMoonPainter,
  LUNAR_ORBIT_FRAME_STEP,
  sizeMoonLayers,
} from './globe-moon-layer'
import {
  clampTheta,
  clampZoom,
  MARKER_ELEVATION,
  stepAngle,
} from './globe-projection'
import { cancelHoverFrame, type GlobeViewState } from './globe-view-state'

const EASE = 0.08
const ZOOM_EASE = 0.16
const DRIFT = 0.00135
const WHEEL_ZOOM_RATE = 0.004
const MOMENTUM_FRICTION = 0.925
const MOMENTUM_CUTOFF = 0.000004

const ROUTE_ARC_HEIGHT = 0.34
const DESKTOP_MAP_SAMPLES = 16000
const TABLET_MAP_SAMPLES = 12000
const MOBILE_MAP_SAMPLES = 8000
const TARGET_FRAME_MS = 1000 / 60
const FRAME_EARLY_TOLERANCE_MS = 0.25
const HOVER_FRAME_STEP = 6
const MAX_GLOBE_BACKING_PIXELS = 900_000
const MIN_RENDER_PIXEL_RATIO = 0.75

const mapSamplesForSize = (size: number): number => {
  if (size <= 480) return MOBILE_MAP_SAMPLES
  if (size <= 800) return TABLET_MAP_SAMPLES
  return DESKTOP_MAP_SAMPLES
}

const renderPixelRatioForSize = (
  size: { height: number; width: number },
  pixelRatioCap: number,
): number => {
  const deviceRatio = Math.min(window.devicePixelRatio || 1, pixelRatioCap)
  const pixelBudgetRatio = Math.sqrt(
    MAX_GLOBE_BACKING_PIXELS / (size.width * size.height),
  )
  return clamp(pixelBudgetRatio, MIN_RENDER_PIXEL_RATIO, deviceRatio)
}

const supportsWebGL = (): boolean => {
  try {
    const probe = document.createElement('canvas')
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'))
  } catch {
    return false
  }
}

export function useGlobeRenderer({
  state,
  palette,
  canvasFit,
  resolvedPixelRatioCap,
  initialMarkersRef,
  initialArcsRef,
}: {
  state: GlobeViewState
  palette: TravelGlobePalette
  canvasFit: 'square' | 'viewport'
  resolvedPixelRatioCap: number
  initialMarkersRef: React.RefObject<ReturnType<typeof buildMarkers>>
  initialArcsRef: React.RefObject<ReturnType<typeof buildArcs>>
}) {
  const {
    canvasRectRef,
    canvasRef,
    dialControlCountRef,
    dialIdleUntilRef,
    dragRef,
    focusRef,
    focusTimeRef,
    globeRef,
    grabRef,
    hoverFrameRef,
    moonRef,
    phiRef,
    pinchRef,
    pointersRef,
    publishZoomLevel,
    quietRef,
    refreshHoverRef,
    resolvedZoomMax,
    setStatus,
    thetaRef,
    tiltRef,
    velocityRef,
    zoomRef,
    zoomTargetRef,
  } = state
  const updateCompass = createCompassPainter(state)

  // biome-ignore lint/correctness/useExhaustiveDependencies: view-state refs and the compass painter are stable, the globe rebuilds only on renderer options
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    setStatus('loading')
    if (!supportsWebGL()) {
      setStatus('unavailable')
      return
    }

    const viewport = canvas.parentElement ?? canvas
    const measureCanvasBounds = () => {
      const rect = canvas.getBoundingClientRect()
      canvasRectRef.current = {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      }
    }
    const fitCanvas = (box: { width: number; height: number }) => {
      const width = Math.floor(box.width)
      const height = Math.floor(box.height)
      if (canvasFit === 'viewport') return { width, height }
      const side = Math.min(width, height)
      return { width: side, height: side }
    }
    const applyCanvasSize = (size: { width: number; height: number }) => {
      canvas.style.width = `${size.width}px`
      canvas.style.height = `${size.height}px`
      sizeMoonLayers(moonRef, size)
    }
    let renderSize = fitCanvas(viewport.getBoundingClientRect())
    if (renderSize.width <= 0 || renderSize.height <= 0) {
      renderSize = { width: 600, height: 600 }
    }
    applyCanvasSize(renderSize)
    let pendingSize: { width: number; height: number } | null = null
    const observer = new ResizeObserver(([entry]) => {
      const next = fitCanvas(entry.contentRect)
      if (
        next.width <= 0 ||
        next.height <= 0 ||
        (next.width === renderSize.width && next.height === renderSize.height)
      )
        return
      applyCanvasSize(next)
      renderSize = next
      pendingSize = next
      measureCanvasBounds()
    })
    observer.observe(viewport)

    const renderPixelRatio = renderPixelRatioForSize(
      renderSize,
      resolvedPixelRatioCap,
    )
    const stylesBeforeGlobe = new Set(
      document.head.querySelectorAll<HTMLStyleElement>('style'),
    )
    let globe: ReturnType<typeof createGlobe>
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: renderPixelRatio,
        width: renderSize.width,
        height: renderSize.height,
        phi: phiRef.current,
        theta: thetaRef.current,
        dark: 1,
        diffuse: 1.68,
        mapSamples: mapSamplesForSize(
          Math.min(renderSize.width, renderSize.height),
        ),
        mapBrightness: 9,
        mapBaseBrightness: 0.018,
        baseColor: palette.base,
        markerColor: palette.signal,
        glowColor: palette.glow,
        markers: initialMarkersRef.current,
        arcs: initialArcsRef.current,
        arcColor: palette.signal,
        arcWidth: 0.76,
        arcHeight: ROUTE_ARC_HEIGHT,
        markerElevation: MARKER_ELEVATION,
        context: {
          antialias: true,
          desynchronized: true,
          powerPreference: 'high-performance',
        },
      })
    } catch {
      observer.disconnect()
      setStatus('unavailable')
      return
    }

    // Cobe 2.0.1 maintains CSS anchors for optional marker IDs. This globe
    // does not use IDs, so leaving its empty style node connected would force
    // a global style invalidation on every update.
    for (const style of document.head.querySelectorAll<HTMLStyleElement>(
      'style',
    )) {
      if (
        !stylesBeforeGlobe.has(style) &&
        style.textContent?.trim() === ':root{}'
      ) {
        style.remove()
      }
    }

    globeRef.current = globe
    measureCanvasBounds()
    canvas.dataset.ready = 'true'
    canvas.dataset.renderMode = canvasFit
    canvas.dataset.renderPixelRatio = renderPixelRatio.toFixed(2)
    setStatus('ready')

    // React's root wheel listener is passive, so preventDefault needs a
    // manual non-passive one
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return
      const nextZoom = clampZoom(
        zoomTargetRef.current * Math.exp(-event.deltaY * WHEEL_ZOOM_RATE),
        resolvedZoomMax,
      )
      if (nextZoom === zoomTargetRef.current) return
      event.preventDefault()
      zoomTargetRef.current = nextZoom
      publishZoomLevel(nextZoom)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })

    let lastFrameTime = performance.now()

    const stepFrame = (now: number) => {
      const elapsed = clamp(now - lastFrameTime, 1, 32)
      lastFrameTime = now
      if (
        grabRef.current !== null ||
        pinchRef.current ||
        dialControlCountRef.current > 0 ||
        now < dialIdleUntilRef.current
      )
        return

      const [targetPhi, targetTheta] = focusRef.current
      const frameFactor = elapsed / TARGET_FRAME_MS
      const ease = quietRef.current ? 1 : 1 - (1 - EASE) ** frameFactor
      if (focusTimeRef.current > 0) {
        focusTimeRef.current = Math.max(0, focusTimeRef.current - elapsed)
        phiRef.current = stepAngle(phiRef.current, targetPhi, ease)
        thetaRef.current += (targetTheta - thetaRef.current) * ease
        return
      }

      if (quietRef.current) return

      phiRef.current += DRIFT * frameFactor
      const velocity = velocityRef.current
      if (
        Math.abs(velocity.phi) > MOMENTUM_CUTOFF ||
        Math.abs(velocity.theta) > MOMENTUM_CUTOFF
      ) {
        phiRef.current += velocity.phi * elapsed
        thetaRef.current = clampTheta(
          thetaRef.current + velocity.theta * elapsed,
        )
        const decay = MOMENTUM_FRICTION ** (elapsed / TARGET_FRAME_MS)
        velocity.phi *= decay
        velocity.theta *= decay
        return
      }

      velocityRef.current = { phi: 0, theta: 0 }
    }

    let frame: number | null = null
    let isIntersecting = true
    let isPageVisible = document.visibilityState === 'visible'
    let contextAvailable = true

    const shouldRender = () =>
      isIntersecting && isPageVisible && contextAvailable

    const updateMoon = createMoonPainter(moonRef)

    let hoverTick = 0
    let lunarFrame = 0
    let lastRenderTime = performance.now() - TARGET_FRAME_MS
    const tick = (now: number) => {
      frame = null
      if (!shouldRender()) return
      const renderElapsed = now - lastRenderTime
      if (renderElapsed < TARGET_FRAME_MS - FRAME_EARLY_TOLERANCE_MS) {
        frame = requestAnimationFrame(tick)
        return
      }
      lastRenderTime =
        renderElapsed < TARGET_FRAME_MS
          ? now
          : now - (renderElapsed % TARGET_FRAME_MS)
      stepFrame(now)
      const zoomEase = quietRef.current ? 1 : ZOOM_EASE
      zoomRef.current += (zoomTargetRef.current - zoomRef.current) * zoomEase
      const didResize = pendingSize !== null
      const resize =
        pendingSize === null
          ? {}
          : {
              width: pendingSize.width,
              height: pendingSize.height,
              mapSamples: mapSamplesForSize(
                Math.min(pendingSize.width, pendingSize.height),
              ),
            }
      pendingSize = null
      const phi = phiRef.current + dragRef.current
      const theta = thetaRef.current + tiltRef.current
      const view = {
        phi,
        theta,
        zoom: zoomRef.current,
        aspect: renderSize.width / renderSize.height,
      }
      hoverTick = (hoverTick + 1) % HOVER_FRAME_STEP
      if (hoverTick === 0) {
        if (pointersRef.current.size === 0) refreshHoverRef.current?.()
      }
      globe.update({ phi, theta, scale: view.zoom, ...resize })
      updateCompass(view)
      updateMoon(view, didResize || lunarFrame % LUNAR_ORBIT_FRAME_STEP === 0)
      lunarFrame = (lunarFrame + 1) % LUNAR_ORBIT_FRAME_STEP
      frame = requestAnimationFrame(tick)
    }

    const syncRenderLoop = () => {
      if (shouldRender()) {
        if (frame === null) frame = requestAnimationFrame(tick)
        return
      }
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
    }

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isIntersecting = entry?.isIntersecting ?? true
      syncRenderLoop()
    })
    intersectionObserver.observe(canvas)

    const onVisibilityChange = () => {
      isPageVisible = document.visibilityState === 'visible'
      syncRenderLoop()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const onContextLost = (event: Event) => {
      event.preventDefault()
      contextAvailable = false
      delete canvas.dataset.ready
      setStatus('unavailable')
      syncRenderLoop()
    }
    canvas.addEventListener('webglcontextlost', onContextLost)

    syncRenderLoop()

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      observer.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      cancelHoverFrame(hoverFrameRef)
      delete canvas.dataset.ready
      delete canvas.dataset.hovered
      delete canvas.dataset.renderMode
      delete canvas.dataset.renderPixelRatio
      canvasRectRef.current = null
      globe.destroy()
      globeRef.current = null
    }
  }, [
    canvasFit,
    palette,
    publishZoomLevel,
    resolvedPixelRatioCap,
    resolvedZoomMax,
  ])
}
