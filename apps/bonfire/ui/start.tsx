import type { PlanMode } from 'services/plans'

const BUTTON =
  'flex flex-1 flex-col items-center gap-1 rounded-xl border p-4 transition duration-150 ease-out-strong active:scale-[0.98]'

export function Start(props: { onSelect: (mode: PlanMode) => void }) {
  return (
    <div className='flex w-full flex-col gap-4'>
      <p className='text-center text-[11px] tracking-[0.3em] text-ash uppercase'>
        no pause · no skip
      </p>
      <div className='flex w-full flex-col gap-3 sm:flex-row'>
        <button
          className={`${BUTTON} border-ember/60 bg-ember/10 text-firelight hover:border-ember hover:bg-ember/15`}
          onClick={() => props.onSelect('long')}
          type='button'
        >
          <span className='font-semibold'>Start long session</span>
          <span className='text-xs text-ash'>1 h 45 min · 4 work blocks</span>
        </button>
        <button
          className={`${BUTTON} border-white/15 text-ash hover:border-white/35 hover:text-firelight`}
          onClick={() => props.onSelect('short')}
          type='button'
        >
          <span className='font-semibold'>Start short session</span>
          <span className='text-xs text-ash'>45 min · 2 work blocks</span>
        </button>
      </div>
    </div>
  )
}
