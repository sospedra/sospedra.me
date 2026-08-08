import { animated, useTransition } from '@react-spring/web'
import { useCallback, useState } from 'react'
import useSWR from 'swr'
import { Progress } from '../components/progress.tsx'
import { Shell } from '../components/shell.tsx'
import { fetcherSubmitRequest } from '../services/github-api.ts'
import { Find } from './find.tsx'
import { Issue } from './issue.tsx'
import { Preview } from './preview.tsx'

export const Submit = () => {
  const [repoUrl, setRepoUrl] = useState('')
  const [requestIssue, setRequestIssue] = useState('')
  const { data, error } = useSWR(repoUrl || null, fetcherSubmitRequest)
  const [index, setIndex] = useState(0)
  const onNext = useCallback(() => setIndex((state) => (state + 1) % 3), [])
  const transitions = useTransition(index, {
    from: { opacity: 0, transform: 'translate3d(24px, 0, 0)' },
    enter: { opacity: 1, transform: 'translate3d(0px, 0, 0)' },
    leave: { opacity: 0, transform: 'translate3d(-24px, 0, 0)' },
    config: { frequency: 0.3, damping: 1 },
  })

  return (
    <Shell>
      <div className='flex flex-col items-center justify-center w-full text-center md:p-8'>
        <Progress ratio={(index + 1) / 3} />
        <div className='grid w-full'>
          {transitions((style, step) => (
            <animated.div
              className='col-start-1 row-start-1 w-full'
              style={style}
            >
              {
                [
                  <Find
                    key='find'
                    onNext={onNext}
                    setRepoUrl={setRepoUrl}
                    error={error}
                    data={data}
                  />,
                  <Issue
                    key='issue'
                    onNext={onNext}
                    data={data}
                    requestIssue={requestIssue}
                    setRequestIssue={setRequestIssue}
                  />,
                  <Preview
                    key='preview'
                    data={data}
                    requestIssue={requestIssue}
                  />,
                ][step]
              }
            </animated.div>
          ))}
        </div>
      </div>
    </Shell>
  )
}
