const MONTH_INDEX: Record<string, number | undefined> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
}

export const parseSpanishDate = (date: string, time: string): number | null => {
  const dateParts = date.trim().toLowerCase().split(' de ')
  const timeParts = time.trim().split(':')
  if (dateParts.length !== 3 || timeParts.length !== 2) return null
  const [day, month, year] = dateParts
  const [hours, minutes] = timeParts
  const monthIndex = MONTH_INDEX[month]
  if (monthIndex === undefined) return null
  const unix = Date.UTC(
    Number(year),
    monthIndex,
    Number(day),
    Number(hours),
    Number(minutes),
  )
  return Number.isNaN(unix) ? null : unix
}
