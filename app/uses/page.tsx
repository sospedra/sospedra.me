import External, { TWITTER } from 'components/External'
import Link from 'components/Link'
import RouteHeader from 'components/RouteHeader'
import Shell from 'components/Shell'
import type { Metadata, Route } from 'next'
import { USES_DESC } from 'service/descriptions'
import cssNeon from 'service/style/neon.module.css'
import uses from './uses.json'
import css from './uses.module.css'

export const metadata: Metadata = {
  title: 'Uses',
  description: USES_DESC,
  alternates: { canonical: '/uses' },
}

export default function UsesPage() {
  return (
    <Shell canonical='/uses' className={css.frame}>
      <RouteHeader
        title='Uses'
        sector='04.2'
        status='Inventory ready'
        description={
          <p>
            The tools behind every part of my work. The idea comes from{' '}
            <External href='https://uses.tech'>uses.tech</External>. If you
            don't agree, <External href={TWITTER}>fight me</External>.
          </p>
        }
      />

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
                    <Link url={item.url as Route} className={cssNeon.neon}>
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
