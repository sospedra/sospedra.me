import * as cheerio from 'cheerio'
import { competitionFlag } from './competition-flag.ts'
import { findScore, type Match } from './scores.ts'
import { sportIcon } from './sport-icon.ts'
import type { TvEvent } from './types.ts'

const sourceUrl = (): string => {
  const url = process.env.SOURCE_URL
  if (!url) throw new Error('SOURCE_URL is not set')
  return url
}

export const fetchSourceHtml = async (): Promise<string> => {
  const response = await fetch(sourceUrl())
  if (!response.ok) throw new Error(`source answered ${response.status}`)
  return new TextDecoder('iso-8859-15').decode(await response.arrayBuffer())
}

export const parseSourceAgenda = (
  html: string,
  scores: readonly Match[],
): TvEvent[] => {
  const $ = cheerio.load(html)
  return $('ol .content-item')
    .toArray()
    .flatMap((item) => {
      const header = $(item).find('.title-section-widget').first()
      const weekday = header.find('strong').text().trim()
      const date = header.text().replace(weekday, '').trim()
      return $(item)
        .find('.dailyevent')
        .toArray()
        .map((element) => {
          const cell = (selector: string) =>
            $(element).find(selector).first().text().trim()
          const sport = cell('.dailyday')
          const competition = cell('.dailycompetition')
          const teams = cell('.dailyteams')
          const time = cell('.dailyhour')
          const score = findScore(scores, { sport, teams, time })
          return {
            channel: cell('.dailychannel'),
            competition,
            date,
            flag: competitionFlag(competition),
            icon: sportIcon(sport),
            matchtime: score.matchtime,
            result: score.result,
            sport,
            teams,
            time,
            weekday,
          }
        })
    })
}
