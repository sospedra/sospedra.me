import { getAllPosts } from 'service/api'

export { default } from 'components/papers'

export async function getStaticProps() {
  const allPosts = getAllPosts([
    'excerpt',
    'readingMinutes',
    'slug',
    'timeStamp',
    'title',
  ])

  return {
    props: { allPosts },
  }
}
