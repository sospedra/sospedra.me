export type ShareOutcome = 'shared' | 'dismissed' | 'unsupported'

// a dismissed share sheet must not fall through to the clipboard
export const shareText = async (data: {
  text: string
  title?: string
}): Promise<ShareOutcome> => {
  if (!navigator.share) return 'unsupported'
  try {
    await navigator.share(data)
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'dismissed'
    }
    return 'unsupported'
  }
}
