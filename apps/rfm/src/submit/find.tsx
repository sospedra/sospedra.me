import { useEffect, useState } from 'react'
import { ErrorBanner } from '../components/error-banner.tsx'
import { track } from '../services/analytics.ts'
import { createGithubRepoUrl, isValidGithubUrl } from '../services/github.ts'
import type { SubmitRequest } from '../services/github-api.ts'
import { Button } from './button.tsx'

export const Find = (props: {
  setRepoUrl: (repo: string) => void
  onNext: () => void
  error: unknown
  data?: SubmitRequest
}) => {
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (props.data?.fullName) {
      track('submit', { step: 'find' })
      props.onNext()
    } else {
      setLoading(false)
    }
  }, [props.data, props.onNext])

  return (
    <section className='flex flex-col w-full'>
      <h1 className='font-mono text-xl font-bold'>
        Add a new repository that needs maintance
      </h1>

      <form
        className='flex flex-col items-center w-full'
        onSubmit={(event) => {
          event.preventDefault()
          setLoading(true)
          props.setRepoUrl(createGithubRepoUrl(inputValue))
        }}
      >
        <div className='relative w-full md:w-2/3'>
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.currentTarget.value)}
            className='w-full py-2 pl-24 pr-4 my-4 border rounded shadow-lg'
            required
          />
          <span
            className='absolute text-gray-500'
            style={{
              left: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            github.com/
          </span>
        </div>

        <ErrorBanner error={props.error} />
        {props.data && !props.data?.fullName && (
          <div className='flex flex-col justify-center py-6 text-lg text-center'>
            <p>
              We couldn't find any repo named{' '}
              <b>
                {props.data?.owner}/{props.data?.name}
              </b>
            </p>
            <p>Try to copy and paste the link directly</p>
          </div>
        )}
        <Button disabled={!isValidGithubUrl(inputValue)} loading={loading}>
          Find repo
        </Button>
      </form>
    </section>
  )
}
