import humanNumber from 'human-number'
import { Code as PlaceholderCode } from 'react-content-loader'
import { Circle, IssueIcon, Star } from '../components/icons.tsx'
import { track } from '../services/analytics.ts'
import type { Request } from '../services/github-api.ts'

const selectMessage = (total?: number) => {
  switch (total) {
    case 0:
      return (
        <p className='text-lg'>
          There are not requests that matches your criteria{' '}
          <span role='img' aria-label='shrug'>
            🤷🏻‍♂️
          </span>{' '}
          Try another search.
        </p>
      )
    case 1:
      return (
        <p className='text-lg'>
          There is <b>1</b> request that needs your help{' '}
          <span role='img' aria-label='muscle'>
            💪
          </span>
        </p>
      )
    default:
      return (
        <p className='text-lg'>
          There are <b>{total}</b> requests that need your help{' '}
          <span role='img' aria-label='hero'>
            🦸🏽‍♀️
          </span>
        </p>
      )
  }
}

export const List = (props: { requestList?: Request[]; total?: number }) => {
  if (!props.requestList) {
    return (
      <section className='w-full py-4 md:w-2/3'>
        <PlaceholderCode />
        <br />
        <PlaceholderCode />
      </section>
    )
  }

  return (
    <section className='w-full py-4'>
      {selectMessage(props.total)}
      <ul>
        {props.requestList.map(({ url, createdAt, body }) => (
          <li key={url} className='py-4 border-b sm:mx-4'>
            <a
              href={body.url}
              target='_blank'
              rel='noopener noreferrer'
              className='block text-lg text-blue-600 hover:text-blue-800'
              onClick={() => track('click_repo', body)}
            >
              {body.owner}/<b>{body.name}</b>
            </a>
            <p className='pt-1'>{body.description}</p>
            <div className='flex flex-row flex-wrap items-end w-full pt-1 text-sm'>
              {body.topics?.map((topic) => (
                <span
                  key={topic}
                  className='p-1 mb-1 mr-1 text-pink-500 bg-pink-100 rounded'
                >
                  {topic}
                </span>
              ))}
            </div>
            <p className='text-sm text-gray-700'>
              Requested on{' '}
              <b className='font-semibold'>{createdAt.toLocaleDateString()}</b>{' '}
              <a
                href={url}
                className='text-blue-600 hover:text-blue-800'
                target='_blank'
                rel='noopener noreferrer'
              >
                Has something changed since?
              </a>
            </p>
            <div className='flex flex-row pt-1 text-sm text-gray-700'>
              <span className='mr-4'>
                <Star /> {humanNumber(body.stars)}
              </span>
              <span className='flex flex-row items-center mr-4'>
                <Circle color={body.color} /> {body.language}
              </span>
              <span className='mr-4'>
                <IssueIcon /> {body.openIssues}
              </span>
              <span className='mr-4'>{body.license}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className='pt-4 text-sm italic text-gray-800'>
        <p>
          <b className='font-semibold'>
            ProTip
            <span aria-label='trademark' role='img'>
              ™️
            </span>{' '}
          </b>
          Results are limited to a{' '}
          <b className='font-semibold'>maximum of 100 items</b> per search.
        </p>
        <p>
          To get the best results{' '}
          <b className='font-semibold'>refine your query</b> or inspect the{' '}
          <a
            className='text-blue-600 hover:text-blue-800'
            href='https://github.com/sospedra/rfm'
          >
            repo
          </a>
        </p>
      </div>
    </section>
  )
}
