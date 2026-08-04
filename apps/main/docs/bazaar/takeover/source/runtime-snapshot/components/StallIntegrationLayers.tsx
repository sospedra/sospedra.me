import cn from 'clsx'
import type { CSSProperties } from 'react'
import styles from '../integration.module.css'
import {
  type Bazaar3IntegrationStallId,
  canRenderIntegration,
  getStallIntegration,
  type IntegrationBreakpoint,
} from '../integration-manifest'

export type StallIntegrationLayersProps = Readonly<{
  stallId: Bazaar3IntegrationStallId
  breakpoint: IntegrationBreakpoint
  active: boolean
  qaMode?: boolean
  className?: string
}>

type PlateProperties = CSSProperties & {
  '--integration-base-opacity': number
  '--integration-active-opacity': number
}

/**
 * Registered decorative siblings for an existing stall link.
 *
 * The caller must place this inside the approved `.stallWrap`. Plates use the
 * same full box as `FullStallFrames`; they never receive a per-frame transform,
 * crop or scale.
 */
export default function StallIntegrationLayers({
  stallId,
  breakpoint,
  active,
  qaMode = false,
  className,
}: StallIntegrationLayersProps) {
  const spec = getStallIntegration(stallId)
  const variant = spec.variants[breakpoint]

  if (!canRenderIntegration(variant.status, qaMode)) return null

  return (
    <>
      {variant.plates.map((plate) => {
        const baseOpacity = plate.baseOpacity ?? 1
        const activeOpacity = plate.activeOpacity ?? baseOpacity

        return (
          <img
            key={plate.id}
            src={plate.src}
            alt=''
            className={cn(styles.stallPlate, className)}
            data-integration-stall={stallId}
            data-integration-plate={plate.id}
            data-integration-phase={plate.phase}
            data-active={active || undefined}
            data-source-width={spec.sourceCanvas.width}
            data-source-height={spec.sourceCanvas.height}
            width={spec.sourceCanvas.width}
            height={spec.sourceCanvas.height}
            style={
              {
                '--integration-base-opacity': baseOpacity,
                '--integration-active-opacity': activeOpacity,
              } as PlateProperties
            }
            aria-hidden
            draggable={false}
            decoding='async'
            loading='lazy'
          />
        )
      })}
    </>
  )
}
