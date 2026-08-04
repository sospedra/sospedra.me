'use client'

import clsx from 'clsx'
import { type FormEvent, useRef, useState } from 'react'
import { parsePlaylistID } from 'services/soundcloud'
import { ExternalLink } from 'ui/external-link'

export function PlaylistForm() {
  const [status, setStatus] = useState<'idle' | 'warn'>('idle')
  const input = useRef<HTMLInputElement>(null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (status === 'idle') {
      setStatus('warn')
      return
    }

    const playlistID = parsePlaylistID(input.current?.value ?? '')
    window.location.href = `/${playlistID}`
  }

  return (
    <form className='flex flex-col items-start w-full' onSubmit={submit}>
      <label className='flex flex-row' htmlFor='playlist'>
        SoundCloud embed code{' '}
        <ExternalLink
          className='flex items-center justify-center w-6 h-6 ml-2 bg-gray-600 rounded-full'
          href='https://help.soundcloud.com/hc/en-us/articles/115003568008-Embedding-a-track-or-playlist-'
        >
          ?
        </ExternalLink>
      </label>
      <div className='flex flex-row flex-wrap w-full'>
        <input
          className='flex-1 px-2 py-1 mt-2 mr-2 text-black bg-white rounded'
          id='playlist'
          minLength={10}
          placeholder='<iframe width="100%" height="300" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/1198136710&auto_play=false"></iframe>'
          ref={input}
          required
          type='text'
        />
        <input
          className={clsx(
            'px-2 py-1 mt-2 border-2 border-white rounded cursor-pointer hover:underline',
            status === 'warn' ? 'bg-yellow-700' : 'bg-black',
          )}
          type='submit'
          value={status === 'warn' ? 'Save now' : 'Set playlist'}
        />
      </div>
      <p className='italic text-yellow-300'>
        {status === 'warn' ? (
          'This will reload the page immediately'
        ) : (
          <span className='text-transparent'>_</span>
        )}
      </p>
    </form>
  )
}
