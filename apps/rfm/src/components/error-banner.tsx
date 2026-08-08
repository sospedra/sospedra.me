import { useEffect } from 'react'

export const ErrorBanner = (props: { error: unknown }) => {
  useEffect(() => {
    if (props.error) {
      // biome-ignore lint/suspicious/noConsole: the visible copy points users at the console report
      console.error(props.error)
    }
  }, [props.error])

  if (!props.error) return null

  return (
    <aside className='p-4 m-6 text-red-700 transition-[opacity,scale] duration-200 ease-out border border-red-700 rounded starting:opacity-0 starting:scale-[0.98] motion-reduce:starting:scale-100'>
      Something went wrong. Check the report details in the console.
    </aside>
  )
}
