'use client'

import clsx from 'clsx'
import { type FormEvent, useRef, useState } from 'react'
import { parsePlaylistID } from 'services/soundcloud'
import { ExternalLink } from 'ui/external-link'

type FormStatus = 'idle' | 'warn' | 'invalid'

const MESSAGES: Record<FormStatus, string> = {
  idle: '',
  warn: 'This will reload the page immediately',
  invalid: 'Could not read a playlist ID from that code',
}

export function PlaylistForm() {
  const [status, setStatus] = useState<FormStatus>('idle')
  const input = useRef<HTMLInputElement>(null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const playlistID = parsePlaylistID(input.current?.value ?? '')
    if (!playlistID) {
      setStatus('invalid')
      return
    }
    if (status !== 'warn') {
      setStatus('warn')
      return
    }

    window.location.href = `/${playlistID}`
  }

  return (
    <form className='flex w-full flex-col items-start' onSubmit={submit}>
      <label
        className='flex flex-row items-center gap-2 text-sm text-ash'
        htmlFor='playlist'
      >
        SoundCloud embed code
        <ExternalLink
          className='grid size-5 place-items-center rounded-full border border-white/20 text-[11px] text-ash transition-colors duration-150 hover:border-ember hover:text-ember'
          href='https://help.soundcloud.com/hc/en-us/articles/115003568008-Embedding-a-track-or-playlist-'
        >
          ?
        </ExternalLink>
      </label>
      <div className='mt-2 flex w-full flex-row flex-wrap gap-2'>
        <input
          className='min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-firelight transition-colors duration-150 placeholder:text-white/25 focus:border-ember/60'
          id='playlist'
          minLength={10}
          placeholder='<iframe width="100%" height="300" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/1198136710&auto_play=false"></iframe>'
          ref={input}
          required
          type='text'
        />
        <input
          className={clsx(
            'cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition duration-150 ease-out-strong active:scale-[0.98]',
            status === 'warn'
              ? 'border-ember bg-ember text-night'
              : 'border-ember/50 text-ember hover:bg-ember/10',
          )}
          type='submit'
          value={status === 'warn' ? 'Save now' : 'Set playlist'}
        />
      </div>
      <p className='mt-2 min-h-4 text-xs text-ember transition-opacity duration-150'>
        {MESSAGES[status]}
      </p>
    </form>
  )
}
