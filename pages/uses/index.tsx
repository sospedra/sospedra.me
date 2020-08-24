import { NextPage } from 'next'
import Shell from 'components/Shell'
import Link, { LinkBack } from 'components/Link'
import External, { TWITTER } from 'components/External'
import cssNeon from 'service/style/neon.module.css'
import uses from './uses.json'
import css from './uses.module.css'

export const USES_DESC =
  'The specifics of the piece of software and hardware I use every day. Highly opinionated.'

const Uses: NextPage<{}> = () => {
  return (
    <Shell
      canonical='/uses'
      className='relative w-full max-w-2xl min-h-full px-4 pt-12 pb-20 mx-auto text-white'
      description={USES_DESC}
      title='About'
    >
      <Link url='/'>
        <LinkBack>Home</LinkBack>
      </Link>
      <h1 className='pt-4 font-serif text-4xl text-cyan-400'>Uses</h1>
      <p className='-mb-16'>
        I tend to dive into discussions about the tools used for different parts
        of my work, so inspired by{' '}
        <External href='https://uses.tech'>uses.tech</External>, I've put
        together this "uses" page that covers every part of my setup. If you
        don't agree, <External href={TWITTER}>fight me</External>.
      </p>

      {uses.map((section) => (
        <section className={css.section} key={section.title}>
          <h2>{section.title}</h2>
          <ul>
            {section.items.map((item) => (
              <li key={item.title}>
                <h3>
                  {item.url.includes('http') ? (
                    <External href={item.url}>{item.title}</External>
                  ) : (
                    <Link url={item.url} className={cssNeon.neon}>
                      {item.title}
                    </Link>
                  )}
                </h3>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Shell>
  )
}

export default Uses
