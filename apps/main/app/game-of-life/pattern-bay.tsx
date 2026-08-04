import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
} from 'react'
import bayLinks from './bay-links.module.css'
import cartridges from './cartridge.module.css'
import type { LifeState } from './engine'
import css from './pattern-bay.module.css'
import {
  type InteractiveLifePreset,
  LIFE_PRESETS,
  type LifePreset,
} from './presets'

const SourceLink = ({
  children,
  preset,
}: {
  children: ReactNode
  preset: LifePreset
}) => (
  <a
    className={bayLinks.sourceLink}
    href={preset.sourceHref}
    aria-label={`Open source pattern for ${preset.title}`}
    target='_blank'
    rel='noreferrer'
  >
    {children}
  </a>
)

const CartridgeBody = ({
  active = false,
  index,
  preset,
}: {
  active?: boolean
  index: number
  preset: LifePreset
}) => (
  <>
    <span className={cartridges.cartridgeIndex}>
      {String(index + 1).padStart(2, '0')}
    </span>
    <i className={cartridges.cartridgeNotch} aria-hidden='true' />
    <strong>{preset.title}</strong>
    <em className={cartridges.cartridgeFamily}>{preset.family}</em>
    <small>{preset.note}</small>
    <b className={cartridges.cartridgeAction}>
      {preset.kind === 'reference'
        ? `${preset.actionLabel} ↗`
        : active
          ? 'Loaded ✓'
          : 'Load preset →'}
    </b>
  </>
)

export const PatternBay = ({
  close,
  loadPreset,
  state,
}: {
  close: () => void
  loadPreset: (preset: InteractiveLifePreset) => void
  state: LifeState
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    closeButtonRef.current?.focus()
  }, [])

  const closeOnBackdropClick = (event: ReactMouseEvent<HTMLDialogElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const insideBay =
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom
    if (!insideBay) close()
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is pointer sugar, Escape closes the modal natively
    <dialog
      ref={dialogRef}
      id='pattern-bay'
      className={`${css.patternBay} ${cartridges.patternBay}`}
      aria-labelledby='pattern-bay-title'
      onClick={closeOnBackdropClick}
      onClose={close}
    >
      <header>
        <div>
          <span>11 runnable seeds · 2 dossiers</span>
          <h2 id='pattern-bay-title'>Choose a pattern</h2>
        </div>
        <p>
          Press a cartridge to load it now. Orange dossiers open reference
          patterns built for a remote HashLife engine.
        </p>
        <a
          className={bayLinks.protocolLink}
          href='https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life'
          target='_blank'
          rel='noreferrer'
        >
          B3/S23 protocol ↗
        </a>
        <button
          ref={closeButtonRef}
          type='button'
          className={bayLinks.patternClose}
          aria-label='Close pattern bay'
          onClick={close}
        >
          Close <span aria-hidden='true'>×</span>
        </button>
      </header>
      <ol>
        {LIFE_PRESETS.map((preset, index) => {
          const active =
            preset.kind === 'interactive' && state.presetId === preset.id

          return (
            <li key={preset.id} data-active={active} data-kind={preset.kind}>
              {preset.kind === 'interactive' ? (
                <>
                  <button
                    type='button'
                    className={cartridges.cartridge}
                    aria-pressed={active}
                    data-life-sfx='cartridge'
                    onClick={() => loadPreset(preset)}
                  >
                    <CartridgeBody
                      active={active}
                      index={index}
                      preset={preset}
                    />
                  </button>
                  <SourceLink preset={preset}>Info ↗</SourceLink>
                </>
              ) : (
                <a
                  className={`${cartridges.cartridge} ${cartridges.referenceCartridge}`}
                  data-life-sfx='cartridge'
                  href={preset.sourceHref}
                  aria-label={`${preset.title}. Reference-scale pattern; open source dossier`}
                  target='_blank'
                  rel='noreferrer'
                  onClick={close}
                >
                  <CartridgeBody index={index} preset={preset} />
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </dialog>
  )
}
