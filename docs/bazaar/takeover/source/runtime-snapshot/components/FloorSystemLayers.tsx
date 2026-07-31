import type { CSSProperties } from 'react'
import styles from '../floor-system.module.css'
import {
  type FloorPropKind,
  type FloorSystemPalette,
  getDesktopFloorSystem,
  type PercentRect,
} from '../floor-system-manifest'
import type {
  FloorIntegrationId,
  IntegrationPhase,
} from '../integration-manifest'

export type FloorSystemLayersProps = Readonly<{
  floorId: FloorIntegrationId
  phase: IntegrationPhase
}>

type FloorSystemProperties = CSSProperties & {
  '--floor-environment-image': string
  '--floor-void': string
  '--floor-wall-shadow': string
  '--floor-wall-mid': string
  '--floor-ground-shadow': string
  '--floor-ground-mid': string
  '--floor-iron-shadow': string
  '--floor-iron-mid': string
  '--floor-iron-edge': string
  '--floor-oxide': string
  '--floor-oxide-edge': string
  '--floor-seam': string
}

type RectProperties = CSSProperties & {
  '--item-x': string
  '--item-y': string
  '--item-width': string
  '--item-height': string
}

type ReceiverProperties = RectProperties & {
  '--receiver-core': string
  '--receiver-direct': string
  '--receiver-spill': string
}

const PROP_CLASSES: Record<FloorPropKind, string> = {
  asset: styles.assetProp,
  'service-drop': styles.serviceDrop,
  'beam-clamp': styles.beamClamp,
  'wall-ledger': styles.wallLedger,
  'floor-trench': styles.floorTrench,
  'threshold-plate': styles.thresholdPlate,
  'crate-stack': styles.crateStack,
  'bay-recess': styles.bayRecess,
  'server-bank': styles.serverBank,
  'rug-extension': styles.rugExtension,
  'cable-run': styles.cableRun,
  'drain-channel': styles.drainChannel,
  'route-rail': styles.routeRail,
}

function getFloorSystemProperties(
  palette: FloorSystemPalette,
  environmentSrc: string,
): FloorSystemProperties {
  return {
    '--floor-environment-image': `url("${environmentSrc}")`,
    '--floor-void': palette.void,
    '--floor-wall-shadow': palette.wallShadow,
    '--floor-wall-mid': palette.wallMid,
    '--floor-ground-shadow': palette.floorShadow,
    '--floor-ground-mid': palette.floorMid,
    '--floor-iron-shadow': palette.ironShadow,
    '--floor-iron-mid': palette.ironMid,
    '--floor-iron-edge': palette.ironEdge,
    '--floor-oxide': palette.oxide,
    '--floor-oxide-edge': palette.oxideEdge,
    '--floor-seam': palette.seam,
  }
}

function getRectProperties(rect: PercentRect): RectProperties {
  return {
    '--item-x': `${rect.x}%`,
    '--item-y': `${rect.y}%`,
    '--item-width': `${rect.width}%`,
    '--item-height': `${rect.height}%`,
  }
}

export default function FloorSystemLayers({
  floorId,
  phase,
}: FloorSystemLayersProps) {
  const system = getDesktopFloorSystem(floorId)
  if (!system) return null

  const receivers = system.receivers.filter(
    (receiver) => receiver.phase === phase,
  )
  const props = system.props.filter((prop) => prop.phase === phase)
  const drawsEnvironment = phase === 'rear'

  if (!drawsEnvironment && receivers.length === 0 && props.length === 0) {
    return null
  }

  return (
    <div
      className={styles.pass}
      data-floor-system-layer=''
      data-floor-system={system.id}
      data-integration-phase={phase}
      style={getFloorSystemProperties(system.palette, system.environment.src)}
      aria-hidden
    >
      {drawsEnvironment && (
        <span
          className={styles.environmentTile}
          data-source-width={system.environment.sourceCanvas.width}
          data-source-height={system.environment.sourceCanvas.height}
          data-authored-pixel-scale={system.environment.authoredPixelScale}
        />
      )}

      {receivers.map((receiver) => {
        const emitter = system.emitters.find(
          ({ id }) => id === receiver.emitterId,
        )
        if (!emitter) return null

        return (
          <span
            key={receiver.id}
            className={styles.receiver}
            data-floor-receiver={receiver.id}
            data-owner={receiver.owner}
            data-shape={receiver.shape}
            data-surface={receiver.surface}
            data-mirror-x={receiver.mirrorX || undefined}
            style={
              {
                ...getRectProperties(receiver.rect),
                '--receiver-core': emitter.coreColor,
                '--receiver-direct': emitter.directColor,
                '--receiver-spill': emitter.spillColor,
              } as ReceiverProperties
            }
          />
        )
      })}

      {props.map((prop) => {
        const className = `${styles.prop} ${PROP_CLASSES[prop.kind]}`
        const commonProps = {
          className,
          'data-floor-prop': prop.id,
          'data-role': prop.role,
          'data-tone': prop.tone,
          'data-owner': prop.owner,
          'data-mirror-x': prop.mirrorX || undefined,
          style: getRectProperties(prop.rect),
        }

        if (prop.kind === 'asset') {
          return (
            <img
              key={prop.id}
              {...commonProps}
              src={prop.asset.src}
              alt=''
              width={prop.asset.sourceCanvas.width}
              height={prop.asset.sourceCanvas.height}
              draggable={false}
              decoding='async'
              loading='lazy'
            />
          )
        }

        return <span key={prop.id} {...commonProps} />
      })}
    </div>
  )
}
