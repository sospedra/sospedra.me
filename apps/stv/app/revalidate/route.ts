import { revalidatePath } from 'next/cache'

/** cron target: purge the agenda at Madrid midnight, see vercel.json */
export function GET() {
  revalidatePath('/')
  return Response.json({ ok: true })
}
