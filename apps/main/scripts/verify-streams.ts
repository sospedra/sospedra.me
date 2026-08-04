const MAX_CONCURRENCY = 6
const STREAM_TIMEOUT_MS = 10_000
const MIN_AUDIO_BYTES = 1_024
const MAX_PLAYLIST_BYTES = 64 * 1_024

export type StreamVerdict = {
  status: number | null
  contentType: string | null
  bytesRead: number
  finalUrl: string | null
  working: boolean
  reason: string | null
}

export type StreamTarget = {
  streamUrl: string
  accept: string
  userAgent: string
  isAudio?: (contentType: string) => boolean
  isPlaylist?: (contentType: string) => boolean
  responseCheck?: (response: Response) => string | null
}

type ProbeState = {
  status: number | null
  contentType: string | null
  bytesRead: number
  finalUrl: string | null
}

export const contentTypeOf = (response: Response): string =>
  response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ??
  ''

export const isAudioContentType = (contentType: string): boolean =>
  contentType.startsWith('audio/') || contentType === 'application/octet-stream'

const failure = (state: ProbeState, reason: string): StreamVerdict => ({
  ...state,
  working: false,
  reason,
})

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError'

const drainBytes = async (
  body: NonNullable<Response['body']>,
  byteGoal: number,
  state: ProbeState,
) => {
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  while (state.bytesRead < byteGoal) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      state.bytesRead += value.byteLength
    }
  }
  void reader.cancel().catch(() => undefined)
  return chunks
}

const playlistVerdict = (chunks: Uint8Array[]) => {
  const body = new TextDecoder().decode(
    Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
  )
  const working = body.trimStart().startsWith('#EXTM3U')
  return { working, reason: working ? null : 'invalid HLS playlist' }
}

const audioVerdict = (
  contentType: string,
  bytesRead: number,
  isAudio: (contentType: string) => boolean,
) => {
  const working = bytesRead >= MIN_AUDIO_BYTES && isAudio(contentType)
  return {
    working,
    reason: working
      ? null
      : `expected audio bytes, received ${contentType || 'no content type'}`,
  }
}

const probeStream = async (
  target: StreamTarget,
  signal: AbortSignal,
  state: ProbeState,
): Promise<StreamVerdict> => {
  const response = await fetch(target.streamUrl, {
    headers: {
      Accept: target.accept,
      'Icy-MetaData': '0',
      'User-Agent': target.userAgent,
    },
    redirect: 'follow',
    signal,
  })
  const contentType = contentTypeOf(response)
  state.status = response.status
  state.contentType = contentType
  state.finalUrl = response.url

  if (!response.ok) return failure(state, `HTTP ${response.status}`)
  const rejection = target.responseCheck?.(response)
  if (rejection) return failure(state, rejection)
  if (!response.body) return failure(state, 'empty response body')

  const playlist = target.isPlaylist?.(contentType) ?? false
  const chunks = await drainBytes(
    response.body,
    playlist ? MAX_PLAYLIST_BYTES : MIN_AUDIO_BYTES,
    state,
  )
  const verdict = playlist
    ? playlistVerdict(chunks)
    : audioVerdict(
        contentType,
        state.bytesRead,
        target.isAudio ?? isAudioContentType,
      )
  return { ...state, ...verdict }
}

/* the timeout can strike after a 2xx stream already sent enough audio; that stream works */
const settleFailure = (
  error: unknown,
  state: ProbeState,
  isAudio: (contentType: string) => boolean,
): StreamVerdict => {
  if (!isAbortError(error)) {
    return failure(
      state,
      error instanceof Error ? error.message : 'unknown network error',
    )
  }
  const deliveredAudio =
    state.status !== null &&
    state.status >= 200 &&
    state.status < 300 &&
    state.bytesRead >= MIN_AUDIO_BYTES &&
    state.contentType !== null &&
    isAudio(state.contentType)
  if (!deliveredAudio) {
    return failure(state, `timeout after ${state.bytesRead} bytes`)
  }
  return { ...state, working: true, reason: null }
}

export const verifyStream = async (
  target: StreamTarget,
): Promise<StreamVerdict> => {
  const state: ProbeState = {
    status: null,
    contentType: null,
    bytesRead: 0,
    finalUrl: null,
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS)
  try {
    return await probeStream(target, controller.signal, state)
  } catch (error) {
    return settleFailure(error, state, target.isAudio ?? isAudioContentType)
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
}

export const runPool = async <Item, Verdict>(
  items: readonly Item[],
  verify: (item: Item) => Promise<Verdict>,
): Promise<Verdict[]> => {
  const results: Verdict[] = []
  let nextIndex = 0
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await verify(items[index])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENCY, items.length) }, worker),
  )
  return results
}
