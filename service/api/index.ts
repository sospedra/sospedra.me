import fs from 'fs'
import { join } from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

const postsDirectory = join(process.cwd(), '_papers')

export type Post = {
  title: string
  timeStamp: string
  slug: string
  coverImage: string
  excerpt: string
  content: string
  readingMinutes: number
  ogImage: {
    url: string
  }
}

export function getPostSlugs() {
  return fs.readdirSync(postsDirectory)
}

export function getPostBySlug(slug: string, fields: string[] = []) {
  const realSlug = slug.replace(/\.md$/, '')
  const fullPath = join(postsDirectory, realSlug, 'index.md')
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  const post: { [key: string]: any } = {}

  fields.forEach((field) => {
    if (field === 'slug') {
      post[field] = realSlug
    }
    if (field === 'content') {
      post[field] = content
    }
    if (field === 'readingMinutes') {
      post.readingMinutes = readingTime(content).minutes
    }

    if (data[field]) {
      post[field] = data[field]
    }
  })

  return post as Post
}

export function getAllPosts(fields: string[] = []) {
  const slugs = getPostSlugs()
  return slugs.filter((x) => x).map((slug) => getPostBySlug(slug, fields))
}
