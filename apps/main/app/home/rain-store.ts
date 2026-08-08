import { createExternalStore } from 'services/external-store'
import { fetchJson } from 'services/http'
import { fetchVisitorLocation } from 'services/visitor-location'
import * as z from 'zod/mini'

// WMO weather codes: drizzle and rain 51-67, rain showers 80-82, thunderstorm 95-99
const RAIN_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
])

const weatherSchema = z.object({
  current: z.object({
    precipitation: z.catch(z.number(), 0),
    weather_code: z.catch(z.number(), 0),
  }),
})

export const rainStore = createExternalStore(false)

let userChose = false
let checked = false

export const toggleRain = () => {
  userChose = true
  rainStore.set(!rainStore.get())
}

const weatherUrl = ({ lat, lon }: { lat: number; lon: number }) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(1)}&longitude=${lon.toFixed(1)}&current=precipitation,weather_code`

// One check per page load: start the rain when the visitor's sky rains, and
// never override a choice the visitor already made through the moon.
export const syncRainToWeather = async (): Promise<void> => {
  if (checked) return
  checked = true

  const visitor = await fetchVisitorLocation()
  if (visitor?.lat === undefined || visitor.lon === undefined) return

  const weather = await fetchJson(
    weatherUrl({ lat: visitor.lat, lon: visitor.lon }),
    weatherSchema,
  ).catch(() => null)
  if (!weather || userChose) return

  const { precipitation, weather_code } = weather.current
  const raining = precipitation > 0 || RAIN_CODES.has(weather_code)
  if (raining) rainStore.set(true)
}
