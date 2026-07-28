import cn from 'clsx'
import type { CSSProperties } from 'react'
import styles from '../integration.module.css'
import {
  type Bazaar3IntegrationStallId,
  canRenderIntegration,
  type FloorIntegrationId,
  getFloorIntegration,
  type IntegrationPhase,
  type RegisteredStagePlacement,
  type SceneLength,
} from '../integration-manifest'
import FloorSystemLayers from './FloorSystemLayers'

export type FloorIntegrationLayersProps = Readonly<{
  floorId: FloorIntegrationId
  phase: IntegrationPhase
  activeStallId?: Bazaar3IntegrationStallId | null
  qaMode?: boolean
  className?: string
}>

type StageProperties = CSSProperties & {
  '--integration-stage-height': string
  '--integration-stage-offset-inline': string
  '--integration-stage-offset-block': string
}

type PlateProperties = CSSProperties & {
  '--integration-base-opacity': number
  '--integration-active-opacity': number
}

function sceneLengthToCss(length: SceneLength): string {
  switch (length.unit) {
    case 'market':
      return `calc(var(--mkt-m) * ${length.value})`
    case 'percent':
      return `${length.value}%`
    case 'vw':
      return `${length.value}vw`
    case 'svh':
      return `${length.value}svh`
    case 'px':
      return `${length.value}px`
  }
}

function getStageProperties(
  placement: RegisteredStagePlacement,
  width: number,
  height: number,
): StageProperties {
  return {
    '--integration-stage-height': sceneLengthToCss(placement.height),
    '--integration-stage-offset-inline': sceneLengthToCss(
      placement.inline.offset,
    ),
    '--integration-stage-offset-block': sceneLengthToCss(
      placement.block.offset,
    ),
    aspectRatio: `${width} / ${height}`,
  }
}

export default function FloorIntegrationLayers({
  floorId,
  phase,
  activeStallId = null,
  qaMode = false,
  className,
}: FloorIntegrationLayersProps) {
  const spec = getFloorIntegration(floorId)
  const rendersAuthoredPlates =
    spec.status !== 'legacy' && canRenderIntegration(spec.status, qaMode)
  const floorSystem = <FloorSystemLayers floorId={floorId} phase={phase} />

  if (!rendersAuthoredPlates) return floorSystem

  const plates = spec.plates.filter((plate) => plate.phase === phase)
  if (plates.length === 0) return floorSystem

  const { height, width } = spec.stage.sourceCanvas
  const { placement } = spec.stage

  return (
    <div
      className={cn(styles.floorPass, className)}
      data-integration-floor={floorId}
      data-integration-phase={phase}
      aria-hidden
    >
      <div
        className={styles.registeredStage}
        data-inline-anchor={placement.inline.anchor}
        data-block-anchor={placement.block.anchor}
        data-mirror-x={placement.mirrorX || undefined}
        data-source-width={width}
        data-source-height={height}
        style={getStageProperties(placement, width, height)}
      >
        {plates.map((plate) => {
          const baseOpacity = plate.baseOpacity ?? 1
          const activeOpacity = plate.activeOpacity ?? baseOpacity
          const active =
            plate.activeFor !== undefined && plate.activeFor === activeStallId

          return (
            <img
              key={plate.id}
              src={plate.src}
              alt=''
              className={styles.floorPlate}
              data-integration-plate={plate.id}
              data-active-for={plate.activeFor}
              data-active={active || undefined}
              width={width}
              height={height}
              style={
                {
                  '--integration-base-opacity': baseOpacity,
                  '--integration-active-opacity': activeOpacity,
                } as PlateProperties
              }
              draggable={false}
              decoding='async'
              loading='lazy'
            />
          )
        })}
      </div>
    </div>
  )
}
