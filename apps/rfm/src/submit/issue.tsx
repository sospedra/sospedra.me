import Markdown from 'markdown-to-jsx/react'
import { useState } from 'react'
import { List as PlaceholderList } from 'react-content-loader'
import { createPortal } from 'react-dom'
import useSWR from 'swr'
import { ErrorBanner } from '../components/error-banner.tsx'
import { Comments } from '../components/icons.tsx'
import { track } from '../services/analytics.ts'
import { isValidGithubIssueUrl, NONE_ISSUE } from '../services/github.ts'
import {
  fetcherFindSupportIssues,
  type SubmitRequest,
} from '../services/github-api.ts'
import { Button } from './button.tsx'

export const Issue = (props: {
  onNext: () => void
  data?: SubmitRequest
  requestIssue: string
  setRequestIssue: (issue: string) => void
}) => {
  const [didSubmit, setDidSubmit] = useState(false)
  const isValidUrl = isValidGithubIssueUrl(props.requestIssue)
  const { data, error } = useSWR(
    props.data?.fullName
      ? (['support-issues', props.data.fullName] as const)
      : null,
    ([, fullName]) => fetcherFindSupportIssues(fullName),
  )

  return (
    <section>
      <h1 className='font-mono text-xl font-bold'>Enter the issue link</h1>
      <h3 className='text-lg'>
        To ensure the best communication we need to know in which Github issue
        the owners of <b>{props.data?.fullName}</b> requested support to
        maintain the project
      </h3>
      <form
        id='js-submit-issue'
        className='flex flex-col items-center w-full'
        onSubmit={(event) => {
          event.preventDefault()
          setDidSubmit(true)
          track('submit', { step: 'issue' })
          props.onNext()
        }}
      >
        <div className='w-full md:w-2/3'>
          <ErrorBanner error={error} />
          <input
            id='githubRepo'
            value={props.requestIssue}
            onChange={(event) =>
              props.setRequestIssue(event.currentTarget.value)
            }
            placeholder={`github.com/${props.data?.fullName}/:number`}
            className='w-full px-4 py-2 my-4 border rounded shadow-lg'
            required
          />

          <div className='flex flex-col flex-1 w-full'>
            <p className='pt-4 font-mono text-xs font-bold text-left text-gray-600'>
              Suggestions
            </p>
            <p className='pb-2 text-left'>Maybe it's one of these</p>
            {data?.requestList.map(
              ({ id, url, title, user, createdAt, comments, number, body }) => (
                <label
                  key={id}
                  className='flex flex-row items-baseline p-4 transition-colors duration-150 border-t cursor-pointer has-[:checked]:bg-pink-50'
                >
                  <input
                    name='issue'
                    type='radio'
                    value={url}
                    checked={props.requestIssue === url}
                    onChange={(event) =>
                      props.setRequestIssue(event.currentTarget.value)
                    }
                  />
                  <div className='flex-1 px-4 text-left'>
                    <p className='font-bold'>
                      <span className='text-sm'>#{number}</span> {title}
                    </p>
                    <div className='w-full text-xs italic text-gray-600 markdown'>
                      <Markdown>{body?.slice(0, 140) ?? ''}</Markdown>
                      {'... '}
                      <a
                        href={url}
                        className='text-blue-500 hover:text-blue-800'
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        view more
                      </a>
                    </div>
                    <p className='text-sm text-gray-800'>
                      Opened by <b>{user}</b> at{' '}
                      <span>{createdAt?.toLocaleDateString()}</span>{' '}
                      <Comments /> {comments}
                    </p>
                  </div>
                </label>
              ),
            )}
            {data ? (
              <label className='flex flex-row items-baseline p-4 transition-colors duration-150 border-t cursor-pointer has-[:checked]:bg-pink-50'>
                <input
                  name='issue'
                  type='radio'
                  value={NONE_ISSUE}
                  checked={props.requestIssue === NONE_ISSUE}
                  onChange={(event) =>
                    props.setRequestIssue(event.currentTarget.value)
                  }
                />
                <div className='flex-1 px-4 text-left'>
                  <p className='font-bold'>No issue exists</p>
                  <p className='text-sm text-yellow-700'>
                    <span>⚠️</span>This action is discouraged
                  </p>
                  <p className='text-sm text-gray-800'>
                    If no issue calling for maintainers exists yet we'll create
                    one. However, we recommend asking the current repo's owner
                    first.
                  </p>
                </div>
              </label>
            ) : (
              <PlaceholderList />
            )}
          </div>
        </div>

        {createPortal(
          <div
            className={`sticky bottom-0 left-0 right-0 flex justify-center w-full p-2 bg-white transition-transform duration-200 ease-out starting:translate-y-full motion-reduce:transition-none ${
              didSubmit ? 'translate-y-full' : ''
            }`}
          >
            <Button disabled={!isValidUrl} form='js-submit-issue'>
              Select request issue
            </Button>
          </div>,
          document.getElementsByTagName('main')[0],
        )}
      </form>
    </section>
  )
}
