import { GetStaticProps } from 'next'
import { getPostBySlug, getAllPosts } from 'service/api'
import markdownToHtml from 'service/markdown'

export { default } from 'components/papers/slug'

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const post = getPostBySlug(params?.slug as string, [
    'content',
    'coverImage',
    'excerpt',
    'ogImage',
    'readingMinutes',
    'slug',
    'timeStamp',
    'title',
  ])
  const content = await markdownToHtml(post.content || '')

  return {
    props: {
      post: {
        ...post,
        content,
      },
    },
  }
}

export async function getStaticPaths() {
  const posts = getAllPosts(['slug'])

  return {
    paths: posts.map((posts) => {
      return {
        params: {
          slug: posts.slug,
        },
      }
    }),
    fallback: false,
  }
}
