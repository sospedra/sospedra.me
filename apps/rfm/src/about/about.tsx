import Markdown from 'markdown-to-jsx/react'
import { Shell } from '../components/shell.tsx'

const md = `
### What's this?

RFM is community-driven platform to **track OSS repositories that need a maintainer** or support.

### Why?

You're interested in this project if you've been in any of these situations:

- As a **user**, you find and interesting library. But it seems unmaintained. How to know for sure?
- As a **maintainer**, you can't find anyone who wants to take the lead. Where to find them?
- As a **developer**, you want to contribute to the community but don't know where to start. Which projects need help?

### How does it work?

It heavily relies on the Github public API (which is awesome).

1. Every request is an Issue labeled as \`search\` in this repository.
2. The body of the issue contains a JSON with the searchable data.
3. It uses the Github Search API to find tickets.
4. To avoid undesired format errors the web has a request genertor, as well.

These are the main steps. Aside of it, RFM also checks that nobody use the platform as a spam weapon, checks for duplicates, ensures the data integrity, etc.

### Contribute

1. 🤗 [PRs](https://github.com/sospedra/rfm) are more than welcome
2. 🕵🏽‍♀️ [Add](/submit) any repo you find that's unmaintained
3. 🌎 Spread the word
4. Thank you!
`

export const About = () => {
  return (
    <Shell>
      <h1 className='font-mono text-xl font-bold text-center'>About RFM</h1>
      <h2 className='text-lg text-center'>
        Track OSS requests for maintainers
      </h2>
      <a
        href='https://www.producthunt.com/posts/request-for-maintainers?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-request-for-maintainers'
        className='justify-center w-full mt-4'
        target='_blank'
        rel='noopener noreferrer'
      >
        <img
          src='https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=195531&theme=dark'
          alt='Request for maintainers - Find any OSS project calling for collaborators | Product Hunt Embed'
          width='250'
          height='54'
        />
      </a>
      <article className='markdown-body'>
        <Markdown>{md}</Markdown>
      </article>
    </Shell>
  )
}
