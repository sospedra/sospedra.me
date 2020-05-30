import { NextRouter } from 'next/router'
import Hashids from 'hashids'
import rewrites from './rewrites.json'

const tiny = new Hashids('1337', 4, 'abcdefghijklmnopqrstuvwxyz')

export const isRouterReady = (router: NextRouter) => {
  return router.asPath !== router.route
}

export const publicRewrites = rewrites.filter(({ listed }) => listed)

export const decode = (id: string | string[] | undefined) => {
  const [position] = tiny.decode(`${id}`)
  return rewrites[Number(position)]
}

export const encode = (position: number) => {
  return tiny.encode(position)
}
