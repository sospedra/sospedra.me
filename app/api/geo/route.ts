import type { NextRequest } from 'next/server'

const json = (body: Record<string, unknown>) =>
  Response.json(body, {
    headers: { 'Cache-Control': 'private, no-store' },
  })

// city arrives percent-encoded; a malformed sequence keeps the raw value
const decodedHeader = (value: string | null): string | undefined => {
  if (!value) return undefined
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// Vercel fills these at the edge; local dev has none of them
export function GET(request: NextRequest) {
  // Number(null) is 0, so absent headers must bail before the cast
  const rawLat = request.headers.get('x-vercel-ip-latitude')
  const rawLon = request.headers.get('x-vercel-ip-longitude')
  if (!rawLat || !rawLon) {
    return json({ located: false })
  }

  const lat = Number(rawLat)
  const lon = Number(rawLon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ located: false })
  }

  return json({
    located: true,
    lat,
    lon,
    city: decodedHeader(request.headers.get('x-vercel-ip-city')),
    country: request.headers.get('x-vercel-ip-country') ?? undefined,
  })
}
