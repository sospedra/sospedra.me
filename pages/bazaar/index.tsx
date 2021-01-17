import { useState, useEffect } from 'react'
import { NextPage } from 'next'
import cn from 'classnames'
import { STACK_DESC } from 'pages/stack'
import { SERVE_DESC } from 'pages/serve'
import { REWRITE_DESC } from 'pages/rewrite'
import { USES_DESC } from 'pages/uses'
import { MANUAL_DESC } from 'pages/manual'
import { useScroll } from 'service/scroll'
import Link, { LinkBack } from 'components/Link'
import Shell from 'components/Shell'
import SpriteMountain from 'components/Sprite/Mountain'
import SpriteCar from 'components/Sprite/Car'
import Cheatcodes from 'components/Cheatcodes'
import External from 'components/External'
import css from './bazaar.module.css'

const BAZAAR_DESC = 'Gallery of my featured projects'

const Bazaar: NextPage = () => {
  const [isHidden, setIsHidden] = useState(false)
  const [intent, setIntent] = useState(false)
  const scrollRef = useScroll((e) => {
    return e.target.scrollTop > 300 ? setIntent(true) : setIntent(false)
  })

  useEffect(() => {
    if (intent !== isHidden) {
      setIsHidden(intent)
    }
  }, [intent, isHidden])

  return (
    <Shell title='Bazaar' description={BAZAAR_DESC} canonical='/bazaar'>
      <div className='w-full h-screen overflow-auto' ref={scrollRef}>
        <div className={css.bazaar}>
          <Link url='/'>
            <LinkBack>Home</LinkBack>
          </Link>
          <h1 className='font-serif text-4xl text-cyan-300'>Bazaar</h1>
          <p>{BAZAAR_DESC}</p>

          <ul className={css.list}>
            <li>
              <Link className={css.title} url='/stack'>
                the stack
              </Link>
              <p>{STACK_DESC}</p>
            </li>
            <li>
              <Link className={css.title} url='/manual'>
                user guide manual
              </Link>
              <p>{MANUAL_DESC}</p>
            </li>
            <li>
              <Link className={css.title} url='/uses'>
                uses
              </Link>
              <p>{USES_DESC}</p>
            </li>
            <li>
              <Link className={css.title} url='/serve'>
                serve assets
              </Link>
              <p>{SERVE_DESC}</p>
            </li>
            <li>
              <Link className={css.title} url='/rewrite'>
                rewrites
              </Link>
              <p>{REWRITE_DESC}</p>
            </li>
            <li>
              <Cheatcodes className={css.title} />
              <p>wait wat?</p>
            </li>
            <li>
              <External href='https://rfm.sospedra.me' className={css.title}>
                rfm
              </External>
              <p>
                Track OSS <b>requests for maintainers</b>. Find any project
                calling for collaborators.
              </p>
            </li>
            <li>
              <External
                href='https://reinput.sospedra.me'
                className={css.title}
              >
                reinput
              </External>
              <p>A React Native TextInput with material style 😎</p>
            </li>
            <li>
              <External href='https://spg.sospedra.me' className={css.title}>
                spg
              </External>
              <p>
                Secure passwords that humans can read 🗝
                <br />
                Generate passwords that are semantically correct. The passwords
                are more secure the longer they are. They don't need symbols or
                special characters at all. We end up using cryptic passwords
                that are impossible to type. This generator uses NLP technology
                to create semantically meaningful passwords.
              </p>
            </li>
            <li>
              <External
                href='https://keycodes.sospedra.me'
                className={css.title}
              >
                which key code
              </External>
              <p>Which keys map to what keyboard code?</p>
            </li>
          </ul>
        </div>
      </div>
      <aside
        className={cn(css.offscreen, {
          [css.hidden]: isHidden,
        })}
      >
        <div className={css.car}>
          <SpriteCar />
        </div>
        <SpriteMountain />
      </aside>
    </Shell>
  )
}

export default Bazaar
