'use client'

import { useRef } from 'react'
import { useSession } from 'services/use-session'
import { AmbienceToggle } from 'ui/ambience'
import { Background } from 'ui/background'
import { Footer } from 'ui/footer'
import { Player } from 'ui/player'
import { Settings } from 'ui/settings'
import { Share } from 'ui/share'
import { Timer } from 'ui/timer'

export function Home(props: { playlistID: string }) {
  const ambience = useRef<HTMLAudioElement>(null)
  const session = useSession()

  return (
    <div>
      <aside>
        <Background />
      </aside>

      <header className='rise-in fixed top-0 left-0 z-10 p-5 lg:p-8'>
        <h1 className='font-display text-2xl tracking-tight italic [text-shadow:0_0_24px_rgba(255,158,69,0.25)]'>
          Bonfire
        </h1>
        <p className='mt-1 text-[10px] tracking-[0.3em] text-ash uppercase'>
          the working room
        </p>
      </header>

      <div className='fixed right-0 flex h-screen w-full flex-col items-center justify-between bg-linear-to-r from-transparent to-night/90 p-4 lg:left-1/3 lg:w-2/3 lg:p-12'>
        <main className='flex w-full max-w-md flex-1 flex-col justify-center'>
          <div className='rise-in'>
            <Timer session={session} />
          </div>

          <div className='rise-in w-full rounded-2xl border border-white/10 bg-smoke/55 p-4 shadow-lg shadow-black/40 backdrop-blur-md [animation-delay:80ms]'>
            <Player
              ambience={ambience}
              playlistID={props.playlistID}
              session={session}
            />
            <AmbienceToggle audioRef={ambience} />
            <Share session={session} />
          </div>
        </main>

        <Settings />
        <div className='rise-in [animation-delay:160ms]'>
          <Footer />
        </div>
      </div>
    </div>
  )
}
