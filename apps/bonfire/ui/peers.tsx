'use client'

import type { Session } from 'services/use-session'

export function Peers(props: { session: Session }) {
  const { runtime } = props.session
  if (runtime.phase === 'solo' || runtime.phase === 'gate') return null

  const others = Object.entries(runtime.peers)
  const relaysDown = runtime.everOpen && runtime.openRelays === 0

  return (
    <div className='mt-3 flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ash'>
      <Nick label={`${runtime.nick} (you)`} />
      {others.map(([pubkey, peer]) => (
        <Nick key={pubkey} label={peer.nick} />
      ))}
      {relaysDown && <span className='italic'>the fire flickers alone</span>}
      {runtime.hostLeft && (
        <span className='italic'>the keeper left · the fire burns down</span>
      )}
    </div>
  )
}

function Nick(props: { label: string }) {
  return (
    <span className='inline-flex items-center gap-1.5'>
      <span className='inline-block size-1.5 rounded-full bg-ember' />
      {props.label}
    </span>
  )
}
