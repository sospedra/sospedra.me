import { feature } from 'topojson-client'
import land from './data/land.json'

/** Names the topojson types without importing a module that is not hoisted. */
type Topology = Parameters<typeof feature>[0]
type Collection = Parameters<typeof feature>[1]

const topology = land as unknown as Topology

/** World coastlines at 110m, shared by the world map and any globe. */
export const WORLD_LAND = feature(topology, topology.objects.land as Collection)
