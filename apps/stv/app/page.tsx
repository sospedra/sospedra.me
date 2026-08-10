import { buildAgenda } from 'services/agenda'
import { fetchScores } from 'services/scores'
import { fetchSourceHtml, parseSourceAgenda } from 'services/source'
import { Agenda } from 'ui/agenda'

export const revalidate = 1800

const MADRID_CLOCK = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Madrid',
})

export default async function Page() {
  const now = Date.now()
  const [html, scores] = await Promise.all([
    fetchSourceHtml(),
    fetchScores(now),
  ])
  const agenda = buildAgenda(parseSourceAgenda(html, scores))

  return (
    <>
      <header className='flex flex-col items-center justify-center max-w-5xl pt-6 mx-auto'>
        <h1 className='text-2xl font-bold text-gradient'>SporTV</h1>
        <h2 className='font-semibold'>Agenda de deportes en TV</h2>
      </header>

      <main className='container flex flex-row items-center justify-center flex-1 max-w-6xl mx-auto md:p-8'>
        <Agenda agenda={agenda} />
      </main>

      <footer className='container flex flex-col items-center py-8 mx-auto font-mono text-sm text-purple-900'>
        <p className='pr-2 text-xs text-gray-700'>
          Last updated at {MADRID_CLOCK.format(now)}
        </p>

        <p>
          Made with{' '}
          <span aria-label='love' className='text-xs' role='img'>
            💜
          </span>{' '}
          by{' '}
          <a
            className='text-green-600 underline'
            href='https://sospedra.me'
            rel='noopener noreferrer'
            target='_blank'
          >
            @sospedra
          </a>
        </p>
      </footer>
    </>
  )
}
