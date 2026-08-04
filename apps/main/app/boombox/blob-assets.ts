const BLOB = 'https://2nvntiogo7b5zhfu.public.blob.vercel-storage.com/boombox'

export const clipUrl = (id: string) => `${BLOB}/clips/${id}.mp3`
export const coverUrl = (id: string) => `${BLOB}/covers/${id}.jpg`
