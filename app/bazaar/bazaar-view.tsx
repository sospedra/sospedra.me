'use client'

import cn from 'clsx'
import Cheatcodes from 'components/Cheatcodes'
import External from 'components/External'
import Link from 'components/Link'
import RouteHeader from 'components/RouteHeader'
import Shell from 'components/Shell'
import SpriteCar from 'components/Sprite/Car'
import SpriteMountain from 'components/Sprite/Mountain'
import { useState } from 'react'
import {
  BAZAAR_DESC,
  MANUAL_DESC,
  REWRITE_DESC,
  SERVE_DESC,
  USES_DESC,
} from 'service/descriptions'
import { useScroll } from 'service/scroll'
import css from './bazaar.module.css'

export default function BazaarView() {
  const [isHidden, setIsHidden] = useState(false)
  const scrollRef = useScroll((e) => {
    setIsHidden(e.target.scrollTop > 300)
  })

  return (
    <Shell canonical='/bazaar'>
      <div className={css.scroll} ref={scrollRef}>
        <div className={css.bazaar}>
          <RouteHeader
            title='Bazaar'
            sector='04'
            status='Open channel'
            description={BAZAAR_DESC}
          />

          <ul className={css.list}>
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
