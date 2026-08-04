import type { PlanMode } from 'services/plans'

export function Start(props: { onSelect: (mode: PlanMode) => void }) {
  return (
    <div className='flex flex-row'>
      <button
        className='flex flex-col items-center justify-center flex-1 p-4 mr-2 font-bold border-2 border-white rounded hover:underline'
        onClick={() => props.onSelect('long')}
        type='button'
      >
        <p>Start long session</p>
        <p>(1h 45min)</p>
      </button>
      <button
        className='flex flex-col items-center justify-center flex-1 p-4 ml-2 text-gray-400 border-2 border-gray-400 rounded hover:underline'
        onClick={() => props.onSelect('short')}
        type='button'
      >
        <p>Start short session</p>
        <p>(45 minutes)</p>
      </button>
    </div>
  )
}
