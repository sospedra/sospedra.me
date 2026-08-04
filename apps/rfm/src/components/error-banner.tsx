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
    <aside className='p-4 m-6 text-red-700 border border-red-700 rounded'>
      Something went wrong. Check the report details in the console.
    </aside>
  )
}
