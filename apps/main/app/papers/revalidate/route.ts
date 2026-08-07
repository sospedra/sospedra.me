import { revalidateTag } from 'next/cache'

/** dev-only: metadata.json edits bypass the compiler, so the papers tag needs a manual kick */
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return new Response(null, { status: 404 })
  }
  revalidateTag('papers', 'max')
  return Response.json({ ok: true })
}
