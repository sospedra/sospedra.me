export const formatTime = (milliseconds: number): string => {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '00:00'
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const extensionStart = (fileName: string): number => {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex >= 0 && dotIndex < fileName.length - 1 ? dotIndex : -1
}

export const extensionOf = (fileName: string): string => {
  const dotIndex = extensionStart(fileName)
  return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toUpperCase() : 'AUDIO'
}

export const stemOf = (fileName: string): string => {
  const dotIndex = extensionStart(fileName)
  return dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName
}
