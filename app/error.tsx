'use client'

// the root boundary rides the intact root layout, so fonts and global
// styles survive; only layout crashes would need more than this
export default function RootError(props: { reset: () => void }) {
  return (
    <main className='flex h-dvh w-screen flex-col items-center justify-center gap-6'>
      <h1 className='text-2xl'>Signal lost ▼</h1>
      <p>The page hit an unexpected error.</p>
      <button
        type='button'
        onClick={props.reset}
        className='cursor-pointer border border-current px-4 py-2'
      >
        Retry
      </button>
    </main>
  )
}
