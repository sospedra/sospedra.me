'use client'

import cn from 'clsx'
import type {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { useEffect, useRef, useState } from 'react'
import styles from './LayeredStallSprite.module.css'

export const BAZAAR3_SPRITE_STAGE = Object.freeze({
  width: 960,
  height: 1264,
})

export type Bazaar3StallId =
  | 'uses'
  | 'papers'
  | 'manual'
  | 'console'
  | 'talks'
  | 'projects'
  | 'games'
  | 'travel'

export type IdleCels = readonly [first: string, second: string]
export type HoverCels = readonly [notice: string, respond: string, hold: string]

export type SpriteCelSequence = Readonly<{
  idle: IdleCels
  hover: HoverCels
}>

export type SpriteRegistration = Readonly<{
  /** Fixed ground/seat/pedestal contact point in authored-stage pixels. */
  root: readonly [x: number, y: number]
  /** Torso lock box in authored-stage pixels: x, y, width, height. */
  torso: readonly [x: number, y: number, width: number, height: number]
}>

export type EffectPlacement = 'behind-keeper' | 'over-keeper'

export type Bazaar3StallSprite = Readonly<{
  stallId: Bazaar3StallId
  label: string
  rearSrc: string
  frontSrc: string
  keeper: SpriteCelSequence
  effects: SpriteCelSequence
  registration: SpriteRegistration
  effectPlacement?: EffectPlacement
}>

export type SpriteValidationIssue =
  | Readonly<{
      kind: 'load'
      src: string
    }>
  | Readonly<{
      kind: 'dimensions'
      src: string
      actual: Readonly<{ width: number; height: number }>
      expected: typeof BAZAAR3_SPRITE_STAGE
    }>

export type SpriteValidationResult = Readonly<{
  stallId: Bazaar3StallId
  valid: boolean
  issues: readonly SpriteValidationIssue[]
}>

export type LayeredStallSpriteProps = Readonly<{
  sprite: Bazaar3StallSprite
  className?: string
  /** Forces the hover response, for example while a stall dialog is open. */
  forceActive?: boolean
  /** Set false when an enclosing interactive element owns keyboard focus. */
  focusable?: boolean
  timing?: Readonly<{
    idleMs?: number
    hoverMs?: number
  }>
  onValidation?: (result: SpriteValidationResult) => void
}>

type RuntimeCssProperties = CSSProperties & {
  '--sprite-idle-duration': string
  '--sprite-hover-duration': string
}

type LoadedSprite =
  | Readonly<{
      ok: true
      src: string
      width: number
      height: number
    }>
  | Readonly<{
      ok: false
      src: string
    }>

type SequenceLayerProps = Readonly<{
  layer: 'keeper' | 'effects'
  layerClassName: string
  sequence: SpriteCelSequence
}>

const DEFAULT_IDLE_MS = 2800
const DEFAULT_HOVER_MS = 600

export function defineBazaar3StallSprite<const T extends Bazaar3StallSprite>(
  sprite: T,
): T {
  assertRegistration(sprite.stallId, sprite.registration)
  return sprite
}

function positiveDuration(value: number | undefined, fallback: number) {
  if (value === undefined) return fallback
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Sprite animation durations must be positive; got ${value}`)
  }
  return Math.round(value)
}

function assertRegistration(
  stallId: Bazaar3StallId,
  registration: SpriteRegistration,
) {
  const [rootX, rootY] = registration.root
  const [torsoX, torsoY, torsoWidth, torsoHeight] = registration.torso
  const values = [rootX, rootY, torsoX, torsoY, torsoWidth, torsoHeight]

  if (!values.every(Number.isInteger)) {
    throw new Error(`${stallId}: sprite registration must use integer pixels`)
  }
  if (
    rootX < 0 ||
    rootX > BAZAAR3_SPRITE_STAGE.width ||
    rootY < 0 ||
    rootY > BAZAAR3_SPRITE_STAGE.height
  ) {
    throw new Error(`${stallId}: root registration is outside the sprite stage`)
  }
  if (
    torsoX < 0 ||
    torsoY < 0 ||
    torsoWidth <= 0 ||
    torsoHeight <= 0 ||
    torsoX + torsoWidth > BAZAAR3_SPRITE_STAGE.width ||
    torsoY + torsoHeight > BAZAAR3_SPRITE_STAGE.height
  ) {
    throw new Error(
      `${stallId}: torso registration is outside the sprite stage`,
    )
  }
}

function preloadSprite(src: string): Promise<LoadedSprite> {
  return new Promise((resolve) => {
    const image = new Image()
    let settled = false

    const finish = (result: LoadedSprite) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    image.decoding = 'async'
    image.onload = () => {
      const loaded = {
        ok: true,
        src,
        width: image.naturalWidth,
        height: image.naturalHeight,
      } as const

      if (typeof image.decode !== 'function') {
        finish(loaded)
        return
      }
      image
        .decode()
        .catch(() => undefined)
        .finally(() => finish(loaded))
    }
    image.onerror = () => finish({ ok: false, src })
    image.src = src
  })
}

function SequenceLayer(props: SequenceLayerProps) {
  const { layer, layerClassName, sequence } = props
  const hoverFrames = [
    ['notice', sequence.hover[0], styles.hoverFirst, 1],
    ['respond', sequence.hover[1], styles.hoverMiddle, 2],
    ['hold', sequence.hover[2], styles.hoverLast, 3],
  ] as const

  return (
    <>
      <img
        src={sequence.idle[0]}
        alt=''
        className={cn(
          styles.layer,
          styles.animatedLayer,
          layerClassName,
          styles.idleFirst,
        )}
        data-sprite-layer={layer}
        data-sequence='idle'
        data-frame='1'
        aria-hidden
        draggable={false}
        decoding='async'
        loading='eager'
      />
      <img
        src={sequence.idle[1]}
        alt=''
        className={cn(
          styles.layer,
          styles.animatedLayer,
          layerClassName,
          styles.idleSecond,
        )}
        data-sprite-layer={layer}
        data-sequence='idle'
        data-frame='2'
        aria-hidden
        draggable={false}
        decoding='async'
        loading='eager'
      />
      {hoverFrames.map(([phase, src, frameClassName, frame]) => (
        <img
          key={phase}
          src={src}
          alt=''
          className={cn(
            styles.layer,
            styles.animatedLayer,
            layerClassName,
            styles.hoverFrame,
            frameClassName,
          )}
          data-sprite-layer={layer}
          data-sequence='hover'
          data-frame={frame}
          aria-hidden
          draggable={false}
          decoding='async'
          loading='eager'
        />
      ))}
    </>
  )
}

export default function LayeredStallSprite(props: LayeredStallSpriteProps) {
  const {
    sprite,
    className,
    forceActive = false,
    focusable = true,
    timing,
    onValidation,
  } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [touchActive, setTouchActive] = useState(false)
  const [ready, setReady] = useState(false)
  const [validation, setValidation] = useState<'pending' | 'valid' | 'invalid'>(
    'pending',
  )

  assertRegistration(sprite.stallId, sprite.registration)

  const sourceKey = [
    sprite.rearSrc,
    sprite.frontSrc,
    ...sprite.keeper.idle,
    ...sprite.keeper.hover,
    ...sprite.effects.idle,
    ...sprite.effects.hover,
  ].join('\u0000')

  useEffect(() => {
    let cancelled = false
    setReady(false)
    setValidation('pending')

    const sources = [...new Set(sourceKey.split('\u0000'))]
    Promise.all(sources.map(preloadSprite)).then((loaded) => {
      if (cancelled) return

      const issues: SpriteValidationIssue[] = []
      for (const result of loaded) {
        if (!result.ok) {
          issues.push({ kind: 'load', src: result.src })
          continue
        }
        if (
          result.width === BAZAAR3_SPRITE_STAGE.width &&
          result.height === BAZAAR3_SPRITE_STAGE.height
        ) {
          continue
        }
        issues.push({
          kind: 'dimensions',
          src: result.src,
          actual: { width: result.width, height: result.height },
          expected: BAZAAR3_SPRITE_STAGE,
        })
      }
      const result: SpriteValidationResult = {
        stallId: sprite.stallId,
        valid: issues.length === 0,
        issues,
      }

      setValidation(result.valid ? 'valid' : 'invalid')
      setReady(true)
      onValidation?.(result)

      if (process.env.NODE_ENV !== 'production' && !result.valid) {
        console.error(
          `${sprite.stallId}: invalid layered sprite assets`,
          result.issues,
        )
      }
    })

    return () => {
      cancelled = true
    }
  }, [onValidation, sourceKey, sprite.stallId])

  useEffect(() => {
    if (!touchActive) return

    const dismissTouchState = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && rootRef.current?.contains(target)) return
      setTouchActive(false)
    }

    document.addEventListener('pointerdown', dismissTouchState, true)
    return () =>
      document.removeEventListener('pointerdown', dismissTouchState, true)
  }, [touchActive])

  const active = forceActive || hovered || focused || touchActive
  const [rootX, rootY] = sprite.registration.root
  const [torsoX, torsoY, torsoWidth, torsoHeight] = sprite.registration.torso
  const effectLayerClass =
    sprite.effectPlacement === 'behind-keeper'
      ? styles.effectsBehind
      : styles.effectsOver
  const runtimeStyle: RuntimeCssProperties = {
    '--sprite-idle-duration': `${positiveDuration(
      timing?.idleMs,
      DEFAULT_IDLE_MS,
    )}ms`,
    '--sprite-hover-duration': `${positiveDuration(
      timing?.hoverMs,
      DEFAULT_HOVER_MS,
    )}ms`,
  }

  const handlePointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') setHovered(true)
  }
  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') setHovered(false)
  }
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') setTouchActive(true)
  }
  const handleFocus = () => setFocused(true)
  const handleBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget
    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return
    }
    setFocused(false)
  }
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    setTouchActive(false)
    event.currentTarget.blur()
  }

  return (
    <div
      ref={rootRef}
      className={cn(styles.stage, className)}
      style={runtimeStyle}
      role='img'
      aria-label={sprite.label}
      aria-busy={!ready}
      tabIndex={focusable ? 0 : undefined}
      data-stall={sprite.stallId}
      data-active={active ? 'true' : 'false'}
      data-ready={ready ? 'true' : 'false'}
      data-validation={validation}
      data-stage-width={BAZAAR3_SPRITE_STAGE.width}
      data-stage-height={BAZAAR3_SPRITE_STAGE.height}
      data-root-x={rootX}
      data-root-y={rootY}
      data-torso-x={torsoX}
      data-torso-y={torsoY}
      data-torso-width={torsoWidth}
      data-torso-height={torsoHeight}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <img
        src={sprite.rearSrc}
        alt=''
        className={cn(styles.layer, styles.rear)}
        data-sprite-layer='rear'
        aria-hidden
        draggable={false}
        decoding='async'
        loading='eager'
      />
      {sprite.effectPlacement === 'behind-keeper' && (
        <SequenceLayer
          layer='effects'
          layerClassName={effectLayerClass}
          sequence={sprite.effects}
        />
      )}
      <SequenceLayer
        layer='keeper'
        layerClassName={styles.keeper}
        sequence={sprite.keeper}
      />
      {sprite.effectPlacement !== 'behind-keeper' && (
        <SequenceLayer
          layer='effects'
          layerClassName={effectLayerClass}
          sequence={sprite.effects}
        />
      )}
      <img
        src={sprite.frontSrc}
        alt=''
        className={cn(styles.layer, styles.front)}
        data-sprite-layer='front'
        aria-hidden
        draggable={false}
        decoding='async'
        loading='eager'
      />
    </div>
  )
}
