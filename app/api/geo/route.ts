import type { NextRequest } from 'next/server'

// Vercel fills these at the edge; local dev has none of them
export function GET(request: NextRequest) {
  const json = (body: Record<string, unknown>) =>
    Response.json(body, {
      headers: { 'Cache-Control': 'private, no-store' },
    })

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

  const city = request.headers.get('x-vercel-ip-city')
  return json({
    located: true,
    lat,
    lon,
    city: city && decodeURIComponent(city),
    country: request.headers.get('x-vercel-ip-country'),
  })
}
