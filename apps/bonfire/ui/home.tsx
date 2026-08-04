'use client'

import { useRef } from 'react'
import { AmbienceToggle } from 'ui/ambience'
import { Background } from 'ui/background'
import { Footer } from 'ui/footer'
import { Player } from 'ui/player'
import { Settings } from 'ui/settings'
import { Timer } from 'ui/timer'

export function Home(props: { playlistID: string }) {
  const ambience = useRef<HTMLAudioElement>(null)

  return (
    <div className='text-white'>
      <aside>
        <Background />
      </aside>

      <div className='fixed right-0 flex flex-col items-center justify-between w-full h-screen p-4 lg:p-12 lg:w-2/3 lg:left-1/3 bg-linear-to-r from-transparent to-black'>
        <main className='flex flex-col justify-center flex-1'>
          <Timer />
          <Player ambience={ambience} playlistID={props.playlistID} />
          <AmbienceToggle audioRef={ambience} />
        </main>

        <Settings />
        <Footer />
      </div>
    </div>
  )
}
