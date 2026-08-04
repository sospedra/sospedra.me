'use client'

import { useState } from 'react'
import { ExternalLink } from 'ui/external-link'
import { PlaylistForm } from 'ui/playlist-form'

export function Settings() {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen((visible) => !visible)

  return (
    <div>
      <button
        aria-label='settings'
        className='absolute top-0 right-0 p-4'
        onClick={toggle}
        type='button'
      >
        ⚙️
      </button>

      {open && (
        <aside className='fixed inset-0 z-10 flex items-center justify-center p-4 bg-black/70 lg:p-16'>
          <button
            aria-label='close settings'
            className='absolute inset-0'
            onClick={toggle}
            type='button'
          />
          <div className='relative w-full max-w-lg max-h-full p-2 overflow-y-auto bg-black border-2 border-white rounded md:p-6'>
            <button
              aria-label='close settings'
              className='absolute top-0 right-0 pt-3 pr-4'
              onClick={toggle}
              type='button'
            >
              𝗫
            </button>
            <h1 className='text-6xl font-bold'>Bonfire</h1>
            <h2 className='pb-6 text-2xl'>The working room</h2>
            <h3 className='py-4 text-xl font-bold'>How it works?</h3>
            <p className='py-1'>
              Bonfire merges music, ambience sounds and a extreme{' '}
              <ExternalLink
                className='font-bold'
                href='https://en.wikipedia.org/wiki/Pomodoro_Technique'
              >
                Pomodoro technique
              </ExternalLink>{' '}
              to help you boost your performance.
            </p>
            <p className='py-1'>
              Here you cannot stop, skip or pause stages. Instead, you have to{' '}
              <b>commit to a fixed workload</b>.
            </p>
            <p className='py-1'>
              Light your bonfire and{' '}
              <b>screen share on a videocall or stream</b>! The more the
              merrier.
            </p>
            <h3 className='py-4 text-xl font-bold'>Settings</h3>
            <PlaylistForm />
            <h3 className='pb-4 text-xl font-bold'>Credits</h3>
            <ul>
              <li>
                Video by{' '}
                <ExternalLink href='https://www.youtube.com/watch?v=LYF2VzCN0os'>
                  Nocturnal Network
                </ExternalLink>
              </li>
              <li>
                Bonfire audio by{' '}
                <ExternalLink href='https://freesound.org/people/CaganCelik/sounds/433783/'>
                  Cagan Celik
                </ExternalLink>
              </li>
              <li>
                Pips audio by{' '}
                <ExternalLink href='https://freesound.org/people/Felfa/sounds/188826/'>
                  Felfa
                </ExternalLink>
              </li>
              <li>
                Default playlist info at{' '}
                <ExternalLink href='https://soundcloud.com/sospedra/sets/bonfire'>
                  SoundCloud
                </ExternalLink>
              </li>
            </ul>
            <h3 className='py-4 text-xl font-bold'>Privacy</h3>
            <p className='py-1'>
              No tracking of any kind. No cookies. No spy. No fingerprints.
            </p>
            <p className='py-1'>
              Anything you stream through this website you do under your own
              responsibility. Bear in mind if you stream some music through
              different platforms, that you might incur a copyright felony.
            </p>
            <p className='py-1'>
              Free open-source project. Source code available on{' '}
              <ExternalLink href='https://github.com/sospedra/bonfire'>
                GitHub
              </ExternalLink>
              .
            </p>
          </div>
        </aside>
      )}
    </div>
  )
}
