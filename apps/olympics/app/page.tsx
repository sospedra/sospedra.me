import meta from '../data/meta.json'
import { Anchor } from '../services/anchor'
import { createFlag } from '../services/create-flag'
import { createName } from '../services/create-name'
import { createRanking } from '../services/create-ranking'
import { loadMedals } from '../services/medals'
import { loadRecords } from '../services/records'

const TREND_COLOR = {
  gt: 'text-green-500',
  lt: 'text-red-500',
  eq: '',
}

const trendOf = (diff: number) => {
  if (diff === 0) return 'eq'
  return diff > 0 ? 'gt' : 'lt'
}

export default function Home() {
  const ranking = createRanking(loadMedals(), loadRecords())
  const updatedAt = new Date(meta.updatedAt).toLocaleString('en-US', {
    timeZone: 'UTC',
  })

  return (
    <div>
      <main className='container mx-auto flex flex-col items-center justify-center'>
        <table className='table-auto border-collapse'>
          <thead className='text-sm xs:text-base'>
            <tr className='sticky top-0 bg-linear-to-b from-white via-white'>
              <th className='pt-2 pr-2 pb-5 text-left'>Rank</th>
              <th className='pt-2 pr-2 pb-5 text-left'>Country/NOC</th>
              <th className='pt-2 pr-2 pb-5 text-center'>
                <span role='img' aria-label='Gold medal'>
                  🥇
                </span>
              </th>
              <th className='pt-2 pr-2 pb-5'>
                <span role='img' aria-label='Silver medal'>
                  🥈
                </span>
              </th>
              <th className='pt-2 pr-2 pb-5'>
                <span role='img' aria-label='Bronze medal'>
                  🥉
                </span>
              </th>
              <th className='pt-2 pr-2 pb-5 text-left'>WR</th>
              <th className='pt-2 pr-2 pb-5 text-left'>OR</th>
              <th className='pt-2 pr-2 pb-5 text-left'>Score</th>
            </tr>
          </thead>
          <tbody className='text-sm xs:text-base'>
            {ranking.map((entry, index) => {
              const diff = entry.medal.classicRank - (index + 1)
              const trend = trendOf(diff)

              return (
                <tr
                  key={entry.noc}
                  className={`${index % 2 ? 'bg-yellow-50' : ''} ${
                    index === 2 ? 'border-b-2' : ''
                  }`}
                >
                  <td className='pr-2 font-mono'>
                    <span className='block whitespace-nowrap'>
                      <span className='pr-1'>{index + 1}</span>
                      <span className={`text-xs ${TREND_COLOR[trend]}`}>
                        {trend === 'gt' && '▲'}
                        {trend === 'lt' && '▼'}
                        {diff !== 0 && Math.abs(diff)}
                      </span>
                    </span>
                  </td>
                  <td className='py-1 pr-2 text-gray-900'>
                    {createFlag(entry.medal.name)}{' '}
                    {createName(entry.medal.name)}
                  </td>
                  <td className='pr-2 text-center text-gray-600'>
                    {entry.medal.gold}
                  </td>
                  <td className='pr-2 text-center text-gray-600'>
                    {entry.medal.silver}
                  </td>
                  <td className='pr-2 text-center text-gray-600'>
                    {entry.medal.bronze}
                  </td>
                  <td className='pr-2 text-center text-gray-600'>
                    {entry.records.wr}
                  </td>
                  <td className='pr-2 text-center text-gray-600'>
                    {entry.records.or}
                  </td>
                  <td className='pr-2 text-center'>
                    <b>{entry.score}</b>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className='flex w-full max-w-[475px] justify-end py-4'>
          <p className='pr-2 text-gray-700 text-xs'>
            Last updated at {updatedAt}
          </p>
        </div>
      </main>

      <footer className='container mx-auto flex flex-col items-center py-8 font-mono text-purple-900 text-sm'>
        <p>
          Made with{' '}
          <span className='text-xs' role='img' aria-label='love'>
            💜
          </span>{' '}
          by <Anchor href='https://sospedra.me'>@sospedra</Anchor>
        </p>
      </footer>
    </div>
  )
}
