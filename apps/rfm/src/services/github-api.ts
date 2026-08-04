const GITHUB_ROOT = 'https://api.github.com'

export type SubmitRequest = {
  aceMode?: string
  aliases?: string[]
  color?: string
  description: string | null
  extensions?: string[]
  filenames?: string[]
  fullName: string
  owner: string
  name: string
  group?: string
  interpreters?: string[]
  language: string | null
  license?: string
  requestIssueFullName: string
  requestIssueNumber: number
  openIssues: number
  stars: number
  topics?: string[]
  updatedAt: string
  url: string
}

export type Request = {
  body: SubmitRequest
  comments: number
  createdAt: Date
  title: string
  id: number
  updatedAt: Date
  url: string
}

type GithubSearchIssue = {
  body: string
  comments: number
  created_at: string
  html_url: string
  id: number
  number: number
  title: string
  updated_at: string
  user: { login: string }
}

type GithubSearchResponse = {
  items: GithubSearchIssue[]
  total_count: number
}

type GithubRepo = {
  description: string | null
  full_name?: string
  html_url: string
  language: string | null
  license?: { spdx_id?: string } | null
  open_issues_count: number
  stargazers_count: number
  topics?: string[]
  updated_at: string
}

export const fetcherRequestList = async (query = '') => {
  const params = [
    'repo:sospedra/rfm',
    'state:open',
    'label:search',
    query,
    'in:title,body',
  ]
  const path = `${GITHUB_ROOT}/search/issues?q=${params.join('+')}&per_page=100`
  const response = await fetch(path)
  const payload = (await response.json()) as GithubSearchResponse
  const requestList = payload.items
    .map((item): Request | null => {
      try {
        return {
          body: JSON.parse(item.body) as SubmitRequest,
          id: item.id,
          comments: item.comments,
          createdAt: new Date(item.created_at),
          title: item.title,
          updatedAt: new Date(item.updated_at),
          url: item.html_url,
        }
      } catch {
        return null
      }
    })
    .filter((item) => item !== null)

  return {
    requestList,
    total: payload.total_count,
  }
}

const safe = <K extends string, V>(key: K, value: V | null | undefined) =>
  value ? ({ [key]: value } as Record<K, V>) : {}

export const fetcherSubmitRequest = async (repoUrl: string) => {
  const [, pathname = ''] = repoUrl.split('github.com/')
  const [owner = '', name = ''] = pathname.split('/')
  const response = await fetch(`${GITHUB_ROOT}/repos/${owner}/${name}`)
  const payload = (await response.json()) as GithubRepo
  const { default: langmap } = await import('language-map')
  const language = payload.language ? langmap[payload.language] : undefined
  const repo: SubmitRequest = {
    description: payload.description,
    fullName: payload.full_name ?? '',
    language: payload.language,
    name,
    openIssues: payload.open_issues_count,
    owner,
    stars: payload.stargazers_count,
    updatedAt: payload.updated_at,
    url: payload.html_url,
    requestIssueFullName: 'NONE',
    requestIssueNumber: -1,
    ...safe('license', payload.license?.spdx_id),
    ...safe('topics', payload.topics),
    ...safe('filenames', language?.filenames),
    ...safe('aceMode', language?.aceMode),
    ...safe('aliases', language?.aliases),
    ...safe('color', language?.color),
    ...safe('extensions', language?.extensions),
    ...safe('group', language?.group),
    ...safe('interpreters', language?.interpreters),
  }

  return repo
}

export const fetcherFindSupportIssues = async (fullName: string) => {
  const params = [
    `repo:${fullName}`,
    'state:open',
    'type:issue',
    'support OR maintain',
    'in:title,body',
  ]
  const path = `${GITHUB_ROOT}/search/issues?q=${params.join('+')}&per_page=10`
  const response = await fetch(path)
  const payload = (await response.json()) as GithubSearchResponse
  const requestList = payload.items.map((item) => ({
    id: item.id,
    body: item.body,
    comments: item.comments,
    createdAt: new Date(item.created_at),
    title: item.title,
    url: item.html_url,
    user: item.user.login,
    number: item.number,
  }))

  return {
    requestList,
    total: payload.total_count,
  }
}

export type SupportIssue = Awaited<
  ReturnType<typeof fetcherFindSupportIssues>
>['requestList'][number]
