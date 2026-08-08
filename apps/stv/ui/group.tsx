import Image from 'next/image'
import { useEffect } from 'react'
import type { NodeGroup, TvEvent } from 'services/types'
import { jumpToNow, NOW_ANCHOR_ID } from './scroll'

const WOMEN_KEYWORDS = ['f', 'femenino', 'femenina', 'reina']

const Competition = (props: { competition: string }) => {
  return (
    <span className='text-xs'>
      {props.competition.split(' ').map((token, index) => {
        const key = `${token}-${index}`
        if (!WOMEN_KEYWORDS.includes(token.toLowerCase())) {
          return <span key={key}> {token}</span>
        }
        return (
          <span className='text-purple-400 uppercase' key={key}>
            {' '}
            {token.toLowerCase() === 'f' ? 'Femenina' : token}
          </span>
        )
      })}
    </span>
  )
}

const Score = (props: { result: string | null; teams: string }) => {
  const [local, visitor] = props.teams.split('-')
  const [home, away] = (props.result ?? '').split('-')

  return (
    <p className='flex flex-col mx-3 my-1 font-semibold'>
      <span className='flex flex-1'>
        <span className='flex-1'>{local}</span>
        <span>{home}</span>
      </span>
      <span className='flex flex-1'>
        <span className='flex-1'>{visitor}</span>
        <span>{away}</span>
      </span>
    </p>
  )
}

const Event = (props: { event: TvEvent; isLast: boolean }) => {
  const { event } = props

  return (
    <div
      className={`flex flex-row py-4 border-dashed border-gray-200 ${
        props.isLast ? 'pb-0' : 'border-b-2'
      }`}
    >
      <div className='flex flex-col flex-1'>
        <p className='flex justify-between text-xs font-semibold text-black/50'>
          <span>
            {event.flag && <span>{event.flag}</span>}{' '}
            <Competition competition={event.competition} />
          </span>
          {event.matchtime && (
            <span className='font-bold text-teal-600'>{event.matchtime}'</span>
          )}
        </p>

        <Score result={event.result} teams={event.teams} />

        <p className='flex items-center'>
          <span className='mr-2 italic'>
            En <span className='font-semibold'>{event.channel}</span>
          </span>
          <Image
            alt={event.sport}
            className='mr-1'
            height={14}
            src={event.icon}
            width={14}
          />
        </p>
      </div>
    </div>
  )
}

export const Group = (props: NodeGroup) => {
  const isNext = props.anchor === 'next'

  useEffect(() => {
    if (isNext) jumpToNow()
  }, [isNext])

  return (
    <li
      className={`relative ${
        props.anchor === 'past' ? 'grayscale opacity-40' : ''
      }`}
      id={isNext ? NOW_ANCHOR_ID : undefined}
    >
      <p className='absolute z-10 inline-block px-2 mr-4 font-bold bg-white rounded-full shadow-sm -top-2 left-1 shadow-teal-400'>
        {(props.anchor === 'live' || isNext) && (
          <span className='absolute right-0 flex items-center justify-center w-3 h-3'>
            <span className='absolute inset-0 bg-teal-400 rounded-full opacity-75 animate-ping' />
            <span className='relative w-2 h-2 bg-teal-500 rounded-full' />
          </span>
        )}
        {props.time}
      </p>
      <div className='p-2 my-6 mr-2 ml-4 bg-white/60 rounded shadow-sm'>
        {props.events.map((event, index) => (
          <Event
            event={event}
            isLast={index === props.events.length - 1}
            key={`${event.teams}-${event.channel}`}
          />
        ))}
      </div>
    </li>
  )
}
