'use client'

import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { ExternalLink } from 'ui/external-link'
import { CloseIcon, SlidersIcon } from 'ui/icons'
import { PlaylistForm } from 'ui/playlist-form'

const HEADING = 'mt-8 mb-2 font-display text-xl'
const SECTION = 'space-y-2 text-sm leading-relaxed text-ash'

export function Settings() {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) setOpen(false)
  }

  return (
    <>
      <button
        aria-label='settings'
        className='rise-in fixed top-3 right-3 z-10 grid size-11 place-items-center rounded-full text-ash transition duration-150 ease-out-strong hover:bg-white/5 hover:text-firelight active:scale-95'
        onClick={() => setOpen(true)}
        type='button'
      >
        <SlidersIcon />
      </button>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: native dialog closes on Escape via onClose */}
      <dialog
        aria-labelledby='settings-title'
        className='dialog relative m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-night/85 p-0 text-firelight shadow-2xl shadow-black/60 backdrop-blur-2xl'
        onClick={closeOnBackdrop}
        onClose={() => setOpen(false)}
        ref={dialogRef}
      >
        <button
          aria-label='close settings'
          className='absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full text-ash transition duration-150 ease-out-strong hover:bg-white/5 hover:text-firelight active:scale-95'
          onClick={() => setOpen(false)}
          type='button'
        >
          <CloseIcon />
        </button>

        <div className='max-h-[inherit] overflow-y-auto p-6 md:p-8'>
          <h2
            className='font-display text-4xl tracking-tight italic'
            id='settings-title'
          >
            Bonfire
          </h2>
          <p className='mt-1 text-[11px] tracking-[0.3em] text-ash uppercase'>
            the working room
          </p>

          <h3 className={HEADING}>How it works</h3>
          <div className={SECTION}>
            <p>
              Bonfire merges music, ambience sounds and an extreme{' '}
              <ExternalLink
                className='text-ember'
                href='https://en.wikipedia.org/wiki/Pomodoro_Technique'
              >
                Pomodoro technique
              </ExternalLink>{' '}
              to help you boost your performance.
            </p>
            <p>
              Here you cannot stop, skip or pause stages. Instead, you have to{' '}
              <b className='text-firelight'>commit to a fixed workload</b>.
            </p>
            <p>
              Light your bonfire and{' '}
              <b className='text-firelight'>
                screen share on a videocall or stream
              </b>
              ! The more the merrier.
            </p>
          </div>

          <h3 className={HEADING}>Playlist</h3>
          <PlaylistForm />

          <h3 className={HEADING}>Credits</h3>
          <ul className='space-y-1 text-sm text-ash'>
            <li>
              Video by{' '}
              <ExternalLink
                className='text-ember'
                href='https://www.youtube.com/watch?v=LYF2VzCN0os'
              >
                Nocturnal Network
              </ExternalLink>
            </li>
            <li>
              Bonfire audio by{' '}
              <ExternalLink
                className='text-ember'
                href='https://freesound.org/people/CaganCelik/sounds/433783/'
              >
                Cagan Celik
              </ExternalLink>
            </li>
            <li>
              Pips audio by{' '}
              <ExternalLink
                className='text-ember'
                href='https://freesound.org/people/Felfa/sounds/188826/'
              >
                Felfa
              </ExternalLink>
            </li>
            <li>
              Default playlist info at{' '}
              <ExternalLink
                className='text-ember'
                href='https://soundcloud.com/sospedra/sets/bonfire'
              >
                SoundCloud
              </ExternalLink>
            </li>
          </ul>

          <h3 className={HEADING}>Privacy</h3>
          <div className={SECTION}>
            <p>No tracking of any kind. No cookies. No spy. No fingerprints.</p>
            <p>
              Anything you stream through this website you do under your own
              responsibility. Bear in mind if you stream some music through
              different platforms, that you might incur a copyright felony.
            </p>
            <p>
              Free open-source project. Source code available on{' '}
              <ExternalLink
                className='text-ember'
                href='https://github.com/sospedra/bonfire'
              >
                GitHub
              </ExternalLink>
              .
            </p>
          </div>
        </div>
      </dialog>
    </>
  )
}
