import fs from 'fs'
import { join } from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

const postsDirectory = join(process.cwd(), '_papers')

export type Post = {
  title: string
  date: string
  slug: string
  coverImage: string
  excerpt: string
  content: string
  time: number
  ogImage: {
    url: string
  }
}

export function getPostSlugs() {
  return fs.readdirSync(postsDirectory)
}

export function getPostBySlug(slug: string, fields: string[] = []) {
  const realSlug = slug.replace(/\.md$/, '')
  const fullPath = join(postsDirectory, `${realSlug}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  const post: { [key: string]: any } = {}

  fields.forEach((field) => {
    if (field === 'slug') {
      post[field] = realSlug
    }
    if (field === 'content') {
      post[field] = content
      post.time = readingTime(content).minutes
    }

    if (data[field]) {
      post[field] = data[field]
    }
  })

  return post as Post
}

export function getAllPosts(fields: string[] = []) {
  const slugs = getPostSlugs()
  return slugs.map((slug) => getPostBySlug(slug, fields))
}
