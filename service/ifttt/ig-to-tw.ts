import { sendPhoto } from 'service/telegram'

const findHashtags = (parts: string[], index: number): number => {
  if (parts[index].includes('#')) return index
  if (index === 0) return -1
  return findHashtags(parts, index - 1)
}

const findHead = (parts: string[], index: number): number => {
  if (parts[index]) return index
  if (parts.length - 1 === index) return -1
  return findHead(parts, index + 1)
}

/**
 * The data from Instagram comes from an IFTTT applet.
 * In raw text, the format is:
 * {sourceUrl}
 * ###
 * {caption}
 */
export const igToTw = async (fromInstagram: string) => {
  const parts = fromInstagram.split('###').map((x) => x.trim())
  const photo = parts[0].replace(/\\n/g, '')
  const captionParts = parts[1].split(/\\n/).filter((x) => x !== '.')
  const headLine = findHead(captionParts, 0)
  const hashtagsLine = findHashtags(captionParts, captionParts.length - 1)
  const hashtags = captionParts[hashtagsLine].match(/#[^\s#]*/gim)
  const content = captionParts
    .slice(headLine, hashtagsLine)
    .join('\n')
    .replace(/\n\s*\n/g, '\n')
  const caption = `${content}\n${hashtags?.slice(0, 3).join(' ')}`

  return sendPhoto({
    chatID: '@prosoque',
    photo,
    caption,
  })
}
