import React from 'react'
import Shell from 'components/sospedra/Shell'
import SpriteBust from 'components/sospedra/Sprite/Bust'
import Link, { LinkBack } from 'components/sospedra/Link'
import css from './about.module.css'

const About: React.FC<{}> = () => {
  return (
    <Shell
      title='About'
      className='relative w-full h-full max-w-2xl px-4 pt-12 pb-20 mx-auto text-gray-200'
      description='javascript hacker ▼ fullstack engineer contractor'
    >
      <Link url='/'>
        <LinkBack>Home</LinkBack>
      </Link>

      <article className={css.content}>
        <h1 className='pt-2 pb-8 font-serif text-3xl text-cyan-300'>
          Who framed Rubén Sospedra?{' '}
          <span role='img' aria-label='rabbit'>
            🐇
          </span>
        </h1>

        <p>
          I’m a 29-years old developer amazed by the web. I think a lot about
          how it works deep inside, how to improve those things that I already
          know and the best way to implement every new thing that came to me. I
          tend to find myself hacking with Javascript a lot.
        </p>

        <h2 className={css.header2}>
          ｊａｖａｓｃｒｉｐｔ&nbsp;&nbsp;&nbsp;&nbsp;ｈａｃｋｅｒ
          <br />
          ｆｕｌｌｓｔａｃｋ ｅｎｇｉｎｅｅｒ
        </h2>

        <p>
          I really love this language, it’s a double-edged sword with which you
          can make really messy things or the most amazing piece of code never
          seen. I strongly believe that if you go for it, you can go wrong. It
          may cost contempt or loneliness. But It’ll be worth it
        </p>

        <p>
          Right now I’m pursuing with this strength to evolve and improve myself
          as an engineer. And I'm available to hire as an independent
          contractor.
        </p>

        <a
          href='mailto:hello@sospedra/me'
          className='text-xl font-bold text-cyan-400'
        >
          Hire me
        </a>
      </article>

      <div className={css.sprite}>
        <SpriteBust />
      </div>
    </Shell>
  )
}

export default About
