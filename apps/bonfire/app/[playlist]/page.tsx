import { Home } from 'ui/home'

export default async function Page(props: {
  params: Promise<{ playlist: string }>
}) {
  const { playlist } = await props.params
  return <Home playlistID={playlist} />
}
