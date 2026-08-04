import { DEFAULT_PLAYLIST_ID } from 'services/soundcloud'
import { Home } from 'ui/home'

export default function Page() {
  return <Home playlistID={DEFAULT_PLAYLIST_ID} />
}
