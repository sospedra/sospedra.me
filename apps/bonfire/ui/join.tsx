'use client'

import { type FormEvent, useEffect, useState } from 'react'
import type { Session } from 'services/use-session'
import { storedNick, storeNick } from 'ui/share'

export function Join(props: { session: Session }) {
  const [nick, setNick] = useState('')

  useEffect(() => {
    setNick(storedNick(''))
  }, [])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = nick.trim() || 'wanderer'
    storeNick(name)
    props.session.seat(name)
  }

  return (
    <form className='flex w-full flex-col gap-4' onSubmit={submit}>
      <p className='text-center text-[11px] tracking-[0.3em] text-ash uppercase'>
        a fire burns here
      </p>
      <div className='flex w-full flex-row gap-3'>
        <input
          aria-label='your nick'
          className='min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-firelight transition-colors duration-150 placeholder:text-white/25 focus:border-ember/60'
          maxLength={24}
          onChange={(event) => setNick(event.target.value)}
          placeholder='wanderer'
          value={nick}
        />
        <button
          className='rounded-xl border border-ember/60 bg-ember/10 px-4 py-3 text-sm font-semibold text-firelight transition duration-150 ease-out-strong hover:border-ember hover:bg-ember/15 active:scale-[0.98]'
          type='submit'
        >
          sit by the fire
        </button>
      </div>
    </form>
  )
}
