import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { DecorDoc } from '../../decor'
import { decorDocSchema, serializeDoc } from '../serialize'

type Issue = { path: PropertyKey[]; message: string }

const issueSummary = (issues: Issue[]) =>
  issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(' · ')

/** dev-only: the editor writes decor.json straight into the repo */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return new Response(null, { status: 404 })
  }
  const parsed = decorDocSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json(
      { error: issueSummary(parsed.error.issues) },
      { status: 400 },
    )
  }
  const file = path.join(process.cwd(), 'app', 'bazaar', 'decor.json')
  await writeFile(file, serializeDoc(parsed.data as DecorDoc), 'utf8')
  return Response.json({ ok: true })
}
